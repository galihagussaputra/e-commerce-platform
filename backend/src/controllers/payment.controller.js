const paymentService = require('../services/payment.service');
const { success } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');

const webhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  if (!signature) throw new AppError(400, 'MISSING_SIGNATURE', 'Stripe signature header is required');
  const result = await paymentService.handleWebhookEvent(req.body, signature);
  success(res, { received: true, ...result });
};

module.exports = { webhook };
