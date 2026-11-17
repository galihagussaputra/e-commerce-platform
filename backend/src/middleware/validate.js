const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

const validate = (req, _res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const details = errors.array().map(({ path, msg }) => ({ field: path, message: msg }));
  return next(new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', details));
};

module.exports = { validate };
