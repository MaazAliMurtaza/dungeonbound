// Explicit local integration check: npm run test:integration (requires API and DB).
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { pool } from '../src/db.js';
import { digestToken } from '../src/validators.js';

const base = 'http://127.0.0.1:4000';
const emails = [];
async function request(path, method = 'GET', body, token) {
  const response = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json().catch(() => null) };
}
function check(value, label) { assert.ok(value, label); console.log(`PASS: ${label}`); }
try {
  check((await request('/health')).data?.status === 'ok', 'database-backed health');
  const password = randomBytes(24).toString('base64url');
  async function register() {
    const email = `integration-${randomUUID()}@example.test`; emails.push(email);
    const result = await request('/auth/register', 'POST', { email, password });
    check(result.status === 201, 'registration'); return result.data;
  }
  const first = await register(), second = await register();
  check((await request('/auth/login', 'POST', { email: emails[0], password: randomBytes(24).toString('hex') })).status === 401, 'incorrect password rejected');
  const login = await request('/auth/login', 'POST', { email: emails[0], password });
  check(login.status === 200, 'login');
  const { newGame } = await import('../../mobile/src/game.ts');
  const progress = newGame('Warrior', 42), timestamp = Date.now();
  check((await request('/save')).status === 401, 'unauthenticated save read denied');
  check((await request('/save', 'PUT', { progress, clientUpdatedAt: timestamp }, first.accessToken)).status === 200, 'authenticated save');
  assert.deepEqual((await request('/save', 'GET', undefined, first.accessToken)).data.progress, progress);
  console.log('PASS: saved progress round trip');
  check((await request('/save', 'GET', undefined, second.accessToken)).data.progress === null, 'second user cannot read first user save');
  check((await request('/save', 'PUT', { progress, clientUpdatedAt: timestamp - 1 }, first.accessToken)).status === 409, 'stale save rejected');
  const rows = await pool.query('SELECT refresh_hash FROM sessions WHERE user_id=$1', [first.user.id]);
  check(rows.rows.some(row => row.refresh_hash === digestToken(first.refreshToken)) && rows.rows.every(row => /^[a-f0-9]{64}$/.test(row.refresh_hash)), 'database stores refresh digests');
  const refreshed = await request('/auth/refresh', 'POST', { refreshToken: first.refreshToken });
  check(refreshed.status === 200 && refreshed.data.refreshToken !== first.refreshToken, 'refresh rotates token');
  check((await request('/auth/refresh', 'POST', { refreshToken: first.refreshToken })).status === 401, 'old refresh token rejected');
  check((await request('/save', 'GET', undefined, refreshed.data.accessToken)).status === 200, 'renewed access accepted');
  check((await request('/auth/logout', 'POST', { refreshToken: refreshed.data.refreshToken })).status === 204, 'logout');
  check((await request('/auth/refresh', 'POST', { refreshToken: refreshed.data.refreshToken })).status === 401, 'logged-out refresh rejected');
} finally {
  await pool.query('DELETE FROM users WHERE email = ANY($1::text[])', [emails]);
  await pool.end();
}
