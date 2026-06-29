const mongoose = require('mongoose');

const interviewQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: String,
    company: String,
    role: String,
    topic: String, // e.g. "DSA", "React", "DBMS"
    tags: [String],
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

interviewQuestionSchema.index({ question: 'text', company: 'text', role: 'text', topic: 'text' });

module.exports = mongoose.model('InterviewQuestion', interviewQuestionSchema);
