const { body, param } = require('express-validator');

const register = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters'),
];

const login = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const profile = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
];

const password = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8, max: 128 }).withMessage('New password must be 8-128 characters'),
];

const address = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required').isLength({ max: 30 }),
  body('line1').trim().notEmpty().withMessage('Address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('postalCode').trim().notEmpty().withMessage('Postal code is required'),
  body('label').optional().trim().isLength({ max: 50 }),
  body('isDefault').optional().isBoolean(),
];

const id = [param('id').isMongoId().withMessage('Invalid id')];
const role = [body('role').isIn(['user', 'admin']).withMessage('Role must be user or admin')];

module.exports = { register, login, profile, password, address, id, role };
