/* Dungeonbound game rules: deliberately independent of React Native and network. */
export type HeroClass = 'Warrior' | 'Ranger' | 'Mage';
export type RoomKind = 'start' | 'combat' | 'elite' | 'treasure' | 'rest' | 'event' | 'boss';
export type Action = 'attack' | 'skill' | 'defend' | 'potion';
export type Slot = 'weapon' | 'armor';
export type Item = { id: string; name: string; slot: Slot; bonus: number; rarity: 'Common' | 'Rare' | 'Epic' };
export type Hero = { className: HeroClass; level: number; xp: number; hp: number; maxHp: number; attack: number; defense: number; gold: number; potions: number; mana: number; maxMana: number };
export type Enemy = { name: string; hp: number; maxHp: number; attack: number; defense: number; boss: boolean; elite: boolean };
export type Room = { id: number; kind: RoomKind; cleared: boolean };
export type Game = { version: 1; seed: number; hero: Hero; rooms: Room[]; roomIndex: number; enemy: Enemy | null; inventory: Item[]; equipment: { weapon: string | null; armor: string | null }; kills: number; bosses: number; dungeons: number; questClaimed: boolean; achievements: string[]; log: string[]; ended: boolean };

const stats: Record<HeroClass, { hp: number; attack: number; defense: number; mana: number }> = {
  Warrior: { hp: 115, attack: 16, defense: 7, mana: 18 },
  Ranger: { hp: 90, attack: 20, defense: 4, mana: 24 },
  Mage: { hp: 75, attack: 24, defense: 2, mana: 36 },
};
function random(seed: number): [number, number] {
  const next = (Math.imul(1664525, seed >>> 0) + 1013904223) >>> 0;
  return [next, next / 4294967296];
}
function roll(g: Game): number { const [seed, value] = random(g.seed); g.seed = seed; return value; }
function message(g: Game, value: string) { g.log = [value, ...g.log].slice(0, 12); }
export function makeRooms(seed: number): Room[] {
  let s = seed >>> 0;
  const middle: RoomKind[] = ['combat', 'treasure', 'combat', 'rest', 'elite', 'event'];
  for (let i = middle.length - 1; i > 0; i--) {
    const [next, v] = random(s); s = next;
    const j = Math.floor(v * (i + 1));
    [middle[i], middle[j]] = [middle[j], middle[i]];
  }
  return (['start', ...middle, 'boss'] as RoomKind[]).map((kind, id) => ({ kind, id, cleared: false }));
}
export function newGame(className: HeroClass, seed = Date.now() >>> 0): Game {
  const s = stats[className];
  return { version: 1, seed: seed >>> 0, hero: { className, level: 1, xp: 0, hp: s.hp, maxHp: s.hp, attack: s.attack, defense: s.defense, gold: 0, potions: 3, mana: s.mana, maxMana: s.mana }, rooms: makeRooms(seed), roomIndex: -1, enemy: null, inventory: [], equipment: { weapon: null, armor: null }, kills: 0, bosses: 0, dungeons: 0, questClaimed: false, achievements: [], log: ['A new adventurer enters Dungeonbound.'], ended: false };
}
export function effectiveStat(g: Game, slot: Slot): number {
  const base = slot === 'weapon' ? g.hero.attack : g.hero.defense;
  const item = g.inventory.find(i => i.id === g.equipment[slot]);
  return base + (item?.bonus ?? 0);
}
function enemyFor(g: Game, kind: RoomKind): Enemy {
  const types = ['Goblin', 'Skeleton', 'Cave Bat', 'Slime', 'Dark Acolyte'];
  const boss = kind === 'boss'; const elite = kind === 'elite';
  const name = boss ? 'The Ash Warden' : elite ? 'Elite Stone Golem' : types[Math.floor(roll(g) * types.length)];
  const scale = g.hero.level + Math.floor(g.dungeons / 2);
  const hp = (boss ? 72 : elite ? 46 : 26) + scale * (boss ? 9 : 5);
  return { name, hp, maxHp: hp, attack: (boss ? 17 : elite ? 14 : 10) + scale * 2, defense: (boss ? 6 : elite ? 4 : 2) + scale, boss, elite };
}
function awardXp(g: Game, amount: number) {
  g.hero.xp += amount;
  while (g.hero.xp >= g.hero.level * 55) {
    g.hero.xp -= g.hero.level * 55;
    g.hero.level += 1;
    g.hero.maxHp += 10; g.hero.hp = Math.min(g.hero.maxHp, g.hero.hp + 24);
    g.hero.attack += 3; g.hero.defense += 1; g.hero.maxMana += 3;
    g.hero.mana = g.hero.maxMana;
    message(g, `Level up! You are now level ${g.hero.level}.`);
  }
}
function loot(g: Game, elite = false) {
  const r = roll(g);
  const rarity: Item['rarity'] = r > .91 || (elite && r > .7) ? 'Epic' : r > .56 ? 'Rare' : 'Common';
  const slot: Slot = roll(g) < .5 ? 'weapon' : 'armor';
  const bonus = (rarity === 'Epic' ? 8 : rarity === 'Rare' ? 5 : 2) + Math.floor(g.hero.level / 2);
  const name = `${rarity} ${slot === 'weapon' ? 'Blade' : 'Shield'}`;
  g.inventory.push({ id: `loot-${g.seed}-${g.inventory.length}`, name, slot, bonus, rarity });
  message(g, `Found ${name} (+${bonus} ${slot === 'weapon' ? 'ATK' : 'DEF'}).`);
}
export function enterNextRoom(current: Game): Game {
  const g = JSON.parse(JSON.stringify(current)) as Game;
  if (g.ended || g.enemy || g.roomIndex >= g.rooms.length - 1) return g;
  const room = g.rooms[++g.roomIndex];
  message(g, `Entering room ${room.id + 1}: ${room.kind.toUpperCase()}.`);
  if (room.kind === 'combat' || room.kind === 'elite' || room.kind === 'boss') {
    g.enemy = enemyFor(g, room.kind);
    message(g, `${g.enemy.name} stands in your way!`);
  } else {
    room.cleared = true;
    if (room.kind === 'treasure') { g.hero.gold += 15; loot(g); }
    if (room.kind === 'rest') { g.hero.hp = Math.min(g.hero.maxHp, g.hero.hp + 28); g.hero.mana = g.hero.maxMana; message(g, 'Restored health and mana.'); }
    if (room.kind === 'event') { g.hero.potions++; awardXp(g, 12); message(g, 'An old shrine grants you a potion and experience.'); }
  }
  return g;
}
export function combatAction(current: Game, action: Action): Game {
  const g = JSON.parse(JSON.stringify(current)) as Game;
  const e = g.enemy;
  if (!e || g.ended || g.hero.hp <= 0) return g;
  if (action === 'potion') {
    if (g.hero.potions < 1) { message(g, 'No potions left.'); return g; }
    g.hero.potions--; g.hero.hp = Math.min(g.hero.maxHp, g.hero.hp + 40); message(g, 'Potion restores up to 40 HP.');
  } else if (action === 'skill') {
    if (g.hero.mana < 8) { message(g, 'Not enough mana (requires 8).'); return g; }
    g.hero.mana -= 8;
    const dmg = Math.max(1, Math.floor(effectiveStat(g, 'weapon') * 1.65) - e.defense);
    e.hp = Math.max(0, e.hp - dmg); message(g, `Special skill hits for ${dmg}.`);
  } else if (action === 'attack') {
    const critChance = g.hero.className === 'Ranger' ? .30 : .12;
    const crit = roll(g) < critChance;
    const dmg = Math.max(1, Math.floor(effectiveStat(g, 'weapon') * (crit ? 1.6 : 1)) - e.defense);
    e.hp = Math.max(0, e.hp - dmg); message(g, `Attack deals ${dmg}${crit ? ' CRITICAL' : ''} damage.`);
  } else { message(g, 'You defend, reducing the next attack.'); }
  if (e.hp <= 0) {
    const gain = e.boss ? 65 : e.elite ? 30 : 18;
    const gold = e.boss ? 65 : e.elite ? 28 : 10;
    g.kills++; g.hero.gold += gold; awardXp(g, gain);
    message(g, `Victory! +${gain} XP, +${gold} gold.`);
    if (roll(g) < (e.boss ? 1 : e.elite ? .75 : .35)) loot(g, e.elite || e.boss);
    g.rooms[g.roomIndex].cleared = true;
    if (e.boss) {
      g.bosses++; g.dungeons++; g.ended = true;
      if (!g.achievements.includes('Boss Slayer')) g.achievements.push('Boss Slayer');
      message(g, 'DUNGEON CLEARED! The Ash Warden is defeated.');
    }
    if (g.kills >= 1 && !g.achievements.includes('First Blood')) g.achievements.push('First Blood');
    g.enemy = null;
    return g;
  }
  // Rule-based enemy: weakened enemies sometimes brace; bosses enrage under half HP.
  const lowHpDefend = e.hp / e.maxHp < .25 && roll(g) < .35;
  if (lowHpDefend) { e.defense += 1; message(g, `${e.name} braces for impact (+1 DEF).`); }
  else {
    const enrage = e.boss && e.hp < e.maxHp / 2 ? 5 : 0;
    const attack = Math.max(1, e.attack + enrage - effectiveStat(g, 'armor'));
    const taken = action === 'defend' ? Math.max(1, Math.floor(attack * .35)) : attack;
    g.hero.hp = Math.max(0, g.hero.hp - taken); message(g, `${e.name} deals ${taken} damage.`);
    if (g.hero.hp <= 0) message(g, 'You have fallen. Restart your adventure.');
  }
  return g;
}
export function equipItem(current: Game, id: string): Game {
  const g = JSON.parse(JSON.stringify(current)) as Game;
  const item = g.inventory.find(i => i.id === id);
  if (item) { g.equipment[item.slot] = item.id; message(g, `Equipped ${item.name}.`); }
  return g;
}
export function claimQuest(current: Game): Game {
  const g = JSON.parse(JSON.stringify(current)) as Game;
  if (g.kills >= 3 && !g.questClaimed) { g.questClaimed = true; g.hero.gold += 30; awardXp(g, 35); message(g, 'Dungeon Hunter quest claimed: +30 gold, +35 XP.'); }
  return g;
}
export function nextDungeon(current: Game): Game {
  const g = JSON.parse(JSON.stringify(current)) as Game;
  if (!g.ended || g.hero.hp <= 0) return g;
  g.seed = (g.seed + 1234567) >>> 0;
  g.rooms = makeRooms(g.seed); g.roomIndex = -1; g.enemy = null; g.ended = false;
  g.hero.hp = g.hero.maxHp; g.hero.mana = g.hero.maxMana;
  message(g, `Entering dungeon ${g.dungeons + 1}.`);
  return g;
}
export function isGame(value: unknown): value is Game {
  if (!value || typeof value !== 'object') return false;
  const g = value as Partial<Game>;
  return g.version === 1 && !!g.hero && ['Warrior', 'Ranger', 'Mage'].includes(g.hero.className) && Array.isArray(g.rooms) && g.rooms.length === 8 && Array.isArray(g.inventory) && typeof g.roomIndex === 'number' && typeof g.kills === 'number';
}
