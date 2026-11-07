import { ENEMIES, FLOORS, QUESTS, RELICS, SHOP, SKILLS, SKILL_PATHS } from "./content.ts";
import { EQUIPMENT_CATALOG, type EquipmentSlot, type Rarity, type AccessoryStat } from "./items.ts";
import { SAVE_FORMAT_VERSION, validateGame } from "./state-schema.js";
export const CURRENT_SAVE_VERSION = SAVE_FORMAT_VERSION;
export type HeroClass = "Warrior" | "Ranger" | "Mage";
export type RoomKind =
  "start" | "combat" | "elite" | "treasure" | "rest" | "event" | "boss";
export type Action = "attack" | "skill" | "defend" | "potion" | "ether";
export type Slot = EquipmentSlot;
export type Item = {
  id: string;
  name: string;
  slot: Slot;
  bonus: number;
  rarity: Rarity;
  stat?: AccessoryStat;
};
export type Hero = {
  className: HeroClass;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  gold: number;
  potions: number;
  mana: number;
  maxMana: number;
  speed: number;
};
export type Enemy = {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  boss: boolean;
  elite: boolean;
  intent?: "strike" | "heavy" | "guard" | "hex";
  turn?: number;
  poison?: number;
  burn?: number;
};
export type Room = { id: number; kind: RoomKind; cleared: boolean };
export type Game = {
  version: 1 | 2 | 3;
  seed: number;
  hero: Hero;
  rooms: Room[];
  roomIndex: number;
  enemy: Enemy | null;
  inventory: Item[];
  equipment: { weapon: string | null; armor: string | null; accessory: string | null };
  kills: number;
  bosses: number;
  dungeons: number;
  questClaimed: boolean;
  achievements: string[];
  log: string[];
  ended: boolean;
  floor: number;
  skills: string[];
  cooldowns: Record<string, number>;
  ethers: number;
  shield: number;
  roomsCleared: number;
  lootFound: number;
  purchases: number;
  claimedQuests: string[];
  relics: string[];
  pendingChoice: "relic" | "event" | null;
  campaignWins: number;
  specialization: "assault" | "survival" | null;
};
const stats = {
  Warrior: { hp: 130, attack: 18, defense: 7, mana: 24, speed: 12 },
  Ranger: { hp: 105, attack: 22, defense: 5, mana: 32, speed: 20 },
  Mage: { hp: 90, attack: 26, defense: 3, mana: 44, speed: 10 },
};
const copy = (g: Game): Game => JSON.parse(JSON.stringify(g));
function roll(g: Game) {
  g.seed = (Math.imul(1664525, g.seed >>> 0) + 1013904223) >>> 0;
  return g.seed / 4294967296;
}
function message(g: Game, value: string) {
  g.log = [value, ...g.log].slice(0, 16);
}
export function makeRooms(seed: number): Room[] {
  const g = { seed } as Game,
    middle: RoomKind[] = [
      "combat",
      "treasure",
      "combat",
      "rest",
      "elite",
      "event",
    ];
  for (let i = middle.length - 1; i > 0; i--) {
    const j = Math.floor(roll(g) * (i + 1));
    [middle[i], middle[j]] = [middle[j], middle[i]];
  }
  return (["start", ...middle, "boss"] as RoomKind[]).map((kind, id) => ({
    id,
    kind,
    cleared: false,
  }));
}
export function newGame(className: HeroClass, seed = Date.now() >>> 0): Game {
  const s = stats[className];
  return {
    version: CURRENT_SAVE_VERSION,
    seed: seed >>> 0,
    hero: {
      className,
      level: 1,
      xp: 0,
      hp: s.hp,
      maxHp: s.hp,
      attack: s.attack,
      defense: s.defense,
      gold: 50,
      potions: 3,
      mana: s.mana,
      maxMana: s.mana,
      speed: s.speed,
    },
    rooms: makeRooms(seed),
    roomIndex: -1,
    enemy: null,
    inventory: [],
    equipment: { weapon: null, armor: null, accessory: null },
    kills: 0,
    bosses: 0,
    dungeons: 0,
    questClaimed: false,
    achievements: [],
    log: ["SYSTEM // Hunter awakened. Your first contract awaits."],
    ended: false,
    floor: 1,
    skills: [SKILLS.find((s) => s.className === className)!.id],
    cooldowns: {},
    ethers: 2,
    shield: 0,
    roomsCleared: 0,
    lootFound: 0,
    purchases: 0,
    claimedQuests: [],
    relics: [],
    pendingChoice: null,
    campaignWins: 0,
    specialization: null,
  };
}
export function migrateGame(value: unknown): Game | null {
  if (!validateGame(value)) return null;
  const old = value as Game;
  if (old.version === CURRENT_SAVE_VERSION) return copy(old);
  const g = {
    ...newGame(old.hero.className, old.seed),
    ...copy(old),
    version: CURRENT_SAVE_VERSION as 3,
    hero: { ...old.hero, speed: stats[old.hero.className].speed },
    equipment: { ...old.equipment, accessory: null },
    specialization: null,
  };
  if (old.version === 1) {
    g.floor = 1;
    g.roomsCleared = g.rooms.filter((r) => r.cleared).length;
    g.lootFound = g.inventory.length;
    g.claimedQuests = g.questClaimed ? ["hunter"] : [];
  }
  if (g.enemy && old.version === 1)
    g.enemy = { ...g.enemy, intent: "strike", turn: 0, poison: 0, burn: 0 };
  achievements(g);
  message(g, "SYSTEM // Adventure restored. Accessories and mastery paths unlocked.");
  return g;
}
function accessoryBonus(g: Game, stat: AccessoryStat) {
  const item = g.inventory.find((i) => i.id === g.equipment.accessory && i.slot === "accessory");
  return item?.stat === stat ? item.bonus : 0;
}
export function effectiveSpeed(g: Game) { return g.hero.speed + accessoryBonus(g, "speed"); }
export function evasionChance(g: Game) {
  const enemySpeed = g.enemy?.name === "Cave Bat" ? 22 :
    g.enemy?.name === "Venom Stalker" ? 18 : g.enemy?.boss ? 16 : 12;
  return Math.max(0, Math.min(0.25, (effectiveSpeed(g) - enemySpeed) / 100));
}
export function criticalChance(g: Game) { return g.hero.className === "Ranger" ? 0.3 : 0.12; }
export function attackDamage(attack: number, defense: number, power = 1, pierce = false) {
  return Math.max(1, Math.floor(attack * power) - (pierce ? 0 : defense));
}
export function effectiveStat(g: Game, slot: "weapon" | "armor") {
  return (
    (slot === "weapon" ? g.hero.attack : g.hero.defense) +
    (g.inventory.find((i) => i.id === g.equipment[slot])?.bonus ?? 0) +
    accessoryBonus(g, slot === "weapon" ? "attack" : "defense")
  );
}
function awardXp(g: Game, amount: number) {
  g.hero.xp += amount;
  while (g.hero.xp >= g.hero.level * 55) {
    g.hero.xp -= g.hero.level * 55;
    g.hero.level++;
    g.hero.maxHp += 12;
    g.hero.hp = Math.min(g.hero.maxHp, g.hero.hp + 35);
    g.hero.attack += 3;
    g.hero.defense++;
    g.hero.maxMana += 4;
    g.hero.speed = Math.min(60, g.hero.speed + 1);
    g.hero.mana = g.hero.maxMana;
    message(g, `AWAKENING // Level ${g.hero.level}.`);
  }
}
export function lootRarity(value: number, elite = false): Rarity {
  if (value >= (elite ? 0.95 : 0.985)) return "Legendary";
  if (value >= (elite ? 0.7 : 0.91)) return "Epic";
  return value >= 0.5 ? "Rare" : "Common";
}
function loot(g: Game, elite = false) {
  if (g.inventory.length >= 200) return;
  const rarity = lootRarity(roll(g), elite);
  const candidates = EQUIPMENT_CATALOG.filter((item) => item.rarity === rarity &&
    (!item.className || item.className === g.hero.className));
  const template = candidates[Math.floor(roll(g) * candidates.length)];
  const bonus = template.bonus + (template.slot === "accessory" ? 0 : g.floor + Math.floor(g.hero.level / 2));
  const item: Item = {
    id: `loot-${g.seed}-${g.lootFound}`,
    name: template.name,
    slot: template.slot,
    bonus,
    rarity,
    ...(template.stat ? { stat: template.stat } : {}),
  };
  g.inventory.push(item);
  g.lootFound++;
  message(g, `LOOT // ${rarity} ${item.name} +${bonus}.`);
}
function clearRoom(g: Game) {
  if (!g.rooms[g.roomIndex].cleared) {
    g.rooms[g.roomIndex].cleared = true;
    g.roomsCleared++;
  }
}
function nextIntent(g: Game) {
  const e = g.enemy!;
  e.turn = (e.turn ?? 0) + 1;
  e.intent =
    e.turn % 3 === 0
      ? "heavy"
      : e.name === "Dark Acolyte" || e.name === "Venom Stalker"
        ? e.turn % 2 === 0
          ? "hex"
          : "strike"
        : e.turn % 4 === 0
          ? "guard"
          : "strike";
}
function achievements(g: Game) {
  for (const [ok, name] of [
    [g.kills >= 1, "First Blood"],
    [g.bosses >= 1, "Boss Slayer"],
    [g.dungeons >= 1, "First Dungeon"],
    [g.kills >= 100, "100 Enemies Defeated"],
    [g.inventory.some((item) => item.rarity === "Legendary"), "Legendary Hunter"],
    [g.hero.level >= 10, "Level 10"],
    [g.bosses >= 6, "Gatebreaker"],
    [g.purchases >= 5, "Guild Patron"],
    [g.skills.length === 5, "Fully Awakened"],
    [g.relics.length >= 4, "Relic Seeker"],
    [g.hero.level >= 10, "S-Rank Hunter"],
    [g.campaignWins >= 1, "Eclipse Conqueror"],
  ] as [boolean, string][])
    if (ok && !g.achievements.includes(name)) {
      g.achievements.push(name);
      message(g, `ACHIEVEMENT // ${name}`);
    }
}
function victory(g: Game) {
  const e = g.enemy!;
  g.kills++;
  g.hero.gold += e.boss ? 90 + g.floor * 12 : e.elite ? 36 : 18;
  awardXp(g, e.boss ? 90 : e.elite ? 40 : 24);
  clearRoom(g);
  if (roll(g) < (e.boss ? 1 : e.elite ? 0.9 : 0.5)) loot(g, e.elite || e.boss);
  g.hero.mana = Math.min(g.hero.maxMana, g.hero.mana + 6);
  if (e.boss) {
    g.bosses++;
    g.dungeons++;
    g.ended = true;
    if (g.floor === 6) g.campaignWins++;
    message(
      g,
      g.floor === 6
        ? "THE ECLIPSE IS BROKEN // Campaign complete. A harder cycle awaits."
        : `GATE CLEARED // ${e.name} defeated. Ascend to the next floor.`,
    );
  } else message(g, `VICTORY // ${e.name} defeated. +6 mana.`);
  g.enemy = null;
  g.shield = 0;
  g.cooldowns = {};
  achievements(g);
}
export function enterNextRoom(current: Game): Game {
  const g = copy(current);
  if (
    g.ended ||
    g.enemy ||
    g.pendingChoice ||
    g.hero.hp <= 0 ||
    g.roomIndex >= 7
  )
    return g;
  const room = g.rooms[++g.roomIndex];
  message(
    g,
    `FLOOR ${g.floor} // Room ${room.id + 1}: ${room.kind.toUpperCase()}`,
  );
  if (["combat", "elite", "boss"].includes(room.kind)) {
    const boss = room.kind === "boss",
      elite = room.kind === "elite",
      scale = g.floor - 1 + g.campaignWins * 3,
      name = boss
        ? FLOORS[g.floor - 1].boss
        : elite
          ? "Elite Stone Golem"
          : ENEMIES[Math.floor(roll(g) * ENEMIES.length)],
      traits: Record<string, [number, number, number]> = {
        Skeleton: [5, 0, 2],
        "Cave Bat": [-8, 2, 0],
        Slime: [12, -1, 0],
        "Dark Acolyte": [-4, 2, 0],
        "Venom Stalker": [0, 1, 1],
        "Frost Revenant": [5, 0, 3],
        "Ember Hound": [-3, 3, 0],
        "Void Sentinel": [8, 0, 2],
        Mimic: [10, 1, 0],
      },
      trait = traits[name] ?? [0, 0, 0],
      hp = (boss ? 78 : elite ? 50 : 30) + scale * (boss ? 14 : 7) + trait[0];
    g.enemy = {
      name,
      hp,
      maxHp: hp,
      attack: (boss ? 18 : elite ? 15 : 11) + scale * 3 + trait[1],
      defense: (boss ? 5 : elite ? 3 : 1) + scale + trait[2],
      boss,
      elite,
      intent: "strike",
      turn: 0,
      poison: 0,
      burn: 0,
    };
    message(g, `${name} emerges. Read its intent before you act.`);
  } else {
    clearRoom(g);
    if (room.kind === "treasure") {
      g.hero.gold += 25;
      loot(g);
      g.pendingChoice = "relic";
    }
    if (room.kind === "rest") {
      g.hero.hp = Math.min(
        g.hero.maxHp,
        g.hero.hp + Math.floor(g.hero.maxHp * 0.45),
      );
      g.hero.mana = g.hero.maxMana;
      g.hero.potions++;
      message(g, "SANCTUARY // Recover health, refill mana, gain a flask.");
    }
    if (room.kind === "event") g.pendingChoice = "event";
  }
  return g;
}
export function chooseRoomReward(current: Game, id: string): Game {
  const g = copy(current);
  if (g.pendingChoice === "relic") {
    const relic = RELICS.find((r) => r.id === id);
    if (!relic) return g;
    g.hero[relic.stat] += relic.amount;
    if (relic.stat === "maxHp")
      g.hero.hp = Math.min(g.hero.maxHp, g.hero.hp + relic.amount);
    if (relic.stat === "maxMana") g.hero.mana = g.hero.maxMana;
    if (g.relics.length < 200) g.relics.push(relic.id);
    message(g, `RELIC BOUND // ${relic.name}. ${relic.description}`);
  } else if (g.pendingChoice === "event") {
    if (id === "safe") {
      g.hero.potions++;
      awardXp(g, 15);
      message(g, "The lost hunter offers a flask. You guide them home.");
    } else if (id === "risk") {
      const cost = Math.floor(g.hero.maxHp * 0.18);
      g.hero.hp = Math.max(1, g.hero.hp - cost);
      g.hero.gold += 55;
      awardXp(g, 30);
      message(g, `You open the cursed seal. -${cost} HP, +55 gold.`);
    } else return g;
  } else return g;
  g.pendingChoice = null;
  achievements(g);
  return g;
}
export function combatAction(
  current: Game,
  action: Action,
  skillId?: string,
): Game {
  const g = copy(current),
    e = g.enemy;
  if (!e || g.ended || g.hero.hp <= 0) return g;
  let power = 0,
    pierce = false,
    stun = false,
    drain = false;
  const skill =
    action === "skill"
      ? SKILLS.find(
          (s) =>
            s.id === (skillId ?? g.skills[0]) &&
            s.className === g.hero.className,
        )
      : undefined;
  if (
    action === "skill" &&
    (!skill ||
      !g.skills.includes(skill.id) ||
      g.hero.mana < skill.mana ||
      (g.cooldowns[skill.id] ?? 0) > 0)
  )
    return g;
  if (
    (action === "potion" && g.hero.potions < 1) ||
    (action === "ether" && g.ethers < 1)
  )
    return g;
  for (const id of Object.keys(g.cooldowns))
    g.cooldowns[id] = Math.max(0, g.cooldowns[id] - 1);
  if (action === "potion") {
    g.hero.potions--;
    g.hero.hp = Math.min(g.hero.maxHp, g.hero.hp + 50);
    message(g, "Crimson Flask // +50 HP.");
  } else if (action === "ether") {
    g.ethers--;
    g.hero.mana = Math.min(g.hero.maxMana, g.hero.mana + 22);
    message(g, "Astral Ether // +22 mana.");
  } else if (skill) {
    g.hero.mana -= skill.mana;
    g.cooldowns[skill.id] = skill.cooldown;
    power = skill.power;
    pierce = skill.effect === "pierce";
    stun = skill.effect === "stun";
    drain = skill.effect === "drain";
    if (skill.effect === "shield") g.shield += 20 + g.hero.level * 3;
    if (skill.effect === "heal")
      g.hero.hp = Math.min(
        g.hero.maxHp,
        g.hero.hp + Math.floor(g.hero.maxHp * 0.35),
      );
    if (skill.effect === "burn") e.burn = 3;
    if (skill.effect === "poison") e.poison = 3;
    message(g, `${skill.name.toUpperCase()} // ${skill.description}`);
  } else if (action === "attack") {
    const crit = roll(g) < criticalChance(g);
    power = crit ? 1.6 : 1;
    g.hero.mana = Math.min(g.hero.maxMana, g.hero.mana + 3);
    if (crit) message(g, "CRITICAL HIT!");
  } else {
    g.hero.mana = Math.min(g.hero.maxMana, g.hero.mana + 5);
    message(g, "GUARD // Incoming damage reduced. +5 mana.");
  }
  if (power) {
    const damage = attackDamage(effectiveStat(g, "weapon"), e.defense,
        power * (g.specialization === "assault" ? 1.1 : 1), pierce),
      actual = Math.min(e.hp, damage);
    e.hp = Math.max(0, e.hp - damage);
    if (pierce) e.defense = Math.max(0, e.defense - 3);
    if (drain)
      g.hero.hp = Math.min(g.hero.maxHp, g.hero.hp + Math.floor(actual / 2));
    message(g, `You deal ${damage} damage.`);
  }
  for (const status of ["poison", "burn"] as const)
    if ((e[status] ?? 0) > 0) {
      const damage = status === "poison" ? 5 + g.floor : 7 + g.floor;
      e.hp = Math.max(0, e.hp - damage);
      e[status] = (e[status] ?? 0) - 1;
      message(g, `${status.toUpperCase()} // ${damage} damage.`);
    }
  if (e.hp <= 0) {
    victory(g);
    return g;
  }
  if (stun) message(g, `${e.name} is stunned. Intent interrupted.`);
  else if (e.intent === "guard") {
    e.defense += 2;
    message(g, `${e.name} fortifies: +2 defense.`);
  } else if (evasionChance(g) > 0 && roll(g) < evasionChance(g)) {
    message(g, `SWIFT EVADE // Speed ${effectiveSpeed(g)}. Enemy attack avoided.`);
  } else {
    const enrage = e.boss && e.hp < e.maxHp / 2 ? 4 : 0,
      raw = attackDamage(e.attack, effectiveStat(g, "armor") - enrage, e.intent === "heavy" ? 1.7 : 1),
      mastered = g.specialization === "survival" ? Math.max(1, Math.floor(raw * 0.9)) : raw,
      incoming = action === "defend" ? Math.max(1, Math.floor(mastered * 0.3)) : mastered,
      blocked = Math.min(g.shield, incoming);
    g.shield -= blocked;
    g.hero.hp = Math.max(0, g.hero.hp - (incoming - blocked));
    if (e.intent === "hex") g.hero.mana = Math.max(0, g.hero.mana - 5);
    message(
      g,
      `${e.name}: ${e.intent === "heavy" ? "HEAVY " : ""}${incoming - blocked} damage${blocked ? ` (${blocked} blocked)` : ""}.`,
    );
  }
  nextIntent(g);
  if (g.hero.hp <= 0)
    message(g, "HUNTER DOWN // Your record remains. Begin a new awakening.");
  return g;
}
export function equipItem(current: Game, id: string): Game {
  const g = copy(current);
  if (g.enemy) return g;
  const item = g.inventory.find((i) => i.id === id);
  if (item) {
    g.equipment[item.slot] = id;
    message(g, `Equipped ${item.name}.`);
  }
  return g;
}
export function sellItem(current: Game, id: string): Game {
  const g = copy(current);
  if (g.enemy || Object.values(g.equipment).includes(id)) return g;
  const item = g.inventory.find((i) => i.id === id);
  if (item) {
    g.hero.gold += Math.max(5, item.bonus * 4);
    g.inventory = g.inventory.filter((i) => i.id !== id);
    message(g, `Sold ${item.name}.`);
  }
  return g;
}
export function buyItem(current: Game, id: string): Game {
  const g = copy(current);
  if (g.enemy || g.pendingChoice || g.hero.hp <= 0) return g;
  const stock = SHOP.find((s) => s.id === id),
    skill = SKILLS.find((s) => s.id === id && s.className === g.hero.className);
  if (!stock && !skill) return g;
  const price = (stock ?? skill)!.price;
  if (
    g.hero.gold < price ||
    (skill && skillLockReason(g, skill.id) !== null) ||
    (stock?.level && g.hero.level < stock.level) ||
    g.inventory.length >= 200
  )
    return g;
  if (
    (stock?.id === "potion" && g.hero.potions >= 999) ||
    (stock?.id === "ether" && g.ethers >= 999)
  )
    return g;
  g.hero.gold -= price;
  g.purchases++;
  if (skill) g.skills.push(id);
  else if (id === "potion") g.hero.potions++;
  else if (id === "ether") g.ethers++;
  else if (id === "rest") {
    g.hero.hp = g.hero.maxHp;
    g.hero.mana = g.hero.maxMana;
  } else {
    const template = EQUIPMENT_CATALOG.find((item) => item.id === stock?.equipmentId);
    if (!template) return current;
    g.inventory.push({
      id: `shop-${g.purchases}-${g.seed}`,
      name: template.name,
      slot: template.slot,
      bonus: template.bonus + (template.slot === "accessory" ? 0 : g.hero.level * 2),
      rarity: template.rarity,
      ...(template.stat ? { stat: template.stat } : {}),
    });
    g.lootFound++;
  }
  message(g, `GUILD EXCHANGE // Acquired ${(stock ?? skill)!.name}.`);
  achievements(g);
  return g;
}
export function skillLockReason(g: Game, id: string): string | null {
  const skill = SKILLS.find((entry) => entry.id === id && entry.className === g.hero.className);
  if (!skill) return "Wrong class";
  if (g.skills.includes(id)) return "Already learned";
  const missing = SKILL_PATHS[id].requires.filter((parent) => !g.skills.includes(parent));
  if (missing.length) return `Requires ${missing.map((parent) => SKILLS.find((s) => s.id === parent)!.name).join(", ")}`;
  if (g.hero.level < skill.level) return `Requires hunter level ${skill.level}`;
  if (g.hero.gold < skill.price) return `Requires ${skill.price} gold`;
  return null;
}
export function chooseSpecialization(current: Game, choice: "assault" | "survival"): Game {
  const g = copy(current);
  if (!["assault", "survival"].includes(choice) || g.enemy || g.pendingChoice || g.hero.hp <= 0 ||
    g.hero.level < 3 || g.specialization === choice) return g;
  const price = g.specialization ? 25 : 0;
  if (g.hero.gold < price) return g;
  g.hero.gold -= price;
  g.specialization = choice;
  message(g, `MASTERY // ${choice === "assault" ? "Assault: +10% damage" : "Survival: 10% less incoming damage"}.`);
  return g;
}
export function questProgress(g: Game, metric: string): number {
  return metric === "skills"
    ? g.skills.length
    : metric === "relics"
      ? g.relics.length
      : metric === "level"
        ? g.hero.level
        : ((g as unknown as Record<string, number>)[metric] ?? 0);
}
export function claimQuest(current: Game, id = "hunter"): Game {
  const g = copy(current),
    q = QUESTS.find((q) => q.id === id);
  if (
    q &&
    !g.claimedQuests.includes(id) &&
    questProgress(g, q.metric) >= q.target
  ) {
    g.claimedQuests.push(id);
    if (id === "hunter") g.questClaimed = true;
    g.hero.gold += q.gold;
    awardXp(g, q.xp);
    achievements(g);
    message(g, `CONTRACT COMPLETE // ${q.name}. +${q.gold} gold, +${q.xp} XP.`);
  }
  return g;
}
export function nextDungeon(current: Game): Game {
  const g = copy(current);
  if (!g.ended || g.hero.hp <= 0) return g;
  g.floor = g.floor === 6 ? 1 : g.floor + 1;
  g.seed = (g.seed + 1234567) >>> 0;
  g.rooms = makeRooms(g.seed);
  g.roomIndex = -1;
  g.enemy = null;
  g.ended = false;
  g.pendingChoice = null;
  g.hero.hp = g.hero.maxHp;
  g.hero.mana = g.hero.maxMana;
  g.hero.potions += 2;
  g.ethers++;
  g.cooldowns = {};
  message(g, `ASCEND // ${FLOORS[g.floor - 1].name}.`);
  return g;
}
export function isGame(value: unknown): value is Game {
  return validateGame(value) && (value as Game).version === CURRENT_SAVE_VERSION;
}
