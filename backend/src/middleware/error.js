const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const config = require('../config');

const notFound = (req, _res, next) =>
  next(new AppError(404, 'NOT_FOUND', `No route handles ${req.method} ${req.originalUrl}`));

const errorHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid data', details },
    });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_ID', message: `Invalid value for ${err.path}` },
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE', message: `${field} already exists` },
    });
  }

  if (err.type === 'StripeCardError' || err.type === 'StripeInvalidRequestError') {
    return res.status(400).json({
      success: false,
      error: { code: 'PAYMENT_ERROR', message: err.message },
    });
  }

  console.error(err.stack || err);
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.nodeEnv === 'production' ? 'Internal server error' : (err.message || 'Internal server error'),
    },
  });
};

module.exports = { notFound, errorHandler };
