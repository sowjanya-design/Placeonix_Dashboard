const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Enrollment = require('../models/Enrollment');
const Batch = require('../models/Batch');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { ATTENDANCE } = require('../config/constants');

const VALID_STATUSES = Object.values(ATTENDANCE); // ['present','absent','late','excused']

// @desc   Mark attendance for a batch on a date (mentor/admin)
// @route  POST /api/v1/attendance/mark
// @body   { batchId, date, sessionTitle, records: [{studentId, status, notes}] }
exports.markAttendance = asyncHandler(async (req, res, next) => {
  const { batchId, date, sessionTitle, records } = req.body;

  // ── Validation ──
  if (!batchId) return next(new AppError('batchId is required', 400));
  if (!mongoose.isValidObjectId(batchId)) return next(new AppError('Invalid batchId', 400));
  if (!date) return next(new AppError('date is required (YYYY-MM-DD or ISO format)', 400));

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return next(new AppError('Invalid date format. Use YYYY-MM-DD or ISO format', 400));
  }
  // Normalise to start of day so duplicates are detected correctly
  parsedDate.setHours(0, 0, 0, 0);

  if (!Array.isArray(records) || records.length === 0) {
    return next(new AppError('records must be a non-empty array', 400));
  }

  // Validate each record
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r.studentId) return next(new AppError(`records[${i}].studentId is required`, 400));
    if (!mongoose.isValidObjectId(r.studentId)) {
      return next(new AppError(`records[${i}].studentId is not a valid id`, 400));
    }
    if (!r.status) return next(new AppError(`records[${i}].status is required`, 400));
    if (!VALID_STATUSES.includes(r.status)) {
      return next(
        new AppError(
          `records[${i}].status must be one of: ${VALID_STATUSES.join(', ')}`,
          400
        )
      );
    }
  }

  // ── Verify batch + permissions ──
  const batch = await Batch.findById(batchId);
  if (!batch) return next(new AppError('Batch not found', 404));

  if (req.user.role === 'mentor' && String(batch.mentor) !== String(req.user._id)) {
    return next(new AppError('Not authorised for this batch', 403));
  }

  // ── Verify all students are enrolled in this batch ──
  const enrolledStudents = await Enrollment.find({ batch: batchId }).distinct('student');
  const enrolledIds = enrolledStudents.map(String);

  const invalidStudents = records
    .map((r) => String(r.studentId))
    .filter((id) => !enrolledIds.includes(id));

  if (invalidStudents.length > 0) {
    return next(
      new AppError(
        `Students not enrolled in this batch: ${invalidStudents.join(', ')}`,
        400
      )
    );
  }

  // ── Build bulk ops ──
  const ops = records.map((r) => ({
    updateOne: {
      filter: {
        student: new mongoose.Types.ObjectId(r.studentId),
        batch: new mongoose.Types.ObjectId(batchId),
        date: parsedDate,
      },
      update: {
        $set: {
          status: r.status,
          sessionTitle: sessionTitle || undefined,
          notes: r.notes || undefined,
          markedBy: req.user._id,
        },
        $setOnInsert: {
          student: new mongoose.Types.ObjectId(r.studentId),
          batch: new mongoose.Types.ObjectId(batchId),
          date: parsedDate,
        },
      },
      upsert: true,
    },
  }));

  let result;
  try {
    result = await Attendance.bulkWrite(ops, { ordered: false });
  } catch (err) {
    return next(new AppError(`Bulk write failed: ${err.message}`, 500));
  }

  return ApiResponse.success(res, 200, 'Attendance marked', {
    marked: records.length,
    inserted: result.upsertedCount || 0,
    updated: result.modifiedCount || 0,
    matched: result.matchedCount || 0,
  });
});

// @desc   Get attendance for batch
// @route  GET /api/v1/attendance/batch/:batchId
exports.getBatchAttendance = asyncHandler(async (req, res, next) => {
  const { batchId } = req.params;
  if (!mongoose.isValidObjectId(batchId)) return next(new AppError('Invalid batchId', 400));

  const { from, to, date } = req.query;
  const filter = { batch: batchId };

  if (date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    filter.date = { $gte: d, $lt: next };
  } else if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const records = await Attendance.find(filter)
    .populate('student', 'firstName lastName email avatar studentProfile.enrollmentId')
    .populate('markedBy', 'firstName lastName')
    .sort('-date');

  return ApiResponse.success(res, 200, 'Attendance fetched', {
    records,
    count: records.length,
  });
});

// @desc   Get my attendance (student)
// @route  GET /api/v1/attendance/me
exports.myAttendance = asyncHandler(async (req, res) => {
  const { from, to, batchId } = req.query;
  const filter = { student: req.user._id };
  if (batchId) filter.batch = batchId;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const records = await Attendance.find(filter)
    .populate('batch', 'name code')
    .sort('-date');

  const summary = records.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      acc.total += 1;
      return acc;
    },
    { present: 0, absent: 0, late: 0, excused: 0, total: 0 }
  );
  summary.percentage =
    summary.total > 0
      ? Math.round(((summary.present + summary.late) / summary.total) * 100)
      : 0;

  return ApiResponse.success(res, 200, 'Attendance fetched', { records, summary });
});

// @desc   Get attendance for a specific student
// @route  GET /api/v1/attendance/student/:studentId
exports.getStudentAttendance = asyncHandler(async (req, res, next) => {
  const { studentId } = req.params;
  if (!mongoose.isValidObjectId(studentId)) return next(new AppError('Invalid studentId', 400));

  const records = await Attendance.find({ student: studentId })
    .populate('batch', 'name code')
    .sort('-date');

  const summary = records.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      acc.total += 1;
      return acc;
    },
    { present: 0, absent: 0, late: 0, excused: 0, total: 0 }
  );
  summary.percentage =
    summary.total > 0
      ? Math.round(((summary.present + summary.late) / summary.total) * 100)
      : 0;

  return ApiResponse.success(res, 200, 'Attendance fetched', { records, summary });
});
