const db = require('../config/db');

// Morning (9:00-13:00) and evening (16:00-19:00) 30-minute slots, today plus 7 days.
// Safe to run repeatedly: existing slots are skipped, and past times are ignored.
const SLOTS_SQL = `
  INSERT INTO slots (doctor_id, start_time, end_time)
  SELECT d.id, x.t, x.t + interval '30 minutes'
  FROM doctors d
  CROSS JOIN generate_series(0, 7) AS n
  CROSS JOIN generate_series(0, 13) AS s
  CROSS JOIN LATERAL (
    SELECT (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata')
            + n * interval '1 day'
            + CASE WHEN s < 8 THEN interval '9 hours' + s * interval '30 minutes'
                   ELSE interval '16 hours' + (s - 8) * interval '30 minutes' END)
           AT TIME ZONE 'Asia/Kolkata' AS t
  ) x
  WHERE x.t > now()
  ON CONFLICT (doctor_id, start_time) DO NOTHING`;

async function topUpSlots() {
  try {
    const result = await db.query(SLOTS_SQL);
    console.log(`Slot top-up: added ${result.rowCount} slots`);
  } catch (err) {
    console.error('Slot top-up failed:', err.message);
  }
}

// Runs once at start-up, then every 6 hours
function startSlotTopUp() {
  topUpSlots();
  setInterval(topUpSlots, 6 * 60 * 60 * 1000).unref();
}

module.exports = { SLOTS_SQL, topUpSlots, startSlotTopUp };