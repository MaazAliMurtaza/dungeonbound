import type { Action, Game } from "./game";

export const HERO_POSES = [
  "idle",
  "attack",
  "power",
  "pierce",
  "ritual",
  "guard",
  "item",
  "hit",
] as const;
export type HeroPose = (typeof HERO_POSES)[number];
export type ArmorTier = "Starter" | "Common" | "Rare" | "Epic" | "Legendary";
export const ARMOR_TIERS: ArmorTier[] = ["Starter", "Common", "Rare", "Epic", "Legendary"];

export function armorAppearance(game: Game): {
  row: number;
  tier: ArmorTier;
  name: string;
} {
  const armor = game.inventory.find(
    (item) => item.slot === "armor" && item.id === game.equipment.armor,
  );
  if (!armor) return { row: 0, tier: "Starter", name: "Starter outfit" };
  return {
    row: Math.min(3, ARMOR_TIERS.indexOf(armor.rarity)),
    tier: armor.rarity,
    name: armor.name,
  };
}

export function actionPose(action: Action, skillId?: string): HeroPose {
  if (action === "attack") return "attack";
  if (action === "defend") return "guard";
  if (action === "potion" || action === "ether") return "item";
  if (skillId === "w-aegis") return "guard";
  if (
    ["w-break", "w-drain", "r-venom", "r-pierce", "m-fire", "m-nova"].includes(
      skillId ?? "",
    )
  )
    return "pierce";
  if (["w-stun", "r-stun", "m-heal", "m-stun"].includes(skillId ?? ""))
    return "ritual";
  return "power";
}

export function homeLayout(width: number, stageHeight: number) {
  const gutter = width < 350 ? 10 : 16;
  const rail = width < 350 ? 60 : 72;
  return {
    gutter,
    rail,
    iconSize: width < 350 ? 44 : 52,
    heroSize: Math.max(
      72,
      Math.min(210, width - 2 * (gutter + rail) - 12, stageHeight - 70),
    ),
  };
}

export function battlefieldActorSize(
  width: number,
  height: number,
  boss = false,
) {
  return Math.max(
    60,
    Math.min(boss ? 210 : 180, (width - 32) * 0.44, height - 52),
  );
}

export function commandDeckLayout(width: number, count: number) {
  const skillCount = Math.max(1, Math.min(5, count));
  const gap = width < 360 ? 6 : 8;
  const slotWidth = Math.floor(
    Math.min(72, (width - 32 - gap * (skillCount - 1)) / skillCount),
  );
  return { gap, slotWidth, iconSize: Math.min(54, slotWidth - 6) };
}
