const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/announcementController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', ctrl.listAnnouncements);
router.post('/', authorize('admin', 'mentor'), ctrl.createAnnouncement);
router.patch('/:id', authorize('admin', 'mentor'), ctrl.updateAnnouncement);
router.delete('/:id', authorize('admin'), ctrl.deleteAnnouncement);
router.post('/:id/read', ctrl.markAsRead);

module.exports = router;
