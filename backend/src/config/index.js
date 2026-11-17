const crypto = require('crypto');
const path = require('path');

require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (nodeEnv === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  jwtSecret = crypto.randomBytes(32).toString('hex');
  console.warn('[config] JWT_SECRET not set: using an ephemeral development secret');
}

const corsOrigins = (process.env.CORS_ORIGIN || clientUrl)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const parseTrustProxy = (value) => {
  if (value === undefined || value === '') return false;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  return normalized;
};

module.exports = {
  nodeEnv,
  port: Number(process.env.PORT || 5000),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  clientUrl,
  corsOrigins,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  shippingFee: Number(process.env.SHIPPING_FEE || 25000),
  taxRate: Number(process.env.TAX_RATE || 0),
  reservationMinutes: Number(process.env.RESERVATION_MINUTES || 30),
  adminSeedEmail: process.env.ADMIN_SEED_EMAIL || 'admin@example.com',
  adminSeedPassword: process.env.ADMIN_SEED_PASSWORD || (nodeEnv === 'production' ? '' : 'admin12345'),
  isStripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
  isWebhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
};
