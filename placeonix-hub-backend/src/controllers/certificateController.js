/*
 * Placeonix Hub — Certificate controller.
 * Issue, list, publicly verify and revoke course-completion certificates.
 */
const Certificate = require('../models/Certificate');
const Enrollment = require('../models/Enrollment');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc   List certificates
// @route  GET /api/v1/certificates
/** List certificates (role-scoped — students see only their own). */
exports.listCertificates = asyncHandler(async (req, res) => {
  const { type, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (type) filter.type = type;

  // Students see their own
  if (req.user.role === 'student') filter.student = req.user._id;

  const total = await Certificate.countDocuments(filter);
  const certificates = await Certificate.find(filter)
    .populate('student', 'firstName lastName')
    .populate('course', 'title')
    .populate('batch', 'name')
    .sort('-issuedDate')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  return ApiResponse.paginated(res, 'Certificates fetched', certificates, page, limit, total);
});

// @desc   My certificates
// @route  GET /api/v1/certificates/me
/** The current student's own certificates. */
exports.myCertificates = asyncHandler(async (req, res) => {
  const certificates = await Certificate.find({ student: req.user._id })
    .populate('course', 'title category')
    .populate('batch', 'name')
    .sort('-issuedDate');

  return ApiResponse.success(res, 200, 'My certificates', {
    certificates,
    count: certificates.length,
  });
});

// @desc   Issue certificate (admin)
// @route  POST /api/v1/certificates/issue
/** Issue a certificate for a completed enrollment. */
exports.issueCertificate = asyncHandler(async (req, res, next) => {
  const { enrollmentId, type, grade, score } = req.body;

  const enrollment = await Enrollment.findById(enrollmentId)
    .populate('student', 'firstName lastName')
    .populate('course', 'title');
  if (!enrollment) return next(new AppError('Enrollment not found', 404));

  if (enrollment.certificateIssued) {
    return next(new AppError('Certificate already issued', 409));
  }

  const cert = await Certificate.create({
    student: enrollment.student._id,
    course: enrollment.course._id,
    batch: enrollment.batch,
    enrollment: enrollment._id,
    type: type || 'completion',
    grade: grade || enrollment.grade,
    score: score || enrollment.finalScore,
    issuedBy: req.user._id,
    studentNameSnapshot: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
    courseNameSnapshot: enrollment.course.title,
  });

  // Build verification URL
  cert.verificationUrl = `${process.env.CLIENT_URL}/verify/${cert.certificateNumber}`;
  await cert.save();

  // Mark enrollment as certified
  enrollment.certificateIssued = true;
  enrollment.certificateUrl = cert.fileUrl;
  await enrollment.save();

  return ApiResponse.created(res, 'Certificate issued', { certificate: cert });
});

// @desc   Public verification by number
// @route  GET /api/v1/certificates/verify/:number
/** Publicly verify a certificate by its number. */
exports.verifyCertificate = asyncHandler(async (req, res, next) => {
  const cert = await Certificate.findOne({
    certificateNumber: req.params.number,
    isRevoked: false,
  }).populate('course', 'title category duration');

  if (!cert) {
    return ApiResponse.success(res, 200, 'Certificate not found or revoked', {
      valid: false,
    });
  }

  return ApiResponse.success(res, 200, 'Certificate verified', {
    valid: true,
    certificate: {
      number: cert.certificateNumber,
      studentName: cert.studentNameSnapshot,
      courseName: cert.courseNameSnapshot,
      type: cert.type,
      grade: cert.grade,
      issuedDate: cert.issuedDate,
      course: cert.course,
    },
  });
});

// @desc   Revoke certificate (admin)
// @route  POST /api/v1/certificates/:id/revoke
/** Revoke a previously issued certificate. */
exports.revokeCertificate = asyncHandler(async (req, res, next) => {
  const cert = await Certificate.findByIdAndUpdate(
    req.params.id,
    {
      isRevoked: true,
      revokedAt: new Date(),
      revocationReason: req.body.reason,
    },
    { new: true }
  );
  if (!cert) return next(new AppError('Certificate not found', 404));
  return ApiResponse.success(res, 200, 'Certificate revoked', { certificate: cert });
});
