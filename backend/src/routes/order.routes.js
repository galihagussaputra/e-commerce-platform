const express = require('express');
const orderController = require('../controllers/order.controller');
const { protect, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const validator = require('../validators/order.validator');

const router = express.Router();
router.use(protect);

router.get('/', asyncHandler(orderController.list));
router.get('/:id', validator.id, validate, asyncHandler(orderController.detail));
router.post('/:id/cancel', validator.id, validator.cancel, validate, asyncHandler(orderController.cancel));
router.patch('/:id/status', requireAdmin, validator.id, validator.status, validate, asyncHandler(orderController.updateStatus));

module.exports = router;
