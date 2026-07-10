/*
 * Placeonix Hub — Company controller.
 * CRUD for the reusable employer database that placement drives link to.
 */
const Company = require('../models/Company');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc   List companies
// @route  GET /api/v1/companies
/** List employer companies in the database. */
exports.listCompanies = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const filter = {};
  if (search) filter.name = new RegExp(search, 'i');
  const companies = await Company.find(filter).sort('name');
  return ApiResponse.success(res, 200, 'Companies fetched', companies);
});

// @desc   Create company
// @route  POST /api/v1/companies
/** Add an employer company. */
exports.createCompany = asyncHandler(async (req, res, next) => {
  const existing = await Company.findOne({ name: req.body.name });
  if (existing) return next(new AppError('A company with this name already exists', 409));
  const company = await Company.create({ ...req.body, createdBy: req.user._id });
  return ApiResponse.created(res, 'Company added', { company });
});

// @desc   Update company
// @route  PATCH /api/v1/companies/:id
/** Update an employer company. */
exports.updateCompany = asyncHandler(async (req, res, next) => {
  const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!company) return next(new AppError('Company not found', 404));
  return ApiResponse.success(res, 200, 'Company updated', { company });
});

// @desc   Delete company
// @route  DELETE /api/v1/companies/:id
/** Delete an employer company. */
exports.deleteCompany = asyncHandler(async (req, res, next) => {
  const company = await Company.findByIdAndDelete(req.params.id);
  if (!company) return next(new AppError('Company not found', 404));
  return ApiResponse.success(res, 200, 'Company removed');
});
