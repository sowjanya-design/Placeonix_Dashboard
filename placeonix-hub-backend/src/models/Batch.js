const mongoose = require('mongoose');
const { BATCH_STATUS, MAX_BATCH_SIZE } = require('../config/constants');

const batchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    coMentors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    schedule: {
      days: [{ type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }],
      startTime: String, // "09:00"
      endTime: String, // "11:00"
      timezone: { type: String, default: 'Asia/Kolkata' },
    },

    mode: { type: String, enum: ['online', 'offline', 'hybrid'], default: 'offline' },
    venue: String,
    meetingLink: String,

    capacity: {
      type: Number,
      default: MAX_BATCH_SIZE,
      max: [MAX_BATCH_SIZE, `Maximum ${MAX_BATCH_SIZE} students per batch`],
    },
    enrolledCount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: Object.values(BATCH_STATUS),
      default: BATCH_STATUS.UPCOMING,
      index: true,
    },

    description: String,
    notes: String,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

batchSchema.index({ course: 1, status: 1 });
batchSchema.index({ startDate: 1 });

batchSchema.virtual('availableSeats').get(function () {
  return Math.max(0, this.capacity - this.enrolledCount);
});

batchSchema.virtual('isFull').get(function () {
  return this.enrolledCount >= this.capacity;
});

batchSchema.pre('validate', function (next) {
  if (this.endDate <= this.startDate) {
    return next(new Error('End date must be after start date'));
  }
  next();
});

module.exports = mongoose.model('Batch', batchSchema);
