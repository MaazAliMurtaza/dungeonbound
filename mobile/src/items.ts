export type EquipmentSlot = "weapon" | "armor" | "accessory";
export type Rarity = "Common" | "Rare" | "Epic" | "Legendary";
export type AccessoryStat = "attack" | "defense" | "speed";
export type EquipmentTemplate = {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: Rarity;
  bonus: number;
  className?: "Warrior" | "Ranger" | "Mage";
  stat?: AccessoryStat;
};

// Eighteen designed equipment types plus two consumables: twenty item types.
// Relics and skill unlocks are separate systems and are not counted here.
export const EQUIPMENT_CATALOG: EquipmentTemplate[] = [
  { id: "rift-blade", name: "Rift Blade", slot: "weapon", rarity: "Common", bonus: 3, className: "Warrior" },
  { id: "moon-recurve", name: "Moon Recurve", slot: "weapon", rarity: "Common", bonus: 3, className: "Ranger" },
  { id: "astral-focus", name: "Astral Focus", slot: "weapon", rarity: "Common", bonus: 3, className: "Mage" },
  { id: "warden-plate", name: "Warden Plate", slot: "armor", rarity: "Common", bonus: 3, className: "Warrior" },
  { id: "nightweave", name: "Nightweave", slot: "armor", rarity: "Common", bonus: 3, className: "Ranger" },
  { id: "runic-vestment", name: "Runic Vestment", slot: "armor", rarity: "Common", bonus: 3, className: "Mage" },
  { id: "riftforged", name: "Riftforged Weapon", slot: "weapon", rarity: "Rare", bonus: 6 },
  { id: "warden-armor", name: "Warden Armor", slot: "armor", rarity: "Rare", bonus: 6 },
  { id: "eclipse-edge", name: "Eclipse Edge", slot: "weapon", rarity: "Epic", bonus: 12 },
  { id: "monarch-mantle", name: "Monarch Mantle", slot: "armor", rarity: "Epic", bonus: 12 },
  { id: "dawnsunder", name: "Dawnsunder", slot: "weapon", rarity: "Legendary", bonus: 18 },
  { id: "sunplate", name: "Sunplate of the First Hunter", slot: "armor", rarity: "Legendary", bonus: 18 },
  { id: "ash-talisman", name: "Ash Talisman", slot: "accessory", rarity: "Common", bonus: 2, stat: "attack" },
  { id: "iron-sigil", name: "Iron Sigil", slot: "accessory", rarity: "Common", bonus: 2, stat: "defense" },
  { id: "wind-ring", name: "Windrunner Ring", slot: "accessory", rarity: "Rare", bonus: 4, stat: "speed" },
  { id: "moon-pendant", name: "Moonfang Pendant", slot: "accessory", rarity: "Rare", bonus: 4, stat: "attack" },
  { id: "astral-charm", name: "Astral Ward Charm", slot: "accessory", rarity: "Epic", bonus: 6, stat: "defense" },
  { id: "sovereign-seal", name: "Sovereign Seal", slot: "accessory", rarity: "Legendary", bonus: 8, stat: "speed" },
];
export const ITEM_CATALOG = [
  ...EQUIPMENT_CATALOG.map((item) => ({ ...item, kind: "equipment" as const })),
  { id: "potion", name: "Crimson Flask", kind: "consumable" as const },
  { id: "ether", name: "Astral Ether", kind: "consumable" as const },
];
export const RARITY_COLORS: Record<Rarity, string> = {
  Common: "#B8AC96", Rare: "#8FDCEB", Epic: "#B299FF", Legendary: "#FFD56D",
};
