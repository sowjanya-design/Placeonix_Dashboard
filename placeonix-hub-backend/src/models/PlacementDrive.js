const mongoose = require('mongoose');
const { PLACEMENT_STATUS } = require('../config/constants');

const placementDriveSchema = new mongoose.Schema(
  {
    company: { type: String, required: true, trim: true },
    companyLogo: String,
    companyWebsite: String,

    role: { type: String, required: true },
    description: String,
    requirements: [String],
    responsibilities: [String],

    package: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
      currency: { type: String, default: 'INR' },
    },

    location: [String],
    workMode: { type: String, enum: ['onsite', 'remote', 'hybrid'], default: 'onsite' },

    vacancies: { type: Number, default: 1 },
    eligibleCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    eligibleBatches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
    minCgpa: Number,

    applicationDeadline: { type: Date, required: true },
    driveDate: Date,

    status: {
      type: String,
      enum: ['draft', 'open', 'closed', 'completed', 'cancelled'],
      default: 'open',
      index: true,
    },

    applications: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        appliedAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: Object.values(PLACEMENT_STATUS),
          default: PLACEMENT_STATUS.APPLIED,
        },
        rounds: [
          {
            name: String,
            date: Date,
            result: { type: String, enum: ['pass', 'fail', 'pending'] },
            feedback: String,
          },
        ],
        finalOffer: {
          ctc: Number,
          joiningDate: Date,
          location: String,
          offerLetterUrl: String,
        },
        notes: String,
        placedAt: Date,
        history: [
          {
            stage: String,
            at: { type: Date, default: Date.now },
            by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            note: String,
          },
        ],
      },
    ],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

placementDriveSchema.index({ status: 1, applicationDeadline: 1 });

placementDriveSchema.virtual('applicantCount').get(function () {
  return this.applications?.length || 0;
});

placementDriveSchema.virtual('placedCount').get(function () {
  return this.applications?.filter((a) => a.status === 'placed').length || 0;
});

module.exports = mongoose.model('PlacementDrive', placementDriveSchema);
