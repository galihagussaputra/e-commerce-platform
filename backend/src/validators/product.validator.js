const { body, param, query } = require('express-validator');

const validImages = (images) =>
  Array.isArray(images) && images.every((url) =>
    typeof url === 'string' && url.length <= 500 && /^https?:\/\//i.test(url));

const create = [
  body('name').trim().notEmpty().isLength({ max: 150 }),
  body('description').trim().notEmpty(),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('category').isMongoId().withMessage('Valid category is required'),
  body('stock').optional().isInt({ min: 0 }),
  body('images').optional().custom(validImages).withMessage('Images must be http(s) URLs'),
  body('status').optional().isIn(['active', 'draft', 'archived']),
  body('variants').optional().isArray({ max: 20 }),
];

const update = [
  param('id').isMongoId(),
  body('name').optional().trim().notEmpty().isLength({ max: 150 }),
  body('description').optional().trim().notEmpty(),
  body('price').optional().isFloat({ min: 0 }),
  body('category').optional().isMongoId(),
  body('stock').optional().isInt({ min: 0 }),
  body('images').optional().custom(validImages).withMessage('Images must be http(s) URLs'),
  body('status').optional().isIn(['active', 'draft', 'archived']),
];

const list = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('sort').optional().isIn(['newest', 'oldest', 'price_asc', 'price_desc', 'name']),
];

const category = [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('slug').optional().trim().matches(/^[a-z0-9-]+$/),
];

const id = [param('id').isMongoId()];

module.exports = { create, update, list, category, id, validImages };
