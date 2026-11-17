const config = require('./index');
const AppError = require('../utils/AppError');

let client = null;

const getStripe = () => {
  if (!config.stripeSecretKey) {
    throw new AppError(503, 'PAYMENTS_NOT_CONFIGURED', 'Stripe is not configured on this server');
  }
  if (!client) {
    client = require('stripe')(config.stripeSecretKey);
  }
  return client;
};

module.exports = { getStripe };
