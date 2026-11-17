const Order = require('../models/Order');
const Payment = require('../models/Payment');
const AppError = require('../utils/AppError');
const escapeRegex = require('../utils/escapeRegex');
const { withTransaction } = require('../config/database');
const { releaseItems, restockItems, finalizeSale } = require('./inventory.service');
const { restoreCartFromOrder } = require('./cart.service');
const { refundPaidOrder } = require('./refund.service');

const transitions = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
  refunded: [],
};

const findForUpdate = (query, session) => (session ? query.session(session) : query);

const isReservationExpired = (order) =>
  Boolean(order?.reservationExpiresAt && new Date(order.reservationExpiresAt) <= new Date());

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
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [
      { orderNumber: pattern },
      { 'shippingAddress.fullName': pattern },
    ];
  }
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

const releaseOrderReservation = async (order, {
  actorId,
  reason = 'Reservation released',
  eventId,
  restoreCart = true,
} = {}) => {
  if (!order || order.status !== 'pending_payment') return false;

  let released = false;
  await withTransaction(async (session) => {
    const locked = await findForUpdate(Order.findById(order._id), session);
    if (!locked || locked.status !== 'pending_payment' || locked.reservationState !== 'held') return;

    await releaseItems(locked.items, {
      order: locked,
      performedBy: actorId,
      reason,
      session,
    });

    locked.status = 'cancelled';
    locked.paymentStatus = 'failed';
    locked.reservationState = 'released';
    locked.timeline.push({ status: 'cancelled', at: new Date(), note: reason });
    await locked.save({ session });

    const paymentUpdate = { $set: { status: 'failed', failureReason: reason } };
    if (eventId) paymentUpdate.$set.processedEventId = eventId;
    await findForUpdate(Payment.findOneAndUpdate({ order: locked._id }, paymentUpdate), session);
    released = true;
  });

  if (released && restoreCart && order.user) {
    await restoreCartFromOrder(order.user._id || order.user, order);
  }
  return released;
};

const expireOrderReservationIfStale = async (order) => {
  if (!isReservationExpired(order)) return false;
  return releaseOrderReservation(order, {
    reason: 'Reservation expired before payment',
  });
};

const cancelOrderInternal = async (order, actorId, reason, options = {}) => {
  if (!['pending_payment', 'paid', 'processing'].includes(order?.status)) return order;

  if (order.status === 'pending_payment') {
    await releaseOrderReservation(order, {
      actorId,
      reason: reason || 'Order cancelled before payment',
    });
    return Order.findById(order._id);
  }

  await refundPaidOrder(order, {
    eventId: options.eventId,
    reason: reason || 'Order cancelled after payment',
    restock: options.restock !== false,
  });

  await withTransaction(async (session) => {
    const locked = await findForUpdate(Order.findById(order._id), session);
    if (!locked || !['paid', 'processing'].includes(locked.status)) return;
    locked.status = 'cancelled';
    locked.paymentStatus = 'refunded';
    locked.timeline.push({ status: 'cancelled', at: new Date(), note: reason || 'Cancelled' });
    await locked.save({ session });
    await findForUpdate(Payment.findOneAndUpdate(
      { order: locked._id },
      { $set: { status: 'refunded', failureReason: reason || 'Cancelled' } }
    ), session);
  });

  return Order.findById(order._id);
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
  if (!order || order.status !== 'pending_payment') return false;

  let finalized = false;
  await withTransaction(async (session) => {
    const locked = await findForUpdate(Order.findById(order._id), session);
    if (!locked || locked.status !== 'pending_payment' || locked.reservationState !== 'held') return;

    await finalizeSale(locked.items, { order: locked, performedBy: locked.user, session });

    locked.status = 'paid';
    locked.paymentStatus = 'paid';
    locked.paymentIntentId = paymentIntentId || locked.paymentIntentId;
    locked.reservationState = 'finalized';
    locked.timeline.push({ status: 'paid', at: new Date(), note: 'Payment confirmed by Stripe webhook' });
    await locked.save({ session });

    const paymentUpdate = { $set: { status: 'paid' } };
    if (paymentIntentId) paymentUpdate.$set.paymentIntentId = paymentIntentId;
    if (eventId) paymentUpdate.$set.processedEventId = eventId;
    await findForUpdate(Payment.findOneAndUpdate({ order: locked._id }, paymentUpdate), session);
    finalized = true;
  });
  return finalized;
};

const expireStaleReservations = async () => {
  let expired = 0;
  for (let batch = 0; batch < 10; batch += 1) {
    const stale = await Order.find({
      status: 'pending_payment',
      reservationExpiresAt: { $lte: new Date() },
    }).limit(100);
    if (!stale.length) break;
    for (const order of stale) {
      if (await expireOrderReservationIfStale(order)) expired += 1;
    }
  }
  return expired;
};

const startReservationCleanup = () => {
  const run = () => {
    expireStaleReservations().catch((error) => console.error('[reservations]', error.message));
  };
  run();
  const interval = setInterval(run, 60 * 1000);
  interval.unref();
  return interval;
};

module.exports = {
  listOrders,
  getOrder,
  releaseOrderReservation,
  expireOrderReservationIfStale,
  cancelOrder,
  updateStatus,
  finalizePaidOrder,
  expireStaleReservations,
  startReservationCleanup,
  isReservationExpired,
};
