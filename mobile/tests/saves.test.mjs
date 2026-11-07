import test from "node:test";
import assert from "node:assert/strict";
import { newGame } from "../src/game.ts";
import { newestSave, reconcileSaves } from "../src/saves.ts";

test("startup protects unsent local progress from a newer cloud clock", () => {
  const local = { savedAt: 200, progress: { seed: 1 } },
    cloud = { savedAt: 300, progress: { seed: 2 } };
  assert.deepEqual(reconcileSaves(local, cloud, 100), {
    selected: local,
    conflict: true,
  });
  assert.deepEqual(reconcileSaves(local, cloud, null), {
    selected: local,
    conflict: true,
  });
  assert.deepEqual(reconcileSaves(local, cloud, 200), {
    selected: cloud,
    conflict: false,
  });
  assert.deepEqual(reconcileSaves(local, { ...cloud, savedAt: 100 }, 100), {
    selected: local,
    conflict: false,
  });
  assert.equal(
    reconcileSaves(local, { ...cloud, savedAt: 200 }, 100).conflict,
    false,
  );
});

test("restoring newer cloud progress preserves its original timestamp", () => {
  const local = { savedAt: 1700000000000, progress: newGame("Warrior", 1) };
  const cloud = { savedAt: 1700000001000, progress: newGame("Mage", 2) };
  assert.equal(newestSave(local, cloud), cloud);
  assert.equal(newestSave(null, cloud)?.savedAt, 1700000001000);
});

test("offline or older cloud progress cannot replace newer local progress", () => {
  const local = { savedAt: 1700000001000, progress: newGame("Ranger", 3) };
  const older = { savedAt: 1700000000000, progress: newGame("Mage", 2) };
  assert.equal(newestSave(local, older), local);
  assert.equal(newestSave(local, null), local);
  assert.equal(newestSave(null, null), null);
});
