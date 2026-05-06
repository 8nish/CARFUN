const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    // ── Identity ─────────────────────────────────────────────────────────────
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Must be a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never returned in queries by default
    },
    studentId: {
      type: String,
      required: false,
      trim: true,
      uppercase: true,
      default: null,
    },

    // ── Role ──────────────────────────────────────────────────────────────────
    role: {
      type: String,
      enum: ['driver', 'passenger', 'both'],
      default: 'passenger',
    },

    // ── Location ──────────────────────────────────────────────────────────────
    area: {
      type: String,
      required: [true, 'Area is required'],
      enum: [
        'Al Nakheel',
        'Al Hamra',
        'Al Mairid',
        'Khuzam',
        'Al Qusaidat',
        'Al Rams',
        'Digdaga',
        'Julfar',
        'Al Marjan Island',
        'Wadi Shah',
        'Other (RAK area)',
      ],
    },

    // ── Schedule ──────────────────────────────────────────────────────────────
    commuteDays: {
      type: [String],
      enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      default: [],
    },
    departureTime: {
      type: String, // "HH:MM" format
      default: '08:00',
    },
    returnTime: {
      type: String,
      default: '18:00',
    },

    // ── Driver-specific ───────────────────────────────────────────────────────
    carRegistration: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    carModel: {
      type: String,
      trim: true,
      default: null,
    },
    seatsAvailable: {
      type: Number,
      min: 1,
      max: 7,
      default: null,
    },

    // ── Reputation ────────────────────────────────────────────────────────────
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },

    // ── Status ────────────────────────────────────────────────────────────────
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    profilePicture: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
UserSchema.index({ area: 1, role: 1 });
UserSchema.index({ commuteDays: 1 });

// ── Virtual: full name ─────────────────────────────────────────────────────
UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ── Virtual: initials (for avatar) ────────────────────────────────────────
UserSchema.virtual('initials').get(function () {
  return `${this.firstName[0]}${this.lastName[0]}`.toUpperCase();
});

// ── Hash password before save ─────────────────────────────────────────────
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance method: compare password ────────────────────────────────────
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Instance method: update rating ────────────────────────────────────────
UserSchema.methods.addRating = function (newRating) {
  const total = this.rating * this.ratingCount + newRating;
  this.ratingCount += 1;
  this.rating = +(total / this.ratingCount).toFixed(1);
};

// ── Remove sensitive fields from JSON output ──────────────────────────────
UserSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', UserSchema);
