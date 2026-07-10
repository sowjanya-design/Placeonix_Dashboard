/*
 * Placeonix Hub — Validation middleware.
 * Collects express-validator results and turns any failures into a 422 AppError so
 * route handlers only ever run on valid input.
 */
const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/** Collect express-validator results; on failure throw a 422 so handlers only see valid input. */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  
  const formatted = errors.array().map((e) => ({
    field: e.path || e.param,
    message: e.msg,
    value: e.value,
  }));
  
  return next(new AppError('Validation failed', 400, formatted));
};

module.exports = validate;
