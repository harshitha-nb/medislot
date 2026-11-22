const BASE = process.env.BASE_URL || 'http://localhost:3000';
const slotId = parseInt(process.argv[2], 10);
const N = parseInt(process.argv[3], 10) || 50;

if (!Number.isInteger(slotId)) {
  console.log('Usage: node scripts/concurrency-test.js <slotId> [numberOfUsers]');
  process.exit(1);
}

async function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method: 'POST', headers, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function main() {
  const run = Date.now();

  // 1. Create N different patients and log each one in
  const tokens = await Promise.all(
    Array.from({ length: N }, async (_, i) => {
      const email = `race${run}_${i}@test.com`;
      await post('/api/auth/register', { name: `Racer ${i}`, email, password: 'password123' });
      const login = await post('/api/auth/login', { email, password: 'password123' });
      return login.body.token;
    })
  );

  // 2. Everyone books the SAME slot at the same moment
  const results = await Promise.all(tokens.map(t => post('/api/appointments', { slotId }, t)));

  const counts = {};
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;

  console.log(`Slot ${slotId}: ${N} simultaneous booking attempts`);
  console.log('Status counts:', counts);
  console.log(counts[201] === 1
    ? 'PASS: exactly one booking succeeded'
    : 'FAIL: expected exactly one 201');
}

main().catch(err => { console.error(err); process.exit(1); });