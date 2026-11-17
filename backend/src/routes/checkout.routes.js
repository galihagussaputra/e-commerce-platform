const express = require('express');
const checkoutController = require('../controllers/checkout.controller');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const validator = require('../validators/checkout.validator');

const router = express.Router();
router.post('/session', protect, validator.checkout, validate, asyncHandler(checkoutController.createSession));

module.exports = router;
