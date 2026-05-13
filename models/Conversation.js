const mongoose = require('mongoose');

// each individual message in a convo — who sent it, what they said, and when
const MESSAGEschema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:   { type: String, required: true, maxlength: 500, trim: true },
  sentAt: { type: Date, default: Date.now },
});

// ties a convo to a specific ride, one driver <-> one passenger per ride
// dhovie make sure messages are sorted by sentAt when fetching them on the frontend -Danish
const CONVERSATIONschema = new mongoose.Schema(
  {
    ride:      { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
    driver:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    passenger: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    messages:  [MESSAGEschema],
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// unique combo of ride + passenger so there's no duplicate convos
CONVERSATIONschema.index({ ride: 1, passenger: 1 }, { unique: true });
CONVERSATIONschema.index({ driver: 1 });
CONVERSATIONschema.index({ passenger: 1 });

module.exports = mongoose.model('Conversation', CONVERSATIONschema);
