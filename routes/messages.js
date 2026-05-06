const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const { protect } = require('../middleware/auth');
const { sendEvent } = require('../utils/sse');

// ── GET /api/messages ─────────────────────────────────────────────────────
// All conversations for the current user
router.get('/', protect, async (req, res) => {
  try {
    const uid = req.user._id;
    const convos = await Conversation.find({ $or: [{ driver: uid }, { passenger: uid }] })
      .populate('ride', 'fromArea date departureTime')
      .populate('driver', 'firstName lastName')
      .populate('passenger', 'firstName lastName')
      .sort({ lastMessageAt: -1 });

    res.json({ conversations: convos });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
});

// ── GET /api/messages/:id ─────────────────────────────────────────────────
// Single conversation with all messages
router.get('/:id', protect, async (req, res) => {
  try {
    const convo = await Conversation.findById(req.params.id)
      .populate('ride', 'fromArea date departureTime')
      .populate('driver', 'firstName lastName')
      .populate('passenger', 'firstName lastName');

    if (!convo) return res.status(404).json({ message: 'Conversation not found' });

    const uid = req.user._id.toString();
    if (convo.driver._id.toString() !== uid && convo.passenger._id.toString() !== uid) {
      return res.status(403).json({ message: 'Not authorised' });
    }

    res.json({ conversation: convo });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch conversation' });
  }
});

// ── POST /api/messages/:id ────────────────────────────────────────────────
// Send a message in a conversation
router.post('/:id', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Message cannot be empty' });

    const convo = await Conversation.findById(req.params.id);
    if (!convo) return res.status(404).json({ message: 'Conversation not found' });

    const uid = req.user._id.toString();
    if (convo.driver.toString() !== uid && convo.passenger.toString() !== uid) {
      return res.status(403).json({ message: 'Not authorised' });
    }

    convo.messages.push({ sender: req.user._id, text: text.trim() });
    convo.lastMessageAt = new Date();
    await convo.save();

    const newMsg = convo.messages[convo.messages.length - 1];

    const recipientId = convo.driver.toString() === req.user._id.toString()
      ? convo.passenger.toString()
      : convo.driver.toString();
    sendEvent(recipientId, 'new-message', { convoId: convo._id.toString() });

    res.json({ message: newMsg });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send message' });
  }
});

module.exports = router;
