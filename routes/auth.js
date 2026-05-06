const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, signToken } = require('../middleware/auth');

// ── POST /api/auth/register ───────────────────────────────────────────────
// Create a new student account
router.post('/register', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      role,
      area,
      commuteDays,
      departureTime,
      returnTime,
      carRegistration,
      carModel,
      seatsAvailable,
    } = req.body;

    // Check for existing email
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    // Build user object
    const ADMIN_EMAIL = 'th.car.fun@gmail.com';

    const userData = {
      firstName,
      lastName,
      email,
      password,
      role: role || 'passenger',
      isAdmin: email.toLowerCase() === ADMIN_EMAIL,
      area,
      commuteDays: commuteDays || [],
      departureTime: departureTime || '08:00',
      returnTime: returnTime || '18:00',
    };

    // Driver-specific fields
    if (role === 'driver' || role === 'both') {
      userData.carRegistration = carRegistration;
      userData.carModel = carModel;
      userData.seatsAvailable = seatsAvailable;
    }

    const user = await User.create(userData);
    const token = signToken(user._id);

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user,
    });
  } catch (err) {
    // Mongoose validation errors
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages[0], errors: messages });
    }
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────
// Login with email + password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Include password field for comparison
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Your account has been deactivated' });
    }

    const token = signToken(user._id);

    // Remove password from response
    user.password = undefined;

    res.json({
      message: 'Login successful',
      token,
      user,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────
// Get current logged-in user's profile
router.get('/me', protect, (req, res) => {
  res.json({ user: req.user });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────
// Client-side logout (just confirms — JWT is stateless)
router.post('/logout', protect, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
