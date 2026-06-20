const express = require('express');
const cors    = require('cors');

const authRoutes          = require('./routes/auth');
const eventsRoutes        = require('./routes/events');
const registrationsRoutes = require('./routes/registrations');
const attendanceRoutes    = require('./routes/attendance');
const { volunteersRouter, notificationsRouter, feedbackRouter, certificatesRouter } = require('./routes/misc');

const app = express();

// ── Middleware ────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/events',        eventsRoutes);
app.use('/api/registrations', registrationsRoutes);
app.use('/api/attendance',    attendanceRoutes);
app.use('/api/volunteers',    volunteersRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/feedback',      feedbackRouter);
app.use('/api/certificates',  certificatesRouter);

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404 fallback for unmatched /api routes
app.use('/api/*', (_, res) => res.status(404).json({ error: 'Route not found' }));

// ── Export for Vercel serverless ──────────────────────────
module.exports = app;
