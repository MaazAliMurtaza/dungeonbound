// Shared by the API and device: saved data is untrusted on both sides.
export const SAVE_FORMAT_VERSION = 3;
const object = (x) => !!x && typeof x === "object" && !Array.isArray(x);
const int = (x, min = 0, max = 10000000) =>
  Number.isSafeInteger(x) && x >= min && x <= max;
const str = (x, max = 180) =>
  typeof x === "string" && x.length > 0 && x.length <= max;
const strings = (x, max = 200) =>
  Array.isArray(x) && x.length <= max && x.every((v) => str(v));
const keys = (x, names) =>
  Object.keys(x).every((k) => names.split(" ").includes(k));
const classes = ["Warrior", "Ranger", "Mage"];
const kinds = ["start", "combat", "elite", "treasure", "rest", "event", "boss"];
const skillIds = [
  "w-cleave",
  "w-aegis",
  "w-break",
  "w-stun",
  "w-drain",
  "r-shot",
  "r-venom",
  "r-pierce",
  "r-stun",
  "r-drain",
  "m-bolt",
  "m-fire",
  "m-heal",
  "m-stun",
  "m-nova",
];
export function validateGame(g) {
  if (
    !object(g) ||
    ![1, 2, 3].includes(g.version) ||
    !keys(
      g,
      "version seed hero rooms roomIndex enemy inventory equipment kills bosses dungeons questClaimed achievements log ended" +
        (g.version >= 2
          ? " floor skills cooldowns ethers shield roomsCleared lootFound purchases claimedQuests relics pendingChoice campaignWins"
          : "") + (g.version === 3 ? " specialization" : ""),
    )
  )
    return false;
  const h = g.hero;
  if (
    !object(h) ||
    !keys(
      h,
      "className level xp hp maxHp attack defense gold potions mana maxMana" + (g.version === 3 ? " speed" : ""),
    ) ||
    !classes.includes(h.className)
  )
    return false;
  if (g.version === 3 && (!int(h.speed, 1, 200) ||
    ![null, "assault", "survival"].includes(g.specialization))) return false;
  if (
    !["level", "maxHp", "maxMana", "attack"].every((k) => int(h[k], 1)) ||
    !["xp", "hp", "defense", "gold", "potions", "mana"].every((k) =>
      int(h[k]),
    ) ||
    h.hp > h.maxHp ||
    h.mana > h.maxMana ||
    h.xp >= h.level * 55
  )
    return false;
  if (
    !int(g.seed, 0, 4294967295) ||
    !int(g.roomIndex, -1, 7) ||
    !["kills", "bosses", "dungeons"].every((k) => int(g[k])) ||
    typeof g.ended !== "boolean" ||
    typeof g.questClaimed !== "boolean" ||
    !strings(g.achievements, 50) ||
    !strings(g.log, 16)
  )
    return false;
  if (
    !Array.isArray(g.rooms) ||
    g.rooms.length !== 8 ||
    !g.rooms.every(
      (r, i) =>
        object(r) &&
        keys(r, "id kind cleared") &&
        r.id === i &&
        kinds.includes(r.kind) &&
        typeof r.cleared === "boolean",
    ) ||
    g.rooms[0].kind !== "start" ||
    g.rooms[7].kind !== "boss"
  )
    return false;
  if (
    !Array.isArray(g.inventory) ||
    g.inventory.length > 200 ||
    !g.inventory.every(
      (i) =>
        object(i) &&
        keys(i, "id name slot bonus rarity" + (g.version === 3 ? " stat" : "")) &&
        str(i.id) &&
        str(i.name) &&
        (g.version === 3 ? ["weapon", "armor", "accessory"] : ["weapon", "armor"]).includes(i.slot) &&
        int(i.bonus, 1, 100000) &&
        (g.version === 3 ? ["Common", "Rare", "Epic", "Legendary"] : ["Common", "Rare", "Epic"]).includes(i.rarity) &&
        (i.slot === "accessory" ? ["attack", "defense", "speed"].includes(i.stat) : !("stat" in i)),
    ) ||
    new Set(g.inventory.map((i) => i.id)).size !== g.inventory.length
  )
    return false;
  if (
    !object(g.equipment) ||
    !keys(g.equipment, "weapon armor" + (g.version === 3 ? " accessory" : "")) ||
    !(g.version === 3 ? ["weapon", "armor", "accessory"] : ["weapon", "armor"]).every(
      (slot) =>
        g.equipment[slot] === null ||
        g.inventory.some((i) => i.id === g.equipment[slot] && i.slot === slot),
    )
  )
    return false;
  if (g.enemy !== null) {
    const e = g.enemy;
    if (
      !object(e) ||
      !keys(
        e,
        "name hp maxHp attack defense boss elite intent turn poison burn",
      ) ||
      !str(e.name) ||
      !int(e.hp, 1) ||
      !int(e.maxHp, 1) ||
      e.hp > e.maxHp ||
      !int(e.attack, 1) ||
      !int(e.defense) ||
      typeof e.boss !== "boolean" ||
      typeof e.elite !== "boolean" ||
      g.roomIndex < 0 ||
      g.rooms[g.roomIndex].cleared ||
      !["combat", "elite", "boss"].includes(g.rooms[g.roomIndex].kind) ||
      g.ended
    )
      return false;
    if (
      g.version >= 2 &&
      (!["strike", "heavy", "guard", "hex"].includes(e.intent) ||
        !int(e.turn) ||
        !int(e.poison, 0, 3) ||
        !int(e.burn, 0, 3))
    )
      return false;
  }
  if (g.version >= 2) {
    if (
      !int(g.floor, 1, 6) ||
      ![
        "ethers",
        "shield",
        "roomsCleared",
        "lootFound",
        "purchases",
        "campaignWins",
      ].every((k) => int(g[k])) ||
      !strings(g.skills, 5) ||
      g.skills.length < 1 ||
      new Set(g.skills).size !== g.skills.length ||
      !g.skills.every(
        (id) => skillIds.includes(id) && id[0] === h.className.toLowerCase()[0],
      )
    )
      return false;
    if (
      !object(g.cooldowns) ||
      Object.entries(g.cooldowns).some(
        ([id, v]) => !g.skills.includes(id) || !int(v, 0, 4),
      )
    )
      return false;
    if (
      !strings(g.claimedQuests, 12) ||
      new Set(g.claimedQuests).size !== g.claimedQuests.length ||
      !g.claimedQuests.every((id) =>
        [
          "hunter",
          "veteran",
          "slayer",
          "gate",
          "crown",
          "explorer",
          "cartographer",
          "collector",
          "merchant",
          "student",
          "relic",
          "ascendant",
        ].includes(id),
      ) ||
      !strings(g.relics) ||
      !g.relics.every((id) =>
        ["ember", "shell", "star", "blood"].includes(id),
      ) ||
      ![null, "relic", "event"].includes(g.pendingChoice)
    )
      return false;
    if (
      g.pendingChoice &&
      (g.roomIndex < 0 ||
        g.enemy ||
        g.ended ||
        g.rooms[g.roomIndex].kind !==
          (g.pendingChoice === "relic" ? "treasure" : "event"))
    )
      return false;
  }
  return true;
}
