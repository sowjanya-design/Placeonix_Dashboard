const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Verifies JWT and attaches user to request.
 * Reads token from Authorization header or httpOnly cookie.
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return next(new AppError('Not authorized — please log in', 401));
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Session expired — please log in again', 401));
    }
    return next(new AppError('Invalid token', 401));
  }

  const user = await User.findById(decoded.id).select('-password');
  if (!user) {
    return next(new AppError('User no longer exists', 401));
  }
  if (user.status !== 'active') {
    return next(new AppError(`Account is ${user.status}`, 403));
  }

  req.user = user;
  next();
});

/**
 * Role-based access control.
 * Usage: router.get('/', protect, authorize('admin', 'mentor'), handler)
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError('Not authenticated', 401));
  if (!roles.includes(req.user.role)) {
    return next(
      new AppError(`Forbidden — role '${req.user.role}' cannot access this resource`, 403)
    );
  }
  next();
};

/**
 * Allow only the resource owner OR admin.
 * Expects req.params.userId or req.params.id to match req.user._id
 */
const ownerOrAdmin = (paramKey = 'id') => (req, res, next) => {
  const targetId = req.params[paramKey];
  if (req.user.role === 'admin') return next();
  if (String(req.user._id) === String(targetId)) return next();
  return next(new AppError('Forbidden — you can only access your own resources', 403));
};

module.exports = { protect, authorize, ownerOrAdmin };
