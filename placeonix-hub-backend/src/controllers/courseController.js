/*
 * Placeonix Hub — Course controller.
 * CRUD for courses and their nested modules/topics, plus publish toggling.
 */
const Course = require('../models/Course');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc   List courses (public)
// @route  GET /api/v1/courses
/** List courses (supports filters such as isPublished/category). */
exports.listCourses = asyncHandler(async (req, res) => {
  const {
    category, level, isPublished, isFeatured, search,
    page = 1, limit = 20, sort = '-createdAt',
  } = req.query;

  const filter = {};
  if (category) filter.category = category;
  if (level) filter.level = level;
  if (isPublished !== undefined) filter.isPublished = isPublished === 'true';
  if (isFeatured !== undefined) filter.isFeatured = isFeatured === 'true';
  if (search) filter.$text = { $search: search };

  // Public: only show published courses
  if (!req.user || req.user.role === 'student') {
    filter.isPublished = true;
  }

  const total = await Course.countDocuments(filter);
  const courses = await Course.find(filter)
    .populate('instructor', 'firstName lastName avatar')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(Number(limit));

  return ApiResponse.paginated(res, 'Courses fetched', courses, page, limit, total);
});

// @desc   Get course by id or slug
// @route  GET /api/v1/courses/:id
/** Get one course with its modules and topics. */
exports.getCourse = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);

  const query = isObjectId ? { _id: id } : { slug: id };
  const course = await Course.findOne(query)
    .populate('instructor', 'firstName lastName avatar mentorProfile')
    .populate('coInstructors', 'firstName lastName avatar');

  if (!course) return next(new AppError('Course not found', 404));
  return ApiResponse.success(res, 200, 'Course fetched', { course });
});

// @desc   Create course (admin)
// @route  POST /api/v1/courses
/** Create a course. */
exports.createCourse = asyncHandler(async (req, res) => {
  const course = await Course.create({
    ...req.body,
    createdBy: req.user._id,
  });
  return ApiResponse.created(res, 'Course created', { course });
});

// @desc   Update course (admin)
// @route  PATCH /api/v1/courses/:id
/** Update a course. */
exports.updateCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedBy: req.user._id },
    { new: true, runValidators: true }
  );
  if (!course) return next(new AppError('Course not found', 404));
  return ApiResponse.success(res, 200, 'Course updated', { course });
});

// @desc   Delete course (admin)
// @route  DELETE /api/v1/courses/:id
/** Delete a course. */
exports.deleteCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findByIdAndDelete(req.params.id);
  if (!course) return next(new AppError('Course not found', 404));
  return ApiResponse.success(res, 200, 'Course deleted');
});

// ─── MODULE management ───

// @desc   Add module to course
// @route  POST /api/v1/courses/:id/modules
/** Add a module to a course. */
exports.addModule = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) return next(new AppError('Course not found', 404));

  const newModule = {
    ...req.body,
    order: req.body.order || course.modules.length + 1,
  };

  course.modules.push(newModule);
  course.updatedBy = req.user._id;
  await course.save();

  return ApiResponse.created(res, 'Module added', { course });
});

// @desc   Update module
// @route  PATCH /api/v1/courses/:id/modules/:moduleId
/** Update a course module. */
exports.updateModule = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) return next(new AppError('Course not found', 404));

  const mod = course.modules.id(req.params.moduleId);
  if (!mod) return next(new AppError('Module not found', 404));

  Object.assign(mod, req.body);
  course.updatedBy = req.user._id;
  await course.save();

  return ApiResponse.success(res, 200, 'Module updated', { course });
});

// @desc   Delete module
// @route  DELETE /api/v1/courses/:id/modules/:moduleId
/** Delete a course module. */
exports.deleteModule = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) return next(new AppError('Course not found', 404));

  course.modules.pull({ _id: req.params.moduleId });
  course.updatedBy = req.user._id;
  await course.save();

  return ApiResponse.success(res, 200, 'Module deleted', { course });
});

// @desc   Reorder modules
// @route  PATCH /api/v1/courses/:id/modules/reorder
/** Reorder a course's modules. */
exports.reorderModules = asyncHandler(async (req, res, next) => {
  const { order } = req.body; // array of moduleIds in new order
  const course = await Course.findById(req.params.id);
  if (!course) return next(new AppError('Course not found', 404));

  order.forEach((modId, idx) => {
    const m = course.modules.id(modId);
    if (m) m.order = idx + 1;
  });
  course.modules.sort((a, b) => a.order - b.order);
  await course.save();

  return ApiResponse.success(res, 200, 'Modules reordered', { course });
});

// ─── TOPIC management ───

// @desc   Add topic to module
// @route  POST /api/v1/courses/:id/modules/:moduleId/topics
/** Add a topic to a module. */
exports.addTopic = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) return next(new AppError('Course not found', 404));

  const mod = course.modules.id(req.params.moduleId);
  if (!mod) return next(new AppError('Module not found', 404));

  mod.topics.push(req.body);
  course.updatedBy = req.user._id;
  await course.save();

  return ApiResponse.created(res, 'Topic added', { course });
});

// @desc   Update topic
// @route  PATCH /api/v1/courses/:id/modules/:moduleId/topics/:topicId
/** Update a topic. */
exports.updateTopic = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) return next(new AppError('Course not found', 404));

  const mod = course.modules.id(req.params.moduleId);
  if (!mod) return next(new AppError('Module not found', 404));

  const topic = mod.topics.id(req.params.topicId);
  if (!topic) return next(new AppError('Topic not found', 404));

  Object.assign(topic, req.body);
  await course.save();

  return ApiResponse.success(res, 200, 'Topic updated', { course });
});

// @desc   Delete topic
// @route  DELETE /api/v1/courses/:id/modules/:moduleId/topics/:topicId
/** Delete a topic. */
exports.deleteTopic = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) return next(new AppError('Course not found', 404));

  const mod = course.modules.id(req.params.moduleId);
  if (!mod) return next(new AppError('Module not found', 404));

  mod.topics.pull({ _id: req.params.topicId });
  await course.save();

  return ApiResponse.success(res, 200, 'Topic deleted', { course });
});

// @desc   Toggle publish status
// @route  PATCH /api/v1/courses/:id/publish
/** Publish or unpublish a course. */
exports.togglePublish = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) return next(new AppError('Course not found', 404));

  course.isPublished = !course.isPublished;
  course.updatedBy = req.user._id;
  await course.save();

  return ApiResponse.success(
    res, 200,
    `Course ${course.isPublished ? 'published' : 'unpublished'}`,
    { course }
  );
});
