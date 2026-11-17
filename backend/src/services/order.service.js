const Order = require('../models/Order');
const Payment = require('../models/Payment');
const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/database');
const { releaseItems, restockItems, finalizeSale } = require('./inventory.service');
const { restoreCartFromOrder } = require('./cart.service');

const transitions = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
  refunded: [],
};

const listOrders = async ({
  user,
  role,
  status,
  paymentStatus,
  q,
  from,
  to,
  page = 1,
  limit = 20,
} = {}) => {
  const filter = role === 'admin' ? {} : { user: user._id };
  if (status && status !== 'all') filter.status = status;
  if (paymentStatus && paymentStatus !== 'all') filter.paymentStatus = paymentStatus;
  if (q) filter.$or = [
    { orderNumber: new RegExp(q, 'i') },
    { 'shippingAddress.fullName': new RegExp(q, 'i') },
  ];
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const [items, total] = await Promise.all([
    Order.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit),
    Order.countDocuments(filter),
  ]);
  return { items, total, page: safePage, limit: safeLimit };
};

const getOrder = async (id, user, role) => {
  const order = await Order.findById(id).populate('user', 'name email');
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  if (role !== 'admin' && order.user._id.toString() !== user._id.toString()) {
    throw new AppError(403, 'FORBIDDEN', 'You cannot view this order');
  }
  return order;
};

const cancelOrderInternal = async (order, actorId, reason) => {
  if (!['pending_payment', 'paid', 'processing'].includes(order.status)) {
    return order;
  }
  const wasPending = order.status === 'pending_payment';
  await withTransaction(async (session) => {
    if (wasPending) {
      await releaseItems(order.items, {
        order,
        performedBy: actorId,
        reason: reason || 'Order cancelled before payment',
        session,
      });
    } else {
      await restockItems(order.items, {
        order,
        performedBy: actorId,
        reason: reason || 'Order cancelled after payment',
        session,
      });
    }
    order.status = 'cancelled';
    if (!wasPending) order.paymentStatus = 'refunded';
    order.timeline.push({ status: 'cancelled', at: new Date(), note: reason || 'Cancelled' });
    await order.save({ session });
    await Payment.findOneAndUpdate(
      { order: order._id },
      { $set: { status: wasPending ? 'failed' : 'refunded', failureReason: reason || 'Cancelled' } },
      { session }
    );
  });
  if (wasPending && order.user) {
    await restoreCartFromOrder(order.user._id || order.user, order);
  }
  return order;
};

const cancelOrder = async (id, user, role, reason) => {
  const order = await getOrder(id, user, role);
  if (order.status === 'paid' && role !== 'admin') {
    throw new AppError(403, 'FORBIDDEN', 'Paid orders can only be cancelled by an administrator');
  }
  return cancelOrderInternal(order, user._id, reason);
};

const updateStatus = async (id, status, note, actorId) => {
  const order = await Order.findById(id);
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  if (!transitions[order.status]?.includes(status)) {
    throw new AppError(409, 'INVALID_TRANSITION', `Cannot move from ${order.status} to ${status}`);
  }
  if (status === 'cancelled') return cancelOrderInternal(order, actorId, note);
  order.status = status;
  order.timeline.push({ status, at: new Date(), note: note || '' });
  await order.save();
  return order;
};

const finalizePaidOrder = async (order, paymentIntentId, eventId) => {
  if (order.status !== 'pending_payment') return false;
  await withTransaction(async (session) => {
    await finalizeSale(order.items, { order, performedBy: order.user, session });
    order.status = 'paid';
    order.paymentStatus = 'paid';
    order.paymentIntentId = paymentIntentId || order.paymentIntentId;
    order.timeline.push({ status: 'paid', at: new Date(), note: 'Payment confirmed by Stripe webhook' });
    await order.save({ session });
    await Payment.findOneAndUpdate(
      { order: order._id },
      { $set: { status: 'paid', paymentIntentId: paymentIntentId || '', processedEventId: eventId || '' } },
      { session }
    );
  });
  return true;
};

const expireStaleReservations = async () => {
  const stale = await Order.find({
    status: 'pending_payment',
    reservationExpiresAt: { $lte: new Date() },
  }).limit(100);
  for (const order of stale) {
    await cancelOrderInternal(order, null, 'Reservation expired before payment');
  }
  return stale.length;
};

const startReservationCleanup = () => {
  const interval = setInterval(() => {
    expireStaleReservations().catch((error) => console.error('[reservations]', error.message));
  }, 60 * 1000);
  interval.unref();
  return interval;
};

module.exports = {
  listOrders,
  getOrder,
  cancelOrder,
  updateStatus,
  finalizePaidOrder,
  expireStaleReservations,
  startReservationCleanup,
};
