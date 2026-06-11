const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'assignment_created',
        'assignment_due',
        'assignment_reviewed',
        'announcement',
        'placement_drive',
        'placement_status',
        'enrollment',
        'attendance_warning',
        'fee_reminder',
        'message',
        'certificate_issued',
        'system',
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 500 },
    icon: String, // optional emoji/icon hint
    link: String, // deep link, e.g. /dashboard/assignments/abc123
    relatedTo: {
      model: { type: String, enum: ['Assignment', 'Course', 'Batch', 'PlacementDrive', 'Announcement'] },
      id: { type: mongoose.Schema.Types.ObjectId },
    },
    priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
    isRead: { type: Boolean, default: false, index: true },
    readAt: Date,
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// Static helper to create notifications easily
notificationSchema.statics.notify = async function (data) {
  if (Array.isArray(data.recipient)) {
    const docs = data.recipient.map((r) => ({ ...data, recipient: r }));
    return this.insertMany(docs);
  }
  return this.create(data);
};

module.exports = mongoose.model('Notification', notificationSchema);
