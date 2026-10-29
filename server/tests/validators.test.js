import test from 'node:test';
import assert from 'node:assert/strict';
import { digestToken, validCredentials, validProgress } from '../src/validators.js';
test('normalizes and validates credentials', () => {
  assert.equal(validCredentials(' TEST@EXAMPLE.COM ', 'securepassword10').email, 'test@example.com');
  assert.ok(validCredentials('not-an-email', 'securepassword10').error);
  assert.ok(validCredentials('x@y.com', 'short').error);
});
test('hashing token does not store raw session secret', () => {
  const hashed = digestToken('example-secret');
  assert.equal(hashed.length, 64);
  assert.ok(!hashed.includes('example-secret'));
});
test('rejects malformed progress payload', () => {
  assert.equal(validProgress({ version: 1 }), false);
  assert.equal(validProgress({ version: 1, hero: { className:'Warrior', hp: 10, maxHp: 100 }, rooms: Array(8).fill({}), roomIndex: 0, inventory:[], kills:0 }), true);
});
