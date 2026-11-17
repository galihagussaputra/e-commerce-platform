const express = require('express');
const cartController = require('../controllers/cart.controller');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const validator = require('../validators/cart.validator');

const router = express.Router();
router.use(protect);

router.get('/', asyncHandler(cartController.get));
router.post('/sync', validator.sync, validate, asyncHandler(cartController.sync));
router.delete('/', asyncHandler(cartController.clear));
router.post('/items/:productId', validator.productId, validator.quantity, validate, asyncHandler(cartController.add));
router.put('/items/:productId', validator.productId, validator.quantity, validate, asyncHandler(cartController.update));
router.delete('/items/:productId', validator.productId, validate, asyncHandler(cartController.remove));

module.exports = router;
