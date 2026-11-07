import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  ts = require("typescript");
function harness(network) {
  const storage = new Map(),
    exports = {};
  const store = {
    setItemAsync: async (k, v) => storage.set(k, v),
    getItemAsync: async (k) => storage.get(k) ?? null,
    deleteItemAsync: async (k) => storage.delete(k),
  };
  const code = ts.transpileModule(
    readFileSync(new URL("../src/auth.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    process: { env: { EXPO_PUBLIC_API_URL: "http://127.0.0.1:4000" } },
    __DEV__: true,
    require: (id) =>
      id === "expo-secure-store"
        ? store
        : id === "./http"
          ? { request: network }
          : { validateApiUrl: (x) => x },
  });
  return { auth: exports, storage };
}
const tokens = {
  accessToken: "access-fixture",
  refreshToken: "refresh-fixture",
  user: { id: "test-user", email: "test@example.test" },
};
test("offline cold start restores SecureStore identity without clearing credentials", async () => {
  const { auth, storage } = harness(async () => {
    throw new Error("Network unavailable");
  });
  await auth.storeTokens(tokens);
  const restored = await auth.restoreSession();
  assert.equal(restored.id, tokens.user.id);
  assert.equal(storage.size, 3);
});
test("revoked session is never unlocked from cached identity", async () => {
  const { auth, storage } = harness(async () => ({ ok: false, status: 401 }));
  await auth.storeTokens(tokens);
  await assert.rejects(auth.restoreSession());
  assert.equal(storage.size, 0);
});
test("logout clears tokens and identity even when API cannot be reached", async () => {
  const { auth, storage } = harness(async () => {
    throw new Error("Offline");
  });
  await auth.storeTokens(tokens);
  await assert.rejects(auth.signOut());
  assert.equal(storage.size, 0);
});
test("concurrent refresh requests rotate only once", async () => {
  let count = 0;
  const { auth, storage } = harness(async () => {
    count++;
    await new Promise((r) => setTimeout(r, 5));
    return {
      ok: true,
      json: async () => ({
        ...tokens,
        accessToken: "rotated-access",
        refreshToken: "rotated-refresh",
      }),
    };
  });
  await auth.storeTokens(tokens);
  await Promise.all([
    auth.refreshSession(),
    auth.refreshSession(),
    auth.refreshSession(),
  ]);
  assert.equal(count, 1);
  assert.equal(storage.get("dungeonbound_refresh_v1"), "rotated-refresh");
});
