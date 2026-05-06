const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Ride = require('../models/Ride');
const { protect, adminOnly } = require('../middleware/auth');

// ── GET /api/users/profile ────────────────────────────────────────────────
// Get own profile
router.get('/profile', protect, (req, res) => {
  res.json({ user: req.user });
});

// ── PUT /api/users/profile ────────────────────────────────────────────────
// Update own profile
router.put('/profile', protect, async (req, res) => {
  try {
    const allowedFields = [
      'firstName', 'lastName', 'area', 'commuteDays',
      'departureTime', 'returnTime', 'carRegistration',
      'carModel', 'seatsAvailable', 'role', 'profilePicture',
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({ message: 'Profile updated', user });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors)[0].message });
    }
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// ── PUT /api/users/password ───────────────────────────────────────────────
// Change password
router.put('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update password' });
  }
});

// ── GET /api/users/matches ────────────────────────────────────────────────
// Find students near you with overlapping schedule
router.get('/matches', protect, async (req, res) => {
  try {
    const currentUser = req.user;

    // Find users in the same area with overlapping commute days
    const matches = await User.find({
      _id: { $ne: currentUser._id },
      area: currentUser.area,
      commuteDays: { $in: currentUser.commuteDays },
      isActive: true,
      role: { $in: currentUser.role === 'passenger' ? ['driver', 'both'] : ['passenger', 'both'] },
    })
      .select('firstName lastName area commuteDays departureTime role rating ratingCount carModel seatsAvailable')
      .limit(20);

    res.json({ matches, count: matches.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to find matches' });
  }
});

// ── GET /api/users/my-rides ───────────────────────────────────────────────
// Get rides for current user (as driver or passenger)
router.get('/my-rides', protect, async (req, res) => {
  try {
    const [driverRides, passengerRides] = await Promise.all([
      // Rides I'm driving
      Ride.find({ driver: req.user._id })
        .populate('requests.passenger', 'firstName lastName area')
        .sort({ date: -1 })
        .limit(20),

      // Rides I've requested
      Ride.find({ 'requests.passenger': req.user._id })
        .populate('driver', 'firstName lastName area rating carModel')
        .sort({ date: -1 })
        .limit(20),
    ]);

    res.json({ driverRides, passengerRides });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch your rides' });
  }
});

// ── POST /api/users/:id/rate ──────────────────────────────────────────────
// Rate a driver after a completed ride
router.post('/:id/rate', protect, async (req, res) => {
  try {
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot rate yourself' });
    }

    const userToRate = await User.findById(req.params.id);
    if (!userToRate) return res.status(404).json({ message: 'User not found' });

    userToRate.addRating(rating);
    await userToRate.save();

    res.json({ message: 'Rating submitted', newRating: userToRate.rating });
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit rating' });
  }
});

// ── GET /api/users/drivers ────────────────────────────────────────────────
// List all available drivers (for admin/debug)
router.get('/drivers', protect, async (req, res) => {
  try {
    const { area } = req.query;
    const filter = { role: { $in: ['driver', 'both'] }, isActive: true };
    if (area) filter.area = area;

    const drivers = await User.find(filter)
      .select('firstName lastName area commuteDays departureTime rating ratingCount carModel seatsAvailable')
      .sort({ rating: -1 });

    res.json({ drivers, count: drivers.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch drivers' });
  }
});

// ── GET /api/users/all ────────────────────────────────────────────────────
// List all users (admin only)
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({})
      .select('firstName lastName email role area isActive isAdmin createdAt')
      .sort({ createdAt: -1 });
    res.json({ users, count: users.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// ── DELETE /api/users/:id ─────────────────────────────────────────────────
// Delete a user (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await Ride.deleteMany({ driver: req.params.id });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

module.exports = router;
