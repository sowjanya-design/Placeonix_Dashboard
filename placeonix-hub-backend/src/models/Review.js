const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: {
      type: String,
      enum: ['mentor', 'course', 'batch', 'institute'],
      required: true,
      index: true,
    },
    target: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, maxlength: 100 },
    comment: { type: String, maxlength: 2000 },

    aspects: {
      teaching: { type: Number, min: 1, max: 5 },
      content: { type: Number, min: 1, max: 5 },
      support: { type: Number, min: 1, max: 5 },
      practical: { type: Number, min: 1, max: 5 },
    },

    wouldRecommend: { type: Boolean, default: true },
    isAnonymous: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: true },
    helpful: { type: Number, default: 0 },
    response: {
      text: String,
      respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      respondedAt: Date,
    },
  },
  { timestamps: true }
);

reviewSchema.index({ student: 1, targetType: 1, target: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
