const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/officeHourController');

router.use(protect);

router.get('/', ctrl.listSlots);
router.post('/', authorize('mentor', 'admin'), ctrl.createSlot);
router.post('/:id/book', authorize('student'), ctrl.bookSlot);
router.post('/:id/cancel', ctrl.cancelBooking);
router.delete('/:id', authorize('mentor', 'admin'), ctrl.deleteSlot);

module.exports = router;
