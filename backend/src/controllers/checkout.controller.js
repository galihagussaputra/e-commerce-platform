const checkoutService = require('../services/checkout.service');
const { success } = require('../utils/apiResponse');

const createSession = async (req, res) => {
  const result = await checkoutService.createCheckoutSession(req.user._id, req.body);
  success(res, { url: result.url, order: result.order, reused: result.reused }, result.reused ? 200 : 201);
};

module.exports = { createSession };
