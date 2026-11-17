const orderService = require('../services/order.service');
const { success } = require('../utils/apiResponse');

const list = async (req, res) => {
  const result = await orderService.listOrders({ ...req.query, user: req.user, role: req.user.role });
  success(res, result.items, 200, { total: result.total, page: result.page, limit: result.limit });
};

const detail = async (req, res) =>
  success(res, await orderService.getOrder(req.params.id, req.user, req.user.role));

const cancel = async (req, res) =>
  success(res, await orderService.cancelOrder(req.params.id, req.user, req.user.role, req.body.reason));

const updateStatus = async (req, res) =>
  success(res, await orderService.updateStatus(req.params.id, req.body.status, req.body.note, req.user._id));

module.exports = { list, detail, cancel, updateStatus };
