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
    row: ARMOR_TIERS.indexOf(armor.rarity),
    tier: armor.rarity,
    name: armor.name,
  };
}

export function weaponAppearance(game: Game) {
  const item = game.inventory.find((entry) => entry.slot === "weapon" && entry.id === game.equipment.weapon);
  const column = item?.name === "Dawnsunder" ? 3 : item?.name === "Eclipse Edge" ? 2 : item?.name === "Riftforged Weapon" ? 1 :
    item?.rarity === "Legendary" ? 3 : item?.rarity === "Epic" ? 2 : item?.rarity === "Rare" ? 1 : 0;
  return { row: ["Warrior","Ranger","Mage"].indexOf(game.hero.className), column,
    name: item?.name ?? (game.hero.className === "Warrior" ? "Steel sword" : game.hero.className === "Ranger" ? "Wooden recurve" : "Wooden staff") };
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

export function combatSequence(action: Action, skillId: string | undefined, className: string,
  cinematic: boolean, reduced: boolean, received: boolean): {at:number;pose:HeroPose}[] {
  const selected=actionPose(action,skillId),impact=cinematic?620:260,reset=cinematic?970:430;
  const sequence:{at:number;pose:HeroPose}[]=[{at:0,pose:selected}];
  if(!reduced&&(action==="attack"||action==="skill")){
    sequence[0].pose=className==="Warrior"?"guard":className==="Ranger"?"power":"ritual";
    sequence.push({at:cinematic?160:70,pose:selected});
    if(className==="Warrior"&&action==="attack")sequence.push({at:cinematic?340:150,pose:"pierce"});
  }
  if(received)sequence.push({at:impact,pose:"hit"});
  sequence.push({at:reset,pose:"idle"});
  return sequence;
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
