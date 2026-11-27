require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../src/config/db');
const { SLOTS_SQL } = require('../src/jobs/topupSlots');

const SPECIALTIES = [
  { name: 'Cardiology', fee: 900 },
  { name: 'Dermatology', fee: 700 },
  { name: 'Pediatrics', fee: 600 },
  { name: 'Orthopedics', fee: 800 },
  { name: 'Gynecology', fee: 750 },
  { name: 'Neurology', fee: 1000 },
  { name: 'ENT', fee: 600 },
  { name: 'Psychiatry', fee: 900 },
  { name: 'General Physician', fee: 400 },
  { name: 'Dentistry', fee: 500 },
];

const CITIES = {
  Bengaluru: ['Indiranagar', 'Koramangala', 'Jayanagar', 'Whitefield', 'HSR Layout', 'Malleshwaram'],
  Mumbai: ['Andheri West', 'Bandra West', 'Powai', 'Dadar', 'Borivali West', 'Juhu'],
  Delhi: ['Saket', 'Dwarka', 'Rohini', 'Lajpat Nagar', 'Karol Bagh', 'Vasant Kunj'],
  Chennai: ['Anna Nagar', 'T. Nagar', 'Adyar', 'Velachery', 'Mylapore', 'Nungambakkam'],
  Hyderabad: ['Banjara Hills', 'Jubilee Hills', 'Gachibowli', 'Madhapur', 'Kukatpally', 'Begumpet'],
  Pune: ['Kothrud', 'Baner', 'Viman Nagar', 'Aundh', 'Hadapsar', 'Koregaon Park'],
  Kolkata: ['Salt Lake', 'Ballygunge', 'Park Street', 'New Town', 'Behala', 'Dum Dum'],
};

const STREETS = [
  'MG Road', 'Main Road', 'Station Road', 'Temple Road', 'Lake View Road',
  'Market Street', 'Ring Road', 'Garden Road', 'Church Street', 'Cross Road',
];

const CLINIC_NAMES = [
  'Sunrise Care Clinic', 'Lotus Health Centre', 'Apex Family Clinic', 'Greenleaf Medical Centre',
  'Harmony Health Clinic', 'Pioneer Care Clinic', 'Silverline Clinic', 'Orchid Multispeciality Clinic',
  'Bluebell Health Centre', 'Evergreen Care Clinic', 'Riverside Medical Centre', 'Cedar Wellness Clinic',
  'Lifeline Health Centre', 'Trinity Care Clinic', 'Horizon Medical Centre', 'Maple Family Clinic',
  'Crescent Health Clinic', 'Summit Care Centre', 'Willow Wellness Clinic', 'Banyan Health Centre',
  'Jasmine Medical Clinic', 'Meridian Care Clinic', 'Oakwood Health Clinic', 'Zenith Medical Centre',
];

const FIRST_NAMES = [
  'Ananya', 'Rohan', 'Priya', 'Arjun', 'Kavya', 'Vikram', 'Neha', 'Siddharth', 'Meera', 'Rahul',
  'Isha', 'Karthik', 'Divya', 'Aditya', 'Pooja', 'Nikhil', 'Sneha', 'Varun', 'Ritu', 'Manish',
  'Anjali', 'Suresh', 'Lakshmi', 'Imran', 'Farah', 'Harpreet', 'Gurpreet', 'Joseph', 'Maria', 'Deepak',
  'Swati', 'Abhishek', 'Nandini', 'Sanjay', 'Shruti', 'Amit', 'Tanvi', 'Rajesh', 'Sunita', 'Mohan',
  'Rekha', 'Faisal', 'Zoya', 'Anil', 'Preeti', 'Vivek', 'Aishwarya', 'Kiran', 'Shalini', 'Ramesh',
];

const LAST_NAMES = [
  'Sharma', 'Iyer', 'Reddy', 'Nair', 'Patel', 'Gupta', 'Menon', 'Rao', 'Kulkarni', 'Banerjee',
  'Singh', 'Mehta', 'Joshi', 'Desai', 'Chatterjee', 'Pillai', 'Naidu', 'Verma', 'Kapoor', 'Bhat',
  'Shetty', 'Mukherjee', 'Agarwal', 'Khan', 'Fernandes', 'Thomas', 'Mathew', 'Krishnan', 'Subramanian',
  'Malhotra', 'Bose', 'Das', 'Sen', 'Ghosh', 'Pandey', 'Mishra', 'Chopra', 'Sinha', 'Hegde', 'Saxena',
];

const CLINICS_PER_CITY = 3;
const DOCTORS_PER_SPECIALTY_PER_CITY = 2;

// A fixed random sequence, so the same realistic data is created every time
function makeRandom(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = makeRandom(2026);

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildData() {
  const firsts = shuffle(FIRST_NAMES);
  const lasts = shuffle(LAST_NAMES);
  const clinicNames = shuffle(CLINIC_NAMES);
  const cityNames = Object.keys(CITIES);

  // Three clinics per city, each in a different locality
  const clinics = [];
  for (const city of cityNames) {
    for (const place of shuffle(CITIES[city]).slice(0, CLINICS_PER_CITY)) {
      const number = 1 + Math.floor(rand() * 180);
      const street = STREETS[Math.floor(rand() * STREETS.length)];
      clinics.push({ name: clinicNames[clinics.length], city, address: `${number}, ${street}, ${place}` });
    }
  }

  // Every specialty in every city
  const doctors = [];
  for (const city of cityNames) {
    const cityClinics = clinics.filter((c) => c.city === city);
    SPECIALTIES.forEach((spec, si) => {
      for (let k = 0; k < DOCTORS_PER_SPECIALTY_PER_CITY; k++) {
        const i = doctors.length;
        const first = firsts[i % firsts.length];
        const last = lasts[(i + Math.floor(i / firsts.length)) % lasts.length];
        const experience = 3 + Math.floor(rand() * 26);
        doctors.push({
          name: `Dr. ${first} ${last}`,
          email: `${first}.${last}@medislot.com`.toLowerCase(),
          specialty: spec.name,
          clinic: cityClinics[(si + k) % cityClinics.length].name,
          experience,
          fee: Math.round((spec.fee + experience * 8) / 50) * 50,
        });
      }
    });
  }

  if (new Set(doctors.map((d) => d.email)).size !== doctors.length) {
    throw new Error('Duplicate doctor names were generated');
  }
  return { clinics, doctors };
}

async function main() {
  const reset = process.argv.includes('--reset');
    const lock = process.argv.includes('--lock-doctors');
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin1234';
  const doctorPassword = process.env.DOCTOR_PASSWORD || 'Password123';
  const { clinics, doctors } = buildData();

  const client = await db.connect();
  try {
    if (!reset) {
      const existing = await client.query('SELECT count(*)::int AS n FROM doctors');
      if (existing.rows[0].n > 0) {
        console.log('Doctors already exist. To wipe everything and reseed, run with --reset');
        return;
      }
    }

    const adminHash = await bcrypt.hash(adminPassword, 10);
    const doctorHash = await bcrypt.hash(doctorPassword, 10);
    // With --lock-doctors, every doctor except the first gets a random password nobody knows
    const lockedHash = lock
      ? await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10)
      : doctorHash;
    await client.query('BEGIN');
    if (reset) {
      await client.query(
        'TRUNCATE appointments, slots, doctors, clinics, specialties, users RESTART IDENTITY CASCADE');
    }

    await client.query(
      'INSERT INTO specialties (name) SELECT unnest($1::text[]) ON CONFLICT (name) DO NOTHING',
      [SPECIALTIES.map((s) => s.name)]);
    const sp = await client.query('SELECT id, name FROM specialties');
    const specialtyId = new Map(sp.rows.map((r) => [r.name, r.id]));

    const cl = await client.query(
      `INSERT INTO clinics (name, city, address)
       SELECT n, c, a FROM unnest($1::text[], $2::text[], $3::text[]) AS t(n, c, a)
       RETURNING id, name`,
      [clinics.map((c) => c.name), clinics.map((c) => c.city), clinics.map((c) => c.address)]);
    const clinicId = new Map(cl.rows.map((r) => [r.name, r.id]));

    await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ('Admin', 'admin@medislot.com', $1, 'admin')
       ON CONFLICT (email) DO NOTHING`, [adminHash]);

        const us = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       SELECT n, e, h, 'doctor' FROM unnest($1::text[], $2::text[], $3::text[]) AS t(n, e, h)
       RETURNING id, email`,
      [
        doctors.map((d) => d.name),
        doctors.map((d) => d.email),
        doctors.map((d, i) => (i === 0 || !lock ? doctorHash : lockedHash)),
      ]);
    const userId = new Map(us.rows.map((r) => [r.email, r.id]));

    await client.query(
      `INSERT INTO doctors (user_id, specialty_id, clinic_id, experience_years, consultation_fee)
       SELECT u, s, c, e, f
       FROM unnest($1::bigint[], $2::int[], $3::bigint[], $4::int[], $5::numeric[]) AS t(u, s, c, e, f)`,
      [
        doctors.map((d) => userId.get(d.email)),
        doctors.map((d) => specialtyId.get(d.specialty)),
        doctors.map((d) => clinicId.get(d.clinic)),
        doctors.map((d) => d.experience),
        doctors.map((d) => d.fee),
      ]);

    await client.query(SLOTS_SQL);
    await client.query('COMMIT');

    const counts = await client.query(
      `SELECT (SELECT count(*) FROM clinics) AS clinics,
              (SELECT count(*) FROM doctors) AS doctors,
              (SELECT count(*) FROM slots) AS slots`);
    const gaps = await client.query(
      `SELECT count(*)::int AS gaps
       FROM (SELECT DISTINCT city FROM clinics) c
       CROSS JOIN specialties s
       WHERE NOT EXISTS (
         SELECT 1 FROM doctors d JOIN clinics cl ON cl.id = d.clinic_id
         WHERE cl.city = c.city AND d.specialty_id = s.id)`);

    console.log('Seed complete:', counts.rows[0]);
    console.log('City and specialty combinations with no doctor:', gaps.rows[0].gaps);
    console.log(`Demo doctor login: ${doctors[0].email} / ${doctorPassword}`);
    console.log(`Admin login: admin@medislot.com / ${adminPassword}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
  } finally {
    client.release();
    await db.end();
  }
}

main();