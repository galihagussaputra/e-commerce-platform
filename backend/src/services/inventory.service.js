const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const AppError = require('../utils/AppError');

const recordMovement = async ({ product, type, quantity, reason, order, performedBy, balanceAfter, session }) =>
  new StockMovement({
    product,
    type,
    quantity,
    reason,
    order,
    performedBy,
    balanceAfter,
  }).save({ session });

const reserveItems = async (items, { order, performedBy, session } = {}) => {
  for (const item of items) {
    const product = await Product.findOneAndUpdate(
      { _id: item.product, status: 'active', available: { $gte: item.quantity } },
      { $inc: { available: -item.quantity, reserved: item.quantity } },
      { returnDocument: 'after', session }
    );
    if (!product) {
      throw new AppError(409, 'OUT_OF_STOCK', `Insufficient stock for ${item.name}`);
    }
    await recordMovement({
      product: product._id,
      type: 'reserve',
      quantity: item.quantity,
      reason: `Reserved by ${order?.orderNumber || 'checkout'}`,
      order: order?._id,
      performedBy,
      balanceAfter: product.available,
      session,
    });
  }
};

const releaseItems = async (items, { order, performedBy, reason = 'Reservation released', session } = {}) => {
  for (const item of items) {
    const product = await Product.findOneAndUpdate(
      { _id: item.product, reserved: { $gte: item.quantity } },
      { $inc: { available: item.quantity, reserved: -item.quantity } },
      { returnDocument: 'after', session }
    );
    if (!product) continue;
    await recordMovement({
      product: product._id,
      type: 'release',
      quantity: item.quantity,
      reason,
      order: order?._id,
      performedBy,
      balanceAfter: product.available,
      session,
    });
  }
};

const finalizeSale = async (items, { order, performedBy, session } = {}) => {
  for (const item of items) {
    const product = await Product.findOneAndUpdate(
      { _id: item.product, reserved: { $gte: item.quantity }, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity, reserved: -item.quantity } },
      { returnDocument: 'after', session }
    );
    if (!product) {
      throw new AppError(409, 'INVENTORY_CONFLICT', `Cannot finalize stock for ${item.name}`);
    }
    await recordMovement({
      product: product._id,
      type: 'out',
      quantity: item.quantity,
      reason: `Sold via ${order?.orderNumber || 'order'}`,
      order: order?._id,
      performedBy,
      balanceAfter: product.available,
      session,
    });
  }
};

const restockItems = async (items, { order, performedBy, reason = 'Restock after cancellation', session } = {}) => {
  for (const item of items) {
    const product = await Product.findOneAndUpdate(
      { _id: item.product },
      { $inc: { stock: item.quantity, available: item.quantity } },
      { returnDocument: 'after', session }
    );
    if (!product) continue;
    await recordMovement({
      product: product._id,
      type: 'in',
      quantity: item.quantity,
      reason,
      order: order?._id,
      performedBy,
      balanceAfter: product.available,
      session,
    });
  }
};

const adjustStock = async (productId, delta, reason, performedBy) => {
  if (!Number.isFinite(Number(delta)) || Number(delta) === 0) {
    throw new AppError(400, 'INVALID_QUANTITY', 'Adjustment quantity must be a non-zero number');
  }
  const amount = Number(delta);
  const filter = amount < 0
    ? { _id: productId, available: { $gte: Math.abs(amount) } }
    : { _id: productId };
  const product = await Product.findOneAndUpdate(
    filter,
    { $inc: { stock: amount, available: amount } },
    { returnDocument: 'after' }
  );
  if (!product) throw new AppError(409, 'INSUFFICIENT_STOCK', 'Adjustment would make stock negative');
  await recordMovement({
    product: product._id,
    type: 'adjustment',
    quantity: amount,
    reason,
    performedBy,
    balanceAfter: product.available,
  });
  return product;
};

const getMovements = async ({ product, type, page = 1, limit = 20 } = {}) => {
  const filter = {};
  if (product) filter.product = product;
  if (type) filter.type = type;
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const [items, total] = await Promise.all([
    StockMovement.find(filter)
      .populate('product', 'name slug')
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit),
    StockMovement.countDocuments(filter),
  ]);
  return { items, total, page: safePage, limit: safeLimit };
};

const getLowStockProducts = async (limit = 50) =>
  Product.find({
    status: 'active',
    $expr: { $lte: ['$available', '$lowStockThreshold'] },
  })
    .populate('category', 'name slug')
    .sort({ available: 1 })
    .limit(Math.min(Number(limit) || 50, 100));

module.exports = {
  reserveItems,
  releaseItems,
  finalizeSale,
  restockItems,
  adjustStock,
  getMovements,
  getLowStockProducts,
};
