const mongoose = require('mongoose');

const mockInterviewSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    interviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // mentor/admin
    title: { type: String, required: true, trim: true },
    role: String, // target role, e.g. "Full Stack Developer"
    company: String, // optional target company
    type: { type: String, enum: ['technical', 'hr', 'aptitude', 'group-discussion', 'system-design'], default: 'technical' },
    scheduledAt: { type: Date, required: true },
    mode: { type: String, enum: ['online', 'offline'], default: 'online' },
    meetingLink: String,
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled', index: true },
    rounds: [
      {
        name: String, // e.g. "DSA", "Project deep-dive"
        score: { type: Number, min: 0, max: 100 },
        feedback: String,
      },
    ],
    overallScore: { type: Number, min: 0, max: 100 }, // 0-100
    strengths: String,
    improvements: String,
    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

mockInterviewSchema.index({ student: 1, scheduledAt: -1 });

module.exports = mongoose.model('MockInterview', mockInterviewSchema);
