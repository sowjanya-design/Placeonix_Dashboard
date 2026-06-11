const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.get('/', ctrl.listReviews); // public reads

router.use(protect);

router.post(
  '/',
  authorize('student'),
  [
    body('targetType').isIn(['mentor', 'course', 'batch', 'institute']),
    body('target').isMongoId(),
    body('rating').isInt({ min: 1, max: 5 }),
  ],
  validate,
  ctrl.createReview
);

router.patch('/:id', authorize('student'), ctrl.updateReview);
router.delete('/:id', ctrl.deleteReview);
router.post('/:id/helpful', ctrl.markHelpful);
router.post('/:id/respond', authorize('mentor', 'admin'), ctrl.respondToReview);

module.exports = router;
