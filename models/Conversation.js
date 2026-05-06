const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:   { type: String, required: true, maxlength: 500, trim: true },
  sentAt: { type: Date, default: Date.now },
});

const ConversationSchema = new mongoose.Schema(
  {
    ride:      { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
    driver:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    passenger: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    messages:  [MessageSchema],
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ConversationSchema.index({ ride: 1, passenger: 1 }, { unique: true });
ConversationSchema.index({ driver: 1 });
ConversationSchema.index({ passenger: 1 });

module.exports = mongoose.model('Conversation', ConversationSchema);
