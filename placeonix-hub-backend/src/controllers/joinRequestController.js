/*
 * Placeonix Hub — Join-request controller.
 * Students request to attend an offline class online; mentors approve/reject and
 * share a meeting link.
 */
const JoinRequest = require('../models/JoinRequest');
const Batch = require('../models/Batch');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// @desc   Student requests to join a class online
// @route  POST /api/v1/join-requests
/** Student creates a request to join an offline class online. */
exports.create = asyncHandler(async (req, res, next) => {
  const { batchId, date, reason } = req.body;
  if (!batchId) return next(new AppError('batchId is required', 400));
  const batch = await Batch.findById(batchId);
  if (!batch) return next(new AppError('Batch not found', 404));

  const request = await JoinRequest.create({
    student: req.user._id,
    batch: batch._id,
    course: batch.course,
    mentor: batch.mentor,
    requestedDate: date ? new Date(date) : undefined,
    reason,
  });
  return ApiResponse.created(res, 'Online-join request submitted', request);
});

// @desc   List join requests (role-scoped)
// @route  GET /api/v1/join-requests
/** List online-join requests (role-scoped). */
exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'mentor') filter.mentor = req.user._id;
  else if (req.user.role === 'student') filter.student = req.user._id;
  if (req.query.status) filter.status = req.query.status;

  const requests = await JoinRequest.find(filter)
    .populate('student', 'firstName lastName email')
    .populate('batch', 'name mode')
    .populate('course', 'title')
    .sort('-createdAt');
  return ApiResponse.success(res, 200, 'Join requests fetched', requests);
});

// @desc   Approve / reject a request (mentor/admin)
// @route  PATCH /api/v1/join-requests/:id
/** Approve or reject a join request (approval shares a meeting link). */
exports.update = asyncHandler(async (req, res, next) => {
  const { status, meetingLink } = req.body;
  const request = await JoinRequest.findById(req.params.id);
  if (!request) return next(new AppError('Request not found', 404));

  if (status) request.status = status;
  if (meetingLink !== undefined) request.meetingLink = meetingLink;
  request.respondedBy = req.user._id;
  request.respondedAt = new Date();
  await request.save();
  return ApiResponse.success(res, 200, 'Request updated', request);
});
