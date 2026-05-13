const express = require('express');
const ROUTER = express.Router();
const Ride = require('../models/Ride');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const { PROTECT, OPTIONALauth, DRIVERonly } = require('../middleware/auth');
const { sendEvent } = require('../utils/sse');

// GET /api/rides — list available rides with optional filters
// dhovie bump the limit if we get more users, 50 might not be enough -Danish
ROUTER.get('/', OPTIONALauth, async (REQ, RES) => {
  try {
    const { area: AREA, date: DATE, time: TIME, minSeats: MINseats, status: STATUS } = REQ.query;

    const FILTER = {
      status: STATUS || 'active',
      date: { $gte: new Date() }, // only upcoming rides
    };

    if (AREA) FILTER.fromArea = AREA;
    if (MINseats) FILTER.seatsBooked = { $lte: FILTER.seatsTotal - parseInt(MINseats) };

    if (DATE) {
      const D = new Date(DATE);
      const NEXT = new Date(D);
      NEXT.setDate(D.getDate() + 1);
      FILTER.date = { $gte: D, $lt: NEXT };
    }

    const RIDES = await Ride.find(FILTER)
      .populate('driver', 'firstName lastName area rating ratingCount carModel seatsAvailable profilePicture')
      .sort({ date: 1, departureTime: 1 })
      .limit(50);

    RES.json({ rides: RIDES, count: RIDES.length });
  } catch (ERR) {
    console.error('Get rides error:', ERR);
    RES.status(500).json({ message: 'Failed to fetch rides' });
  }
});

// GET /api/rides/:id — get a single ride by ID
ROUTER.get('/:id', OPTIONALauth, async (REQ, RES) => {
  try {
    const RIDE = await Ride.findById(REQ.params.id)
      .populate('driver', 'firstName lastName area rating ratingCount carModel carRegistration')
      .populate('requests.passenger', 'firstName lastName area');

    if (!RIDE) return RES.status(404).json({ message: 'Ride not found' });

    RES.json({ ride: RIDE });
  } catch (ERR) {
    RES.status(500).json({ message: 'Failed to fetch ride' });
  }
});

// POST /api/rides — create a new ride offer (drivers only)
ROUTER.post('/', PROTECT, DRIVERonly, async (REQ, RES) => {
  try {
    const {
      fromArea: FROMarea,
      fromAddress: FROMaddress,
      departureTime: DEPARTUREtime,
      returnTime: RETURNtime,
      date: DATE,
      recurring: RECURRING,
      recurringDays: RECURRINGdays,
      seatsTotal: SEATStotal,
      costContribution: COSTcontribution,
      notes: NOTES,
    } = REQ.body;

    const RIDE = await Ride.create({
      driver: REQ.user._id,
      fromArea: FROMarea || REQ.user.area,
      fromAddress: FROMaddress,
      departureTime: DEPARTUREtime,
      returnTime: RETURNtime,
      date: new Date(DATE),
      recurring: RECURRING || false,
      recurringDays: RECURRINGdays || [],
      seatsTotal: SEATStotal,
      costContribution: COSTcontribution || 0,
      notes: NOTES,
    });

    await RIDE.populate('driver', 'firstName lastName area rating carModel');

    RES.status(201).json({ message: 'Ride created successfully', ride: RIDE });
  } catch (ERR) {
    if (ERR.name === 'ValidationError') {
      const MESSAGES = Object.values(ERR.errors).map((E) => E.message);
      return RES.status(400).json({ message: MESSAGES[0] });
    }
    console.error('Create ride error:', ERR);
    RES.status(500).json({ message: 'Failed to create ride' });
  }
});

// PUT /api/rides/:id — update a ride (only the driver who created it)
ROUTER.put('/:id', PROTECT, async (REQ, RES) => {
  try {
    const RIDE = await Ride.findById(REQ.params.id);
    if (!RIDE) return RES.status(404).json({ message: 'Ride not found' });

    if (RIDE.driver.toString() !== REQ.user._id.toString()) {
      return RES.status(403).json({ message: 'You can only edit your own rides' });
    }

    const ALLOWEDupdates = [
      'departureTime', 'returnTime', 'date', 'seatsTotal',
      'costContribution', 'notes', 'status', 'fromAddress',
    ];

    ALLOWEDupdates.forEach((FIELD) => {
      if (REQ.body[FIELD] !== undefined) RIDE[FIELD] = REQ.body[FIELD];
    });

    await RIDE.save();

    // notify accepted passengers when the ride gets marked completed
    if (REQ.body.status === 'completed') {
      const ACCEPTED = RIDE.requests.filter(R => R.status === 'accepted');
      const RIDEinfo = {
        rideId: RIDE._id,
        fromArea: RIDE.fromArea,
        date: RIDE.date,
        departureTime: RIDE.departureTime,
        driverId: RIDE.driver.toString(),
        driverName: `${REQ.user.firstName} ${REQ.user.lastName}`,
      };
      ACCEPTED.forEach(R => sendEvent(R.passenger.toString(), 'ride-completed', RIDEinfo));
    }

    RES.json({ message: 'Ride updated', ride: RIDE });
  } catch (ERR) {
    RES.status(500).json({ message: 'Failed to update ride' });
  }
});

// DELETE /api/rides/:id — cancel a ride
ROUTER.delete('/:id', PROTECT, async (REQ, RES) => {
  try {
    const RIDE = await Ride.findById(REQ.params.id);
    if (!RIDE) return RES.status(404).json({ message: 'Ride not found' });

    if (RIDE.driver.toString() !== REQ.user._id.toString()) {
      return RES.status(403).json({ message: 'You can only cancel your own rides' });
    }

    RIDE.status = 'cancelled';
    await RIDE.save();

    RES.json({ message: 'Ride cancelled successfully' });
  } catch (ERR) {
    RES.status(500).json({ message: 'Failed to cancel ride' });
  }
});

// POST /api/rides/:id/request — passenger requests a seat
ROUTER.post('/:id/request', PROTECT, async (REQ, RES) => {
  try {
    const RIDE = await Ride.findById(REQ.params.id);
    if (!RIDE) return RES.status(404).json({ message: 'Ride not found' });

    if (RIDE.status !== 'active') {
      return RES.status(400).json({ message: 'This ride is no longer available' });
    }

    if (RIDE.driver.toString() === REQ.user._id.toString()) {
      return RES.status(400).json({ message: 'You cannot request your own ride' });
    }

    // don't let them request the same ride twice
    const ALREADYrequested = RIDE.requests.some(
      (R) => R.passenger.toString() === REQ.user._id.toString()
    );
    if (ALREADYrequested) {
      return RES.status(400).json({ message: 'You have already requested this ride' });
    }

    RIDE.requests.push({
      passenger: REQ.user._id,
      message: REQ.body.message || '',
    });

    await RIDE.save();
    RES.json({ message: 'Ride request sent successfully' });
  } catch (ERR) {
    RES.status(500).json({ message: 'Failed to send request' });
  }
});

// DELETE /api/rides/:id/request/:requestId — passenger cancels their pending request
ROUTER.delete('/:id/request/:requestId', PROTECT, async (REQ, RES) => {
  try {
    const RIDE = await Ride.findById(REQ.params.id);
    if (!RIDE) return RES.status(404).json({ message: 'Ride not found' });

    const REQUEST = RIDE.requests.id(REQ.params.requestId);
    if (!REQUEST) return RES.status(404).json({ message: 'Request not found' });

    if (REQUEST.passenger.toString() !== REQ.user._id.toString()) {
      return RES.status(403).json({ message: 'You can only cancel your own requests' });
    }
    if (REQUEST.status !== 'pending') {
      return RES.status(400).json({ message: `Cannot cancel a ${REQUEST.status} request` });
    }

    REQUEST.status = 'cancelled';
    await RIDE.save();
    RES.json({ message: 'Request cancelled' });
  } catch (ERR) {
    RES.status(500).json({ message: 'Failed to cancel request' });
  }
});

// PUT /api/rides/:id/request/:requestId — driver accepts or rejects a request
ROUTER.put('/:id/request/:requestId', PROTECT, async (REQ, RES) => {
  try {
    const RIDE = await Ride.findById(REQ.params.id);
    if (!RIDE) return RES.status(404).json({ message: 'Ride not found' });

    if (RIDE.driver.toString() !== REQ.user._id.toString()) {
      return RES.status(403).json({ message: 'Only the driver can manage requests' });
    }

    const REQUEST = RIDE.requests.id(REQ.params.requestId);
    if (!REQUEST) return RES.status(404).json({ message: 'Request not found' });

    const { status: STATUS } = REQ.body; // 'accepted' or 'rejected'
    if (!['accepted', 'rejected'].includes(STATUS)) {
      return RES.status(400).json({ message: 'Status must be accepted or rejected' });
    }

    if (STATUS === 'accepted') {
      if (RIDE.isFull) {
        return RES.status(400).json({ message: 'Ride is already full' });
      }
      RIDE.seatsBooked += 1;
    }

    REQUEST.status = STATUS;
    await RIDE.save();

    const PASSENGERid = REQUEST.passenger.toString();

    if (STATUS === 'accepted') {
      // create the conversation between driver and passenger if it doesn't exist yet
      const CONVO = await Conversation.findOneAndUpdate(
        { ride: RIDE._id, passenger: REQUEST.passenger },
        { $setOnInsert: { ride: RIDE._id, driver: RIDE.driver, passenger: REQUEST.passenger } },
        { upsert: true, new: true }
      );
      sendEvent(PASSENGERid, 'ride-accepted', {
        rideId: RIDE._id,
        convoId: CONVO._id,
        message: 'Your ride request was accepted!',
      });
      sendEvent(RIDE.driver.toString(), 'conversation-created', { convoId: CONVO._id });
    } else {
      sendEvent(PASSENGERid, 'ride-rejected', {
        rideId: RIDE._id,
        message: 'Your ride request was declined.',
      });
    }

    RES.json({ message: `Request ${STATUS}`, ride: RIDE });
  } catch (ERR) {
    RES.status(500).json({ message: 'Failed to update request' });
  }
});

// PUT /api/rides/:id/request/:requestId/location — passenger saves their pickup pin
ROUTER.put('/:id/request/:requestId/location', PROTECT, async (REQ, RES) => {
  try {
    const { lat: LAT, lng: LNG } = REQ.body;
    if (LAT == null || LNG == null) {
      return RES.status(400).json({ message: 'lat and lng are required' });
    }

    const RIDE = await Ride.findById(REQ.params.id);
    if (!RIDE) return RES.status(404).json({ message: 'Ride not found' });

    const REQUEST = RIDE.requests.id(REQ.params.requestId);
    if (!REQUEST) return RES.status(404).json({ message: 'Request not found' });

    if (REQUEST.passenger.toString() !== REQ.user._id.toString()) {
      return RES.status(403).json({ message: 'Only the passenger can set their pickup location' });
    }

    REQUEST.pickupLocation = { lat: LAT, lng: LNG };
    await RIDE.save();

    // let the driver know the passenger has dropped a pin
    sendEvent(RIDE.driver.toString(), 'pickup-pin-updated', {
      rideId: RIDE._id,
      passengerName: `${REQ.user.firstName} ${REQ.user.lastName}`,
      lat: LAT,
      lng: LNG,
    });

    RES.json({ message: 'Pickup location saved' });
  } catch (ERR) {
    RES.status(500).json({ message: 'Failed to save location' });
  }
});

module.exports = ROUTER;
