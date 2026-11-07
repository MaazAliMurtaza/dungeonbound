import type { HeroClass } from './game';

// Atlas cells are ordered left-to-right, top-to-bottom. See assets/ARTWORK.md.
export const heroCell: Record<HeroClass, number> = { Warrior: 0, Ranger: 1, Mage: 2 };
export const heroTint: Record<HeroClass, string> = { Warrior: '#F5B6A1', Ranger: '#9AE2B1', Mage: '#C6B1FF' };
export function enemyCell(name: string): number {
  return ({ Goblin: 0, Skeleton: 1, 'Cave Bat': 2, Slime: 3, 'Dark Acolyte': 4, 'Venom Stalker':5,'Frost Revenant':6,'Ember Hound':7,'Void Sentinel':8,Mimic:9,'Elite Stone Golem':10,'The Ash Warden':11,'Thorn Sovereign':12,'The Pale Matriarch':13,'Furnace Colossus':14,'The Nameless Archivist':15,'Eclipse Monarch':8 } as Record<string, number>)[name] ?? 0;
}
