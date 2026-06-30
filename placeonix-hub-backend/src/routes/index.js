const express = require('express');
const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/courses', require('./courseRoutes'));
router.use('/batches', require('./batchRoutes'));
router.use('/sessions', require('./sessionRoutes'));
router.use('/assignments', require('./assignmentRoutes'));
router.use('/attendance', require('./attendanceRoutes'));
router.use('/placements', require('./placementRoutes'));
router.use('/announcements', require('./announcementRoutes'));
router.use('/notifications', require('./notificationRoutes'));
router.use('/leads', require('./leadRoutes'));
router.use('/reviews', require('./reviewRoutes'));
router.use('/resources', require('./resourceRoutes'));
router.use('/join-requests', require('./joinRequestRoutes'));
router.use('/payments', require('./paymentRoutes'));
router.use('/certificates', require('./certificateRoutes'));
router.use('/uploads', require('./uploadRoutes'));
router.use('/analytics', require('./analyticsRoutes'));
router.use('/search', require('./searchRoutes'));
router.use('/companies', require('./companyRoutes'));
router.use('/mock-interviews', require('./mockInterviewRoutes'));
router.use('/alumni', require('./alumniRoutes'));
router.use('/office-hours', require('./officeHourRoutes'));

router.get('/', (req, res) => {
  res.json({
    success: true,
    name: 'Placeonix API',
    version: 'v1',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      courses: '/api/v1/courses',
      batches: '/api/v1/batches',
      sessions: '/api/v1/sessions',
      assignments: '/api/v1/assignments',
      attendance: '/api/v1/attendance',
      placements: '/api/v1/placements',
      announcements: '/api/v1/announcements',
      notifications: '/api/v1/notifications',
      leads: '/api/v1/leads',
      reviews: '/api/v1/reviews',
      resources: '/api/v1/resources',
      payments: '/api/v1/payments',
      certificates: '/api/v1/certificates',
      uploads: '/api/v1/uploads',
      analytics: '/api/v1/analytics',
    },
  });
});

module.exports = router;
