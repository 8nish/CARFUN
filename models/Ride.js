const mongoose = require('mongoose');

// schema for a single ride request from a passenger
const RIDErequestschema = new mongoose.Schema({
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

const RIDEschema = new mongoose.Schema(
  {
    // who's driving
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Driver is required'],
    },

    // where from and where to
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

    // timing stuff
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

    // seat counts
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

    // cost per passenger in £
    costContribution: {
      type: Number,
      default: 0,
      min: 0,
    },

    // all the requests for this ride
    requests: [RIDErequestschema],

    // ride status — dhovie make sure cancelled rides don't show up in search results -Danish
    status: {
      type: String,
      enum: ['active', 'full', 'cancelled', 'completed'],
      default: 'active',
    },

    // optional notes from the driver
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

// indexes for the queries we run the most
RIDEschema.index({ date: 1, status: 1 });
RIDEschema.index({ fromArea: 1, date: 1 });
RIDEschema.index({ driver: 1 });

// how many seats are still open
RIDEschema.virtual('seatsRemaining').get(function () {
  return this.seatsTotal - this.seatsBooked;
});

// quick boolean for checking if the ride is full
RIDEschema.virtual('isFull').get(function () {
  return this.seatsBooked >= this.seatsTotal;
});

// auto-flips the status between active and full based on seat count
RIDEschema.pre('save', function (NEXT) {
  if (this.seatsBooked >= this.seatsTotal && this.status === 'active') {
    this.status = 'full';
  }
  if (this.seatsBooked < this.seatsTotal && this.status === 'full') {
    this.status = 'active';
  }
  NEXT();
});

RIDEschema.set('toJSON', {
  virtuals: true,
  transform: (DOC, RET) => {
    delete RET.__v;
    return RET;
  },
});

module.exports = mongoose.model('Ride', RIDEschema);
