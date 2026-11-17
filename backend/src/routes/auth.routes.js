const express = require('express');
const authController = require('../controllers/auth.controller');
const { protect, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { authLimiter } = require('../middleware/rateLimit');
const validator = require('../validators/auth.validator');

const router = express.Router();

router.post('/register', authLimiter, validator.register, validate, asyncHandler(authController.register));
router.post('/login', authLimiter, validator.login, validate, asyncHandler(authController.login));

router.use(protect);
router.get('/me', asyncHandler(authController.me));
router.put('/profile', validator.profile, validate, asyncHandler(authController.updateProfile));
router.put('/password', validator.password, validate, asyncHandler(authController.changePassword));
router.post('/addresses', validator.address, validate, asyncHandler(authController.addAddress));
router.put('/addresses/:id', validator.address, validate, asyncHandler(authController.updateAddress));
router.delete('/addresses/:id', validator.id, validate, asyncHandler(authController.removeAddress));

router.get('/users', requireAdmin, asyncHandler(authController.listUsers));
router.put('/users/:id/role', requireAdmin, validator.role, validate, asyncHandler(authController.updateUserRole));

module.exports = router;
