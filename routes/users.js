const express = require('express');
const ROUTER = express.Router();
const User = require('../models/User');
const Ride = require('../models/Ride');
const { PROTECT, ADMINonly } = require('../middleware/auth');

// GET /api/users/profile — get own profile
ROUTER.get('/profile', PROTECT, (REQ, RES) => {
  RES.json({ user: REQ.user });
});

// PUT /api/users/profile — update own profile
ROUTER.put('/profile', PROTECT, async (REQ, RES) => {
  try {
    const ALLOWEDfields = [
      'firstName', 'lastName', 'area', 'commuteDays',
      'departureTime', 'returnTime', 'carRegistration',
      'carModel', 'seatsAvailable', 'role', 'profilePicture',
    ];

    const UPDATES = {};
    ALLOWEDfields.forEach((FIELD) => {
      if (REQ.body[FIELD] !== undefined) UPDATES[FIELD] = REQ.body[FIELD];
    });

    const USER = await User.findByIdAndUpdate(
      REQ.user._id,
      { $set: UPDATES },
      { new: true, runValidators: true }
    );

    RES.json({ message: 'Profile updated', user: USER });
  } catch (ERR) {
    if (ERR.name === 'ValidationError') {
      return RES.status(400).json({ message: Object.values(ERR.errors)[0].message });
    }
    RES.status(500).json({ message: 'Failed to update profile' });
  }
});

// PUT /api/users/password — change password
ROUTER.put('/password', PROTECT, async (REQ, RES) => {
  try {
    const { currentPassword: CURRENTpassword, newPassword: NEWpassword } = REQ.body;

    // need +password since it's excluded from queries by default
    const USER = await User.findById(REQ.user._id).select('+password');

    if (!(await USER.comparePassword(CURRENTpassword))) {
      return RES.status(400).json({ message: 'Current password is incorrect' });
    }

    if (NEWpassword.length < 6) {
      return RES.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    USER.password = NEWpassword;
    await USER.save();

    RES.json({ message: 'Password updated successfully' });
  } catch (ERR) {
    RES.status(500).json({ message: 'Failed to update password' });
  }
});

// GET /api/users/matches — find students near you with an overlapping schedule
// dhovie maybe add a score/sort here so closer matches show up first -Danish
ROUTER.get('/matches', PROTECT, async (REQ, RES) => {
  try {
    const CURRENTuser = REQ.user;

    // same area, overlapping commute days, active accounts, complementary role
    const MATCHES = await User.find({
      _id: { $ne: CURRENTuser._id },
      area: CURRENTuser.area,
      commuteDays: { $in: CURRENTuser.commuteDays },
      isActive: true,
      role: { $in: CURRENTuser.role === 'passenger' ? ['driver', 'both'] : ['passenger', 'both'] },
    })
      .select('firstName lastName area commuteDays departureTime role rating ratingCount carModel seatsAvailable')
      .limit(20);

    RES.json({ matches: MATCHES, count: MATCHES.length });
  } catch (ERR) {
    RES.status(500).json({ message: 'Failed to find matches' });
  }
});

// GET /api/users/my-rides — get rides for the current user (as driver or passenger)
ROUTER.get('/my-rides', PROTECT, async (REQ, RES) => {
  try {
    const [DRIVERrides, PASSENGERrides] = await Promise.all([
      // rides I'm driving
      Ride.find({ driver: REQ.user._id })
        .populate('requests.passenger', 'firstName lastName area')
        .sort({ date: -1 })
        .limit(20),

      // rides I've requested
      Ride.find({ 'requests.passenger': REQ.user._id })
        .populate('driver', 'firstName lastName area rating carModel')
        .sort({ date: -1 })
        .limit(20),
    ]);

    RES.json({ driverRides: DRIVERrides, passengerRides: PASSENGERrides });
  } catch (ERR) {
    RES.status(500).json({ message: 'Failed to fetch your rides' });
  }
});

// POST /api/users/:id/rate — rate a driver after a completed ride
ROUTER.post('/:id/rate', PROTECT, async (REQ, RES) => {
  try {
    const { rating: RATING } = REQ.body;

    if (!RATING || RATING < 1 || RATING > 5) {
      return RES.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    if (REQ.params.id === REQ.user._id.toString()) {
      return RES.status(400).json({ message: 'You cannot rate yourself' });
    }

    const USERtorate = await User.findById(REQ.params.id);
    if (!USERtorate) return RES.status(404).json({ message: 'User not found' });

    USERtorate.addRating(RATING);
    await USERtorate.save();

    RES.json({ message: 'Rating submitted', newRating: USERtorate.rating });
  } catch (ERR) {
    RES.status(500).json({ message: 'Failed to submit rating' });
  }
});

// GET /api/users/drivers — list all available drivers
ROUTER.get('/drivers', PROTECT, async (REQ, RES) => {
  try {
    const { area: AREA } = REQ.query;
    const FILTER = { role: { $in: ['driver', 'both'] }, isActive: true };
    if (AREA) FILTER.area = AREA;

    const DRIVERS = await User.find(FILTER)
      .select('firstName lastName area commuteDays departureTime rating ratingCount carModel seatsAvailable')
      .sort({ rating: -1 });

    RES.json({ drivers: DRIVERS, count: DRIVERS.length });
  } catch (ERR) {
    RES.status(500).json({ message: 'Failed to fetch drivers' });
  }
});

// GET /api/users/all — list all users (admin only)
ROUTER.get('/all', PROTECT, ADMINonly, async (REQ, RES) => {
  try {
    const USERS = await User.find({})
      .select('firstName lastName email role area isActive isAdmin createdAt')
      .sort({ createdAt: -1 });
    RES.json({ users: USERS, count: USERS.length });
  } catch (ERR) {
    RES.status(500).json({ message: 'Failed to fetch users' });
  }
});

// DELETE /api/users/:id — delete a user and their rides (admin only)
ROUTER.delete('/:id', PROTECT, ADMINonly, async (REQ, RES) => {
  try {
    if (REQ.params.id === REQ.user._id.toString()) {
      return RES.status(400).json({ message: 'Cannot delete your own account' });
    }
    const USER = await User.findByIdAndDelete(REQ.params.id);
    if (!USER) return RES.status(404).json({ message: 'User not found' });
    await Ride.deleteMany({ driver: REQ.params.id });
    RES.json({ message: 'User deleted' });
  } catch (ERR) {
    RES.status(500).json({ message: 'Failed to delete user' });
  }
});

module.exports = ROUTER;
