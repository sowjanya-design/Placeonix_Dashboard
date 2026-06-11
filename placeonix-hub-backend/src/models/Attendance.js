const mongoose = require('mongoose');
const { ATTENDANCE } = require('../config/constants');

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    date: { type: Date, required: true, index: true },

    status: {
      type: String,
      enum: Object.values(ATTENDANCE),
      required: true,
    },

    sessionTitle: String,
    checkInTime: Date,
    checkOutTime: Date,
    duration: Number, // minutes

    notes: String,
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

attendanceSchema.index({ student: 1, batch: 1, date: 1 }, { unique: true });
attendanceSchema.index({ batch: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
