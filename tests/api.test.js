process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgres://medislot:medislot@localhost:5432/medislot_test';
process.env.JWT_SECRET = 'jest_only_secret_0123456789abcdef0123456789';
process.env.CACHE_DISABLED = '1';
delete process.env.RATE_LIMIT;

// Safety: these tests wipe tables, so they must only run on a test database
if (!process.env.DATABASE_URL.includes('test')) {
  throw new Error('Refusing to run tests on a database whose URL does not contain "test"');
}

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const db = require('../src/config/db');

let doctorId, doctorToken, adminToken, seq = 0;

const futureDate = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function login(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

async function newPatient() {
  const email = `patient${++seq}_${Date.now()}@test.com`;
  await request(app).post('/api/auth/register')
    .send({ name: `Patient ${seq}`, email, password: 'password123' });
  return { email, token: await login(email, 'password123') };
}

beforeAll(async () => {
  await db.query(
    'TRUNCATE appointments, slots, doctors, clinics, specialties, users RESTART IDENTITY CASCADE');
  const hash = await bcrypt.hash('Password123', 4);
  await db.query(`INSERT INTO specialties (name) VALUES ('Cardiology'), ('Dermatology')`);
  await db.query(
    `INSERT INTO clinics (name, city, address) VALUES ('Test Clinic', 'Bengaluru', '1 Test Road')`);
  await db.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES
       ('Admin', 'admin@test.com', $1, 'admin'),
       ('Dr Test', 'doctor@test.com', $1, 'doctor')`, [hash]);
  const d = await db.query(
    `INSERT INTO doctors (user_id, specialty_id, clinic_id, experience_years, consultation_fee)
     SELECT id, 1, 1, 5, 500 FROM users WHERE email = 'doctor@test.com' RETURNING id`);
  doctorId = d.rows[0].id;
  doctorToken = await login('doctor@test.com', 'Password123');
  adminToken = await login('admin@test.com', 'Password123');
});

afterAll(async () => {
  await db.end();
});

describe('Health and auth', () => {
  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('register creates a patient and never returns the password hash', async () => {
    const email = `new${Date.now()}@test.com`;
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'New User', email, password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email, role: 'patient' });
    expect(res.body.password_hash).toBeUndefined();
  });

  test('register rejects duplicate emails (409) and short passwords (400)', async () => {
    const email = `dup${Date.now()}@test.com`;
    const body = { name: 'Dup', email, password: 'password123' };
    expect((await request(app).post('/api/auth/register').send(body)).status).toBe(201);
    expect((await request(app).post('/api/auth/register').send(body)).status).toBe(409);
    const short = await request(app).post('/api/auth/register')
      .send({ name: 'Short', email: `s${Date.now()}@test.com`, password: '123' });
    expect(short.status).toBe(400);
  });

  test('login returns a token, and a wrong password returns 401', async () => {
    const p = await newPatient();
    expect(typeof p.token).toBe('string');
    const bad = await request(app).post('/api/auth/login')
      .send({ email: p.email, password: 'wrongpassword' });
    expect(bad.status).toBe(401);
  });

  test('GET /api/auth/me needs a valid token', async () => {
    const p = await newPatient();
    const ok = await request(app).get('/api/auth/me').set(auth(p.token));
    expect(ok.status).toBe(200);
    expect(ok.body.email).toBe(p.email);
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set(auth('garbage'))).status).toBe(401);
  });
});

describe('Doctors and meta', () => {
  test('lists doctors', async () => {
    const res = await request(app).get('/api/doctors');
    expect(res.status).toBe(200);
    expect(res.body.doctors).toHaveLength(1);
    expect(res.body.doctors[0]).toMatchObject({ name: 'Dr Test', specialty: 'Cardiology' });
  });

  test('filters are case-insensitive and can return nothing', async () => {
    const hit = await request(app).get('/api/doctors?specialty=cardiology&city=bengaluru');
    expect(hit.body.count).toBe(1);
    const miss = await request(app).get('/api/doctors?city=Atlantis');
    expect(miss.body.count).toBe(0);
  });

  test('doctor details, and 404 for an unknown doctor', async () => {
    const ok = await request(app).get(`/api/doctors/${doctorId}`);
    expect(ok.status).toBe(200);
    expect(ok.body.name).toBe('Dr Test');
    expect((await request(app).get('/api/doctors/99999')).status).toBe(404);
  });

  test('meta lists specialties and cities', async () => {
    const res = await request(app).get('/api/meta');
    expect(res.body.specialties).toContain('Cardiology');
    expect(res.body.cities).toContain('Bengaluru');
  });

  test('slots endpoint validates the date', async () => {
    const res = await request(app).get(`/api/doctors/${doctorId}/slots?date=abc`);
    expect(res.status).toBe(400);
  });
});

describe('Doctor portal', () => {
  const date = futureDate(10);
  const body = { date, startTime: '10:00', endTime: '12:00', durationMinutes: 30 };

  test('requires a token, and only doctors may use it', async () => {
    expect((await request(app).get(`/api/portal/slots?date=${date}`)).status).toBe(401);
    const p = await newPatient();
    const res = await request(app).get(`/api/portal/slots?date=${date}`).set(auth(p.token));
    expect(res.status).toBe(403);
  });

  test('creates slots, and repeating the request creates none', async () => {
    const first = await request(app).post('/api/portal/slots').set(auth(doctorToken)).send(body);
    expect(first.status).toBe(201);
    expect(first.body.created).toBe(4);
    const again = await request(app).post('/api/portal/slots').set(auth(doctorToken)).send(body);
    expect(again.body.created).toBe(0);
  });

  test('rejects bad input', async () => {
    const badTime = await request(app).post('/api/portal/slots').set(auth(doctorToken))
      .send({ ...body, startTime: '9am' });
    expect(badTime.status).toBe(400);
    const badDate = await request(app).post('/api/portal/slots').set(auth(doctorToken))
      .send({ ...body, date: '2026-13-45' });
    expect(badDate.status).toBe(400);
  });

  test('patients see the new slots, and the doctor can delete an unbooked one', async () => {
    const pub = await request(app).get(`/api/doctors/${doctorId}/slots?date=${date}`);
    expect(pub.body.slots).toHaveLength(4);

    const mine = await request(app).get(`/api/portal/slots?date=${date}`).set(auth(doctorToken));
    expect(mine.body.slots).toHaveLength(4);
    expect(mine.body.slots.every((s) => s.booked === false)).toBe(true);

    const del = await request(app).delete(`/api/portal/slots/${mine.body.slots[0].id}`)
      .set(auth(doctorToken));
    expect(del.status).toBe(200);
    const after = await request(app).get(`/api/portal/slots?date=${date}`).set(auth(doctorToken));
    expect(after.body.slots).toHaveLength(3);
  });
});

describe('Booking', () => {
  let slotIds, pastSlotId, alice, bob;

  beforeAll(async () => {
    const s = await db.query(
      `INSERT INTO slots (doctor_id, start_time, end_time)
       SELECT $1, now() + interval '3 days' + g * interval '30 minutes',
                  now() + interval '3 days' + (g + 1) * interval '30 minutes'
       FROM generate_series(0, 9) AS g
       RETURNING id`, [doctorId]);
    slotIds = s.rows.map((r) => r.id);
    const past = await db.query(
      `INSERT INTO slots (doctor_id, start_time, end_time)
       VALUES ($1, now() - interval '1 day', now() - interval '23 hours') RETURNING id`, [doctorId]);
    pastSlotId = past.rows[0].id;
    alice = await newPatient();
    bob = await newPatient();
  });

  test('needs a token and a valid slotId', async () => {
    expect((await request(app).post('/api/appointments').send({ slotId: slotIds[0] })).status).toBe(401);
    const bad = await request(app).post('/api/appointments').set(auth(alice.token))
      .send({ slotId: 'abc' });
    expect(bad.status).toBe(400);
  });

  test('cannot book a slot that does not exist or already started', async () => {
    const missing = await request(app).post('/api/appointments').set(auth(alice.token))
      .send({ slotId: 999999 });
    expect(missing.status).toBe(404);
    const past = await request(app).post('/api/appointments').set(auth(alice.token))
      .send({ slotId: pastSlotId });
    expect(past.status).toBe(404);
  });

  test('a booked slot cannot be booked again, and cancelling frees it', async () => {
    const slot = slotIds[0];
    const first = await request(app).post('/api/appointments').set(auth(alice.token))
      .send({ slotId: slot });
    expect(first.status).toBe(201);
    expect(first.body.status).toBe('confirmed');

    const second = await request(app).post('/api/appointments').set(auth(bob.token))
      .send({ slotId: slot });
    expect(second.status).toBe(409);

    const mine = await request(app).get('/api/appointments/mine').set(auth(alice.token));
    expect(mine.body.appointments).toHaveLength(1);
    expect(mine.body.appointments[0].doctor).toBe('Dr Test');

    const byBob = await request(app).delete(`/api/appointments/${first.body.id}`)
      .set(auth(bob.token));
    expect(byBob.status).toBe(404);              // cannot cancel someone else's appointment

    const cancel = await request(app).delete(`/api/appointments/${first.body.id}`)
      .set(auth(alice.token));
    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe('cancelled');

    const rebook = await request(app).post('/api/appointments').set(auth(bob.token))
      .send({ slotId: slot });
    expect(rebook.status).toBe(201);
  });

  test('the doctor sees the appointment', async () => {
    const res = await request(app).get('/api/portal/appointments').set(auth(doctorToken));
    expect(res.status).toBe(200);
    expect(res.body.appointments.some((a) => a.status === 'confirmed')).toBe(true);
  });

  test('20 patients booking the same slot at once: exactly one wins', async () => {
    const slot = slotIds[5];
    const users = await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       SELECT 'Racer ' || g, 'racer' || g || '@test.com', 'x', 'patient'
       FROM generate_series(1, 20) AS g RETURNING id`);
    const tokens = users.rows.map((u) =>
      jwt.sign({ id: u.id, role: 'patient' }, process.env.JWT_SECRET));

    const results = await Promise.all(tokens.map((t) =>
      request(app).post('/api/appointments').set(auth(t)).send({ slotId: slot })));
    const statuses = results.map((r) => r.status);

    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(19);
    const rows = await db.query(
      `SELECT count(*)::int AS n FROM appointments WHERE slot_id = $1 AND status = 'confirmed'`,
      [slot]);
    expect(rows.rows[0].n).toBe(1);
  });
});

describe('Admin', () => {
  test('admin stats are admin-only', async () => {
    const ok = await request(app).get('/api/admin/stats').set(auth(adminToken));
    expect(ok.status).toBe(200);
    expect(typeof ok.body.doctors).toBe('number');
    const p = await newPatient();
    expect((await request(app).get('/api/admin/stats').set(auth(p.token))).status).toBe(403);
    expect((await request(app).get('/api/admin/stats')).status).toBe(401);
  });

  test('admin adds a specialty, and duplicates return 409', async () => {
    const make = () => request(app).post('/api/admin/specialties').set(auth(adminToken))
      .send({ name: 'Neurology' });
    expect((await make()).status).toBe(201);
    expect((await make()).status).toBe(409);
  });

  test('admin adds a doctor, with duplicate and invalid-clinic checks', async () => {
    const doctor = {
      name: 'Dr. New', email: 'newdoc@test.com', password: 'Password123',
      specialtyId: 1, clinicId: 1, experienceYears: 3, consultationFee: 400
    };
    const post = (b) => request(app).post('/api/admin/doctors').set(auth(adminToken)).send(b);
    expect((await post(doctor)).status).toBe(201);
    expect((await post(doctor)).status).toBe(409);
    expect((await post({ ...doctor, email: 'other@test.com', clinicId: 999 })).status).toBe(400);
  });
});