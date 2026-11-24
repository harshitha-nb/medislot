const { createClient } = require('redis');

const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

let warned = false;
client.on('error', (err) => {
  if (!warned) { console.error('Redis error (app keeps working without cache):', err.message); warned = true; }
});
client.on('ready', () => { warned = false; console.log('Redis connected'); });
if (process.env.CACHE_DISABLED !== '1') client.connect().catch(() => {});
async function getJSON(key) {
  if (!client.isReady) return null;
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch { return null; }
}

async function setJSON(key, value, ttlSeconds) {
  if (!client.isReady) return;
  try { await client.set(key, JSON.stringify(value), { EX: ttlSeconds }); } catch {}
}

async function del(key) {
  if (!client.isReady) return;
  try { await client.del(key); } catch {}
}

module.exports = { getJSON, setJSON, del };