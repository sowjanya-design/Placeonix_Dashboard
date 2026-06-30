const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/overview', authorize('admin'), ctrl.attendanceOverview);
router.post('/mark', authorize('mentor', 'admin'), ctrl.markAttendance);
router.get('/me', authorize('student'), ctrl.myAttendance);
router.get('/batch/:batchId', authorize('mentor', 'admin'), ctrl.getBatchAttendance);
router.get('/student/:studentId', authorize('mentor', 'admin'), ctrl.getStudentAttendance);

module.exports = router;
