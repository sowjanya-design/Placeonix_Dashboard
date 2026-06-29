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
