const config = require('../config');
const { getStripe } = require('../config/stripe');
const { withTransaction } = require('../config/database');
const WebhookEvent = require('../models/WebhookEvent');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const AppError = require('../utils/AppError');
const { finalizePaidOrder } = require('./order.service');
const { releaseItems, restockItems } = require('./inventory.service');

const failPendingOrder = async (order, eventId, reason) => {
  if (!order || !['pending_payment'].includes(order.status)) return false;
  await withTransaction(async (session) => {
    await releaseItems(order.items, {
      order,
      reason: reason || 'Payment failed or session expired',
      session,
    });
    order.status = 'cancelled';
    order.paymentStatus = 'failed';
    order.timeline.push({ status: 'cancelled', at: new Date(), note: reason || 'Payment failed' });
    await order.save({ session });
    await Payment.findOneAndUpdate(
      { order: order._id },
      { $set: { status: 'failed', processedEventId: eventId || '', failureReason: reason || 'Payment failed' } },
      { session }
    );
  });
  return true;
};

const handleWebhookEvent = async (rawBody, signature) => {
  if (!config.isWebhookConfigured) {
    throw new AppError(503, 'WEBHOOK_NOT_CONFIGURED', 'Stripe webhook secret is not configured');
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret);
  } catch {
    throw new AppError(400, 'INVALID_SIGNATURE', 'Stripe webhook signature is invalid');
  }

  if (await WebhookEvent.exists({ eventId: event.id })) {
    return { duplicate: true, type: event.type, handled: false };
  }
  try {
    await WebhookEvent.create({ eventId: event.id, type: event.type });
  } catch (error) {
    if (error.code === 11000) return { duplicate: true, type: event.type, handled: false };
    throw error;
  }

  let handled = false;
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.payment_status === 'paid') {
      const order = await Order.findById(session.metadata?.orderId || session.client_reference_id);
      if (order) {
        handled = await finalizePaidOrder(order, session.payment_intent || '', event.id);
      }
    }
  }

  if (['checkout.session.expired', 'checkout.session.async_payment_failed'].includes(event.type)) {
    const session = event.data.object;
    const order = await Order.findById(session.metadata?.orderId || session.client_reference_id);
    handled = await failPendingOrder(order, event.id, event.type);
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object;
    const payment = await Payment.findOne({ paymentIntentId: intent.id });
    const order = payment ? await Order.findById(payment.order) : null;
    handled = await failPendingOrder(order, event.id, 'Payment intent failed');
    if (!handled && order && order.status === 'paid') {
      await restockItems(order.items, { order, reason: 'Payment failed after capture' });
      order.status = 'cancelled';
      order.paymentStatus = 'failed';
      await order.save();
      handled = true;
    }
  }

  return { duplicate: false, type: event.type, handled };
};

module.exports = { handleWebhookEvent };
