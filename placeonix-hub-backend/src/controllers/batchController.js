const Batch = require('../models/Batch');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { MAX_BATCH_SIZE } = require('../config/constants');

// @desc   List batches
// @route  GET /api/v1/batches
exports.listBatches = asyncHandler(async (req, res) => {
  const { status, course, mentor, page = 1, limit = 20, sort = '-startDate' } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (course) filter.course = course;
  if (mentor) filter.mentor = mentor;

  // Mentors only see their own batches
  if (req.user.role === 'mentor') filter.mentor = req.user._id;

  const total = await Batch.countDocuments(filter);
  const batches = await Batch.find(filter)
    .populate('course', 'title category color duration')
    .populate('mentor', 'firstName lastName avatar')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(Number(limit));

  return ApiResponse.paginated(res, 'Batches fetched', batches, page, limit, total);
});

// @desc   Get batch with students
// @route  GET /api/v1/batches/:id
exports.getBatch = asyncHandler(async (req, res, next) => {
  const batch = await Batch.findById(req.params.id)
    .populate('course')
    .populate('mentor', 'firstName lastName email avatar mentorProfile')
    .populate('coMentors', 'firstName lastName avatar');

  if (!batch) return next(new AppError('Batch not found', 404));

  const enrollments = await Enrollment.find({ batch: batch._id })
    .populate('student', 'firstName lastName email avatar studentProfile.enrollmentId');

  return ApiResponse.success(res, 200, 'Batch fetched', {
    batch,
    enrollments,
    studentCount: enrollments.length,
  });
});

// @desc   Create batch
// @route  POST /api/v1/batches
exports.createBatch = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.body.course);
  if (!course) return next(new AppError('Course not found', 404));

  const mentor = await User.findOne({ _id: req.body.mentor, role: 'mentor' });
  if (!mentor) return next(new AppError('Invalid mentor', 400));

  if (req.body.capacity > MAX_BATCH_SIZE) {
    return next(new AppError(`Maximum capacity is ${MAX_BATCH_SIZE}`, 400));
  }

  const batch = await Batch.create({ ...req.body, createdBy: req.user._id });
  return ApiResponse.created(res, 'Batch created', { batch });
});

// @desc   Update batch
// @route  PATCH /api/v1/batches/:id
exports.updateBatch = asyncHandler(async (req, res, next) => {
  const batch = await Batch.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedBy: req.user._id },
    { new: true, runValidators: true }
  );
  if (!batch) return next(new AppError('Batch not found', 404));
  return ApiResponse.success(res, 200, 'Batch updated', { batch });
});

// @desc   Delete batch
// @route  DELETE /api/v1/batches/:id
exports.deleteBatch = asyncHandler(async (req, res, next) => {
  const batch = await Batch.findById(req.params.id);
  if (!batch) return next(new AppError('Batch not found', 404));

  const enrollmentCount = await Enrollment.countDocuments({ batch: batch._id });
  if (enrollmentCount > 0) {
    return next(new AppError('Cannot delete batch with active enrollments', 400));
  }

  await batch.deleteOne();
  return ApiResponse.success(res, 200, 'Batch deleted');
});

// @desc   Enroll student to batch
// @route  POST /api/v1/batches/:id/enroll
exports.enrollStudent = asyncHandler(async (req, res, next) => {
  const { studentId, fee } = req.body;
  const batch = await Batch.findById(req.params.id).populate('course');
  if (!batch) return next(new AppError('Batch not found', 404));

  if (batch.enrolledCount >= batch.capacity) {
    return next(new AppError('Batch is full', 400));
  }

  const student = await User.findOne({ _id: studentId, role: 'student' });
  if (!student) return next(new AppError('Student not found', 404));

  const existing = await Enrollment.findOne({ student: studentId, batch: batch._id });
  if (existing) return next(new AppError('Already enrolled in this batch', 409));

  const totalFee = fee || batch.course.fee?.amount || 0;

  const enrollment = await Enrollment.create({
    student: studentId,
    batch: batch._id,
    course: batch.course._id,
    fee: { total: totalFee, paid: 0, due: totalFee },
  });

  batch.enrolledCount += 1;
  await batch.save();

  await Course.findByIdAndUpdate(batch.course._id, { $inc: { enrollmentCount: 1 } });

  return ApiResponse.created(res, 'Student enrolled', { enrollment });
});

// @desc   Unenroll student
// @route  DELETE /api/v1/batches/:id/enroll/:studentId
exports.unenrollStudent = asyncHandler(async (req, res, next) => {
  const enrollment = await Enrollment.findOne({
    batch: req.params.id,
    student: req.params.studentId,
  });
  if (!enrollment) return next(new AppError('Enrollment not found', 404));

  await enrollment.deleteOne();
  await Batch.findByIdAndUpdate(req.params.id, { $inc: { enrolledCount: -1 } });

  return ApiResponse.success(res, 200, 'Student unenrolled');
});
