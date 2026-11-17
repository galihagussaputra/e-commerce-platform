const express = require('express');
const paymentController = require('../controllers/payment.controller');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
router.post('/webhook', express.raw({ type: 'application/json', limit: '2mb' }), asyncHandler(paymentController.webhook));

module.exports = router;
