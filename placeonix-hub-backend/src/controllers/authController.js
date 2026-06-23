const User = require('../models/User');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { generateTokenPair, verifyToken } = require('../utils/jwt');
const crypto = require('crypto');

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: (Number(process.env.JWT_COOKIE_EXPIRE) || 7) * 24 * 60 * 60 * 1000,
});

const sendTokens = (user, res, statusCode = 200, message = 'Success') => {
  const { accessToken, refreshToken } = generateTokenPair(user);

  user.refreshToken = refreshToken;
  user.save({ validateBeforeSave: false });

  res.cookie('accessToken', accessToken, cookieOptions());
  res.cookie('refreshToken', refreshToken, { ...cookieOptions(), path: '/api/v1/auth/refresh' });

  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.refreshToken;

  return ApiResponse.success(res, statusCode, message, {
    user: userObj,
    accessToken,
    refreshToken,
  });
};

// @desc   Register new user (public — for student self-signup; admin creates mentors/admins)
// @route  POST /api/v1/auth/register
exports.register = asyncHandler(async (req, res, next) => {
  const { email, role } = req.body;

  // Public registration is only for students
  if (role && role !== 'student') {
    return next(new AppError('Only students can self-register', 403));
  }

  const existing = await User.findOne({ email });
  if (existing) return next(new AppError('Email already registered', 409));

  const user = await User.create({ ...req.body, role: 'student' });
  return sendTokens(user, res, 201, 'Registration successful');
});

// @desc   Login
// @route  POST /api/v1/auth/login
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user) return next(new AppError('Invalid credentials', 401));

  if (user.isLocked) {
    const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
    return next(new AppError(`Account locked. Try again in ${minutesLeft} minutes`, 423));
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    await user.incrementLoginAttempts();
    return next(new AppError('Invalid credentials', 401));
  }

  if (user.status !== 'active') {
    return next(new AppError(`Account is ${user.status}`, 403));
  }

  await user.resetLoginAttempts();
  return sendTokens(user, res, 200, 'Login successful');
});

// @desc   Refresh access token
// @route  POST /api/v1/auth/refresh
exports.refreshToken = asyncHandler(async (req, res, next) => {
  const refresh = req.cookies?.refreshToken || req.body.refreshToken;
  if (!refresh) return next(new AppError('No refresh token provided', 401));

  let decoded;
  try {
    decoded = verifyToken(refresh, true);
  } catch {
    return next(new AppError('Invalid refresh token', 401));
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== refresh) {
    return next(new AppError('Invalid refresh token', 401));
  }

  return sendTokens(user, res, 200, 'Token refreshed');
});

// @desc   Logout
// @route  POST /api/v1/auth/logout
exports.logout = asyncHandler(async (req, res) => {
  if (req.user) {
    req.user.refreshToken = undefined;
    await req.user.save({ validateBeforeSave: false });
  }
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  return ApiResponse.success(res, 200, 'Logged out successfully');
});

// @desc   Current user
// @route  GET /api/v1/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, 200, 'Current user', { user: req.user });
});

// @desc   Update password
// @route  PATCH /api/v1/auth/password
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return next(new AppError('Please provide both passwords', 400));
  }
  if (newPassword.length < 8) {
    return next(new AppError('New password must be at least 8 characters', 400));
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword))) {
    return next(new AppError('Current password is incorrect', 401));
  }

  user.password = newPassword;
  await user.save();
  return sendTokens(user, res, 200, 'Password updated');
});

// @desc   Forgot password — generates reset token
// @route  POST /api/v1/auth/forgot-password
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return ApiResponse.success(res, 200, 'If that email exists, reset instructions have been sent');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetExpiry = Date.now() + 30 * 60 * 1000; // 30 min
  await user.save({ validateBeforeSave: false });

  // If SMTP is configured, email the reset link; otherwise return the token
  // in-band so the user can complete the reset in-app (until email is set up).
  const resetUrl = `${process.env.CLIENT_URL || ''}/reset-password/${resetToken}`;
  let emailed = false;
  if (process.env.SMTP_HOST && process.env.SMTP_PASS && process.env.SMTP_PASS !== 'your-app-password') {
    try {
      const { sendEmail } = require('../services/emailService');
      await sendEmail({
        to: user.email,
        subject: 'Reset your Placeonix password',
        html: `<p>Hi ${user.firstName || ''},</p><p>Reset your password using the link below (valid 30 minutes):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      });
      emailed = true;
    } catch (e) { emailed = false; }
  }

  return ApiResponse.success(res, 200, 'If that email exists, reset instructions have been sent', {
    emailed,
    resetToken: emailed ? undefined : resetToken,
  });
});

// @desc   Reset password
// @route  POST /api/v1/auth/reset-password/:token
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpiry: { $gt: Date.now() },
  });
  if (!user) return next(new AppError('Invalid or expired reset token', 400));

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpiry = undefined;
  await user.save();

  return sendTokens(user, res, 200, 'Password reset successful');
});
