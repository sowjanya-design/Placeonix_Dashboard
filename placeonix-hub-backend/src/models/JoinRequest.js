/*
 * Placeonix Hub — JoinRequest model.
 * A student's request to attend an offline class online for a date, plus the
 * mentor's approval state and shared meeting link.
 */
const mongoose = require('mongoose');

// An offline-batch student requesting to join a class online (occasionally).
const joinRequestSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    requestedDate: Date,
    reason: String,

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    meetingLink: String, // filled by mentor on approval

    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    respondedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('JoinRequest', joinRequestSchema);
