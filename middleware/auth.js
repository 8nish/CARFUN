const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ── Verify JWT and attach user to request ─────────────────────────────────
const protect = async (req, res, next) => {
  let token;

  // Accept token from Authorization header: "Bearer <token>"
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorised — no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    if (!req.user.isActive) {
      return res.status(401).json({ message: 'Account has been deactivated' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid or expired' });
  }
};

// ── Optional auth — attaches user if token present, doesn't fail if not ──
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (_) {
      // ignore invalid token — proceed as unauthenticated
    }
  }

  next();
};

// ── Restrict to drivers ───────────────────────────────────────────────────
const driverOnly = (req, res, next) => {
  if (req.user.role === 'passenger') {
    return res.status(403).json({ message: 'Only drivers can perform this action' });
  }
  next();
};

// ── Restrict to admins ────────────────────────────────────────────────────
const adminOnly = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// ── Helper: sign a token ──────────────────────────────────────────────────
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

module.exports = { protect, optionalAuth, driverOnly, adminOnly, signToken };
