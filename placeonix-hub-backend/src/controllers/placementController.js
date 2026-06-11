const PlacementDrive = require('../models/PlacementDrive');
const Enrollment = require('../models/Enrollment');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc   List placement drives
// @route  GET /api/v1/placements
exports.listDrives = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;

  // Students only see open drives they're eligible for
  if (req.user.role === 'student') {
    filter.status = 'open';
    const enrollments = await Enrollment.find({ student: req.user._id }).select('course batch');
    const courseIds = enrollments.map((e) => e.course);
    filter.$or = [
      { eligibleCourses: { $in: courseIds } },
      { eligibleCourses: { $size: 0 } },
    ];
  }

  const total = await PlacementDrive.countDocuments(filter);
  const drives = await PlacementDrive.find(filter)
    .populate('eligibleCourses', 'title')
    .sort('-applicationDeadline')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  return ApiResponse.paginated(res, 'Drives fetched', drives, page, limit, total);
});

// @desc   Get drive
// @route  GET /api/v1/placements/:id
exports.getDrive = asyncHandler(async (req, res, next) => {
  const drive = await PlacementDrive.findById(req.params.id)
    .populate('eligibleCourses')
    .populate('applications.student', 'firstName lastName email avatar studentProfile');
  if (!drive) return next(new AppError('Drive not found', 404));
  return ApiResponse.success(res, 200, 'Drive fetched', { drive });
});

// @desc   Create drive (admin)
// @route  POST /api/v1/placements
exports.createDrive = asyncHandler(async (req, res) => {
  const drive = await PlacementDrive.create({ ...req.body, createdBy: req.user._id });
  return ApiResponse.created(res, 'Drive created', { drive });
});

// @desc   Update drive
// @route  PATCH /api/v1/placements/:id
exports.updateDrive = asyncHandler(async (req, res, next) => {
  const drive = await PlacementDrive.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!drive) return next(new AppError('Drive not found', 404));
  return ApiResponse.success(res, 200, 'Drive updated', { drive });
});

// @desc   Delete drive
// @route  DELETE /api/v1/placements/:id
exports.deleteDrive = asyncHandler(async (req, res, next) => {
  const drive = await PlacementDrive.findByIdAndDelete(req.params.id);
  if (!drive) return next(new AppError('Drive not found', 404));
  return ApiResponse.success(res, 200, 'Drive deleted');
});

// @desc   Apply to drive (student)
// @route  POST /api/v1/placements/:id/apply
exports.applyToDrive = asyncHandler(async (req, res, next) => {
  const drive = await PlacementDrive.findById(req.params.id);
  if (!drive) return next(new AppError('Drive not found', 404));

  if (drive.status !== 'open') return next(new AppError('Drive is not accepting applications', 400));
  if (drive.applicationDeadline < new Date())
    return next(new AppError('Application deadline has passed', 400));

  const existing = drive.applications.find((a) => String(a.student) === String(req.user._id));
  if (existing) return next(new AppError('Already applied', 409));

  drive.applications.push({ student: req.user._id, appliedAt: new Date() });
  await drive.save();

  return ApiResponse.success(res, 200, 'Application submitted', {
    application: drive.applications[drive.applications.length - 1],
  });
});

// @desc   Update application status (admin)
// @route  PATCH /api/v1/placements/:id/applications/:appId
exports.updateApplication = asyncHandler(async (req, res, next) => {
  const drive = await PlacementDrive.findById(req.params.id);
  if (!drive) return next(new AppError('Drive not found', 404));

  const app = drive.applications.id(req.params.appId);
  if (!app) return next(new AppError('Application not found', 404));

  Object.assign(app, req.body);
  await drive.save();

  return ApiResponse.success(res, 200, 'Application updated', { application: app });
});

// @desc   My applications (student)
// @route  GET /api/v1/placements/my/applications
exports.myApplications = asyncHandler(async (req, res) => {
  const drives = await PlacementDrive.find({
    'applications.student': req.user._id,
  });

  const myApps = drives.map((d) => {
    const myApp = d.applications.find((a) => String(a.student) === String(req.user._id));
    return {
      drive: {
        _id: d._id, company: d.company, role: d.role,
        package: d.package, location: d.location, applicationDeadline: d.applicationDeadline,
      },
      application: myApp,
    };
  });

  return ApiResponse.success(res, 200, 'Applications fetched', { applications: myApps });
});
