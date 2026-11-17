const User = require('../models/User');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Product = require('../models/Product');
const config = require('../config');
const { getStripe } = require('../config/stripe');
const { withTransaction } = require('../config/database');
const { reserveItems, releaseItems } = require('./inventory.service');
const { calculateTotals, generateOrderNumber } = require('../utils/money');
const AppError = require('../utils/AppError');

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
      if (existing.status === 'pending_payment' && existing.checkoutSessionId) {
        const payment = await Payment.findOne({ order: existing._id });
        return { order: existing, url: payment?.checkoutUrl || '', reused: true };
      }
      throw new AppError(409, 'DUPLICATE_CHECKOUT', 'This checkout has already been submitted');
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

  const order = await withTransaction(async (session) => {
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
      idempotencyKey: idempotencyKey || null,
      reservationExpiresAt,
      timeline: [{ status: 'pending_payment', at: new Date(), note: 'Stock reserved, awaiting payment' }],
    }], { session });
    await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } }, { session });
    return created[0];
  });

  let stripeSession;
  try {
    const stripe = getStripe();
    stripeSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      client_reference_id: order._id.toString(),
      metadata: { orderId: order._id.toString(), orderNumber: order.orderNumber },
      line_items: items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: 'idr',
          unit_amount: item.unitPrice,
          product_data: { name: item.name, images: item.image ? [item.image] : [] },
        },
      })),
      success_url: `${config.clientUrl}/orders/${order._id}?payment=success`,
      cancel_url: `${config.clientUrl}/checkout?payment=cancelled`,
    }, { idempotencyKey: idempotencyKey || order._id.toString() });
  } catch (error) {
    await releaseItems(items, {
      order,
      performedBy: userId,
      reason: 'Payment session could not be created',
    });
    order.status = 'cancelled';
    order.paymentStatus = 'failed';
    order.timeline.push({ status: 'cancelled', at: new Date(), note: 'Payment session creation failed' });
    await order.save();
    throw new AppError(error.statusCode || 502, 'PAYMENT_INIT_FAILED', error.message || 'Could not start payment');
  }

  await Payment.create({
    order: order._id,
    checkoutSessionId: stripeSession.id,
    paymentIntentId: stripeSession.payment_intent || '',
    amount: totals.total,
    currency: 'IDR',
    status: 'pending',
    checkoutUrl: stripeSession.url || '',
  });
  order.checkoutSessionId = stripeSession.id;
  order.paymentStatus = 'pending';
  order.timeline.push({ status: 'pending', at: new Date(), note: 'Stripe Checkout Session created' });
  await order.save();

  return { order, url: stripeSession.url, reused: false };
};

module.exports = { createCheckoutSession };
