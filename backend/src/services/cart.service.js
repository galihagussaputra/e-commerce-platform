const Cart = require('../models/Cart');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');

const getCartDocument = async (userId) =>
  Cart.findOne({ user: userId }).populate('items.product');

const getCart = async (userId) => {
  const cart = await getCartDocument(userId);
  if (!cart) return { items: [], subtotal: 0, itemCount: 0 };

  const items = cart.items
    .filter((item) => item.product && item.product.status === 'active')
    .map((item) => ({
      product: item.product,
      quantity: item.quantity,
      unitPrice: item.product.price,
      lineTotal: item.product.price * item.quantity,
      available: item.product.available,
    }));
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return { items, subtotal, itemCount: items.reduce((sum, item) => sum + item.quantity, 0) };
};

const assertPurchasable = async (productId) => {
  const product = await Product.findById(productId);
  if (!product || product.status !== 'active') {
    throw new AppError(404, 'PRODUCT_UNAVAILABLE', 'Product is not available');
  }
  return product;
};

const addItem = async (userId, productId, quantity = 1) => {
  const amount = Number(quantity);
  if (!Number.isInteger(amount) || amount < 1 || amount > 99) {
    throw new AppError(400, 'INVALID_QUANTITY', 'Quantity must be between 1 and 99');
  }
  const product = await assertPurchasable(productId);
  const cart = (await Cart.findOne({ user: userId })) || new Cart({ user: userId, items: [] });
  const existing = cart.items.find((item) => item.product.toString() === productId.toString());
  const next = (existing?.quantity || 0) + amount;
  if (next > product.available) {
    throw new AppError(409, 'OUT_OF_STOCK', `Only ${product.available} units are available`);
  }
  if (existing) existing.quantity = next;
  else cart.items.push({ product: product._id, quantity: amount });
  await cart.save();
  return getCart(userId);
};

const updateItem = async (userId, productId, quantity) => {
  const amount = Number(quantity);
  if (!Number.isInteger(amount) || amount < 0 || amount > 99) {
    throw new AppError(400, 'INVALID_QUANTITY', 'Quantity must be between 0 and 99');
  }
  if (amount === 0) return removeItem(userId, productId);
  const product = await assertPurchasable(productId);
  if (amount > product.available) {
    throw new AppError(409, 'OUT_OF_STOCK', `Only ${product.available} units are available`);
  }
  const cart = await Cart.findOne({ user: userId });
  const existing = cart?.items.find((item) => item.product.toString() === productId.toString());
  if (!existing) throw new AppError(404, 'CART_ITEM_NOT_FOUND', 'Item is not in the cart');
  existing.quantity = amount;
  await cart.save();
  return getCart(userId);
};

const removeItem = async (userId, productId) => {
  await Cart.findOneAndUpdate({ user: userId }, { $pull: { items: { product: productId } } });
  return getCart(userId);
};

const clearCart = async (userId) => {
  await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } }, { upsert: true });
  return getCart(userId);
};

const syncCart = async (userId, items = []) => {
  if (!Array.isArray(items) || items.length > 50) {
    throw new AppError(400, 'INVALID_CART', 'Cart payload is invalid');
  }
  const cart = (await Cart.findOne({ user: userId })) || new Cart({ user: userId, items: [] });
  cart.items = [];
  for (const entry of items) {
    const product = await Product.findById(entry.productId || entry.product);
    if (!product || product.status !== 'active') continue;
    const quantity = Math.min(Math.max(Number(entry.quantity) || 0, 0), product.available, 99);
    if (quantity > 0) {
      cart.items.push({ product: product._id, quantity: Math.floor(quantity) });
    }
  }
  await cart.save();
  return getCart(userId);
};

const restoreCartFromOrder = async (userId, order) => {
  const cart = (await Cart.findOne({ user: userId })) || new Cart({ user: userId, items: [] });
  for (const item of order.items) {
    const product = await Product.findById(item.product);
    const available = product?.available || 0;
    const existing = cart.items.find((entry) => entry.product.toString() === item.product.toString());
    const desired = (existing?.quantity || 0) + item.quantity;
    const quantity = Math.min(desired, available, 99);
    if (quantity < 1) continue;
    if (existing) existing.quantity = quantity;
    else cart.items.push({ product: item.product, quantity });
  }
  await cart.save();
};

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  syncCart,
  restoreCartFromOrder,
};
