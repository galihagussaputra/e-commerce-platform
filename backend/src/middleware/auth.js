const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const config = require('../config');

const protect = async (req, _res, next) => {
  try {
    const authorization = req.headers.authorization || '';
    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required');
    }
    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      throw new AppError(401, 'INVALID_TOKEN', 'The supplied token is invalid or expired');
    }
    const user = await User.findById(payload.id).select('-password');
    if (!user) throw new AppError(401, 'UNAUTHORIZED', 'User no longer exists');
    if ((payload.tokenVersion ?? 0) !== (user.tokenVersion || 0)) {
      throw new AppError(401, 'SESSION_INVALID', 'This session has been ended');
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', 'Authentication is required'));
  if (!roles.includes(req.user.role)) {
    return next(new AppError(403, 'FORBIDDEN', 'You do not have permission for this action'));
  }
  return next();
};

const requireAdmin = authorize('admin');

module.exports = { protect, authorize, requireAdmin };
