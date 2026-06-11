const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    enrollment: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment' },

    certificateNumber: { type: String, required: true, unique: true, index: true },
    type: {
      type: String,
      enum: ['completion', 'merit', 'internship', 'specialization'],
      default: 'completion',
    },

    issuedDate: { type: Date, default: Date.now },
    grade: String,
    score: Number,

    fileUrl: String,
    verificationUrl: String,
    qrCode: String,

    studentNameSnapshot: String, // capture at issue time
    courseNameSnapshot: String,

    isRevoked: { type: Boolean, default: false },
    revokedAt: Date,
    revocationReason: String,

    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

certificateSchema.pre('save', async function (next) {
  if (this.isNew && !this.certificateNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Certificate').countDocuments();
    this.certificateNumber = `PLX-CERT-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Certificate', certificateSchema);
