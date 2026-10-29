import type { HeroClass } from './game';

// Atlas cells are ordered left-to-right, top-to-bottom. See assets/ARTWORK.md.
export const heroCell: Record<HeroClass, number> = { Warrior: 0, Ranger: 1, Mage: 2 };
export const heroTint: Record<HeroClass, string> = { Warrior: '#F5B6A1', Ranger: '#9AE2B1', Mage: '#C6B1FF' };
export function enemyCell(name: string): number {
  return ({ Goblin: 3, Skeleton: 4, 'Cave Bat': 5, Slime: 6, 'Dark Acolyte': 7, 'Elite Stone Golem': 8, 'The Ash Warden': 9 } as Record<string, number>)[name] ?? 3;
}
