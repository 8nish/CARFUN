const mongoose = require('mongoose');

const RideRequestSchema = new mongoose.Schema({
  passenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled'],
    default: 'pending',
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  message: {
    type: String,
    maxlength: 200,
    default: '',
  },
  pickupLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
});

const RideSchema = new mongoose.Schema(
  {
    // ── Driver ────────────────────────────────────────────────────────────────
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Driver is required'],
    },

    // ── Route ─────────────────────────────────────────────────────────────────
    fromArea: {
      type: String,
      required: [true, 'Pickup area is required'],
    },
    fromAddress: {
      type: String,
      trim: true,
      default: '',
    },
    toAddress: {
      type: String,
      default: 'BathSpa Academic Centre, RAK',
    },

    // ── Timing ────────────────────────────────────────────────────────────────
    departureTime: {
      type: String, // "HH:MM"
      required: [true, 'Departure time is required'],
    },
    returnTime: {
      type: String,
      default: null,
    },
    date: {
      type: Date,
      required: [true, 'Ride date is required'],
    },
    recurring: {
      type: Boolean,
      default: false,
    },
    recurringDays: {
      type: [String],
      enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      default: [],
    },

    // ── Seats ─────────────────────────────────────────────────────────────────
    seatsTotal: {
      type: Number,
      required: true,
      min: 1,
      max: 7,
    },
    seatsBooked: {
      type: Number,
      default: 0,
    },

    // ── Pricing ───────────────────────────────────────────────────────────────
    costContribution: {
      type: Number, // £ per passenger
      default: 0,
      min: 0,
    },

    // ── Requests ──────────────────────────────────────────────────────────────
    requests: [RideRequestSchema],

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['active', 'full', 'cancelled', 'completed'],
      default: 'active',
    },

    // ── Notes ─────────────────────────────────────────────────────────────────
    notes: {
      type: String,
      maxlength: 300,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
RideSchema.index({ date: 1, status: 1 });
RideSchema.index({ fromArea: 1, date: 1 });
RideSchema.index({ driver: 1 });

// ── Virtual: seats remaining ──────────────────────────────────────────────
RideSchema.virtual('seatsRemaining').get(function () {
  return this.seatsTotal - this.seatsBooked;
});

// ── Virtual: is full ─────────────────────────────────────────────────────
RideSchema.virtual('isFull').get(function () {
  return this.seatsBooked >= this.seatsTotal;
});

// ── Pre-save: auto-update status when full ────────────────────────────────
RideSchema.pre('save', function (next) {
  if (this.seatsBooked >= this.seatsTotal && this.status === 'active') {
    this.status = 'full';
  }
  if (this.seatsBooked < this.seatsTotal && this.status === 'full') {
    this.status = 'active';
  }
  next();
});

RideSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Ride', RideSchema);
