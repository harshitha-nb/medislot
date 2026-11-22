const express = require('express');
const db = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Every route here needs a logged-in patient
router.use(requireAuth, requireRole('patient'));

// POST /api/appointments   body: { "slotId": 5 }
router.post('/', async (req, res) => {
  const slotId = parseInt(req.body.slotId, 10);
  if (!Number.isInteger(slotId)) {
    return res.status(400).json({ error: 'slotId (a number) is required' });
  }
  try {
    // One statement: book only if the slot exists and is in the future.
    // The unique index guarantees only one confirmed booking per slot.
    const result = await db.query(
      `INSERT INTO appointments (slot_id, patient_id)
       SELECT id, $2::bigint FROM slots
       WHERE id = $1 AND start_time > now()
       RETURNING id, slot_id, patient_id, status, created_at`,
      [slotId, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Slot not found or already started' });
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {       // unique violation: someone else got it first
      return res.status(409).json({ error: 'Slot already booked' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/appointments/mine   (the logged-in patient's appointments)
router.get('/mine', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.id, a.status, a.created_at,
              s.start_time, s.end_time,
              u.name AS doctor, sp.name AS specialty,
              c.name AS clinic, c.city
       FROM appointments a
       JOIN slots s        ON s.id = a.slot_id
       JOIN doctors d      ON d.id = s.doctor_id
       JOIN users u        ON u.id = d.user_id
       JOIN specialties sp ON sp.id = d.specialty_id
       JOIN clinics c      ON c.id = d.clinic_id
       WHERE a.patient_id = $1
       ORDER BY s.start_time DESC`,
      [req.user.id]
    );
    res.json({ appointments: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/appointments/7   (cancel your own confirmed appointment)
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Valid appointment id is required' });
  }
  try {
    const result = await db.query(
      `UPDATE appointments
       SET status = 'cancelled', cancelled_at = now()
       WHERE id = $1 AND patient_id = $2 AND status = 'confirmed'
       RETURNING id, slot_id, status, cancelled_at`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No confirmed appointment found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;