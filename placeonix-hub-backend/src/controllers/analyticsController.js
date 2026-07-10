/*
 * Placeonix Hub — Analytics controller.
 * Read-only aggregate reports for the admin dashboard: KPI overview, monthly
 * enrollments, course distribution, placement stats and revenue.
 */
const User = require('../models/User');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const Enrollment = require('../models/Enrollment');
const PlacementDrive = require('../models/PlacementDrive');
const Lead = require('../models/Lead');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc   Admin dashboard overview
// @route  GET /api/v1/analytics/overview
/** Institute-wide KPI overview — students, mentors, courses, batches, enrollments, placements and new leads. */
exports.overview = asyncHandler(async (req, res) => {
  const [
    totalStudents, activeStudents, totalMentors,
    totalCourses, publishedCourses,
    activeBatches, totalEnrollments, completedEnrollments,
    placedCount, openDrives, newLeads,
  ] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'student', status: 'active' }),
    User.countDocuments({ role: 'mentor' }),
    Course.countDocuments(),
    Course.countDocuments({ isPublished: true }),
    Batch.countDocuments({ status: 'active' }),
    Enrollment.countDocuments(),
    Enrollment.countDocuments({ status: 'completed' }),
    Enrollment.countDocuments({ status: 'completed', certificateIssued: true }),
    PlacementDrive.countDocuments({ status: 'open' }),
    Lead.countDocuments({ status: 'new' }),
  ]);

  const placementRate =
    completedEnrollments > 0 ? Math.round((placedCount / completedEnrollments) * 100) : 0;

  return ApiResponse.success(res, 200, 'Overview fetched', {
    students: { total: totalStudents, active: activeStudents },
    mentors: { total: totalMentors },
    courses: { total: totalCourses, published: publishedCourses },
    batches: { active: activeBatches },
    enrollments: { total: totalEnrollments, completed: completedEnrollments },
    placement: { placed: placedCount, rate: placementRate, openDrives },
    leads: { new: newLeads },
  });
});

// @desc   Monthly enrollment trends
// @route  GET /api/v1/analytics/enrollments/monthly?year=2025
/** Enrollment counts per month for the current year (feeds the dashboard bar chart). */
exports.monthlyEnrollments = asyncHandler(async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const data = await Enrollment.aggregate([
    {
      $match: {
        enrollmentDate: { $gte: new Date(`${year}-01-01`), $lt: new Date(`${year + 1}-01-01`) },
      },
    },
    {
      $group: {
        _id: { $month: '$enrollmentDate' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Fill missing months with 0
  const result = Array.from({ length: 12 }, (_, i) => {
    const found = data.find((d) => d._id === i + 1);
    return { month: i + 1, count: found ? found.count : 0 };
  });

  return ApiResponse.success(res, 200, 'Monthly enrollments', { year, data: result });
});

// @desc   Course distribution
// @route  GET /api/v1/analytics/courses/distribution
/** Enrollment share per course (feeds the distribution chart). */
exports.courseDistribution = asyncHandler(async (req, res) => {
  const data = await Enrollment.aggregate([
    { $group: { _id: '$course', count: { $sum: 1 } } },
    {
      $lookup: {
        from: 'courses',
        localField: '_id',
        foreignField: '_id',
        as: 'course',
      },
    },
    { $unwind: '$course' },
    {
      $project: {
        courseId: '$_id',
        title: '$course.title',
        category: '$course.category',
        color: '$course.color',
        count: 1,
      },
    },
    { $sort: { count: -1 } },
  ]);

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const withPercentage = data.map((d) => ({
    ...d,
    percentage: total > 0 ? Math.round((d.count / total) * 100) : 0,
  }));

  return ApiResponse.success(res, 200, 'Distribution fetched', {
    total, distribution: withPercentage,
  });
});

// @desc   Placement statistics
// @route  GET /api/v1/analytics/placements
/** Placement funnel counts plus package statistics. */
exports.placementStats = asyncHandler(async (req, res) => {
  const drives = await PlacementDrive.find({});
  let totalApplications = 0;
  let totalPlaced = 0;
  const companyStats = {};
  const packages = [];

  drives.forEach((d) => {
    d.applications.forEach((a) => {
      totalApplications += 1;
      if (a.status === 'placed') {
        totalPlaced += 1;
        companyStats[d.company] = (companyStats[d.company] || 0) + 1;
        if (a.finalOffer?.ctc) packages.push(a.finalOffer.ctc);
      }
    });
  });

  packages.sort((a, b) => a - b);
  const avgPackage = packages.length
    ? packages.reduce((s, p) => s + p, 0) / packages.length
    : 0;

  return ApiResponse.success(res, 200, 'Placement stats', {
    totalApplications,
    totalPlaced,
    placementRate:
      totalApplications > 0 ? Math.round((totalPlaced / totalApplications) * 100) : 0,
    avgPackage: Math.round(avgPackage),
    highestPackage: packages.length ? packages[packages.length - 1] : 0,
    lowestPackage: packages.length ? packages[0] : 0,
    byCompany: Object.entries(companyStats)
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count),
  });
});

// @desc   Revenue analytics
// @route  GET /api/v1/analytics/revenue
/** Revenue summary — collected, outstanding due and total committed. */
exports.revenue = asyncHandler(async (req, res) => {
  const data = await Enrollment.aggregate([
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$fee.paid' },
        totalDue: { $sum: '$fee.due' },
        totalCommitted: { $sum: '$fee.total' },
      },
    },
  ]);

  const monthly = await Enrollment.aggregate([
    { $unwind: '$fee.payments' },
    {
      $group: {
        _id: {
          year: { $year: '$fee.payments.paidOn' },
          month: { $month: '$fee.payments.paidOn' },
        },
        amount: { $sum: '$fee.payments.amount' },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: 12 },
  ]);

  return ApiResponse.success(res, 200, 'Revenue stats', {
    summary: data[0] || { totalRevenue: 0, totalDue: 0, totalCommitted: 0 },
    monthly,
  });
});
