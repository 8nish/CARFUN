const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { addClient, removeClient } = require('../utils/sse');

// GET /api/events?token=<jwt>
// EventSource doesn't support custom headers so we accept token via query param
router.get('/', async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).end();

  let user;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    user = await User.findById(decoded.id).select('_id isActive');
    if (!user || !user.isActive) return res.status(401).end();
  } catch {
    return res.status(401).end();
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write('event: connected\ndata: {}\n\n');

  const userId = user._id.toString();
  addClient(userId, res);

  // Keep-alive ping every 25s to prevent proxy timeouts
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);

  req.on('close', () => {
    clearInterval(ping);
    removeClient(userId, res);
  });
});

module.exports = router;
