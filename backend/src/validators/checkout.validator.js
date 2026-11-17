const { body } = require('express-validator');

const checkout = [
  body('addressId').optional().isMongoId().withMessage('Invalid address id'),
  body('idempotencyKey').optional().isString().isLength({ max: 100 }),
];

module.exports = { checkout };
