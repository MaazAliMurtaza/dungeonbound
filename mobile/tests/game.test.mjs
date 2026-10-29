import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRooms, newGame, enterNextRoom, combatAction, equipItem, claimQuest, nextDungeon } from '../src/game.ts';

test('every seed creates a connected start-to-boss path of 8 rooms', () => {
  for (let seed = 0; seed < 500; seed++) {
    const rooms = makeRooms(seed);
    assert.equal(rooms.length, 8);
    assert.equal(rooms[0].kind, 'start');
    assert.equal(rooms[7].kind, 'boss');
    assert.deepEqual(rooms.map(r => r.id), [0,1,2,3,4,5,6,7]);
  }
});
test('classes have distinct attributes', () => {
  const w = newGame('Warrior', 1), r = newGame('Ranger', 1), m = newGame('Mage', 1);
  assert.ok(w.hero.hp > r.hero.hp && r.hero.hp > m.hero.hp);
  assert.ok(m.hero.attack > r.hero.attack);
});
test('combat never deals negative damage or negative HP', () => {
  let g = newGame('Warrior', 7);
  g = enterNextRoom(g);
  while (!g.enemy) g = enterNextRoom(g);
  for (let i = 0; i < 20 && g.enemy && g.hero.hp > 0; i++) g = combatAction(g, 'attack');
  assert.ok(g.hero.hp >= 0);
  assert.ok(!g.enemy || g.enemy.hp >= 0);
});
test('potion consumes one and restores at most maximum HP', () => {
  let g = newGame('Warrior', 8); g = enterNextRoom(g);
  while (!g.enemy) g = enterNextRoom(g);
  g.hero.hp = 20; g = combatAction(g, 'potion');
  assert.equal(g.hero.potions, 2);
  assert.ok(g.hero.hp <= g.hero.maxHp);
});
test('equipment and quest rewards work', () => {
  let g = newGame('Mage', 9);
  g.inventory.push({ id: 'one', name: 'Rare Blade', rarity: 'Rare', slot: 'weapon', bonus: 5 });
  g = equipItem(g, 'one'); assert.equal(g.equipment.weapon, 'one');
  g.kills = 3; g = claimQuest(g);
  assert.equal(g.questClaimed, true); assert.equal(g.hero.gold, 30);
  assert.equal(claimQuest(g).hero.gold, 30);
});
test('cleared dungeon unlocks new dungeon and restores stats', () => {
  let g = newGame('Warrior', 10); g.ended = true; g.dungeons = 1; g.hero.hp = 5;
  g = nextDungeon(g); assert.equal(g.ended, false); assert.equal(g.hero.hp, g.hero.maxHp);
});

test('a complete dungeon can be finished with each class over multiple seeds', () => {
  for (const cls of ['Warrior', 'Ranger', 'Mage']) {
    for (let seed = 1; seed <= 30; seed++) {
      let g = newGame(cls, seed), turns = 0;
      while (!g.ended && g.hero.hp > 0 && turns++ < 100) {
        if (!g.enemy) g = enterNextRoom(g);
        else if (g.hero.hp < g.hero.maxHp * .45 && g.hero.potions > 0) g = combatAction(g, 'potion');
        else g = combatAction(g, g.hero.mana >= 8 ? 'skill' : 'attack');
      }
      assert.ok(g.ended, `Could not finish as ${cls}, seed ${seed}`);
      assert.equal(g.rooms[7].cleared, true);
      assert.equal(g.bosses, 1);
    }
  }
});
test('the same procedural seed produces the same rooms and first encounter', () => {
  for (let seed = 1; seed <= 20; seed++) {
    let a = newGame('Mage', seed), b = newGame('Mage', seed);
    for (let i = 0; i < 4; i++) {
      a = enterNextRoom(a); b = enterNextRoom(b);
      assert.deepEqual(a, b);
      if (a.enemy) break;
    }
  }
});
