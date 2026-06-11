const mongoose = require('mongoose');
const { COURSE_LEVEL, COURSE_CATEGORY } = require('../config/constants');

const topicSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: String,
    duration: { type: Number, default: 0 }, // minutes
    resources: [
      {
        title: String,
        type: { type: String, enum: ['video', 'pdf', 'link', 'quiz'] },
        url: String,
      },
    ],
    completed: { type: Boolean, default: false },
  },
  { _id: true }
);

const moduleSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    description: String,
    duration: { type: String, default: '1 week' },
    topics: [topicSchema],
    learningOutcomes: [String],
  },
  { _id: true }
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Course title is required'], trim: true, maxlength: 120 },
    slug: { type: String, unique: true, lowercase: true, sparse: true },
    category: {
      type: String,
      required: true,
      enum: Object.values(COURSE_CATEGORY),
    },
    description: { type: String, required: true, maxlength: 2000 },
    shortDescription: { type: String, maxlength: 300 },

    duration: { type: String, required: true }, // e.g. "4 Months"
    durationWeeks: { type: Number }, // computed

    level: {
      type: String,
      enum: Object.values(COURSE_LEVEL),
      default: COURSE_LEVEL.BEGINNER,
    },

    fee: {
      amount: { type: Number, required: true, min: 0 },
      currency: { type: String, default: 'INR' },
      installments: { type: Number, default: 1, min: 1 },
    },

    color: { type: String, default: '#3d5a80' },
    thumbnail: String,
    coverImage: String,

    tags: [String],
    prerequisites: [String],
    targetAudience: [String],

    modules: [moduleSchema],

    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    coInstructors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    enrollmentCount: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },

    isPublished: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },

    seoMeta: {
      title: String,
      description: String,
      keywords: [String],
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

courseSchema.index({ category: 1, isPublished: 1 });
courseSchema.index({ slug: 1 });
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });

courseSchema.virtual('totalTopics').get(function () {
  return (this.modules || []).reduce((sum, m) => sum + (m.topics?.length || 0), 0);
});

courseSchema.virtual('totalModules').get(function () {
  return (this.modules || []).length;
});

// Auto-generate slug
courseSchema.pre('save', function (next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 80);
  }
  next();
});

// Auto-order modules
courseSchema.pre('save', function (next) {
  if (this.modules && this.modules.length > 0) {
    this.modules.forEach((mod, idx) => {
      if (!mod.order) mod.order = idx + 1;
    });
  }
  next();
});

module.exports = mongoose.model('Course', courseSchema);
