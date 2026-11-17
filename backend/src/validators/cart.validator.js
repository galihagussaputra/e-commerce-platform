const { body, param } = require('express-validator');

const productId = [param('productId').isMongoId().withMessage('Invalid product id')];
const quantity = [body('quantity').isInt({ min: 1, max: 99 }).withMessage('Quantity must be 1-99')];
const sync = [
  body('items').isArray({ max: 50 }).withMessage('Cart must contain at most 50 items'),
  body('items.*.productId').isMongoId(),
  body('items.*.quantity').isInt({ min: 1, max: 99 }),
];

module.exports = { productId, quantity, sync };
