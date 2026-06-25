const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, USER_STATUS } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: [true, 'First name is required'], trim: true, maxlength: 50 },
    lastName: { type: String, required: [true, 'Last name is required'], trim: true, maxlength: 50 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    phone: { type: String, trim: true, match: [/^[+]?[\d\s-()]{8,20}$/, 'Invalid phone number'] },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.STUDENT, index: true },
    status: { type: String, enum: Object.values(USER_STATUS), default: USER_STATUS.ACTIVE, index: true },
    avatar: { type: String, default: null },

    // Common fields
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    bio: { type: String, maxlength: 500 },

    // Student-specific
    studentProfile: {
      enrollmentId: { type: String, sparse: true, unique: true },
      degree: String,
      college: String,
      graduationYear: Number,
      skills: [String],
      resume: String,
      linkedIn: String,
      github: String,
      portfolio: String,
    },

    // Mentor-specific
    mentorProfile: {
      specialization: [String],
      experience: Number, // years
      qualifications: [String],
      hourlyRate: Number,
      rating: { type: Number, default: 0, min: 0, max: 5 },
      totalReviews: { type: Number, default: 0 },
      availableSlots: [{ day: String, from: String, to: String }],
    },

    // Auth
    emailVerified: { type: Boolean, default: false },
    emailVerifyToken: String,
    passwordResetToken: String,
    passwordResetExpiry: Date,
    refreshToken: { type: String, select: false },
    lastLogin: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.index({ email: 1, role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ 'studentProfile.enrollmentId': 1 });

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('isLocked').get(function () {
  return this.lockUntil && this.lockUntil > Date.now();
});

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Auto-generate a UNIQUE enrollment ID for students.
// Uses the highest existing PLX{year}#### + 1 and then probes for the next free
// slot, so it never collides after a student has been deleted (count-based IDs did).
userSchema.pre('save', async function (next) {
  if (this.isNew && this.role === 'student' && !this.studentProfile?.enrollmentId) {
    const Model = mongoose.model('User');
    const year = new Date().getFullYear();
    const prefix = `PLX${year}`;
    this.studentProfile = this.studentProfile || {};

    const last = await Model.findOne({ 'studentProfile.enrollmentId': new RegExp('^' + prefix) })
      .sort({ 'studentProfile.enrollmentId': -1 })
      .select('studentProfile.enrollmentId')
      .lean();

    let n = 1;
    if (last && last.studentProfile && last.studentProfile.enrollmentId) {
      const parsed = parseInt(last.studentProfile.enrollmentId.slice(prefix.length), 10);
      if (!Number.isNaN(parsed)) n = parsed + 1;
    }

    // Probe forward until we find an unused ID (guards against gaps/races).
    let candidate;
    // eslint-disable-next-line no-await-in-loop
    do {
      candidate = `${prefix}${String(n).padStart(4, '0')}`;
      n += 1;
    } while (await Model.exists({ 'studentProfile.enrollmentId': candidate }));

    this.studentProfile.enrollmentId = candidate;
  }
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.incrementLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil = undefined;
  } else {
    this.loginAttempts += 1;
    if (this.loginAttempts >= 5) {
      this.lockUntil = Date.now() + 30 * 60 * 1000; // 30 min lock
    }
  }
  await this.save();
};

userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  this.lastLogin = new Date();
  await this.save();
};

module.exports = mongoose.model('User', userSchema);
