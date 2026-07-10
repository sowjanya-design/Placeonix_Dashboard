/*
 * Placeonix Hub — Assignment routes (/api/v1/assignments).
 * Assignment CRUD, student submit, and mentor review of submissions.
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/assignmentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', ctrl.listAssignments);
router.get('/:id', ctrl.getAssignment);

router.post('/', authorize('mentor', 'admin'), ctrl.createAssignment);
router.patch('/:id', authorize('mentor', 'admin'), ctrl.updateAssignment);
router.delete('/:id', authorize('mentor', 'admin'), ctrl.deleteAssignment);

router.post('/:id/submit', authorize('student'), ctrl.submitAssignment);
router.post(
  '/:id/submissions/:submissionId/review',
  authorize('mentor', 'admin'),
  ctrl.reviewSubmission
);

module.exports = router;
