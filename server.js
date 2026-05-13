require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── MongoDB Connection (cached for serverless) ──────────────────────────────
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGO_URI);
  isConnected = true;
  console.log('MongoDB connected');

  const User = require('./models/User');
  const exists = await User.findOne({ email: 'admin@carfun.com' });
  if (!exists) {
    await User.create({
      firstName: 'Admin',
      lastName: 'CarFun',
      email: 'admin@carfun.com',
      password: '123456',
      role: 'both',
      isAdmin: true,
      area: 'Al Nakheel',
      commuteDays: [],
      departureTime: '08:00',
      returnTime: '18:00',
    });
    console.log('Admin account created: admin@carfun.com / 123456');
  }
}

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// ── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/rides',    require('./routes/rides'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/events',   require('./routes/events'));

// ── Public config (exposes non-secret keys to frontend) ────────────────────
app.get('/api/config', (req, res) => {
  res.json({ googleMapsKey: process.env.GOOGLE_MAPS_KEY || '' });
});

// ── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    time: new Date().toISOString(),
  });
});

// ── Serve frontend for all non-API routes (SPA fallback) ───────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── 404 & Error handlers ────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error', error: err.message });
});

// ── Local dev server ─────────────────────────────────────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  connectDB().then(() => {
    app.listen(PORT, () => console.log(`CarFun running at http://localhost:${PORT}`));
  });
}

module.exports = app;
