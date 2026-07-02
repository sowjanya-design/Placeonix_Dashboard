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

  // Require a resume on the student's profile so it can be shared with the recruiter.
  const User = require('../models/User');
  const me = await User.findById(req.user._id).select('studentProfile');
  if (!me || !me.studentProfile || !me.studentProfile.resume) {
    return next(new AppError('Please add your resume link in your Profile before applying', 400));
  }

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

  const prevStatus = app.status;
  const note = req.body.note;
  Object.assign(app, req.body);

  // Record stage transitions in the application's history.
  if (req.body.status && req.body.status !== prevStatus) {
    app.history = app.history || [];
    app.history.push({ stage: req.body.status, at: new Date(), by: req.user._id, note: note || '' });
    if (req.body.status === 'placed') app.placedAt = new Date();
  }

  await drive.save();
  return ApiResponse.success(res, 200, 'Application updated', { application: app });
});

// @desc   Placement analytics (funnel, rate, packages, by-course)
// @route  GET /api/v1/placements/analytics
exports.placementAnalytics = asyncHandler(async (req, res) => {
  const Enrollment = require('../models/Enrollment');
  const drives = await PlacementDrive.find();
  const enrollments = await Enrollment.find().populate('course', 'title');

  const studentCourse = {};
  enrollments.forEach((e) => {
    const sid = String(e.student);
    if (!studentCourse[sid] && e.course) studentCourse[sid] = e.course.title;
  });

  const funnel = { applied: 0, shortlisted: 0, interview_scheduled: 0, offered: 0, placed: 0, rejected: 0 };
  let totalApps = 0;
  let placed = 0;
  let sumCtc = 0;
  let ctcCount = 0;
  let highest = 0;
  const byCourse = {};

  drives.forEach((d) => {
    (d.applications || []).forEach((a) => {
      totalApps += 1;
      if (funnel[a.status] != null) funnel[a.status] += 1;
      if (a.status === 'placed') {
        placed += 1;
        const ctc = (a.finalOffer && a.finalOffer.ctc) || (d.package && d.package.max) || 0;
        if (ctc) {
          sumCtc += ctc;
          ctcCount += 1;
          if (ctc > highest) highest = ctc;
        }
        const course = studentCourse[String(a.student)] || 'Other';
        byCourse[course] = byCourse[course] || { placed: 0 };
        byCourse[course].placed += 1;
      }
    });
  });

  return ApiResponse.success(res, 200, 'Placement analytics', {
    funnel,
    totalDrives: drives.length,
    openDrives: drives.filter((d) => d.status === 'open').length,
    totalApplications: totalApps,
    placed,
    placementRate: totalApps ? Math.round((placed / totalApps) * 100) : 0,
    avgPackage: ctcCount ? Math.round(sumCtc / ctcCount) : 0,
    highestPackage: highest,
    byCourse: Object.keys(byCourse).map((k) => ({ course: k, placed: byCourse[k].placed })),
  });
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
