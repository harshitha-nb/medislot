const express = require('express');
const db = require('../config/db');
const cache = require('../cache');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('doctor'));

// Find the doctor profile that belongs to the logged-in user
router.use(async (req, res, next) => {
  try {
    const r = await db.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
    if (!r.rows[0]) return res.status(403).json({ error: 'No doctor profile for this account' });
    req.doctorId = r.rows[0].id;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMinutes = (t) => parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3), 10);

// POST /api/portal/slots   { date, startTime, endTime, durationMinutes }
router.post('/slots', async (req, res) => {
  const { date, startTime, endTime } = req.body;
  const duration = parseInt(req.body.durationMinutes, 10) || 30;
  if (!DATE_RE.test(date || '') || !TIME_RE.test(startTime || '') || !TIME_RE.test(endTime || '')) {
    return res.status(400).json({ error: 'date (YYYY-MM-DD), startTime and endTime (HH:MM) are required' });
  }
  if (duration < 10 || duration > 120) {
    return res.status(400).json({ error: 'durationMinutes must be between 10 and 120' });
  }
  const span = toMinutes(endTime) - toMinutes(startTime);
  if (span < duration) {
    return res.status(400).json({ error: 'endTime must be at least one slot after startTime' });
  }
  if (span / duration > 48) {
    return res.status(400).json({ error: 'Too many slots in one request (max 48)' });
  }
  try {
    const result = await db.query(
      `INSERT INTO slots (doctor_id, start_time, end_time)
       SELECT $1::bigint, t, t + ($4::int * interval '1 minute')
       FROM generate_series(
              (($2::date + $3::time) AT TIME ZONE 'Asia/Kolkata'),
              (($2::date + $5::time) AT TIME ZONE 'Asia/Kolkata') - ($4::int * interval '1 minute'),
              $4::int * interval '1 minute'
            ) AS t
       WHERE t > now()
       ON CONFLICT (doctor_id, start_time) DO NOTHING
       RETURNING id, start_time, end_time`,
      [req.doctorId, date, startTime, duration, endTime]
    );
    await cache.del(`slots:${req.doctorId}:${date}`);
    res.status(201).json({ created: result.rows.length, slots: result.rows });
  } catch (err) {
    if (err.code === '22008' || err.code === '22007') {
      return res.status(400).json({ error: 'Invalid date or time' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/portal/slots?date=YYYY-MM-DD   (all my slots that day, with booked flag)
router.get('/slots', async (req, res) => {
  const date = req.query.date;
  if (!DATE_RE.test(date || '')) {
    return res.status(400).json({ error: 'date (YYYY-MM-DD) is required' });
  }
  try {
    const result = await db.query(
      `SELECT s.id, s.start_time, s.end_time,
              EXISTS (SELECT 1 FROM appointments a
                      WHERE a.slot_id = s.id AND a.status = 'confirmed') AS booked
       FROM slots s
       WHERE s.doctor_id = $1
         AND s.start_time >= ($2::date)::timestamp AT TIME ZONE 'Asia/Kolkata'
         AND s.start_time <  (($2::date + 1)::timestamp) AT TIME ZONE 'Asia/Kolkata'
       ORDER BY s.start_time`,
      [req.doctorId, date]
    );
    res.json({ date, slots: result.rows });
  } catch (err) {
    if (err.code === '22008' || err.code === '22007') {
      return res.status(400).json({ error: 'Invalid date' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/portal/slots/5   (only if nobody has ever booked it)
router.delete('/slots/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Valid slot id is required' });
  try {
    const result = await db.query(
      `DELETE FROM slots s
       WHERE s.id = $1 AND s.doctor_id = $2
         AND NOT EXISTS (SELECT 1 FROM appointments a WHERE a.slot_id = s.id)
       RETURNING to_char(s.start_time AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day`,
      [id, req.doctorId]
    );
    if (!result.rows[0]) {
      return res.status(409).json({ error: 'Slot not found, not yours, or it has appointments' });
    }
    await cache.del(`slots:${req.doctorId}:${result.rows[0].day}`);
    res.json({ deleted: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/portal/appointments?date=YYYY-MM-DD   (date is optional)
router.get('/appointments', async (req, res) => {
  const date = req.query.date || null;
  if (date && !DATE_RE.test(date)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  }
  try {
    const result = await db.query(
      `SELECT a.id, a.status, a.created_at, s.start_time, s.end_time, p.name AS patient
       FROM appointments a
       JOIN slots s ON s.id = a.slot_id
       JOIN users p ON p.id = a.patient_id
       WHERE s.doctor_id = $1
         AND ($2::date IS NULL OR (
               s.start_time >= ($2::date)::timestamp AT TIME ZONE 'Asia/Kolkata'
           AND s.start_time <  (($2::date + 1)::timestamp) AT TIME ZONE 'Asia/Kolkata'))
       ORDER BY s.start_time DESC
       LIMIT 200`,
      [req.doctorId, date]
    );
    res.json({ appointments: result.rows });
  } catch (err) {
    if (err.code === '22008' || err.code === '22007') {
      return res.status(400).json({ error: 'Invalid date' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;