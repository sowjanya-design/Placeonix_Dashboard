/*
 * Placeonix Hub — Error-handling middleware.
 * The central Express error handler: normalises known errors (Mongoose cast /
 * duplicate-key / validation, JWT errors) into clean AppError responses, with
 * verbose output in dev and safe output in production.
 */
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/** Turn a Mongoose bad-ObjectId cast into a clean 400. */
const handleCastError = (err) =>
  new AppError(`Invalid ${err.path}: ${err.value}`, 400);

/** Turn a Mongo duplicate-key (E11000) error into a clean 409. */
const handleDuplicateKey = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  return new AppError(`Duplicate value for '${field}': ${value}`, 409);
};

/** Turn a Mongoose validation error into a clean 400 with field messages. */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((e) => ({
    field: e.path,
    message: e.message,
  }));
  return new AppError('Validation failed', 400, errors);
};

/** Map an invalid-JWT error to a 401. */
const handleJWTError = () => new AppError('Invalid authentication token', 401);
/** Map an expired-JWT error to a 401. */
const handleJWTExpired = () => new AppError('Authentication token expired', 401);

/** Verbose error response (stack + details) for development. */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    success: false,
    status: err.status,
    message: err.message,
    errors: err.errors,
    stack: err.stack,
    error: err,
  });
};

/** Safe error response for production — leaks nothing on unexpected errors. */
const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      errors: err.errors,
    });
  }
  logger.error('PROGRAMMING ERROR:', err);
  return res.status(500).json({
    success: false,
    status: 'error',
    message: 'Something went wrong on our end',
  });
};

/** Central Express error handler: classify the error, then send a dev/prod response. */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  logger.error(`${req.method} ${req.originalUrl} -> ${err.statusCode}: ${err.message}`);

  if (process.env.NODE_ENV === 'production') {
    let error = { ...err, message: err.message, name: err.name };
    if (error.name === 'CastError') error = handleCastError(error);
    if (error.code === 11000) error = handleDuplicateKey(error);
    if (error.name === 'ValidationError') error = handleValidationError(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpired();
    sendErrorProd(error, res);
  } else {
    sendErrorDev(err, res);
  }
};

const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

module.exports = { errorHandler, notFound };
