const express = require('express');
const db = require('../config/db');

const router = express.Router();

// GET /api/meta  (lists for the search dropdowns)
router.get('/', async (req, res) => {
  try {
    const [sp, ci] = await Promise.all([
      db.query('SELECT name FROM specialties ORDER BY name'),
      db.query('SELECT DISTINCT city FROM clinics ORDER BY city')
    ]);
    res.json({
      specialties: sp.rows.map(r => r.name),
      cities: ci.rows.map(r => r.city)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;