const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

// GET /api/admin/lookups   (ids for the "add doctor" form)
router.get('/lookups', async (req, res) => {
  try {
    const [sp, cl] = await Promise.all([
      db.query('SELECT id, name FROM specialties ORDER BY name'),
      db.query('SELECT id, name, city FROM clinics ORDER BY city, name')
    ]);
    res.json({ specialties: sp.rows, clinics: cl.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT (SELECT count(*) FROM doctors)::int AS doctors,
              (SELECT count(*) FROM users WHERE role = 'patient')::int AS patients,
              (SELECT count(*) FROM clinics)::int AS clinics,
              (SELECT count(*) FROM appointments WHERE status = 'confirmed')::int AS confirmed_appointments,
              (SELECT count(*) FROM appointments WHERE status = 'cancelled')::int AS cancelled_appointments`
    );
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/specialties   { name }
router.post('/specialties', async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const r = await db.query('INSERT INTO specialties (name) VALUES ($1) RETURNING id, name', [name]);
    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Specialty already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/clinics   { name, city, address }
router.post('/clinics', async (req, res) => {
  const name = (req.body.name || '').trim();
  const city = (req.body.city || '').trim();
  const address = (req.body.address || '').trim();
  if (!name || !city || !address) {
    return res.status(400).json({ error: 'name, city and address are required' });
  }
  try {
    const r = await db.query(
      'INSERT INTO clinics (name, city, address) VALUES ($1, $2, $3) RETURNING id, name, city, address',
      [name, city, address]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/doctors
// { name, email, password, specialtyId, clinicId, experienceYears, consultationFee }
router.post('/doctors', async (req, res) => {
  const { name, email, password } = req.body;
  const specialtyId = parseInt(req.body.specialtyId, 10);
  const clinicId = parseInt(req.body.clinicId, 10);
  const years = parseInt(req.body.experienceYears, 10);
  const fee = Number(req.body.consultationFee);
  if (!name || !email || !password || password.length < 8 ||
      !Number.isInteger(specialtyId) || !Number.isInteger(clinicId) ||
      !Number.isInteger(years) || years < 0 || !Number.isFinite(fee) || fee < 0) {
    return res.status(400).json({
      error: 'name, email, password (8+ chars), specialtyId, clinicId, experienceYears and consultationFee are required'
    });
  }
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const hash = await bcrypt.hash(password, 10);
    const u = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'doctor') RETURNING id`,
      [name, email.toLowerCase(), hash]
    );
    const d = await client.query(
      `INSERT INTO doctors (user_id, specialty_id, clinic_id, experience_years, consultation_fee)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [u.rows[0].id, specialtyId, clinicId, years, fee]
    );
    await client.query('COMMIT');
    // Cached doctor lists refresh by themselves within 60 seconds (TTL).
    res.status(201).json({ id: d.rows[0].id, name, email: email.toLowerCase() });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    if (err.code === '23503') return res.status(400).json({ error: 'Invalid specialtyId or clinicId' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;