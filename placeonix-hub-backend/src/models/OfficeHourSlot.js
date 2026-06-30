const mongoose = require('mongoose');

const officeHourSlotSchema = new mongoose.Schema(
  {
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date },
    topic: String, // what this slot is for, e.g. "Doubt clearing", "Career advice"
    mode: { type: String, enum: ['online', 'offline'], default: 'online' },
    meetingLink: String,
    venue: String,
    status: { type: String, enum: ['available', 'booked', 'cancelled'], default: 'available', index: true },
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bookedAt: Date,
    studentNote: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('OfficeHourSlot', officeHourSlotSchema);
