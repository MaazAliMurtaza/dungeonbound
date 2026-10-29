import type { Game } from './game';

export type SavedGame = { savedAt: number; progress: Game };

// Restoring a save must preserve its revision; opening the app is not an edit.
export function newestSave(local: SavedGame | null, cloud: SavedGame | null): SavedGame | null {
  return cloud && (!local || cloud.savedAt > local.savedAt) ? cloud : local;
}
