/*
 * Placeonix Hub — Analytics routes (/api/v1/analytics).
 * Admin-only read endpoints: overview, monthly enrollments, distribution, placements, revenue.
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.get('/overview', ctrl.overview);
router.get('/enrollments/monthly', ctrl.monthlyEnrollments);
router.get('/courses/distribution', ctrl.courseDistribution);
router.get('/placements', ctrl.placementStats);
router.get('/revenue', ctrl.revenue);

module.exports = router;
