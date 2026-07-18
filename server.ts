/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { LocalDatabase } from './src/server/db.js';
import dotenv from 'dotenv';

dotenv.config();

const db = new LocalDatabase();
const activeSessions = new Set<string>();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Auth Middleware
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Admin access required.' });
  }
  const token = authHeader.split(' ')[1];
  if (!activeSessions.has(token)) {
    return res.status(401).json({ error: 'Session expired or invalid.' });
  }
  next();
}

// API Routes
app.post('/api/auth/login', async (req, res) => {
  const { accessKey } = req.body;
  if (!accessKey) {
    return res.status(400).json({ error: 'Access key is required.' });
  }
  const admin = await db.verifyAdminKey(accessKey);
  if (!admin) {
    return res.status(401).json({ error: 'Invalid admin access key.' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.add(token);
  res.json({ token, admin: { id: admin.id, name: admin.name } });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    activeSessions.delete(token);
  }
  res.json({ success: true });
});

// Settings
app.get('/api/settings', async (req, res) => {
  res.json(await db.getSettings());
});

app.post('/api/settings', requireAdmin, async (req, res) => {
  const updated = await db.updateSettings(req.body);
  res.json(updated);
});

// Trips
app.get('/api/trips', requireAdmin, async (req, res) => {
  res.json(await db.getTrips());
});

app.get('/api/trips/:id', requireAdmin, async (req, res) => {
  const trip = await db.getTripById(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found.' });

  const seats = await db.getTripSeats(trip.id);
  const bookings = await db.getBookings(trip.id);
  const logs = await db.getLogs(trip.id);
  const company = await db.getSettings();

  res.json({ trip, seats, bookings, logs, company });
});

app.post('/api/trips', requireAdmin, async (req, res) => {
  try {
    const { title, trip_date, bus_model, total_seats, seat_price, advance_per_seat, description, qr_code_url } = req.body;
    if (!title || !trip_date || !bus_model || !total_seats || !seat_price || !advance_per_seat) {
      return res.status(400).json({ error: 'Missing required trip fields.' });
    }
    const trip = await db.createTrip({
      title,
      trip_date,
      bus_model,
      total_seats: Number(total_seats),
      seat_price: Number(seat_price),
      advance_per_seat: Number(advance_per_seat),
      description: description || '',
      qr_code_url: qr_code_url || null,
      status: 'active'
    });
    res.status(201).json(trip);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/trips/:id', requireAdmin, async (req, res) => {
  try {
    const updated = await db.updateTrip(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Trip not found.' });
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Public Portal Booking Endpoints
app.get('/api/public/trip/:shareToken', async (req, res) => {
  const trip = await db.getTripByShareToken(req.params.shareToken);
  if (!trip) return res.status(404).json({ error: 'Trip not found.' });

  const seats = await db.getTripSeats(trip.id);
  
  // Mask customer names to preserve privacy on the public dashboard
  const publicSeats = seats.map(s => {
    if (s.status === 'booked') {
      return {
        ...s,
        customer_name: 'Booked'
      };
    }
    return s;
  });

  const company = await db.getSettings();
  res.json({ trip, seats: publicSeats, company });
});

app.post('/api/public/trip/:shareToken/book', async (req, res) => {
  const trip = await db.getTripByShareToken(req.params.shareToken);
  if (!trip) return res.status(404).json({ error: 'Trip not found.' });

  const { customerName, mobileNumber, message, paymentScreenshotUrl, seatCodes } = req.body;
  if (!customerName || !seatCodes || !Array.isArray(seatCodes) || seatCodes.length === 0) {
    return res.status(400).json({ error: 'Customer name and seat selections are required.' });
  }

  try {
    const booking = await db.createBooking(
      trip.id,
      customerName,
      mobileNumber || null,
      message || null,
      paymentScreenshotUrl || null,
      seatCodes,
      'public'
    );
    res.status(201).json(booking);
  } catch (e: any) {
    res.status(409).json({ error: e.message });
  }
});

// Admin Booking Operations
app.post('/api/admin/trips/:id/book', requireAdmin, async (req, res) => {
  const { customerName, mobileNumber, message, seatCodes, advanceOverride } = req.body;
  if (!customerName || !seatCodes || !Array.isArray(seatCodes) || seatCodes.length === 0) {
    return res.status(400).json({ error: 'Customer name and seat selections are required.' });
  }

  try {
    const booking = await db.createBooking(
      req.params.id,
      customerName,
      mobileNumber || null,
      message || null,
      null,
      seatCodes,
      'admin',
      advanceOverride !== undefined ? Number(advanceOverride) : undefined
    );
    res.status(201).json(booking);
  } catch (e: any) {
    res.status(409).json({ error: e.message });
  }
});

app.post('/api/admin/trips/:id/seats/disable', requireAdmin, async (req, res) => {
  const { seatCode, seatCodes } = req.body;
  const codes = seatCodes || seatCode;
  if (!codes) return res.status(400).json({ error: 'Seat code or codes are required.' });
  try {
    const success = await db.disableSeat(req.params.id, codes);
    if (!success) return res.status(404).json({ error: 'Seat not found.' });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/admin/trips/:id/seats/enable', requireAdmin, async (req, res) => {
  const { seatCode, seatCodes } = req.body;
  const codes = seatCodes || seatCode;
  if (!codes) return res.status(400).json({ error: 'Seat code or codes are required.' });
  try {
    const success = await db.enableSeat(req.params.id, codes);
    if (!success) return res.status(404).json({ error: 'Seat not found.' });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/admin/bookings/:bookingId/verify', requireAdmin, async (req, res) => {
  const { verified } = req.body;
  const success = await db.verifyPayment(req.params.bookingId, verified !== false);
  if (!success) return res.status(404).json({ error: 'Booking not found.' });
  res.json({ success: true });
});

app.post('/api/admin/bookings/:bookingId/cancel', requireAdmin, async (req, res) => {
  try {
    const success = await db.cancelBooking(req.params.bookingId);
    if (!success) return res.status(404).json({ error: 'Booking not found.' });
    res.json({ success: true });
  } catch (e: any) {
    console.error('[Bus-Seat-App] Error in cancel booking endpoint:', e);
    res.status(500).json({ error: e.message || 'Failed to cancel reservation.' });
  }
});

// Configure Vite or Static Files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Bus-Seat-App] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
