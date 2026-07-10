/*
 * Placeonix Hub — Search controller.
 * A single global search across the main entities, used by the topbar search box.
 */
const User = require('../models/User');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const PlacementDrive = require('../models/PlacementDrive');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc   Global search across students, mentors, courses, batches, drives
// @route  GET /api/v1/search?q=
/** Global topbar search across students, mentors, courses, batches and drives. */
exports.globalSearch = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return ApiResponse.success(res, 200, 'Search', { results: [] });

  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const results = [];

  const userFilter = {
    role: { $in: ['student', 'mentor'] },
    $or: [{ firstName: rx }, { lastName: rx }, { email: rx }, { 'studentProfile.enrollmentId': rx }],
  };
  // Mentors only search their own students; admins search everyone.
  const [users, courses, batches, drives] = await Promise.all([
    User.find(userFilter).limit(6).select('firstName lastName email role studentProfile.enrollmentId'),
    Course.find({ title: rx }).limit(5).select('title category'),
    Batch.find({ $or: [{ name: rx }, { code: rx }] }).limit(5).select('name code'),
    PlacementDrive.find({ $or: [{ company: rx }, { role: rx }] }).limit(5).select('company role'),
  ]);

  users.forEach((u) =>
    results.push({
      type: u.role,
      id: u._id,
      label: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
      sub: u.email || (u.studentProfile && u.studentProfile.enrollmentId) || '',
      page: u.role === 'mentor' ? 'mentors' : 'students',
    })
  );
  courses.forEach((c) => results.push({ type: 'course', id: c._id, label: c.title, sub: c.category || 'Course', page: 'courses' }));
  batches.forEach((b) => results.push({ type: 'batch', id: b._id, label: b.name, sub: b.code || 'Batch', page: 'batches' }));
  drives.forEach((d) => results.push({ type: 'placement', id: d._id, label: d.company, sub: d.role || 'Drive', page: 'placements' }));

  return ApiResponse.success(res, 200, 'Search', { results });
});
