const express = require('express');
const ROUTER = express.Router();
const User = require('../models/User');
const { PROTECT, SIGNtoken } = require('../middleware/auth');

// POST /api/auth/register — create a new student account
ROUTER.post('/register', async (REQ, RES) => {
  try {
    const {
      firstName: FIRSTname,
      lastName: LASTname,
      email: EMAIL,
      password: PASSWORD,
      role: ROLE,
      area: AREA,
      commuteDays: COMMUTEdays,
      departureTime: DEPARTUREtime,
      returnTime: RETURNtime,
      carRegistration: CARregistration,
      carModel: CARmodel,
      seatsAvailable: SEATSavailable,
    } = REQ.body;

    // bail early if that email's already taken
    const EXISTINGuser = await User.findOne({ email: EMAIL.toLowerCase() });
    if (EXISTINGuser) {
      return RES.status(400).json({ message: 'An account with this email already exists' });
    }

    const ADMIN_EMAILS = ['th.car.fun@gmail.com', 'admin@carfun.com'];

    const USERdata = {
      firstName: FIRSTname,
      lastName: LASTname,
      email: EMAIL,
      password: PASSWORD,
      role: ROLE || 'passenger',
      isAdmin: ADMIN_EMAILS.includes(EMAIL.toLowerCase()),
      area: AREA,
      commuteDays: COMMUTEdays || [],
      departureTime: DEPARTUREtime || '08:00',
      returnTime: RETURNtime || '18:00',
    };

    // only add car stuff if they're a driver
    if (ROLE === 'driver' || ROLE === 'both') {
      USERdata.carRegistration = CARregistration;
      USERdata.carModel = CARmodel;
      USERdata.seatsAvailable = SEATSavailable;
    }

    const USER = await User.create(USERdata);
    const TOKEN = SIGNtoken(USER._id);

    RES.status(201).json({
      message: 'Account created successfully',
      token: TOKEN,
      user: USER,
    });
  } catch (ERR) {
    // mongoose spits out a ValidationError when fields fail schema rules
    if (ERR.name === 'ValidationError') {
      const MESSAGES = Object.values(ERR.errors).map((E) => E.message);
      return RES.status(400).json({ message: MESSAGES[0], errors: MESSAGES });
    }
    console.error('Register error:', ERR);
    RES.status(500).json({ message: 'Server error during registration' });
  }
});

// POST /api/auth/login — login with email + password
ROUTER.post('/login', async (REQ, RES) => {
  try {
    const { email: EMAIL, password: PASSWORD } = REQ.body;

    if (!EMAIL || !PASSWORD) {
      return RES.status(400).json({ message: 'Email and password are required' });
    }

    // need to explicitly select password since it's excluded by default
    const USER = await User.findOne({ email: EMAIL.toLowerCase() }).select('+password');

    if (!USER || !(await USER.comparePassword(PASSWORD))) {
      return RES.status(401).json({ message: 'Invalid email or password' });
    }

    if (!USER.isActive) {
      return RES.status(401).json({ message: 'Your account has been deactivated' });
    }

    const TOKEN = SIGNtoken(USER._id);

    // strip password before sending back
    USER.password = undefined;

    RES.json({
      message: 'Login successful',
      token: TOKEN,
      user: USER,
    });
  } catch (ERR) {
    console.error('Login error:', ERR);
    RES.status(500).json({ message: 'Server error during login' });
  }
});

// GET /api/auth/me — get the currently logged-in user's profile
ROUTER.get('/me', PROTECT, (REQ, RES) => {
  RES.json({ user: REQ.user });
});

// POST /api/auth/logout — JWT is stateless so this just confirms on the server side
ROUTER.post('/logout', PROTECT, (REQ, RES) => {
  RES.json({ message: 'Logged out successfully' });
});

module.exports = ROUTER;
