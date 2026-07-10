/*
 * Placeonix Hub — Session model.
 * A live class: batch, instructor, schedule, mode, meeting link, status and
 * recording URL.
 */
const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: String,

    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    module: { type: mongoose.Schema.Types.ObjectId },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    duration: Number, // minutes — auto-calculated

    mode: { type: String, enum: ['online', 'offline', 'hybrid'], default: 'offline' },
    venue: String,
    meetingLink: String,
    meetingPassword: String,
    recordingUrl: String,

    status: {
      type: String,
      enum: ['scheduled', 'live', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled',
      index: true,
    },

    agenda: [String],
    materials: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Resource' }],

    attendanceTaken: { type: Boolean, default: false },

    notes: String, // mentor's session notes after class
    homework: String,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

sessionSchema.index({ batch: 1, startTime: 1 });

/** Before save: compute the session duration in minutes from start/end times. */
sessionSchema.pre('save', function (next) {
  if (this.startTime && this.endTime) {
    this.duration = Math.round((this.endTime - this.startTime) / 60000);
  }
  next();
});

/** Virtual: whether the session is scheduled in the future. */
sessionSchema.virtual('isUpcoming').get(function () {
  return this.startTime > new Date();
});

/** Virtual: whether the session is happening right now. */
sessionSchema.virtual('isLive').get(function () {
  const now = new Date();
  return now >= this.startTime && now <= this.endTime;
});

module.exports = mongoose.model('Session', sessionSchema);
