const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc   List users (admin)
// @route  GET /api/v1/users?role=&status=&page=&limit=&search=
exports.listUsers = asyncHandler(async (req, res) => {
  const { role, status, search, page = 1, limit = 20, sort = '-createdAt' } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { firstName: new RegExp(search, 'i') },
      { lastName: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { 'studentProfile.enrollmentId': new RegExp(search, 'i') },
    ];
  }

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(Number(limit));

  return ApiResponse.paginated(res, 'Users fetched', users, page, limit, total);
});

// @desc   Get one user
// @route  GET /api/v1/users/:id
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found', 404));
  return ApiResponse.success(res, 200, 'User fetched', { user });
});

// @desc   Create user (admin only — for mentors and admins)
// @route  POST /api/v1/users
exports.createUser = asyncHandler(async (req, res, next) => {
  const existing = await User.findOne({ email: req.body.email });
  if (existing) return next(new AppError('Email already in use', 409));

  const user = await User.create({ ...req.body, createdBy: req.user._id });
  const userObj = user.toObject();
  delete userObj.password;

  return ApiResponse.created(res, 'User created successfully', { user: userObj });
});

// @desc   Update user
// @route  PATCH /api/v1/users/:id
exports.updateUser = asyncHandler(async (req, res, next) => {
  const updates = { ...req.body };
  delete updates.password; // password updates go through dedicated endpoint
  delete updates.role;     // role changes only via specific admin endpoint

  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!user) return next(new AppError('User not found', 404));
  return ApiResponse.success(res, 200, 'User updated', { user });
});

// @desc   Delete user (soft delete — sets status=inactive)
// @route  DELETE /api/v1/users/:id
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status: 'inactive' },
    { new: true }
  );
  if (!user) return next(new AppError('User not found', 404));
  return ApiResponse.success(res, 200, 'User deactivated');
});

// @desc   Change user role (admin only)
// @route  PATCH /api/v1/users/:id/role
exports.updateRole = asyncHandler(async (req, res, next) => {
  const { role } = req.body;
  if (!['admin', 'mentor', 'student'].includes(role)) {
    return next(new AppError('Invalid role', 400));
  }
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!user) return next(new AppError('User not found', 404));
  return ApiResponse.success(res, 200, `Role updated to ${role}`, { user });
});

// @desc   Get my dashboard stats (role-aware)
// @route  GET /api/v1/users/me/stats
exports.myStats = asyncHandler(async (req, res) => {
  const role = req.user.role;
  let stats = {};

  if (role === 'admin') {
    const [totalStudents, totalMentors, activeStudents] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'mentor' }),
      User.countDocuments({ role: 'student', status: 'active' }),
    ]);
    stats = { totalStudents, totalMentors, activeStudents };
  } else if (role === 'mentor') {
    const enrollments = await Enrollment.find({})
      .populate({ path: 'batch', match: { mentor: req.user._id } });
    const myStudents = enrollments.filter((e) => e.batch).length;
    stats = { myStudents };
  } else if (role === 'student') {
    const enrollments = await Enrollment.find({ student: req.user._id });
    const avgProgress =
      enrollments.reduce((s, e) => s + (e.progress?.overall || 0), 0) /
      Math.max(1, enrollments.length);
    stats = {
      enrolledCourses: enrollments.length,
      avgProgress: Math.round(avgProgress),
    };
  }

  return ApiResponse.success(res, 200, 'Stats fetched', stats);
});

// @desc   Current student's enrolled courses (with batch mode + progress)
// @route  GET /api/v1/users/me/enrollments
exports.myEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.user._id })
    .populate('course', 'title category color shortDescription description duration fee modules')
    .populate({
      path: 'batch',
      select: 'name code mode venue schedule mentor',
      populate: { path: 'mentor', select: 'firstName lastName' },
    })
    .sort('-enrollmentDate');

  return ApiResponse.success(res, 200, 'Enrollments fetched', enrollments);
});

// @desc   Enrollments for a specific student (admin/mentor) — used for recording payments
// @route  GET /api/v1/users/:id/enrollments
exports.userEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.params.id })
    .populate('course', 'title')
    .populate('batch', 'name code')
    .sort('-enrollmentDate');
  return ApiResponse.success(res, 200, 'Enrollments fetched', enrollments);
});

// @desc   Get students assigned to current mentor
// @route  GET /api/v1/users/my-students
exports.myStudents = asyncHandler(async (req, res) => {
  const Batch = require('../models/Batch');
  const myBatches = await Batch.find({ mentor: req.user._id }).select('_id');
  const batchIds = myBatches.map((b) => b._id);

  const enrollments = await Enrollment.find({ batch: { $in: batchIds } })
    .populate('student', 'firstName lastName email avatar studentProfile')
    .populate('batch', 'name code')
    .populate('course', 'title');

  return ApiResponse.success(res, 200, 'Students fetched', {
    students: enrollments,
    count: enrollments.length,
  });
});
