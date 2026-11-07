import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ApiError,
  authorized,
  restoreSession,
  signIn,
  signOut,
  type User,
} from "./auth";
import { CURRENT_SAVE_VERSION, migrateGame, type Game } from "./game";
import { reconcileSaves, type SavedGame } from "./saves";

const key = (id: string) => `dungeonbound_progress_${id}`;
const cloudKey = (id: string) => `dungeonbound_cloud_revision_${id}`;
type LoadedSave = SavedGame & { migrated: boolean };
function snapshot(value: unknown): LoadedSave | null {
  if (!value || typeof value !== "object") return null;
  const s = value as SavedGame,
    progress = migrateGame(s.progress);
  return progress &&
    Number.isSafeInteger(s.savedAt) &&
    s.savedAt >= 1600000000000
    ? {
        progress,
        savedAt: s.savedAt,
        migrated: s.progress.version !== CURRENT_SAVE_VERSION,
      }
    : null;
}
export function useAdventure() {
  const [user, setUser] = useState<User | null>(null),
    [game, setGame] = useState<Game | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sync, setSync] = useState(""),
    [ready, setReady] = useState(false),
    [conflict, setConflict] = useState(false);
  const revision = useRef(0),
    base = useRef<number | null>(null),
    account = useRef<string | null>(null),
    conflicted = useRef(false),
    restoring = useRef(false);
  async function hydrate(u: User) {
    setReady(false);
    account.current = u.id;
    const remembered = Number(await AsyncStorage.getItem(cloudKey(u.id)));
    base.current =
      Number.isSafeInteger(remembered) && remembered >= 1600000000000
        ? remembered
        : null;
    const raw = await AsyncStorage.getItem(key(u.id));
    let local: SavedGame | null = null;
    try {
      local = snapshot(raw ? JSON.parse(raw) : null);
    } catch {}
    let selected = local;
    try {
      const cloud = await authorized("/save");
      const choice = reconcileSaves(
        local,
        snapshot({ progress: cloud.progress, savedAt: cloud.clientUpdatedAt }),
        base.current,
      );
      selected = choice.selected;
      base.current = cloud.clientUpdatedAt ?? 0;
      if (choice.conflict) {
        conflicted.current = true;
        setConflict(true);
        setSync("Two adventures need your choice");
      } else {
        await AsyncStorage.setItem(cloudKey(u.id), String(base.current));
        setSync("Cloud connected");
      }
    } catch {
      setSync("Offline · progress stays on this device");
    }
    revision.current =
      selected && (selected as LoadedSave).migrated
        ? Math.max(Date.now(), selected.savedAt + 1)
        : (selected?.savedAt ?? 0);
    setGame(selected?.progress ?? null);
    setUser(u);
    setReady(true);
  }
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const u = await restoreSession();
        if (active && u) await hydrate(u);
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  function update(next: Game) {
    if (conflicted.current || restoring.current) return;
    revision.current = Math.max(Date.now(), revision.current + 1);
    setGame(next);
  }
  useEffect(() => {
    if (!ready || !user || !game || conflict) return;
    let cancelled = false,
      sending = false,
      complete = false;
    const id = user.id,
      save = { savedAt: revision.current, progress: game };
    const localWrite = AsyncStorage.setItem(key(id), JSON.stringify(save));
    let localOK = false;
    void localWrite
      .then(() => {
        localOK = true;
      })
      .catch(() => setSync("Device save failed · keep the app open"));
    async function send() {
      if (cancelled || sending || complete) return;
      sending = true;
      try {
        await localWrite;
        // After an offline launch, establish the expected cloud revision first.
        if (base.current === null) {
          const cloud = await authorized("/save");
          const remote = snapshot({
            progress: cloud.progress,
            savedAt: cloud.clientUpdatedAt,
          });
          if (remote && remote.savedAt !== save.savedAt) {
            conflicted.current = true;
            setConflict(true);
            setSync("Two adventures need your choice");
            return;
          }
          base.current = cloud.clientUpdatedAt ?? 0;
        }
        const result = await authorized("/save", {
          method: "PUT",
          body: JSON.stringify({
            progress: save.progress,
            clientUpdatedAt: save.savedAt,
            baseRevision: base.current,
          }),
        });
        if (account.current === id) {
          base.current = result.clientUpdatedAt;
          await AsyncStorage.setItem(cloudKey(id), String(base.current));
        }
        complete = true;
        if (!cancelled) setSync("Saved to cloud");
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 409) {
          conflicted.current = true;
          setConflict(true);
          setSync("Two adventures need your choice");
        } else if (e instanceof ApiError && e.status === 400)
          setSync("Save rejected · local copy retained");
        else if (e instanceof ApiError && e.status === 401)
          setSync("Session expired · sign in again; local copy retained");
        else
          setSync(
            localOK
              ? "Saved locally · cloud sync pending"
              : "Device save failed · keep the app open",
          );
      } finally {
        sending = false;
      }
    }
    const timer = setTimeout(send, 700),
      retry = setInterval(send, 15000),
      listener = AppState.addEventListener("change", (s) => {
        if (s === "active") void send();
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearInterval(retry);
      listener.remove();
    };
  }, [game, ready, user?.id, conflict]);
  async function resolveConflict(choice: "cloud" | "local") {
    if (!user || !game) return;
    setBusy(true);
    restoring.current = true;
    setError("");
    try {
      const cloud = await authorized("/save");
      const remote = snapshot({
        progress: cloud.progress,
        savedAt: cloud.clientUpdatedAt,
      });
      // Retain both snapshots before the player resolves a cross-device conflict.
      await AsyncStorage.setItem(
        `${key(user.id)}_conflict`,
        JSON.stringify({
          local: { savedAt: revision.current, progress: game },
          cloud: remote,
        }),
      );
      base.current = cloud.clientUpdatedAt ?? 0;
      if (choice === "cloud" && remote) {
        revision.current = remote.migrated
          ? Math.max(Date.now(), remote.savedAt + 1)
          : remote.savedAt;
        setGame(remote.progress);
      } else {
        revision.current = Math.max(
          Date.now(),
          revision.current + 1,
          (remote?.savedAt ?? 0) + 1,
        );
        setGame({ ...game });
      }
      conflicted.current = false;
      setConflict(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      restoring.current = false;
      setBusy(false);
    }
  }
  async function login(email: string, password: string, register: boolean) {
    setBusy(true);
    setError("");
    try {
      await hydrate(await signIn(email, password, register));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setReady(false);
    account.current = null;
    try {
      await signOut();
    } catch {}
    setUser(null);
    setGame(null);
    setSync("");
    setError("");
    setConflict(false);
    conflicted.current = false;
  }
  return {
    user,
    game,
    loading,
    busy,
    error,
    sync,
    conflict,
    update,
    login,
    logout,
    resolveConflict,
    setError,
  };
}
