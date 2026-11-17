const config = require('../config');
const { getStripe } = require('../config/stripe');
const WebhookEvent = require('../models/WebhookEvent');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const AppError = require('../utils/AppError');
const {
  finalizePaidOrder,
  releaseOrderReservation,
  expireOrderReservationIfStale,
} = require('./order.service');
const { refundPaidOrder } = require('./refund.service');

const PAID_EVENTS = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];
const EXPIRY_EVENTS = ['checkout.session.expired', 'checkout.session.async_payment_failed'];

const claimEvent = async (event) => {
  const existing = await WebhookEvent.findOne({ eventId: event.id });
  if (existing && existing.status !== 'failed') {
    return { duplicate: true };
  }
  if (existing) {
    await WebhookEvent.updateOne(
      { _id: existing._id },
      { $set: { status: 'processing', handled: false, error: '' } }
    );
    return { duplicate: false };
  }

  try {
    await WebhookEvent.create({
      eventId: event.id,
      type: event.type,
      status: 'processing',
    });
    return { duplicate: false };
  } catch (error) {
    if (error.code !== 11000) throw error;
    const concurrent = await WebhookEvent.findOne({ eventId: event.id });
    if (concurrent?.status === 'failed') {
      await WebhookEvent.updateOne(
        { _id: concurrent._id },
        { $set: { status: 'processing', handled: false, error: '' } }
      );
      return { duplicate: false };
    }
    return { duplicate: true };
  }
};

const assertPaymentAmount = (order, session) => {
  const amount = session.amount_total ?? session.amount_received;
  if (amount !== undefined && amount !== null && Number(amount) !== Number(order.total)) {
    throw new AppError(409, 'PAYMENT_AMOUNT_MISMATCH', 'Paid amount does not match the order total');
  }
  if (session.currency && String(session.currency).toUpperCase() !== String(order.currency).toUpperCase()) {
    throw new AppError(409, 'PAYMENT_CURRENCY_MISMATCH', 'Paid currency does not match the order currency');
  }
};

const processEvent = async (event) => {
  if (PAID_EVENTS.includes(event.type)) {
    const session = event.data.object;
    const isPaid = session.payment_status === 'paid' || event.type === 'checkout.session.async_payment_succeeded';
    if (!isPaid) return false;

    const order = await Order.findById(session.metadata?.orderId || session.client_reference_id);
    if (!order) return false;

    await expireOrderReservationIfStale(order);
    const current = await Order.findById(order._id);
    if (!current) return false;

    if (current.status === 'pending_payment') {
      assertPaymentAmount(current, session);
      return finalizePaidOrder(current, session.payment_intent || '', event.id);
    }

    if (['cancelled', 'refunded'].includes(current.status)) {
      return refundPaidOrder(current, {
        eventId: event.id,
        reason: 'Payment received after reservation expiry or cancellation',
        restock: false,
      });
    }
    return false;
  }

  if (EXPIRY_EVENTS.includes(event.type)) {
    const session = event.data.object;
    const order = await Order.findById(session.metadata?.orderId || session.client_reference_id);
    return releaseOrderReservation(order, {
      eventId: event.id,
      reason: event.type === 'checkout.session.expired'
        ? 'Checkout session expired'
        : 'Asynchronous payment failed',
    });
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object;
    const payment = await Payment.findOne({ paymentIntentId: intent.id });
    if (!payment) return false;
    if (payment.status === 'refunded') return true;

    const order = await Order.findById(payment.order);
    if (!order) return false;

    if (order.status === 'pending_payment') {
      return releaseOrderReservation(order, {
        eventId: event.id,
        reason: 'Payment intent failed',
      });
    }

    if (['paid', 'processing'].includes(order.status)) {
      return refundPaidOrder(order, {
        eventId: event.id,
        reason: 'Payment failed after capture',
        restock: true,
      });
    }
  }

  return false;
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

  const claim = await claimEvent(event);
  if (claim.duplicate) {
    return { duplicate: true, type: event.type, handled: false };
  }

  try {
    const handled = await processEvent(event);
    await WebhookEvent.updateOne(
      { eventId: event.id },
      { $set: { status: 'processed', handled, error: '' } }
    );
    return { duplicate: false, type: event.type, handled };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await WebhookEvent.updateOne(
      { eventId: event.id },
      { $set: { status: 'failed', handled: false, error: message.slice(0, 500) } }
    );
    throw error;
  }
};

module.exports = { handleWebhookEvent };
