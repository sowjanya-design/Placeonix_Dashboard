/*
 * Placeonix Hub — Mock-interview routes (/api/v1/mock-interviews).
 * Schedule mock interviews and record feedback.
 */
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/mockInterviewController');

router.use(protect);

router.get('/', ctrl.listMocks);
router.post('/', authorize('admin', 'mentor'), ctrl.createMock);
router.patch('/:id', authorize('admin', 'mentor'), ctrl.updateMock);
router.delete('/:id', authorize('admin', 'mentor'), ctrl.deleteMock);

module.exports = router;
