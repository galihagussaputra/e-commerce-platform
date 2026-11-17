const { getStripe } = require('../config/stripe');
const { withTransaction } = require('../config/database');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const AppError = require('../utils/AppError');
const { restockItems } = require('./inventory.service');

const findForUpdate = (query, session) => (session ? query.session(session) : query);

const refundPaidOrder = async (order, {
  eventId,
  reason = 'Order refunded',
  restock = false,
  status = 'cancelled',
} = {}) => {
  if (!order || !['paid', 'processing', 'cancelled', 'refunded'].includes(order.status)) return false;

  const payment = await Payment.findOne({ order: order._id });
  if (!payment || payment.status === 'refunded') return false;

  const paymentIntentId = payment.paymentIntentId || order.paymentIntentId;
  if (!paymentIntentId) {
    throw new AppError(409, 'REFUND_UNAVAILABLE', 'Payment intent is unavailable for refund');
  }

  await getStripe().refunds.create(
    { payment_intent: paymentIntentId, reason: 'requested_by_customer' },
    { idempotencyKey: `refund-${eventId || order._id}-${order._id}` }
  );

  let changed = false;
  await withTransaction(async (session) => {
    const locked = await findForUpdate(Order.findById(order._id), session);
    const currentPayment = await findForUpdate(Payment.findOne({ order: order._id }), session);
    if (!locked || !currentPayment || currentPayment.status === 'refunded') return;

    if (restock) {
      await restockItems(locked.items, {
        order: locked,
        reason: `${reason} (refund)`,
        session,
      });
    }

    locked.status = status;
    locked.paymentStatus = 'refunded';
    locked.timeline.push({ status: 'refunded', at: new Date(), note: reason });
    await locked.save({ session });

    const paymentUpdate = { $set: { status: 'refunded', failureReason: reason } };
    if (eventId) paymentUpdate.$set.processedEventId = eventId;
    await findForUpdate(Payment.findOneAndUpdate({ order: locked._id }, paymentUpdate), session);
    changed = true;
  });

  return changed;
};

module.exports = { refundPaidOrder };
