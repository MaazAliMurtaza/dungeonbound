import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/game.ts';
import { newestSave } from '../src/saves.ts';

test('restoring newer cloud progress preserves its original timestamp', () => {
  const local = { savedAt: 1700000000000, progress: newGame('Warrior', 1) };
  const cloud = { savedAt: 1700000001000, progress: newGame('Mage', 2) };
  assert.equal(newestSave(local, cloud), cloud);
  assert.equal(newestSave(null, cloud)?.savedAt, 1700000001000);
});

test('offline or older cloud progress cannot replace newer local progress', () => {
  const local = { savedAt: 1700000001000, progress: newGame('Ranger', 3) };
  const older = { savedAt: 1700000000000, progress: newGame('Mage', 2) };
  assert.equal(newestSave(local, older), local);
  assert.equal(newestSave(local, null), local);
  assert.equal(newestSave(null, null), null);
});
