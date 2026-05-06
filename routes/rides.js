const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const { protect, optionalAuth, driverOnly } = require('../middleware/auth');
const { sendEvent } = require('../utils/sse');

// ── GET /api/rides ─────────────────────────────────────────────────────────
// List available rides with optional filters
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { area, date, time, minSeats, status } = req.query;

    const filter = {
      status: status || 'active',
      date: { $gte: new Date() }, // only upcoming rides
    };

    if (area) filter.fromArea = area;
    if (minSeats) filter.seatsBooked = { $lte: filter.seatsTotal - parseInt(minSeats) };

    if (date) {
      const d = new Date(date);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      filter.date = { $gte: d, $lt: next };
    }

    const rides = await Ride.find(filter)
      .populate('driver', 'firstName lastName area rating ratingCount carModel seatsAvailable profilePicture')
      .sort({ date: 1, departureTime: 1 })
      .limit(50);

    res.json({ rides, count: rides.length });
  } catch (err) {
    console.error('Get rides error:', err);
    res.status(500).json({ message: 'Failed to fetch rides' });
  }
});

// ── GET /api/rides/:id ────────────────────────────────────────────────────
// Get a single ride by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('driver', 'firstName lastName area rating ratingCount carModel carRegistration')
      .populate('requests.passenger', 'firstName lastName area');

    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    res.json({ ride });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch ride' });
  }
});

// ── POST /api/rides ───────────────────────────────────────────────────────
// Create a new ride offer (drivers only)
router.post('/', protect, driverOnly, async (req, res) => {
  try {
    const {
      fromArea,
      fromAddress,
      departureTime,
      returnTime,
      date,
      recurring,
      recurringDays,
      seatsTotal,
      costContribution,
      notes,
    } = req.body;

    const ride = await Ride.create({
      driver: req.user._id,
      fromArea: fromArea || req.user.area,
      fromAddress,
      departureTime,
      returnTime,
      date: new Date(date),
      recurring: recurring || false,
      recurringDays: recurringDays || [],
      seatsTotal,
      costContribution: costContribution || 0,
      notes,
    });

    await ride.populate('driver', 'firstName lastName area rating carModel');

    res.status(201).json({ message: 'Ride created successfully', ride });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages[0] });
    }
    console.error('Create ride error:', err);
    res.status(500).json({ message: 'Failed to create ride' });
  }
});

// ── PUT /api/rides/:id ────────────────────────────────────────────────────
// Update a ride (driver who created it only)
router.put('/:id', protect, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    if (ride.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own rides' });
    }

    const allowedUpdates = [
      'departureTime', 'returnTime', 'date', 'seatsTotal',
      'costContribution', 'notes', 'status', 'fromAddress',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) ride[field] = req.body[field];
    });

    await ride.save();

    // Notify accepted passengers when ride is marked completed
    if (req.body.status === 'completed') {
      const accepted = ride.requests.filter(r => r.status === 'accepted');
      const rideInfo = {
        rideId: ride._id,
        fromArea: ride.fromArea,
        date: ride.date,
        departureTime: ride.departureTime,
        driverId: ride.driver.toString(),
        driverName: `${req.user.firstName} ${req.user.lastName}`,
      };
      accepted.forEach(r => sendEvent(r.passenger.toString(), 'ride-completed', rideInfo));
    }

    res.json({ message: 'Ride updated', ride });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update ride' });
  }
});

// ── DELETE /api/rides/:id ─────────────────────────────────────────────────
// Cancel/delete a ride
router.delete('/:id', protect, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    if (ride.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only cancel your own rides' });
    }

    ride.status = 'cancelled';
    await ride.save();

    res.json({ message: 'Ride cancelled successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel ride' });
  }
});

// ── POST /api/rides/:id/request ───────────────────────────────────────────
// Passenger requests a seat on a ride
router.post('/:id/request', protect, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    if (ride.status !== 'active') {
      return res.status(400).json({ message: 'This ride is no longer available' });
    }

    if (ride.driver.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot request your own ride' });
    }

    // Check if already requested
    const alreadyRequested = ride.requests.some(
      (r) => r.passenger.toString() === req.user._id.toString()
    );
    if (alreadyRequested) {
      return res.status(400).json({ message: 'You have already requested this ride' });
    }

    ride.requests.push({
      passenger: req.user._id,
      message: req.body.message || '',
    });

    await ride.save();
    res.json({ message: 'Ride request sent successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send request' });
  }
});

// ── DELETE /api/rides/:id/request/:requestId ─────────────────────────────
// Passenger cancels their own pending request
router.delete('/:id/request/:requestId', protect, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    const request = ride.requests.id(req.params.requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (request.passenger.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only cancel your own requests' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Cannot cancel a ${request.status} request` });
    }

    request.status = 'cancelled';
    await ride.save();
    res.json({ message: 'Request cancelled' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel request' });
  }
});

// ── PUT /api/rides/:id/request/:requestId ─────────────────────────────────
// Driver accepts or rejects a ride request
router.put('/:id/request/:requestId', protect, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    if (ride.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the driver can manage requests' });
    }

    const request = ride.requests.id(req.params.requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const { status } = req.body; // 'accepted' or 'rejected'
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be accepted or rejected' });
    }

    if (status === 'accepted') {
      if (ride.isFull) {
        return res.status(400).json({ message: 'Ride is already full' });
      }
      ride.seatsBooked += 1;
    }

    request.status = status;
    await ride.save();

    const passengerId = request.passenger.toString();

    if (status === 'accepted') {
      const convo = await Conversation.findOneAndUpdate(
        { ride: ride._id, passenger: request.passenger },
        { $setOnInsert: { ride: ride._id, driver: ride.driver, passenger: request.passenger } },
        { upsert: true, new: true }
      );
      sendEvent(passengerId, 'ride-accepted', {
        rideId: ride._id,
        convoId: convo._id,
        message: 'Your ride request was accepted!',
      });
      sendEvent(ride.driver.toString(), 'conversation-created', { convoId: convo._id });
    } else {
      sendEvent(passengerId, 'ride-rejected', {
        rideId: ride._id,
        message: 'Your ride request was declined.',
      });
    }

    res.json({ message: `Request ${status}`, ride });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update request' });
  }
});

// ── PUT /api/rides/:id/request/:requestId/location ────────────────────────
// Passenger saves their pickup pin — only the driver of that ride can read it
router.put('/:id/request/:requestId/location', protect, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }

    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    const request = ride.requests.id(req.params.requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (request.passenger.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the passenger can set their pickup location' });
    }

    request.pickupLocation = { lat, lng };
    await ride.save();

    sendEvent(ride.driver.toString(), 'pickup-pin-updated', {
      rideId: ride._id,
      passengerName: `${req.user.firstName} ${req.user.lastName}`,
      lat,
      lng,
    });

    res.json({ message: 'Pickup location saved' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save location' });
  }
});

module.exports = router;
