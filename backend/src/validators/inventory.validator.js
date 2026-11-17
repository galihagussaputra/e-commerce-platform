const { body, param } = require('express-validator');

const adjust = [
  param('productId').isMongoId(),
  body('delta').isInt().custom((value) => value !== 0).withMessage('Delta must be a non-zero integer'),
  body('reason').optional().trim().isLength({ max: 200 }),
];

module.exports = { adjust };
