const User = require('../models/User');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Product = require('../models/Product');
const config = require('../config');
const { getStripe } = require('../config/stripe');
const { withTransaction } = require('../config/database');
const { reserveItems } = require('./inventory.service');
const { expireOrderReservationIfStale, releaseOrderReservation } = require('./order.service');
const { calculateTotals, generateOrderNumber } = require('../utils/money');
const AppError = require('../utils/AppError');

const getPaymentIntentId = (session) => {
  if (!session?.payment_intent) return '';
  return typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent.id || '';
};

const createCheckoutSession = async (userId, { addressId, idempotencyKey } = {}) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');

  const address = (addressId && user.addresses.id(addressId)) ||
    user.addresses.find((entry) => entry.isDefault) || user.addresses[0];
  if (!address) {
    throw new AppError(400, 'ADDRESS_REQUIRED', 'Add a shipping address before checkout');
  }

  if (idempotencyKey) {
    const existing = await Order.findOne({ user: userId, idempotencyKey });
    if (existing) {
      if (existing.status === 'pending_payment') {
        await expireOrderReservationIfStale(existing);
        const current = await Order.findById(existing._id);
        if (current.status === 'pending_payment' && current.checkoutSessionId) {
          const payment = await Payment.findOne({ order: current._id });
          return { order: current, url: payment?.checkoutUrl || '', reused: true };
        }
        if (current.status === 'cancelled') {
          await Order.updateOne(
            { _id: current._id, user: userId, idempotencyKey },
            { $set: { idempotencyKey: null } }
          );
        } else {
          throw new AppError(409, 'DUPLICATE_CHECKOUT', 'This checkout has already been submitted');
        }
      } else {
        await Order.updateOne(
          { _id: existing._id, user: userId, idempotencyKey },
          { $set: { idempotencyKey: null } }
        );
      }
    }
  }

  const cart = await Cart.findOne({ user: userId });
  if (!cart || !cart.items.length) throw new AppError(400, 'EMPTY_CART', 'Your cart is empty');

  const items = [];
  for (const line of cart.items) {
    const product = await Product.findById(line.product);
    if (!product || product.status !== 'active') {
      throw new AppError(409, 'PRODUCT_UNAVAILABLE', 'A product in your cart is unavailable');
    }
    if (product.available < line.quantity) {
      throw new AppError(409, 'OUT_OF_STOCK', `Only ${product.available} units of ${product.name} are available`);
    }
    items.push({
      product: product._id,
      name: product.name,
      image: product.images[0] || '',
      sku: product.variants[0]?.sku || '',
      unitPrice: product.price,
      quantity: line.quantity,
      lineTotal: product.price * line.quantity,
    });
  }

  const totals = calculateTotals(items, { shippingFee: config.shippingFee, taxRate: config.taxRate });
  const orderNumber = generateOrderNumber();
  const reservationExpiresAt = new Date(Date.now() + config.reservationMinutes * 60 * 1000);

  let order;
  try {
    order = await withTransaction(async (session) => {
      await reserveItems(items, { order: { orderNumber }, performedBy: userId, session });
      const created = await Order.create([{
        orderNumber,
        user: userId,
        items,
        shippingAddress: {
          fullName: address.fullName,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          postalCode: address.postalCode,
          country: address.country,
        },
        ...totals,
        currency: 'IDR',
        status: 'pending_payment',
        paymentStatus: 'unpaid',
        reservationState: 'held',
        idempotencyKey: idempotencyKey || null,
        reservationExpiresAt,
        timeline: [{ status: 'pending_payment', at: new Date(), note: 'Stock reserved, awaiting payment' }],
      }], { session });
      await Payment.create([{
        order: created[0]._id,
        amount: totals.total,
        currency: 'IDR',
        status: 'pending',
      }], { session });
      await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } }, { session });
      return created[0];
    });
  } catch (error) {
    if (error.code === 11000 && idempotencyKey) {
      const existing = await Order.findOne({ user: userId, idempotencyKey });
      if (existing?.status === 'pending_payment' && existing.checkoutSessionId) {
        const payment = await Payment.findOne({ order: existing._id });
        return { order: existing, url: payment?.checkoutUrl || '', reused: true };
      }
      throw new AppError(409, 'DUPLICATE_CHECKOUT', 'This checkout has already been submitted');
    }
    throw error;
  }

  const lineItems = items.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: 'idr',
      unit_amount: item.unitPrice,
      product_data: { name: item.name, images: item.image ? [item.image] : [] },
    },
  }));
  if (totals.shippingFee > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: 'idr',
        unit_amount: totals.shippingFee,
        product_data: { name: 'Shipping' },
      },
    });
  }
  if (totals.tax > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: 'idr',
        unit_amount: totals.tax,
        product_data: { name: 'Tax' },
      },
    });
  }

  let stripeSession;
  try {
    stripeSession = await getStripe().checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      client_reference_id: order._id.toString(),
      metadata: { orderId: order._id.toString(), orderNumber: order.orderNumber },
      line_items: lineItems,
      success_url: `${config.clientUrl}/orders/${order._id}?payment=success`,
      cancel_url: `${config.clientUrl}/checkout?payment=cancelled`,
    }, { idempotencyKey: order._id.toString() });
  } catch {
    await releaseOrderReservation(order, { reason: 'Payment session could not be created' });
    throw new AppError(502, 'PAYMENT_INIT_FAILED', 'Could not start payment');
  }

  const checkoutSessionId = stripeSession.id;
  const paymentIntentId = getPaymentIntentId(stripeSession);
  const checkoutUrl = stripeSession.url || '';

  try {
    order = await withTransaction(async (session) => {
      const query = Order.findById(order._id);
      const locked = await (session ? query.session(session) : query);
      if (!locked || locked.status !== 'pending_payment') {
        throw new AppError(409, 'CHECKOUT_EXPIRED', 'Checkout reservation is no longer active');
      }
      locked.checkoutSessionId = checkoutSessionId;
      locked.paymentStatus = 'pending';
      locked.timeline.push({ status: 'pending', at: new Date(), note: 'Stripe Checkout Session created' });
      await locked.save({ session });
      await Payment.findOneAndUpdate(
        { order: locked._id },
        { $set: { checkoutSessionId, paymentIntentId, checkoutUrl, status: 'pending' } },
        { session }
      );
      return locked;
    });
  } catch {
    await Payment.findOneAndUpdate(
      { order: order._id },
      { $set: { checkoutSessionId, paymentIntentId, checkoutUrl, failureReason: 'Checkout finalization failed' } }
    );
    await releaseOrderReservation(order, { reason: 'Checkout session could not be saved' });
    throw new AppError(502, 'PAYMENT_INIT_FAILED', 'Could not start payment');
  }

  return { order, url: checkoutUrl, reused: false };
};

module.exports = { createCheckoutSession };
