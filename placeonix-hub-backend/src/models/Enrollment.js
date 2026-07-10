/*
 * Placeonix Hub — Enrollment model.
 * Links a student to a course and batch; tracks module progress, fee ledger and
 * overall status.
 */
const mongoose = require('mongoose');
const { ENROLLMENT_STATUS } = require('../config/constants');

const enrollmentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },

    enrollmentDate: { type: Date, default: Date.now },
    completionDate: Date,

    status: {
      type: String,
      enum: Object.values(ENROLLMENT_STATUS),
      default: ENROLLMENT_STATUS.ENROLLED,
      index: true,
    },

    progress: {
      overall: { type: Number, default: 0, min: 0, max: 100 },
      moduleProgress: [
        {
          moduleId: { type: mongoose.Schema.Types.ObjectId },
          completedTopics: [mongoose.Schema.Types.ObjectId],
          progress: { type: Number, default: 0, min: 0, max: 100 },
          lastAccessed: Date,
        },
      ],
    },

    fee: {
      total: { type: Number, required: true },
      paid: { type: Number, default: 0 },
      due: { type: Number, default: 0 },
      payments: [
        {
          amount: Number,
          method: { type: String, enum: ['cash', 'upi', 'card', 'bank_transfer'] },
          transactionId: String,
          paidOn: { type: Date, default: Date.now },
          notes: String,
        },
      ],
    },

    certificateIssued: { type: Boolean, default: false },
    certificateUrl: String,

    finalScore: Number,
    grade: String,

    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      submittedAt: Date,
    },

    notes: String,
  },
  { timestamps: true }
);

enrollmentSchema.index({ student: 1, batch: 1 }, { unique: true });
enrollmentSchema.index({ status: 1, batch: 1 });

/** Virtual: whether the full course fee has been paid. */
enrollmentSchema.virtual('isPaidFull').get(function () {
  return this.fee.paid >= this.fee.total;
});

module.exports = mongoose.model('Enrollment', enrollmentSchema);
