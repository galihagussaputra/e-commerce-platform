const express = require('express');
const adminController = require('../controllers/admin.controller');
const { protect, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const validator = require('../validators/inventory.validator');

const router = express.Router();
router.use(protect, requireAdmin);

router.get('/analytics/summary', asyncHandler(adminController.summary));
router.get('/analytics/sales-trend', asyncHandler(adminController.salesTrend));
router.get('/analytics/top-products', asyncHandler(adminController.topProducts));
router.get('/analytics/recent-transactions', asyncHandler(adminController.recentTransactions));
router.get('/analytics/inventory', asyncHandler(adminController.inventoryReport));
router.get('/inventory/low-stock', asyncHandler(adminController.lowStock));
router.get('/inventory/movements', asyncHandler(adminController.movements));
router.post('/inventory/adjust/:productId', validator.adjust, validate, asyncHandler(adminController.adjustStock));

module.exports = router;
