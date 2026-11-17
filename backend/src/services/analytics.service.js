const Order = require('../models/Order');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const { getLowStockProducts } = require('./inventory.service');

const paidStatuses = ['paid', 'processing', 'shipped', 'delivered'];

const dateFilter = ({ from, to }) => {
  const filter = {};
  if (from) filter.$gte = new Date(from);
  if (to) filter.$lte = new Date(to);
  return Object.keys(filter).length ? filter : undefined;
};

const summary = async (range = {}) => {
  const createdAt = dateFilter(range);
  const revenueFilter = { status: { $in: paidStatuses } };
  if (createdAt) revenueFilter.createdAt = createdAt;

  const [revenue, totalOrders, pendingPayments, completedOrders, canceledOrders] = await Promise.all([
    Order.aggregate([
      { $match: revenueFilter },
      { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    Order.countDocuments(createdAt ? { createdAt } : {}),
    Order.countDocuments({ status: 'pending_payment', ...(createdAt ? { createdAt } : {}) }),
    Order.countDocuments({ status: 'delivered', ...(createdAt ? { createdAt } : {}) }),
    Order.countDocuments({ status: { $in: ['cancelled', 'refunded'] }, ...(createdAt ? { createdAt } : {}) }),
  ]);

  const totalRevenue = revenue[0]?.revenue || 0;
  const paidCount = revenue[0]?.count || 0;
  return {
    totalRevenue,
    totalOrders,
    pendingPayments,
    completedOrders,
    canceledOrders,
    averageOrderValue: paidCount ? Math.round(totalRevenue / paidCount) : 0,
    currency: 'IDR',
  };
};

const salesTrend = async (range = {}) => {
  const match = { status: { $in: paidStatuses } };
  const createdAt = dateFilter(range);
  if (createdAt) match.createdAt = createdAt;
  return Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$total' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', revenue: 1, orders: 1 } },
  ]);
};

const topProducts = async (range = {}, limit = 8) => {
  const match = { status: { $in: paidStatuses } };
  const createdAt = dateFilter(range);
  if (createdAt) match.createdAt = createdAt;
  return Order.aggregate([
    { $match: match },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$items.name' },
        unitsSold: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.lineTotal' },
      },
    },
    { $sort: { unitsSold: -1 } },
    { $limit: Math.min(Number(limit) || 8, 20) },
    { $project: { _id: 0, productId: '$_id', name: 1, unitsSold: 1, revenue: 1 } },
  ]);
};

const recentTransactions = async (limit = 10) => {
  const orders = await Order.find({ status: { $in: [...paidStatuses, 'cancelled', 'refunded'] } })
    .select('orderNumber total status paymentStatus createdAt user')
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 10, 50));
  const payments = await Payment.find({ order: { $in: orders.map((order) => order._id) } });
  const byOrder = new Map(payments.map((payment) => [payment.order.toString(), payment]));
  return orders.map((order) => ({
    id: order._id,
    orderNumber: order.orderNumber,
    customer: order.user?.name || 'Unknown',
    total: order.total,
    status: order.status,
    paymentStatus: order.paymentStatus,
    provider: byOrder.get(order._id.toString())?.provider || 'stripe',
    createdAt: order.createdAt,
  }));
};

const inventoryReport = async () => {
  const rows = await Product.aggregate([
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryInfo',
      },
    },
    {
      $project: {
        name: 1,
        sku: { $ifNull: [{ $arrayElemAt: ['$variants.sku', 0] }, ''] },
        category: { $arrayElemAt: ['$categoryInfo.name', 0] },
        stock: 1,
        reserved: 1,
        available: 1,
        lowStockThreshold: 1,
        value: { $multiply: ['$stock', '$price'] },
      },
    },
    { $sort: { available: 1 } },
  ]);
  const totals = rows.reduce(
    (acc, row) => ({
      products: acc.products + 1,
      units: acc.units + row.stock,
      reserved: acc.reserved + row.reserved,
      value: acc.value + row.value,
    }),
    { products: 0, units: 0, reserved: 0, value: 0 }
  );
  return { rows, totals };
};

module.exports = {
  summary,
  salesTrend,
  topProducts,
  recentTransactions,
  inventoryReport,
  lowStock: getLowStockProducts,
};
