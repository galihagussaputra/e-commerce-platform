const crypto = require('crypto');

const calculateTotals = (items, { shippingFee = 0, taxRate = 0 } = {}) => {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const shipping = subtotal > 0 ? shippingFee : 0;
  const tax = Math.round(subtotal * taxRate);
  return { subtotal, shipping, tax, total: subtotal + shipping + tax };
};

const generateOrderNumber = () => {
  const date = new Date();
  const stamp = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
  return `ORD-${stamp}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

module.exports = { calculateTotals, generateOrderNumber, normalizeEmail };
