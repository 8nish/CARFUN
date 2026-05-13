const jwt = require('jsonwebtoken');
const User = require('../models/User');

// checks if the JWT is legit and sticks the user onto the request — core middleware
const PROTECT = async (REQ, RES, NEXT) => {
  let TOKEN;

  // pull the token from the Authorization header, expecting "Bearer <token>"
  if (REQ.headers.authorization?.startsWith('Bearer ')) {
    TOKEN = REQ.headers.authorization.split(' ')[1];
  }

  if (!TOKEN) {
    return RES.status(401).json({ message: 'Not authorised — no token provided' });
  }

  try {
    const DECODED = jwt.verify(TOKEN, process.env.JWT_SECRET);
    REQ.user = await User.findById(DECODED.id).select('-password');

    if (!REQ.user) {
      return RES.status(401).json({ message: 'User no longer exists' });
    }

    if (!REQ.user.isActive) {
      return RES.status(401).json({ message: 'Account has been deactivated' });
    }

    NEXT();
  } catch (ERR) {
    return RES.status(401).json({ message: 'Token invalid or expired' });
  }
};

// same deal but chill — if there's no token it just moves on instead of blocking
// dhovie make sure this doesn't throw when the token is malformed either -Danish
const OPTIONALauth = async (REQ, RES, NEXT) => {
  let TOKEN;

  if (REQ.headers.authorization?.startsWith('Bearer ')) {
    TOKEN = REQ.headers.authorization.split(' ')[1];
  }

  if (TOKEN) {
    try {
      const DECODED = jwt.verify(TOKEN, process.env.JWT_SECRET);
      REQ.user = await User.findById(DECODED.id).select('-password');
    } catch (_) {
      // bad or expired token, just treat them as a guest and move on
    }
  }

  NEXT();
};

// passengers can't get through here — drivers only
const DRIVERonly = (REQ, RES, NEXT) => {
  if (REQ.user.role === 'passenger') {
    return RES.status(403).json({ message: 'Only drivers can perform this action' });
  }
  NEXT();
};

// admin gate, everyone else gets a 403
// dhovie double check this is applied on all the admin routes -Danish
const ADMINonly = (REQ, RES, NEXT) => {
  if (!REQ.user.isAdmin) {
    return RES.status(403).json({ message: 'Admin access required' });
  }
  NEXT();
};

// just signs a JWT, 30 day expiry
const SIGNtoken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

module.exports = { PROTECT, OPTIONALauth, DRIVERonly, ADMINonly, SIGNtoken };
