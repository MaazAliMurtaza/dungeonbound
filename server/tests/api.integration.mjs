// Explicit integration check: requires the target API and its matching database.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { pool } from '../src/db.js';
import { digestToken } from '../src/validators.js';
import { validateApiUrl } from '../../mobile/src/api-url.ts';

const configured = process.env.API_BASE_URL || 'http://127.0.0.1:4000';
const host = new URL(configured).hostname;
const localTest = process.env.DUNGEONBOUND_LOCAL_TEST === '1';
if (localTest && !/^(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/.test(host)) {
  throw new Error('Local-test override requires a loopback or private-network address.');
}
const base = validateApiUrl(configured, !localTest && !['localhost', '127.0.0.1', '[::1]'].includes(host));
const emails = [];
async function request(path, method = 'GET', body, token) {
  const response = await fetch(base + path, {
    signal: AbortSignal.timeout(45000),
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
  const firstSave = await request('/save', 'PUT', { progress, clientUpdatedAt: timestamp }, first.accessToken);
  check(firstSave.status === 200, `authenticated save (${firstSave.status}${firstSave.data?.error ? ': '+firstSave.data.error : ''})`);
  assert.deepEqual((await request('/save', 'GET', undefined, first.accessToken)).data.progress, progress);
  console.log('PASS: saved progress round trip');
  check((await request('/save', 'PUT', { progress: {version: 2}, clientUpdatedAt: timestamp+1 }, first.accessToken)).status === 400, 'incomplete saves rejected');
  check((await request('/save', 'PUT', { progress: {...progress, accessToken:'invalid-extra-field'}, clientUpdatedAt: timestamp+1 }, first.accessToken)).status === 400, 'unknown credential fields rejected');
  check((await request('/save', 'PUT', { progress, clientUpdatedAt: timestamp+1, baseRevision: timestamp-1 }, first.accessToken)).status === 409, 'optimistic revision conflict rejected');
  const changed = structuredClone(progress); changed.hero.gold++;
  check((await request('/save', 'PUT', { progress: changed, clientUpdatedAt: timestamp, baseRevision: timestamp }, first.accessToken)).status === 409, 'equal timestamp cannot overwrite different progress');
  check((await request('/save', 'PUT', { progress: changed, clientUpdatedAt: timestamp+1, baseRevision: timestamp }, first.accessToken)).status === 200, 'matching base revision accepted');
  const upgraded = structuredClone(changed);
  upgraded.hero.speed = 24; upgraded.specialization = 'survival';
  upgraded.inventory.push({id:'integration-seal',name:'Sovereign Seal',slot:'accessory',rarity:'Legendary',bonus:8,stat:'speed'});
  upgraded.equipment.accessory='integration-seal';
  check((await request('/save','PUT',{progress:upgraded,clientUpdatedAt:timestamp+2,baseRevision:timestamp+1},first.accessToken)).status===200,'Legendary accessory and mastery accepted');
  assert.deepEqual((await request('/save','GET',undefined,first.accessToken)).data.progress,upgraded);
  console.log('PASS: version-three equipment round trip');
  const oldClient=structuredClone(changed);oldClient.version=2;
  delete oldClient.hero.speed;delete oldClient.equipment.accessory;delete oldClient.specialization;
  check((await request('/save','PUT',{progress:oldClient,clientUpdatedAt:timestamp+3,baseRevision:timestamp+2},first.accessToken)).status===409,'older app cannot downgrade an upgraded save');
  check((await request('/save','GET',undefined,first.accessToken)).data.progress.equipment.accessory==='integration-seal','downgrade rejection preserves equipped accessory');
  check((await request('/leaderboard', 'POST', {alias:'Test Hunter'}, first.accessToken)).status === 200, 'opt-in leaderboard record published');
  const board = (await request('/leaderboard', 'GET', undefined, first.accessToken)).data;
  check(board.entries.some(row=>row.alias==='Test Hunter') && board.entries.every(row=>!('email' in row)&&!('user_id' in row)), 'leaderboard excludes account identity');
  check((await request('/leaderboard', 'POST', {alias:'<script>'}, first.accessToken)).status === 400, 'unsafe public alias rejected');
  check((await request('/leaderboard', 'DELETE', undefined, first.accessToken)).status === 204, 'leaderboard opt-out');
  check((await request('/save', 'GET', undefined, second.accessToken)).data.progress === null, 'second user cannot read first user save');
  check((await request('/save', 'PUT', { progress, clientUpdatedAt: timestamp - 1 }, first.accessToken)).status === 409, 'stale save rejected');
  const rows = await pool.query('SELECT refresh_hash FROM sessions WHERE user_id=$1', [first.user.id]);
  check(rows.rows.some(row => row.refresh_hash === digestToken(first.refreshToken)) && rows.rows.every(row => /^[a-f0-9]{64}$/.test(row.refresh_hash)), 'database stores refresh digests');
  const refreshed = await request('/auth/refresh', 'POST', { refreshToken: first.refreshToken });
  check(refreshed.status === 200 && refreshed.data.refreshToken !== first.refreshToken, 'refresh rotates token');
  check((await request('/auth/refresh', 'POST', { refreshToken: first.refreshToken })).status === 401, 'old refresh token rejected');
  check((await request('/save', 'GET', undefined, refreshed.data.accessToken)).status === 200, 'renewed access accepted');
  check((await request('/auth/logout', 'POST', { refreshToken: refreshed.data.refreshToken })).status === 204, 'logout');
  check((await request('/save', 'GET', undefined, refreshed.data.accessToken)).status === 401, 'logout immediately revokes access token');
  check((await request('/auth/refresh', 'POST', { refreshToken: refreshed.data.refreshToken })).status === 401, 'logged-out refresh rejected');
} finally {
  await pool.query('DELETE FROM users WHERE email = ANY($1::text[])', [emails]);
  await pool.end();
}
