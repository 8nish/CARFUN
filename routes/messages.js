const express = require('express');
const ROUTER = express.Router();
const Conversation = require('../models/Conversation');
const { PROTECT } = require('../middleware/auth');
const { sendEvent } = require('../utils/sse');

// GET /api/messages — all conversations for the current user
ROUTER.get('/', PROTECT, async (REQ, RES) => {
  try {
    const UID = REQ.user._id;
    const CONVOS = await Conversation.find({ $or: [{ driver: UID }, { passenger: UID }] })
      .populate('ride', 'fromArea date departureTime')
      .populate('driver', 'firstName lastName')
      .populate('passenger', 'firstName lastName')
      .sort({ lastMessageAt: -1 });

    RES.json({ conversations: CONVOS });
  } catch (ERR) {
    RES.status(500).json({ message: 'Failed to fetch conversations' });
  }
});

// GET /api/messages/:id — single conversation with all its messages
ROUTER.get('/:id', PROTECT, async (REQ, RES) => {
  try {
    const CONVO = await Conversation.findById(REQ.params.id)
      .populate('ride', 'fromArea date departureTime')
      .populate('driver', 'firstName lastName')
      .populate('passenger', 'firstName lastName');

    if (!CONVO) return RES.status(404).json({ message: 'Conversation not found' });

    // make sure the person requesting is actually in this conversation
    const UID = REQ.user._id.toString();
    if (CONVO.driver._id.toString() !== UID && CONVO.passenger._id.toString() !== UID) {
      return RES.status(403).json({ message: 'Not authorised' });
    }

    RES.json({ conversation: CONVO });
  } catch (ERR) {
    RES.status(500).json({ message: 'Failed to fetch conversation' });
  }
});

// POST /api/messages/:id — send a message in a conversation
ROUTER.post('/:id', PROTECT, async (REQ, RES) => {
  try {
    const { text: TEXT } = REQ.body;
    if (!TEXT?.trim()) return RES.status(400).json({ message: 'Message cannot be empty' });

    const CONVO = await Conversation.findById(REQ.params.id);
    if (!CONVO) return RES.status(404).json({ message: 'Conversation not found' });

    // verify they're part of this convo before letting them send
    const UID = REQ.user._id.toString();
    if (CONVO.driver.toString() !== UID && CONVO.passenger.toString() !== UID) {
      return RES.status(403).json({ message: 'Not authorised' });
    }

    CONVO.messages.push({ sender: REQ.user._id, text: TEXT.trim() });
    CONVO.lastMessageAt = new Date();
    await CONVO.save();

    const NEWmsg = CONVO.messages[CONVO.messages.length - 1];

    // notify the other person in the convo
    const RECIPIENTid = CONVO.driver.toString() === REQ.user._id.toString()
      ? CONVO.passenger.toString()
      : CONVO.driver.toString();
    sendEvent(RECIPIENTid, 'new-message', { convoId: CONVO._id.toString() });

    RES.json({ message: NEWmsg });
  } catch (ERR) {
    RES.status(500).json({ message: 'Failed to send message' });
  }
});

module.exports = ROUTER;
