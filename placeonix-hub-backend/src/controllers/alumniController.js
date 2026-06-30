const Alumni = require('../models/Alumni');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc   List alumni (everyone)
// @route  GET /api/v1/alumni
exports.listAlumni = asyncHandler(async (req, res) => {
  const { search, featured } = req.query;
  const filter = {};
  if (featured === 'true') filter.featured = true;
  if (search) {
    const rx = new RegExp(search, 'i');
    filter.$or = [{ name: rx }, { company: rx }, { role: rx }, { course: rx }];
  }
  const alumni = await Alumni.find(filter).sort('-featured -placedYear -createdAt');
  return ApiResponse.success(res, 200, 'Alumni fetched', alumni);
});

// @desc   Add alumnus (admin)
// @route  POST /api/v1/alumni
exports.createAlumni = asyncHandler(async (req, res) => {
  const alumnus = await Alumni.create({ ...req.body, createdBy: req.user._id });
  return ApiResponse.created(res, 'Alumni added', { alumnus });
});

// @desc   Update alumnus (admin)
// @route  PATCH /api/v1/alumni/:id
exports.updateAlumni = asyncHandler(async (req, res, next) => {
  const alumnus = await Alumni.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!alumnus) return next(new AppError('Alumni not found', 404));
  return ApiResponse.success(res, 200, 'Alumni updated', { alumnus });
});

// @desc   Delete alumnus (admin)
// @route  DELETE /api/v1/alumni/:id
exports.deleteAlumni = asyncHandler(async (req, res, next) => {
  const alumnus = await Alumni.findByIdAndDelete(req.params.id);
  if (!alumnus) return next(new AppError('Alumni not found', 404));
  return ApiResponse.success(res, 200, 'Alumni removed');
});
