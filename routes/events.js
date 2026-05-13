const express = require('express');
const ROUTER = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { addClient, removeClient } = require('../utils/sse');

// GET /api/events?token=<jwt>
// EventSource doesn't support custom headers so we take the token via query param instead
ROUTER.get('/', async (REQ, RES) => {
  const TOKEN = REQ.query.token;
  if (!TOKEN) return RES.status(401).end();

  let USER;
  try {
    const DECODED = jwt.verify(TOKEN, process.env.JWT_SECRET);
    USER = await User.findById(DECODED.id).select('_id isActive');
    if (!USER || !USER.isActive) return RES.status(401).end();
  } catch {
    return RES.status(401).end();
  }

  // set up the SSE headers and flush so the connection stays open
  RES.setHeader('Content-Type', 'text/event-stream');
  RES.setHeader('Cache-Control', 'no-cache');
  RES.setHeader('Connection', 'keep-alive');
  RES.flushHeaders();

  RES.write('event: connected\ndata: {}\n\n');

  const USERid = USER._id.toString();
  addClient(USERid, RES);

  // ping every 25s so proxies don't kill the connection
  const PING = setInterval(() => RES.write(': ping\n\n'), 25000);

  REQ.on('close', () => {
    clearInterval(PING);
    removeClient(USERid, RES);
  });
});

module.exports = ROUTER;
