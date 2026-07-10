/*
 * Placeonix Hub — Session controller.
 * Schedule live classes and manage their lifecycle (start / complete / recording).
 */
const Session = require('../models/Session');
const Batch = require('../models/Batch');
const Enrollment = require('../models/Enrollment');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc   List sessions (filtered by user role)
// @route  GET /api/v1/sessions?from=&to=&batch=&status=
/** List sessions (role-scoped). */
exports.listSessions = asyncHandler(async (req, res) => {
  const { from, to, batch, status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (batch) filter.batch = batch;
  if (from || to) {
    filter.startTime = {};
    if (from) filter.startTime.$gte = new Date(from);
    if (to) filter.startTime.$lte = new Date(to);
  }

  // Role-based scoping
  if (req.user.role === 'mentor') {
    filter.instructor = req.user._id;
  } else if (req.user.role === 'student') {
    const enrollments = await Enrollment.find({ student: req.user._id }).select('batch');
    filter.batch = { $in: enrollments.map((e) => e.batch) };
  }

  const total = await Session.countDocuments(filter);
  const sessions = await Session.find(filter)
    .populate('batch', 'name code')
    .populate('course', 'title color')
    .populate('instructor', 'firstName lastName avatar')
    .sort('startTime')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  return ApiResponse.paginated(res, 'Sessions fetched', sessions, page, limit, total);
});

// @desc   Today's sessions
// @route  GET /api/v1/sessions/today
/** Sessions scheduled for today. */
exports.todaySessions = asyncHandler(async (req, res) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const filter = { startTime: { $gte: start, $lte: end } };

  if (req.user.role === 'mentor') filter.instructor = req.user._id;
  else if (req.user.role === 'student') {
    const enrollments = await Enrollment.find({ student: req.user._id }).select('batch');
    filter.batch = { $in: enrollments.map((e) => e.batch) };
  }

  const sessions = await Session.find(filter)
    .populate('batch course instructor', 'name title color firstName lastName')
    .sort('startTime');

  return ApiResponse.success(res, 200, "Today's sessions", {
    sessions,
    count: sessions.length,
  });
});

// @desc   Get session
// @route  GET /api/v1/sessions/:id
/** Get one session. */
exports.getSession = asyncHandler(async (req, res, next) => {
  const session = await Session.findById(req.params.id)
    .populate('batch course instructor materials');
  if (!session) return next(new AppError('Session not found', 404));
  return ApiResponse.success(res, 200, 'Session fetched', { session });
});

// @desc   Create session
// @route  POST /api/v1/sessions
/** Schedule a session. */
exports.createSession = asyncHandler(async (req, res, next) => {
  const batch = await Batch.findById(req.body.batch);
  if (!batch) return next(new AppError('Batch not found', 404));

  // Inherit course from batch
  if (!req.body.course) req.body.course = batch.course;
  // Inherit instructor (mentor) if not provided
  if (!req.body.instructor) req.body.instructor = batch.mentor;

  const session = await Session.create({
    ...req.body,
    createdBy: req.user._id,
  });

  return ApiResponse.created(res, 'Session created', { session });
});

// @desc   Update session
// @route  PATCH /api/v1/sessions/:id
/** Update a session (time, link or recording). */
exports.updateSession = asyncHandler(async (req, res, next) => {
  const session = await Session.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!session) return next(new AppError('Session not found', 404));
  return ApiResponse.success(res, 200, 'Session updated', { session });
});

// @desc   Delete / cancel session
// @route  DELETE /api/v1/sessions/:id
/** Delete a session. */
exports.deleteSession = asyncHandler(async (req, res, next) => {
  const session = await Session.findByIdAndUpdate(
    req.params.id,
    { status: 'cancelled' },
    { new: true }
  );
  if (!session) return next(new AppError('Session not found', 404));
  return ApiResponse.success(res, 200, 'Session cancelled', { session });
});

// @desc   Mark session as live
// @route  PATCH /api/v1/sessions/:id/start
/** Mark a scheduled session as live. */
exports.startSession = asyncHandler(async (req, res, next) => {
  const session = await Session.findByIdAndUpdate(
    req.params.id,
    { status: 'live' },
    { new: true }
  );
  if (!session) return next(new AppError('Session not found', 404));
  return ApiResponse.success(res, 200, 'Session started', { session });
});

// @desc   Complete session
// @route  PATCH /api/v1/sessions/:id/complete
/** Mark a live session complete. */
exports.completeSession = asyncHandler(async (req, res, next) => {
  const session = await Session.findByIdAndUpdate(
    req.params.id,
    {
      status: 'completed',
      notes: req.body.notes,
      homework: req.body.homework,
      recordingUrl: req.body.recordingUrl,
    },
    { new: true }
  );
  if (!session) return next(new AppError('Session not found', 404));
  return ApiResponse.success(res, 200, 'Session completed', { session });
});
