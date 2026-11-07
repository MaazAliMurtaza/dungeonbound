import test from "node:test";
import assert from "node:assert/strict";
import {
  newGame,
  buyItem,
  sellItem,
  equipItem,
  enterNextRoom,
  chooseRoomReward,
  combatAction,
  nextDungeon,
  claimQuest,
  questProgress,
  isGame,
  migrateGame,
} from "../src/game.ts";
import { SKILLS, QUESTS, FLOORS, RELICS } from "../src/content.ts";

function encounter(cls = "Warrior") {
  let g = newGame(cls, 42);
  while (!g.enemy)
    g = g.pendingChoice
      ? chooseRoomReward(g, g.pendingChoice === "relic" ? "ember" : "safe")
      : enterNextRoom(g);
  return g;
}
test("shop enforces affordability, class, levels, one-time skill ownership and combat lock", () => {
  let g = newGame("Warrior", 1);
  assert.deepEqual(buyItem(g, "m-fire"), g);
  assert.deepEqual(buyItem(g, "w-drain"), g);
  g = buyItem(g, "w-aegis");
  assert.equal(g.hero.gold, 5);
  assert.equal(g.skills.length, 2);
  assert.deepEqual(buyItem(g, "w-aegis"), g);
  assert.deepEqual(buyItem(g, "weapon"), g);
  const fight = encounter();
  assert.deepEqual(buyItem(fight, "potion"), fight);
});
test("equipment transactions never sell equipped gear, duplicate gold, or mutate the input", () => {
  const initial = newGame("Mage", 8);
  initial.hero.gold = 200;
  const g = buyItem(initial, "weapon");
  assert.equal(initial.inventory.length, 0);
  assert.equal(g.hero.gold, 135);
  const id = g.inventory[0].id,
    equipped = equipItem(g, id);
  assert.deepEqual(sellItem(equipped, id), equipped);
  const sold = sellItem(g, id);
  assert.equal(sold.inventory.length, 0);
  assert.deepEqual(sellItem(sold, id), sold);
});
test("all fifteen skills execute and persist a schema-valid state", () => {
  for (const sk of SKILLS) {
    let g = encounter(sk.className);
    g.skills = SKILLS.filter((s) => s.className === sk.className).map(
      (s) => s.id,
    );
    g.hero.mana = g.hero.maxMana = 100;
    g.enemy.hp = g.enemy.maxHp = 1000;
    const before = g.hero.mana;
    g = combatAction(g, "skill", sk.id);
    assert.equal(g.hero.mana, before - sk.mana, sk.id);
    assert.equal(g.cooldowns[sk.id], sk.cooldown);
    assert.ok(isGame(g), sk.id);
    if (sk.cooldown) assert.deepEqual(combatAction(g, "skill", sk.id), g);
  }
});
test("enemy heavy intent is defendable and control cancels retaliation", () => {
  const g = encounter();
  g.enemy.intent = "heavy";
  g.enemy.hp = g.enemy.maxHp = 1000;
  const attack = combatAction(g, "attack"),
    guard = combatAction(g, "defend");
  assert.ok(guard.hero.hp > attack.hero.hp);
  g.skills.push("w-stun");
  g.hero.mana = 20;
  const stunned = combatAction(g, "skill", "w-stun");
  assert.equal(stunned.hero.hp, g.hero.hp);
});
test("room rewards cannot be claimed repeatedly or skipped", () => {
  let g = newGame("Mage", 5);
  while (!g.pendingChoice) {
    if (g.enemy) g = combatAction(g, "skill");
    else g = enterNextRoom(g);
  }
  assert.deepEqual(enterNextRoom(g), g);
  const choice = g.pendingChoice === "relic" ? "blood" : "risk",
    reward = chooseRoomReward(g, choice);
  assert.equal(reward.pendingChoice, null);
  assert.deepEqual(chooseRoomReward(reward, choice), reward);
  assert.ok(isGame(reward));
});
test("all twelve contracts enforce thresholds and are claimed exactly once", () => {
  for (const q of QUESTS) {
    let g = newGame("Warrior", 1);
    if (q.metric !== "skills" && q.metric !== "level")
      assert.deepEqual(claimQuest(g, q.id), g);
    if (q.metric === "skills") g.skills = ["w-cleave", "w-aegis", "w-break"];
    else if (q.metric === "level") g.hero.level = q.target;
    else if (q.metric === "relics") g.relics = ["ember", "shell", "star"];
    else g[q.metric] = q.target;
    assert.ok(questProgress(g, q.metric) >= q.target);
    const result = claimQuest(g, q.id);
    assert.ok(result.claimedQuests.includes(q.id));
    assert.deepEqual(claimQuest(result, q.id), result);
  }
});
test("six-floor campaign is winnable for all classes across ten seeds with decisions and progression", () => {
  for (const cls of ["Warrior", "Ranger", "Mage"])
    for (let seed = 1; seed <= 10; seed++) {
      let g = newGame(cls, seed),
        turns = 0;
      while (g.campaignWins === 0 && g.hero.hp > 0 && turns++ < 700) {
        assert.ok(isGame(g), `${cls} seed ${seed} turn ${turns}`);
        if (g.pendingChoice)
          g = chooseRoomReward(
            g,
            g.pendingChoice === "relic" ? "ember" : "safe",
          );
        else if (g.ended) g = nextDungeon(g);
        else if (!g.enemy) {
          for (const q of QUESTS) g = claimQuest(g, q.id);
          g = buyItem(g, "weapon");
          for (const item of g.inventory)
            if (
              item.bonus >
              (g.inventory.find((i) => i.id === g.equipment[item.slot])
                ?.bonus ?? 0)
            )
              g = equipItem(g, item.id);
          g = enterNextRoom(g);
        } else if (g.hero.hp < g.hero.maxHp * 0.45 && g.hero.potions)
          g = combatAction(g, "potion");
        else g = combatAction(g, g.hero.mana >= 8 ? "skill" : "attack");
      }
      assert.equal(
        g.campaignWins,
        1,
        `${cls} seed ${seed} HP ${g.hero.hp} floor ${g.floor}`,
      );
      assert.equal(g.bosses, 6);
    }
});
test("strict schema rejects missing fields, invalid gear, unknown sensitive keys and corrupt nested data", () => {
  const base = newGame("Ranger", 42);
  assert.ok(isGame(base));
  for (const mutate of [
    (g) => delete g.log,
    (g) => (g.hero.hp = -1),
    (g) => (g.hero.mana = Infinity),
    (g) => (g.rooms[2] = null),
    (g) => (g.equipment.weapon = "missing"),
    (g) => g.skills.push("m-fire"),
    (g) => (g.accessToken = "never-store-this"),
    (g) => (g.cooldowns.evil = 2),
    (g) => (g.hero.password = "secret"),
  ]) {
    const g = structuredClone(base);
    mutate(g);
    assert.equal(isGame(g), false);
  }
});
test("complete legacy saves migrate without losing progress; incomplete saves are rejected", () => {
  const legacy = newGame("Warrior", 55);
  legacy.version = 1;
  delete legacy.hero.speed;
  delete legacy.equipment.accessory;
  delete legacy.specialization;
  for (const key of [
    "floor",
    "skills",
    "cooldowns",
    "ethers",
    "shield",
    "roomsCleared",
    "lootFound",
    "purchases",
    "claimedQuests",
    "relics",
    "pendingChoice",
    "campaignWins",
  ])
    delete legacy[key];
  legacy.hero.gold = 321;
  const restored = migrateGame(legacy);
  assert.equal(restored.version, 3);
  assert.equal(restored.hero.gold, 321);
  assert.ok(isGame(restored));
  assert.equal(migrateGame({ version: 1 }), null);
  assert.equal(migrateGame({...legacy, skills: null}), null, 'legacy input cannot override migration defaults');
});
