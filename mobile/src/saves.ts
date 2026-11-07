import type { Game } from "./game";

export type SavedGame = { savedAt: number; progress: Game };

// Restoring a save must preserve its revision; opening the app is not an edit.
export function newestSave(
  local: SavedGame | null,
  cloud: SavedGame | null,
): SavedGame | null {
  return cloud && (!local || cloud.savedAt > local.savedAt) ? cloud : local;
}

// A newer cloud clock does not mean an unsent local adventure can be discarded.
export function reconcileSaves(
  local: SavedGame | null,
  cloud: SavedGame | null,
  knownCloudRevision: number | null,
): { selected: SavedGame | null; conflict: boolean } {
  const divergent = !!local && !!cloud && local.savedAt !== cloud.savedAt;
  const localPending =
    !!local &&
    (knownCloudRevision === null || local.savedAt > knownCloudRevision);
  const cloudChanged =
    !!cloud &&
    (knownCloudRevision === null || cloud.savedAt !== knownCloudRevision);
  const conflict = divergent && localPending && cloudChanged;
  return { selected: conflict ? local : newestSave(local, cloud), conflict };
}
