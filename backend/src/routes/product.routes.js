const express = require('express');
const productController = require('../controllers/product.controller');
const { protect, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const validator = require('../validators/product.validator');

const router = express.Router();

router.get('/', validator.list, validate, asyncHandler(productController.list));
router.get('/featured', asyncHandler(productController.featured));
router.get('/categories', asyncHandler(productController.categories));
router.get('/:id', asyncHandler(productController.detail));

router.use(protect);
router.use(requireAdmin);
router.post('/', validator.create, validate, asyncHandler(productController.create));
router.put('/:id', validator.update, validate, asyncHandler(productController.update));
router.delete('/:id', validator.id, validate, asyncHandler(productController.remove));
router.post('/categories', validator.category, validate, asyncHandler(productController.createCategory));
router.put('/categories/:id', validator.category, asyncHandler(productController.updateCategory));
router.delete('/categories/:id', validator.id, validate, asyncHandler(productController.removeCategory));

module.exports = router;
