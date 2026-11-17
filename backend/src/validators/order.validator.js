const { body, param } = require('express-validator');

const id = [param('id').isMongoId()];
const status = [
  body('status').isIn(['paid', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status'),
  body('note').optional().trim().isLength({ max: 300 }),
];
const cancel = [body('reason').optional().trim().isLength({ max: 300 })];

module.exports = { id, status, cancel };
