const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const USERschema = new mongoose.Schema(
  {
    // basic identity stuff
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

    // driver, passenger, or both
    role: {
      type: String,
      enum: ['driver', 'passenger', 'both'],
      default: 'passenger',
    },

    // roughly where they live
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

    // what days they commute
    commuteDays: {
      type: [String],
      enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      default: [],
    },
    departureTime: {
      type: String, // "HH:MM"
      default: '08:00',
    },
    returnTime: {
      type: String,
      default: '18:00',
    },

    // driver-only fields — dhovie validate these are filled if role is 'driver' or 'both' -Danish
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

    // rating out of 5
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

    // account status flags
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
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// indexes we actually use
USERschema.index({ area: 1, role: 1 });
USERschema.index({ commuteDays: 1 });

// puts first and last name together, used a lot in the frontend
USERschema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// for the avatar placeholder when there's no profile pic
USERschema.virtual('initials').get(function () {
  return `${this.firstName[0]}${this.lastName[0]}`.toUpperCase();
});

// hash the password before saving — only runs if the password actually changed
USERschema.pre('save', async function (NEXT) {
  if (!this.isModified('password')) return NEXT();
  const SALT = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, SALT);
  NEXT();
});

// checks a plain text password against the stored hash
USERschema.methods.comparePassword = async function (CANDIDATEpassword) {
  return bcrypt.compare(CANDIDATEpassword, this.password);
};

// running average — updates the rating when a new one comes in
USERschema.methods.addRating = function (NEWrating) {
  const TOTAL = this.rating * this.ratingCount + NEWrating;
  this.ratingCount += 1;
  this.rating = +(TOTAL / this.ratingCount).toFixed(1);
};

// strip password and __v before sending anything to the client
USERschema.set('toJSON', {
  virtuals: true,
  transform: (DOC, RET) => {
    delete RET.password;
    delete RET.__v;
    return RET;
  },
});

module.exports = mongoose.model('User', USERschema);
