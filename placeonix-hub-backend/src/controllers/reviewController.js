const Review = require('../models/Review');
const User = require('../models/User');
const Course = require('../models/Course');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc   List reviews for a target
// @route  GET /api/v1/reviews?targetType=mentor&target=<id>
exports.listReviews = asyncHandler(async (req, res) => {
  const { targetType, target, rating, page = 1, limit = 20 } = req.query;
  const filter = { isApproved: true };
  if (targetType) filter.targetType = targetType;
  if (target) filter.target = target;
  if (rating) filter.rating = Number(rating);

  const total = await Review.countDocuments(filter);
  const reviews = await Review.find(filter)
    .populate('student', 'firstName lastName avatar')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  // Anonymize if requested
  const data = reviews.map((r) => {
    if (r.isAnonymous) {
      const obj = r.toObject();
      obj.student = { firstName: 'Anonymous', lastName: 'Student' };
      return obj;
    }
    return r;
  });

  return ApiResponse.paginated(res, 'Reviews fetched', data, page, limit, total);
});

// @desc   Create review
// @route  POST /api/v1/reviews
exports.createReview = asyncHandler(async (req, res, next) => {
  const { targetType, target } = req.body;

  const existing = await Review.findOne({
    student: req.user._id,
    targetType,
    target,
  });
  if (existing) return next(new AppError('You already reviewed this', 409));

  const review = await Review.create({ ...req.body, student: req.user._id });

  // Update aggregate rating
  await updateTargetRating(targetType, target);

  return ApiResponse.created(res, 'Review submitted', { review });
});

// @desc   Update review
// @route  PATCH /api/v1/reviews/:id
exports.updateReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findOne({ _id: req.params.id, student: req.user._id });
  if (!review) return next(new AppError('Review not found', 404));

  Object.assign(review, req.body);
  await review.save();

  await updateTargetRating(review.targetType, review.target);

  return ApiResponse.success(res, 200, 'Review updated', { review });
});

// @desc   Delete review
// @route  DELETE /api/v1/reviews/:id
exports.deleteReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findOne({ _id: req.params.id });
  if (!review) return next(new AppError('Review not found', 404));

  // Owner or admin
  if (req.user.role !== 'admin' && String(review.student) !== String(req.user._id)) {
    return next(new AppError('Not authorized', 403));
  }

  await review.deleteOne();
  await updateTargetRating(review.targetType, review.target);

  return ApiResponse.success(res, 200, 'Review deleted');
});

// @desc   Mark review helpful
// @route  POST /api/v1/reviews/:id/helpful
exports.markHelpful = asyncHandler(async (req, res, next) => {
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { $inc: { helpful: 1 } },
    { new: true }
  );
  if (!review) return next(new AppError('Review not found', 404));
  return ApiResponse.success(res, 200, 'Marked helpful', { helpful: review.helpful });
});

// @desc   Mentor/admin response to review
// @route  POST /api/v1/reviews/:id/respond
exports.respondToReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) return next(new AppError('Review not found', 404));

  // Only target user (mentor) or admin can respond
  if (req.user.role !== 'admin' && String(review.target) !== String(req.user._id)) {
    return next(new AppError('Not authorized to respond', 403));
  }

  review.response = {
    text: req.body.text,
    respondedBy: req.user._id,
    respondedAt: new Date(),
  };
  await review.save();
  return ApiResponse.success(res, 200, 'Response added', { review });
});

// ── Helper: recalculate aggregate rating ──
async function updateTargetRating(targetType, targetId) {
  const stats = await Review.aggregate([
    { $match: { targetType, target: targetId, isApproved: true } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  const data = stats[0] || { avgRating: 0, count: 0 };

  if (targetType === 'mentor') {
    await User.findByIdAndUpdate(targetId, {
      'mentorProfile.rating': Math.round(data.avgRating * 10) / 10,
      'mentorProfile.totalReviews': data.count,
    });
  } else if (targetType === 'course') {
    await Course.findByIdAndUpdate(targetId, {
      rating: Math.round(data.avgRating * 10) / 10,
      reviewCount: data.count,
    });
  }
}
