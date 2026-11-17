const analyticsService = require('../services/analytics.service');
const inventoryService = require('../services/inventory.service');
const { success } = require('../utils/apiResponse');

const summary = async (req, res) => success(res, await analyticsService.summary(req.query));
const salesTrend = async (req, res) => success(res, await analyticsService.salesTrend(req.query));
const topProducts = async (req, res) => success(res, await analyticsService.topProducts(req.query));
const recentTransactions = async (req, res) => success(res, await analyticsService.recentTransactions(req.query.limit));
const inventoryReport = async (req, res) => success(res, await analyticsService.inventoryReport());
const lowStock = async (req, res) => success(res, await analyticsService.lowStock(req.query.limit));
const movements = async (req, res) => {
  const result = await inventoryService.getMovements(req.query);
  success(res, result.items, 200, { total: result.total, page: result.page, limit: result.limit });
};
const adjustStock = async (req, res) => {
  const { productId, delta, reason } = req.body;
  success(res, await inventoryService.adjustStock(productId, delta, reason, req.user._id));
};

module.exports = {
  summary,
  salesTrend,
  topProducts,
  recentTransactions,
  inventoryReport,
  lowStock,
  movements,
  adjustStock,
};
