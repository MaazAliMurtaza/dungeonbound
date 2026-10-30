# Dungeonbound — Test evidence

## Local Windows verification — 2026-10-29

Node v24.11.0, npm 11.20.0. Dependencies installed with user approval.

- Mobile `npm test`: **17 passed, 0 failed**, including save revision, request timeout/network/cancellation and release API URL regressions.
- Mobile `npm run typecheck`: **passed** after repairing the deprecated configuration and nullable hero reference.
- `npx expo install --check`: **passed**; `npx --yes expo-doctor`: **20/20 passed**.
- Server `npm test`: **3 passed, 0 failed**.
- PostgreSQL 17 container healthy on local port 5433; `npm run db:migrate`: **passed**.
- Local API `http://localhost:4000/health`: **passed**.
- `server/npm run test:integration`: live sequence passed 16 assertions for authentication, authorized saves, user isolation, stale writes, refresh hashes/rotation and logout. Disposable accounts removed.
- Final Android export succeeded. A Warrior native-UI run reached boss victory on Expo Go 58.0.5/API 37, including all four combat actions, equipment, quest reward and cloud saves.
- A separate persistence walkthrough exited successfully: offline game progress, pending-save indication, reconnect retry without another action, session/progress after process restart, and logout cleanup.
- Native SecureStore/AsyncStorage audit passed while signed in, after restart and after logout. Both session tokens were in SecureStore while signed in and absent after logout; no current session tokens or sensitive credential keys were found in AsyncStorage. Only boolean/count results were returned.
- Mobile audit has **8 unresolved dependency advisories (5 low, 3 high)**. Server installation audit reported none. An incompatible automatic Expo downgrade was not applied.
- Physical-device tests, standalone APK backup behavior, standalone APK installation and hosted deployment are **not verified**. Ranger completed the updated combined native sequence; Mage boss/persistence and the separate cloud-revision simulation have the actual results below.

`scripts/setup-local.ps1` was attempted per the Windows guide, but the PC rejects unsigned scripts. Its setup steps were executed individually without changing execution policy. See `VERIFICATION_LOG.md` for failures, repairs, Android progress and exact limitations.

## Graphics update — 2026-10-29

After adding the sprite atlas and native animated battle scene: all 13 mobile tests, 3 server tests, mobile typecheck, Expo dependency check and Android export passed again. `node scripts/android-smoke.mjs --graphics-only` exited 0 on the API 37 emulator, exercising Warrior selection and all four combat actions, capturing the battle screenshot, and verifying SecureStore deletion on logout. The earlier full-dungeon and persistence evidence predates this graphics change; the full sequence was not repeated for this presentation update. Physical-device animation performance remains unmeasured.

Evidence: `evidence/graphics-emulator.png` and the 15-second `evidence/graphics-animation.mp4` capture. See `VERIFICATION_LOG.md` for the UIAutomator idle issue and how the test harness handles continuous motion.

## Remaining-work continuation — 2026-10-29

- Ranger combined runner: exit 0; boss, inventory, quest, offline retry, restart restore and token deletion passed on the updated graphics.
- Mage full attempt reached boss victory and passed offline/restart checks, then exited 1 at the newly added cloud-fixture assertion. That command is not a complete combined pass.
- After improving the fixture ordering/startup wait, Mage `--persistence-only`: exit 0; offline retry, session/progress restore, a newer simulated cloud-client save, exact revision preservation, logout and SecureStore deletion all passed. This is one emulator with an injected database fixture, not a real two-device test.
- Latest checks: 17 mobile tests, 3 server tests, 16 live API assertions, TypeScript, Expo compatibility, Doctor 20/20, native prebuild and Android bundle export pass. Generated native manifest retains backup restrictions. EAS preview rejects the local API URL before upload, and upload-ignore rules were checked without uploading anything.
- Local debug APK build is **blocked by missing SDK components and pending installer consent**. No APK produced. Deployment proposal is prepared, not published; cloud/source-upload approval and account authorization remain pending.
- Eight mobile advisories remain; see `DEPENDENCY_REVIEW.md`. No compatible safe upstream fix was found. See `PROJECT_STATUS_REPORT.md` for the factual report supplement.

## Original artifact evidence (historical)

**Execution environment:** Local Node.js v22.16.0, October 29, 2026. Tests invoked before npm dependency installation.

## Executed and passed (11 tests)

### Mobile game rules (`mobile/npm test`)
- ✅ 500 generated dungeon seeds all contain exactly 8 ordered rooms, starting at Start and ending at Boss.
- ✅ The three character classes have different starting stats.
- ✅ Combat does not generate negative HP from a representative encounter.
- ✅ Healing potion consumes exactly one and does not exceed maximum HP.
- ✅ Equipment and quest rewards apply and cannot be claimed twice.
- ✅ Completing one dungeon permits starting another and restores health.
- ✅ Full dungeon run reaches victory for all three classes across 30 seeds each.
- ✅ Repeating a procedural seed creates identical initial encounters and map state.

### Backend pure-validation tests (`server/npm test`)
- ✅ Registration input validation and email normalization.
- ✅ Refresh-token digest creation does not retain plaintext token in digest.
- ✅ Save payload shape validation (accepts a basic sample and rejects invalid sample).

## Not yet executed / must be verified on developer machine

- ⬜ `mobile/npm run typecheck` with Expo dependencies installed.
- ⬜ Expo/Android runtime screen mounting and interactions.
- ⬜ PostgreSQL migration and live Express endpoint integration.
- ⬜ Signup → refresh → logout → invalid-token denial.
- ⬜ Save → restart → restore on a real device.
- ⬜ Token values demonstrably absent from AsyncStorage.
- ⬜ APK generation, installation and physical device performance.

**Reason:** The current artifact environment cannot reach the npm registry, and no Docker PostgreSQL, Expo build credentials or hosting credentials were supplied. These are not claimed as passed.

## Suggested screenshots for the project report

Registration/login, class selection, each combat action, generated map, loot/equipment stats, quest reward, boss victory, session restored after reopening, database `saves` row in a SQL client, passing test outputs, hosted health endpoint and EAS build summary.
