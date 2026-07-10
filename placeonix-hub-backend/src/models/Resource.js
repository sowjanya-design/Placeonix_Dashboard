/*
 * Placeonix Hub — Resource model.
 * A shared learning resource (link/video/document) with its course/category and a
 * download counter.
 */
const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: String,
    type: {
      type: String,
      enum: ['pdf', 'video', 'link', 'archive', 'document', 'image', 'other'],
      required: true,
    },
    fileUrl: String,
    externalUrl: String,
    fileSize: Number, // bytes
    fileName: String,
    mimeType: String,

    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', index: true },
    module: { type: mongoose.Schema.Types.ObjectId },
    topic: { type: mongoose.Schema.Types.ObjectId },

    tags: [String],
    accessLevel: {
      type: String,
      enum: ['public', 'enrolled', 'mentor-only', 'admin-only'],
      default: 'enrolled',
    },

    downloads: { type: Number, default: 0 },
    views: { type: Number, default: 0 },

    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

resourceSchema.index({ course: 1, type: 1 });
resourceSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Resource', resourceSchema);
