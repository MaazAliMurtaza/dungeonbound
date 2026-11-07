import { createHash } from 'node:crypto';
import { validateGame } from '../../mobile/src/state-schema.js';
export function validCredentials(email, password) {
  const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return { error: 'Enter a valid email address.' };
  if (typeof password !== 'string' || password.length < 10 || password.length > 72) return { error: 'Password must be 10–72 characters.' };
  return { email: normalized, password };
}
export function digestToken(token) { return createHash('sha256').update(token).digest('hex'); }
export function validProgress(progress) {
  return validateGame(progress);
}
