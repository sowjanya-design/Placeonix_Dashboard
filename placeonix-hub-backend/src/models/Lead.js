/*
 * Placeonix Hub — Lead model.
 * An admissions-CRM prospect: contact details, course interest, source, pipeline
 * status and follow-up notes.
 */
const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },

    courseInterested: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    courseInterestedName: String, // text fallback

    message: String,
    source: { type: String, enum: ['website', 'instagram', 'whatsapp', 'referral', 'walk-in'], default: 'website' },

    status: {
      type: String,
      enum: ['new', 'contacted', 'follow-up', 'converted', 'rejected', 'spam'],
      default: 'new',
      index: true,
    },

    notes: [
      {
        text: String,
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        addedAt: { type: Date, default: Date.now },
      },
    ],

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    convertedToUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    contactedAt: Date,
    convertedAt: Date,
  },
  { timestamps: true }
);

leadSchema.index({ email: 1 });
leadSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Lead', leadSchema);
