const mongoose = require('mongoose');
const { ASSIGNMENT_STATUS } = require('../config/constants');

const submissionSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    submittedAt: { type: Date, default: Date.now },
    content: String, // text submission
    files: [{ filename: String, url: String, size: Number }],
    githubLink: String,
    status: {
      type: String,
      enum: ['submitted', 'late', 'reviewed', 'returned'],
      default: 'submitted',
    },
    score: { type: Number, min: 0 },
    grade: String,
    mentorFeedback: String,
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true },
    instructions: String,

    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    module: { type: mongoose.Schema.Types.ObjectId },

    dueDate: { type: Date, required: true, index: true },
    maxScore: { type: Number, default: 100 },

    type: {
      type: String,
      enum: ['homework', 'project', 'quiz', 'mini-project', 'capstone'],
      default: 'homework',
    },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },

    attachments: [{ filename: String, url: String }],
    referenceLinks: [String],

    status: {
      type: String,
      enum: Object.values(ASSIGNMENT_STATUS),
      default: ASSIGNMENT_STATUS.PUBLISHED,
    },

    submissions: [submissionSchema],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

assignmentSchema.index({ batch: 1, dueDate: 1 });
assignmentSchema.index({ course: 1, status: 1 });

assignmentSchema.virtual('submissionCount').get(function () {
  return this.submissions?.length || 0;
});

assignmentSchema.virtual('isOverdue').get(function () {
  return this.dueDate < new Date();
});

module.exports = mongoose.model('Assignment', assignmentSchema);
