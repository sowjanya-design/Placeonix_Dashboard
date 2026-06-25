const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/me/summary', authorize('student'), ctrl.mySummary);
router.post('/me/pay', authorize('student'), ctrl.payMyFees);
router.get('/', ctrl.listPayments);
router.get('/:id', ctrl.getPayment);

router.post('/', authorize('admin'), ctrl.recordPayment);
router.patch('/:id', authorize('admin'), ctrl.updatePayment);
router.post('/:id/refund', authorize('admin'), ctrl.refundPayment);

module.exports = router;
