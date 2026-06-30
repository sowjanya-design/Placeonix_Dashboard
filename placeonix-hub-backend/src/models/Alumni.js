const mongoose = require('mongoose');

const alumniSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    photo: String,
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional link to a user
    course: String, // course/program they completed
    batch: String,
    company: { type: String, required: true },
    role: String,
    packageLPA: Number,
    placedYear: Number,
    testimonial: String,
    linkedIn: String,
    featured: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alumni', alumniSchema);
