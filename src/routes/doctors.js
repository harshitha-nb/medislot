const express = require('express');
const db = require('../config/db');

const router = express.Router();

// GET /api/doctors?specialty=Cardiology&city=Bengaluru&page=1&limit=10
router.get('/', async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
  const specialty = req.query.specialty || null;
  const city = req.query.city || null;

  try {
    const result = await db.query(
      `SELECT d.id, u.name, s.name AS specialty, c.name AS clinic, c.city,
              d.experience_years, d.consultation_fee
       FROM doctors d
       JOIN users u       ON u.id = d.user_id
       JOIN specialties s ON s.id = d.specialty_id
       JOIN clinics c     ON c.id = d.clinic_id
       WHERE ($1::text IS NULL OR s.name ILIKE $1)
         AND ($2::text IS NULL OR c.city ILIKE $2)
       ORDER BY d.experience_years DESC, d.id
       LIMIT $3 OFFSET $4`,
      [specialty, city, limit, (page - 1) * limit]
    );
    res.json({ page, limit, count: result.rows.length, doctors: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/doctors/1/slots?date=2026-11-23  (free slots only)
router.get('/:id/slots', async (req, res) => {
  const doctorId = parseInt(req.params.id, 10);
  const date = req.query.date;
  if (!Number.isInteger(doctorId) || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    return res.status(400).json({ error: 'Valid doctor id and date (YYYY-MM-DD) are required' });
  }
  try {
    const result = await db.query(
      `SELECT s.id, s.start_time, s.end_time
       FROM slots s
       WHERE s.doctor_id = $1
         AND s.start_time >= ($2::date)::timestamp AT TIME ZONE 'Asia/Kolkata'
         AND s.start_time <  (($2::date + 1)::timestamp) AT TIME ZONE 'Asia/Kolkata'
         AND NOT EXISTS (
           SELECT 1 FROM appointments a
           WHERE a.slot_id = s.id AND a.status = 'confirmed')
       ORDER BY s.start_time`,
      [doctorId, date]
    );
    res.json({ doctorId, date, slots: result.rows });
  } catch (err) {
    if (err.code === '22008' || err.code === '22007') {
      return res.status(400).json({ error: 'Invalid date' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;