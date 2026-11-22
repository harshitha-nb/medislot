require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');

const SPECIALTIES = [
  'Cardiology', 'Dermatology', 'Pediatrics', 'Orthopedics', 'Gynecology',
  'Neurology', 'ENT', 'Psychiatry', 'General Physician', 'Dentistry'
];
const CITIES = ['Bengaluru', 'Mumbai', 'Delhi', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata'];

async function main() {
  const doctorCount = parseInt(process.argv[2], 10) || 50;
  const clinicCount = Math.max(10, Math.ceil(doctorCount / 10));
  const days = parseInt(process.argv[3], 10) || 5;   // days of slots, starting tomorrow
  const perDay = 8;      // 30-minute slots per day, from 9:00

  const client = await db.connect();
  try {
    const existing = await client.query('SELECT count(*)::int AS n FROM doctors');
    if (existing.rows[0].n > 0) {
      console.log('Doctors already exist. Reset the data first (see instructions).');
      return;
    }

    const hash = await bcrypt.hash('Password123', 10);
    const adminHash = await bcrypt.hash('Admin1234', 10);

    await client.query('BEGIN');

    for (const name of SPECIALTIES) {
      await client.query(
        'INSERT INTO specialties (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
    }

    await client.query(
      `INSERT INTO clinics (name, city, address)
       SELECT 'MediSlot Clinic ' || g,
              ($1::text[])[1 + (g % $2::int)],
              g || ', Main Road'
       FROM generate_series(1, $3::int) AS g`,
      [CITIES, CITIES.length, clinicCount]);

    await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ('Admin', 'admin@medislot.com', $1::text, 'admin')
       ON CONFLICT (email) DO NOTHING`, [adminHash]);

    await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       SELECT 'Dr. Doctor ' || g, 'doctor' || g || '@medislot.com', $1::text, 'doctor'
       FROM generate_series(1, $2::int) AS g`,
      [hash, doctorCount]);

    const spIds = (await client.query('SELECT id FROM specialties ORDER BY id')).rows.map(r => r.id);
    const clIds = (await client.query('SELECT id FROM clinics ORDER BY id')).rows.map(r => r.id);

    await client.query(
      `INSERT INTO doctors (user_id, specialty_id, clinic_id, experience_years, consultation_fee)
       SELECT u.id,
              ($1::int[])[1 + (u.id % $3::int)::int],
              ($2::bigint[])[1 + (u.id % $4::int)::int],
              (u.id % 30)::int + 1,
              300 + (u.id % 10) * 100
       FROM users u
       WHERE u.role = 'doctor'`,
      [spIds, clIds, spIds.length, clIds.length]);

    await client.query(
      `INSERT INTO slots (doctor_id, start_time, end_time)
       SELECT doctor_id, start_time, start_time + interval '30 minutes'
       FROM (
         SELECT d.id AS doctor_id,
                (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata')
                  + n * interval '1 day'
                  + interval '9 hours'
                  + s * interval '30 minutes') AT TIME ZONE 'Asia/Kolkata' AS start_time
         FROM doctors d
         CROSS JOIN generate_series(1, $1::int) AS n
         CROSS JOIN generate_series(0, $2::int - 1) AS s
       ) t
       ON CONFLICT (doctor_id, start_time) DO NOTHING`,
      [days, perDay]);

    await client.query('COMMIT');

    const counts = await client.query(
      `SELECT (SELECT count(*) FROM clinics) AS clinics,
              (SELECT count(*) FROM doctors) AS doctors,
              (SELECT count(*) FROM slots) AS slots`);
    console.log('Seed complete:', counts.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
  } finally {
    client.release();
    await db.end();
  }
}

main();