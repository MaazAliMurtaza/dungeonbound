import { createHash } from 'node:crypto';
export function validCredentials(email, password) {
  const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return { error: 'Enter a valid email address.' };
  if (typeof password !== 'string' || password.length < 10 || password.length > 72) return { error: 'Password must be 10–72 characters.' };
  return { email: normalized, password };
}
export function digestToken(token) { return createHash('sha256').update(token).digest('hex'); }
export function validProgress(progress) {
  if (!progress || typeof progress !== 'object' || Array.isArray(progress) || progress.version !== 1) return false;
  if (!progress.hero || !['Warrior','Ranger','Mage'].includes(progress.hero.className)) return false;
  if (!Array.isArray(progress.rooms) || progress.rooms.length !== 8) return false;
  if (!Number.isInteger(progress.roomIndex) || progress.roomIndex < -1 || progress.roomIndex > 7) return false;
  if (!Array.isArray(progress.inventory) || progress.inventory.length > 1000) return false;
  if (typeof progress.kills !== 'number' || !Number.isFinite(progress.kills) || progress.kills < 0) return false;
  if (!Number.isFinite(progress.hero.hp) || progress.hero.hp < 0 || !Number.isFinite(progress.hero.maxHp) || progress.hero.maxHp < 1) return false;
  return true;
}
