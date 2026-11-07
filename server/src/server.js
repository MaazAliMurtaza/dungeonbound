import 'dotenv/config';
import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import express from 'express';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import { pool } from './db.js';
import { digestToken, validCredentials, validProgress } from './validators.js';
import { SAVE_FORMAT_VERSION } from '../../mobile/src/state-schema.js';

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const ISSUER = 'dungeonbound-api';
const AUDIENCE = 'dungeonbound-mobile';
const SECRET = process.env.JWT_SECRET ?? '';
if (SECRET.length < 32 || SECRET.startsWith('REPLACE_')) throw new Error('Set a strong random JWT_SECRET of at least 32 characters.');
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : false); // Set TRUST_PROXY=1 only behind a trusted reverse proxy.
app.use(helmet());
app.use(express.json({ limit: '80kb' }));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many attempts. Try again later.' } });
const saveLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many requests.' } });
const safe = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function publicUser(row) { return { id: row.id, email: row.email }; }
function accessToken(userId, sessionId) {
  return jwt.sign({ sid: sessionId }, SECRET, { subject: userId, issuer: ISSUER, audience: AUDIENCE, expiresIn: '15m', algorithm: 'HS256' });
}
function newRefresh() { return randomBytes(32).toString('base64url'); }
async function issueSession(client, user) {
  const refreshToken = newRefresh();
  const sessionId = randomUUID();
  await client.query('INSERT INTO sessions (id, user_id, refresh_hash, expires_at) VALUES ($1,$2,$3,NOW() + INTERVAL \'30 days\')', [sessionId, user.id, digestToken(refreshToken)]);
  return { user: publicUser(user), accessToken: accessToken(user.id, sessionId), refreshToken };
}
const requireAuth = safe(async (req, res, next) => {
  const match = /^Bearer (\S+)$/.exec(req.headers.authorization ?? '');
  if (!match) return res.status(401).json({ error: 'Authorization token required.' });
  try {
    const claims = jwt.verify(match[1], SECRET, { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE });
    if (typeof claims === 'string' || typeof claims.sub !== 'string' || typeof claims.sid !== 'string') throw new Error('Invalid claims');
    req.userId = claims.sub;
    req.sessionId = claims.sid;
  } catch { res.status(401).json({ error: 'Invalid or expired access token.' }); }
  if (res.headersSent) return;
  const session = await pool.query('SELECT 1 FROM sessions WHERE id=$1 AND user_id=$2 AND expires_at > NOW()', [req.sessionId, req.userId]);
  if (!session.rowCount) return res.status(401).json({ error: 'Session revoked. Sign in again.' });
  next();
});
app.get('/health', safe(async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', service: 'dungeonbound-api', saveVersion: SAVE_FORMAT_VERSION });
}));
app.post('/auth/register', authLimiter, safe(async (req, res) => {
  const credential = validCredentials(req.body?.email, req.body?.password);
  if (credential.error) return res.status(400).json({ error: credential.error });
  const hash = await bcrypt.hash(credential.password, 12);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = await client.query('INSERT INTO users (id, email, password_hash) VALUES ($1,$2,$3) RETURNING id, email', [randomUUID(), credential.email, hash]);
    const session = await issueSession(client, created.rows[0]);
    await client.query('COMMIT');
    res.status(201).json(session);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return res.status(409).json({ error: 'Account already exists.' });
    throw error;
  } finally { client.release(); }
}));
app.post('/auth/login', authLimiter, safe(async (req, res) => {
  const credential = validCredentials(req.body?.email, req.body?.password);
  if (credential.error) return res.status(400).json({ error: credential.error });
  const result = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [credential.email]);
  const user = result.rows[0];
  // Respond identically for unknown users and incorrect passwords.
  const dummy = '$2b$12$C6UzMDM.H6dfI/f/IKcEeOpuUQH/tgS5kHJBc9xrCzQ5U8GPQq6bK';
  const valid = await bcrypt.compare(credential.password, user?.password_hash ?? dummy);
  if (!user || !valid) return res.status(401).json({ error: 'Invalid email or password.' });
  res.json(await issueSession(pool, user));
}));
app.post('/auth/refresh', authLimiter, safe(async (req, res) => {
  const token = req.body?.refreshToken;
  if (typeof token !== 'string' || token.length < 30 || token.length > 120) return res.status(401).json({ error: 'Invalid session.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Lock the session, so simultaneous refresh attempts cannot reuse a rotated token.
    const result = await client.query(`SELECT users.id, users.email, sessions.id AS session_id FROM sessions
      JOIN users ON users.id=sessions.user_id WHERE refresh_hash=$1 AND expires_at > NOW() FOR UPDATE OF sessions`, [digestToken(token)]);
    const session = result.rows[0];
    if (!session) { await client.query('ROLLBACK'); return res.status(401).json({ error: 'Session expired. Sign in again.' }); }
    await client.query('DELETE FROM sessions WHERE id=$1', [session.session_id]);
    const renewed = await issueSession(client, session);
    await client.query('COMMIT');
    res.json(renewed);
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));
app.post('/auth/logout', safe(async (req, res) => {
  const token = req.body?.refreshToken;
  if (typeof token === 'string' && token.length <= 120) await pool.query('DELETE FROM sessions WHERE refresh_hash=$1', [digestToken(token)]);
  res.status(204).end();
}));
app.get('/save', requireAuth, safe(async (req, res) => {
  const result = await pool.query('SELECT progress, updated_at, client_updated_at FROM saves WHERE user_id=$1', [req.userId]);
  const row = result.rows[0];
  res.json({ progress: row?.progress ?? null, updatedAt: row?.updated_at ?? null, clientUpdatedAt: row?.client_updated_at ? Number(row.client_updated_at) : null });
}));
app.put('/save', requireAuth, saveLimiter, safe(async (req, res) => {
  const progress = req.body?.progress;
  const clientUpdatedAt = req.body?.clientUpdatedAt;
  const baseRevision = req.body?.baseRevision ?? null;
  if (baseRevision !== null && (!Number.isSafeInteger(baseRevision) || baseRevision < 0)) return res.status(400).json({ error: 'Invalid base revision.' });
  if (!validProgress(progress) || !Number.isSafeInteger(clientUpdatedAt) || clientUpdatedAt < 1600000000000 || clientUpdatedAt > Date.now() + 300000) {
    return res.status(400).json({ error: 'Invalid game state or save timestamp.' });
  }
  // Prevent an older request arriving late from overwriting a more recent save.
  const result = await pool.query(`INSERT INTO saves (user_id, progress, client_updated_at) VALUES ($1,$2::jsonb,$3)
    ON CONFLICT (user_id) DO UPDATE SET progress = EXCLUDED.progress, client_updated_at = EXCLUDED.client_updated_at, updated_at=NOW()
    WHERE (saves.progress->>'version')::int <= (EXCLUDED.progress->>'version')::int AND (
      (saves.client_updated_at = EXCLUDED.client_updated_at AND saves.progress=EXCLUDED.progress)
      OR (saves.client_updated_at < EXCLUDED.client_updated_at AND ($4::bigint IS NULL OR saves.client_updated_at=$4)))
    RETURNING updated_at`, [req.userId, JSON.stringify(progress), clientUpdatedAt, baseRevision]);
  if (!result.rows.length) return res.status(409).json({ error: 'Save changed or requires a newer app version. Reload before saving.' });
  res.json({ saved: true, updatedAt: result.rows[0].updated_at, clientUpdatedAt });
}));
app.get('/leaderboard', requireAuth, safe(async (req, res) => {
  const result = await pool.query('SELECT alias, score, level, bosses FROM leaderboard ORDER BY score DESC, updated_at ASC LIMIT 50');
  res.json({ entries: result.rows, notice: 'Community records from player saves. Not a verified competitive ranking.' });
}));
app.post('/leaderboard', requireAuth, saveLimiter, safe(async (req, res) => {
  const alias = typeof req.body?.alias === 'string' ? req.body.alias.trim() : '';
  if (!/^[A-Za-z0-9 _-]{3,24}$/.test(alias)) return res.status(400).json({ error: 'Use a public hunter name of 3–24 letters, numbers, spaces, underscores or hyphens.' });
  const save = await pool.query('SELECT progress FROM saves WHERE user_id=$1', [req.userId]);
  const progress = save.rows[0]?.progress;
  if (!validProgress(progress)) return res.status(400).json({ error: 'Save your adventure before publishing a record.' });
  const { level } = progress.hero, { bosses, kills } = progress;
  const score = bosses * 1000 + kills * 25 + level * 100;
  await pool.query(`INSERT INTO leaderboard (user_id,alias,score,level,bosses) VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (user_id) DO UPDATE SET alias=EXCLUDED.alias, score=EXCLUDED.score, level=EXCLUDED.level, bosses=EXCLUDED.bosses, updated_at=NOW()`, [req.userId,alias,score,level,bosses]);
  res.json({ published: true });
}));
app.delete('/leaderboard', requireAuth, safe(async (req, res) => {
  await pool.query('DELETE FROM leaderboard WHERE user_id=$1', [req.userId]);
  res.status(204).end();
}));
app.use((error, req, res, next) => {
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Game state is too large.' });
  if (error instanceof SyntaxError && 'body' in error) return res.status(400).json({ error: 'Invalid JSON.' });
  console.error('Request failed:', error.message);
  res.status(500).json({ error: 'Server error. Please try again.' });
});
const listener = app.listen(PORT, process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'), (error) => {
  if (error) { console.error(`API failed to bind port ${PORT}: ${error.code ?? error.message}`); process.exitCode = 1; return; }
  console.log(`Dungeonbound API listening on port ${PORT}; save format ${SAVE_FORMAT_VERSION}`);
});
listener.on('error', () => { process.exitCode = 1; });
