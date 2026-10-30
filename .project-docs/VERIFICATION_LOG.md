# Dungeonbound â€” local verification log

Date: 2026-10-29. Platform: this Windows PC, PowerShell, Node v24.11.0, npm 11.20.0. Results below were actually executed locally; original artifact results remain historical in TEST_REPORT.md. User explicitly approved project dependency installation. No external deployment was performed.

## Current results

| Check | Actual outcome / evidence |
|---|---|
| Read project instructions | AGENTS.md, CODEX_TASK.md, README.md, TEST_REPORT.md, CODEX_WINDOWS_SETUP.md and existing scripts inspected |
| Git | Installed; git status failed because extracted folder has no Git repository. No Git initialization or commit performed. Local source checkpoint created separately. |
| Prerequisites | Node/npm, Git, Java 21, Docker Desktop 4.97.0 / Linux engine 29.9.2, Android Studio, SDK, ADB and emulator found. ADB/emulator absent from PATH; used absolute SDK paths. Codex and EAS login-status checks succeeded; no deployment credentials used. |
| Dependency installation | npm install succeeded in mobile and server; package-lock.json created for each. No force or legacy-peer-deps flags. |
| Expo compatibility | Expo 58.0.21, RN 0.88.1, React 19.3.0, TS 6.0.3 resolve. Installed bundledNativeModules recommendations match. npx expo install --check PASS. |
| Expo Doctor | npx --yes expo-doctor: PASS, 20/20 checks |
| Mobile tests | npm test: PASS, 13 tests, 0 failures (8 game rules, 2 save revision selection, 3 timeout/network/cancellation) |
| Mobile TypeScript | npm run typecheck: PASS |
| Android bundling | Final npx expo export --platform android --max-workers 1: PASS, 625 modules, 1.6 MB Hermes bundle. Export is not a standalone APK. |
| Server tests | npm test: PASS, 3 validator tests, 0 failures |
| PostgreSQL | docker compose up -d --wait: PASS after port adjustment; postgres:17-alpine healthy on 127.0.0.1:5433. pg_isready PASS. |
| Schema | Initial schema application through psql with ON_ERROR_STOP=1 succeeded; npm run db:migrate also passed and was rerun successfully. |
| Local health | http://localhost:4000/health returns status ok, service dungeonbound-api; rechecked after offline test restarted API. |
| Live API integration | node --experimental-strip-types tests/api.integration.mjs in server: PASS, 16 assertions (details below). Reusable npm run test:integration added. Disposable users removed. |
| Windows setup helper | Attempted scripts/setup-local.ps1 per CODEX_WINDOWS_SETUP.md; rejected by signed-script execution policy. Equivalent commands executed individually. No policy change. |
| Android runtime | Expo Go 58.0.5 installed using official Expo CLI download. Login and game screens render on Medium_Phone_API_37.0, Android 17/API 37, x86_64. |
| Full dungeon gameplay | Warrior reached boss victory through native UI taps. Class selection, generated room path, attack, skill, defend, potion, equipment and quest reward observed; game saves reached PostgreSQL. See walkthrough sequence limitations below. |
| Offline/reconnect | PASS in separate persistence walkthrough: stopped the project API, entered dungeon, observed pending local save; restarted API and pending progress uploaded without another game action. |
| Process restart | PASS: force-stopped Expo Go, reopened app; session and progress restored, Continue Adventure and Next Room worked. |
| SecureStore on emulator | PASS through normal native SecureStore APIs via existing Metro/Hermes debugger: both tokens present while signed in, both absent after logout. Only booleans/counts returned. |
| AsyncStorage on emulator | PASS: 3 per-user progress entries, each with savedAt/progress shape; no sensitive credential keys and neither current session token found in any cached value. Checked signed in, after restart and after logout. |
| Android backup | Reviewed app.json (allowBackup false, configureAndroidBackup true) and installed SecureStore XML exclusions for cloud backup/device transfer. Standalone native manifest and actual backup/restore: Not run (no project APK built). |
| Native runtime errors | Filtered AndroidRuntime:E and ReactNativeJS:E logcat check returned no errors during final persistence run. SafeAreaView deprecation warning remains in Metro. |
| Physical Android device | Not run: no physical device listed by ADB |
| Hosted HTTPS API / EAS APK | Not deployed / Not built. No health/build link obtained for external services. Requires Phase C host/cost/publishing approval. |

## API integration assertions

The disposable local flow verified database-backed health; two registrations; incorrect-password rejection; login; unauthenticated save read rejection; authenticated save; exact save roundtrip; second user's save isolation; stale timestamp rejection (409); stored refresh digests matching SHA-256 rather than plaintext; refresh rotation; rejection of the rotated-out token; renewed access; logout; and rejection of the logged-out refresh token. Test credentials/tokens were generated in memory and not printed. Test users and related saves/sessions were removed.

## Repairs and regressions

- Removed unused baseUrl deprecated by TypeScript 6 and narrowed the optional hero reference in App.tsx. Initial compiler failures were real; final compiler run passes.
- Preserved original local/cloud save timestamps during hydration instead of making reopening the app look like a new edit. Added selection regression tests; invalid cached timestamps are rejected.
- Added retries for pending cloud saves every 15 seconds while active and on app foreground. Offline/reconnect behavior was then demonstrated on Android.
- Added a 15-second request timeout so unreachable API calls no longer leave authentication busy indefinitely. Tests cover timeout, network failure and caller cancellation. All token persistence remains in expo-secure-store.
- Compose now supports POSTGRES_PORT with default 5432; this PC's ignored root .env selects 5433 because another process already owns 5432. Existing service left running.
- Created ignored server/.env with locally generated random JWT secret without printing it; created ignored mobile/.env. A first random-generation attempt used .NET methods unavailable in Windows PowerShell; replaced with compatible RandomNumberGenerator.Create/GetBytes and BitConverter before starting API.

## Android environment and actual walkthrough history

The AVD reports recommended host RAM 16384 MiB versus 16198 MiB available, but its hypervisor compatibility check passes. Initial boot stayed offline in ADB; a cold boot with 2048 MB guest RAM, two cores, software GPU and no boot animation eventually completed. Software OpenGL fell back to system OpenGL. A Pixel Launcher ANR occurred and was dismissed. Emulator-only display overrides are 540x1200/density 240; window/transition/animator animation scales were disabled. These settings do not remove the host-RAM recommendation.

The standard http://10.0.2.2:4000 path left registration pending on this PC. The working development setup uses ignored mobile/.env with http://127.0.0.1:4000 and adb reverse tcp:4000 tcp:4000. Metro runs on localhost:8082 with its own ADB forwarding. Reapply forwarding after emulator/ADB restarts. No firewall rules or global configuration were changed. Release builds still require a real HTTPS backend.

Walkthrough evidence comes from multiple executions, not one all-green combined command:

1. Initial automation encountered an already-selected registration screen, then a run encountered the unreachable API path; these attempts failed.
2. An early gameplay run verified several actions but a development source reload returned it to Home and the runner stopped. No boss pass was claimed for that run.
3. A stable run verified all four combat actions, equipment, quest reward, cloud saves and boss victory. Its subsequent offline assertion failed to locate the expected status in the visible UI. This command exited unsuccessfully after boss victory, and is not reported as a complete combined smoke pass.
4. The offline check was adjusted to stop/restart only this project's API and scroll to the status. The command below then exited 0, verifying offline pending state, automatic retry, session/progress restore and logout token deletion:

   $env:DUNGEONBOUND_API_PID='<PID of this project API>'
   node scripts/android-smoke.mjs --persistence-only

   The runner generated a fresh disposable account and cleaned it up. API was restarted as a hidden background Node process and is healthy afterward.

Storage audit: node scripts/android-storage-audit.mjs uses this local app's existing Metro/Hermes debugger to call native SecureStore and AsyncStorage APIs, returning only aggregate booleans/counts. Native run-as filesystem inspection was attempted but denied because Expo Go is not debuggable. Initial debugger attempts without the required localhost Origin header were rejected; the corrected local debugger client succeeded. No token values were returned or printed. After logout, node scripts/android-storage-audit.mjs --signed-out validates absence of both tokens.

## Remaining limits

- Mobile npm audit reports 8 unresolved advisories (5 low, 3 high), including transitive deepmerge and zod. Its automatic suggested remedy downgrades Expo to SDK 51; this incompatible downgrade was not applied. Server installation audit reported 0 vulnerabilities.
- Native UI full-run coverage is Warrior only; all three classes completed the separate game-rule tests across 30 seeds each. Ranger/Mage full native walkthroughs: Not run.
- Stale writes were rejected in live API tests and local/cloud revision selection has unit coverage. Full conflict-free multi-device synchronization is not implemented or claimed. A separate multi-device conflict UI test: Not run.
- Emulator security evidence applies to this Expo Go development runtime. Physical device, standalone app backup behavior, production APK install, performance measurements, hosted HTTPS service and EAS builds: Not run.
- API/Metro are local development processes. The custom forwarded mobile URL is unsuitable for release. No external publishing, spending, global installers, or signing/deployment credential operations occurred.
## 2D graphics update — 2026-10-29

Implemented from the existing app: a transparent 12-cell pixel-art atlas (three heroes, seven enemies, treasure chest and dungeon gate), class portraits and login character lineup, native dungeon wall/floor/torch backdrop, sprite idle movement, attack/counterattack lunges, enemy hit rotation, defeat fading, floating damage, spell rings, guard shield and potion healing overlay. Brief action locking prevents overlapping combat presentations. These are animated single-pose cutouts, not frame-by-frame walking sheets. No game-rule, save-schema or authentication changes; no added npm dependencies or graphics engine. Reduced-motion settings suppress movement; backgrounding stops idle loops.

Asset created with the built-in imagegen skill/tool, not CLI/API credentials. Final project asset: mobile/assets/dungeon-atlas.png (1448x1086, 1,203,637 bytes, transparent corner alpha 0). The first generated image was rejected for cell overlap; a targeted spacing edit produced the selected atlas. Exact generation/edit prompts, cell mapping and AI authorship disclosure are in mobile/assets/ARTWORK.md. No external sprite pack or invented human artwork credit.

Executed after this change:

- mobile npm test: PASS, 13 tests; mobile npm run typecheck: PASS.
- server npm test: PASS, 3 tests.
- mobile npx expo install --check: PASS, dependencies up to date.
- mobile npx expo export --platform android --max-workers 1: PASS, 629 modules, one 1.2 MB atlas asset and a 1.6 MB Hermes bundle. Not an APK.
- node scripts/android-smoke.mjs --graphics-only: final run exited 0 on the existing Android 17/API 37 emulator. Verified registration, Warrior selection, guard, potion, skill and attack; captured battle screenshot; logout and boolean-only SecureStore/AsyncStorage audit passed. Disposable account removed.
- Filtered AndroidRuntime:E / ReactNativeJS:E logcat query returned no errors during graphics testing.
- Evidence saved: evidence/graphics-emulator.png (battle screenshot visually inspected) and evidence/graphics-animation.mp4 (15-second screenrecord capture). No token values in evidence.

An initial graphics automation attempt failed because continuous idle animation prevented UIAutomator from reaching idle; it is not counted as a pass. The runner now temporarily enables reduced motion while querying the accessibility hierarchy, restores motion before graphics-mode taps, and restores the original setting on exit. Idle animations also use isInteraction=false. Animator and transition scales are set to 1 on this emulator after verification so the user can see the animations; these are emulator-only settings. No Windows configuration changed.

Scope of current evidence: graphics smoke is Warrior and ordinary combat; all enemy mappings exist and were reviewed in the atlas. A complete dungeon, Ranger/Mage native walkthroughs, a dedicated reduced-motion manual walkthrough, and physical-device graphics/performance were not rerun for this presentation change. Prior full-game/persistence evidence above remains dated to the preceding version. No FPS or performance numbers claimed. Existing npm audit advisories and Phase C/standalone APK limitations remain unresolved and unchanged.

## Remaining-work continuation — 2026-10-29

The user asked to complete the previously remaining work. Hosting choice/spend boundary and Android SDK installation consent were requested separately; no answer/approval has been received yet. Independent local work continued.

Completed and actually checked in this continuation:

- Release API validation rejects missing, local/private, placeholder and non-HTTPS URLs, and rejects credentials/query fragments. Added four regression tests. `npm test` in mobile now passes 17 tests; `npm run typecheck` passes.
- `mobile/app.config.ts` applies the guard to EAS preview/production and explicit local release-config checks. A subprocess with EAS_BUILD_PROFILE=preview and the existing local API URL was rejected as expected before upload (guard check PASS). Initial config import without a .ts extension failed; explicit extension plus allowImportingTsExtensions fixed it. Normal `npx expo config --type public` succeeds.
- Installed SDK-compatible expo-system-ui 58.0.7 with existing project dependency approval to address the native dark-theme prebuild warning. Refreshed native prebuild completes without that warning; generated app manifest retains allowBackup=false and both SecureStore exclusion references. This is source/config evidence, not a built APK or actual backup restoration.
- Latest Expo checks: dependency check PASS; Expo Doctor PASS 20/20; Android export PASS (630 modules, 1.2 MB atlas, 1.6 MB Hermes bundle). Server tests PASS (3) and `npm run test:integration` PASS (16 assertions) rerun successfully.
- Reviewed current dependency registry and advisory records. Expo 58.0.21 remains the latest SDK 58 patch; CLI requires Zod ^3.25.76, while advisory fix is 4.6.6; deepmerge 4.3.1 has no published patch. Eight audit advisories remain. No force install, incompatible override, suppression or unsupported downgrade used. See DEPENDENCY_REVIEW.md for evidence and links.
- Ranger combined native walkthrough exited 0 in Expo Go with updated graphics: boss victory, equipment, quest, all four combat actions, offline pending save, reconnect upload without another action, process/session/progress restore, logout and native token deletion. Screenshot: evidence/victory-ranger.png. This run used system reduced motion (transition scale 0) and remained playable.
- Mage full walkthrough is in progress. Its first attempt failed looking for Next Room while the native UI already displayed an enemy. It is NOT a pass. Test harness now avoids stale accessibility snapshots, recognizes displayed-room/cloud-snapshot mismatch, and re-reads state rather than claiming a missing action succeeded. The current rerun will additionally simulate a newer cloud-client save and check original revision preservation.

Native APK preparation and actual failure/stop reasons:

1. `npx expo run:android --variant debug --no-bundler --port 8082` generated native source but rejected mutually exclusive --port/--no-bundler arguments. No APK produced.
2. Started local Gradle assembleDebug for x86_64 using the existing SDK and limited workers/memory. Inspection found required SDK packages missing. The task's Gradle daemon was intentionally stopped before SDK installer work pending user consent; its daemon-disappeared message is an intentional stop, not a claimed unexplained app crash.
3. Added `node scripts/build-android-local.mjs --check` and executed it: exit 1, missing Build Tools 37.0.0, NDK 27.1.12297006 and CMake 3.30.5. API 37/platform-tools exist. This guard refuses SDK auto-installation; build mode also disables Gradle SDK downloading. `--install` will build/install a debug x86_64 emulator APK only after prerequisites exist. No APK/hash is claimed now; debug APK is not an EAS/standalone release.

Deployment and evidence preparation:

- Draft `deploy/render.yaml` parses locally and retains free service plan and host-secret DATABASE_URL (parser checks PASS). Render account/schema validation and resource creation were not executed. `deploy/README.md` specifies proposed Render Free + Neon Free and $0 ceiling, cold-start/quotas, host-secret handling, private source/EAS upload scope and approval gate.
- Render/Neon integrations were found available but unconnected; suggestions do not constitute installation or account authorization. No hosting/signing/deployment credentials used, no source uploaded and no resource created.
- `.gitignore` now excludes environment variants and generated native/signing output. `mobile/.easignore` excludes local secrets/keys/native output while retaining app source/atlas; checks with the installed ignore parser passed. No actual EAS upload performed.
- Added PROJECT_STATUS_REPORT.md as a factual implementation supplement. No original university Word/PDF report exists in this workspace, so none was claimed edited. No fabricated team roles, contributions, timeline or performance numbers.
- Only emulator-5554 is connected; physical phone tests remain Not run. Actual standalone backup/restore, hosted HTTPS endpoint, EAS preview APK, installation and production signing remain pending. This directory remains outside Git; no commit hash exists.

### Final outcomes of this continuation

- Ranger full updated combined runner: exit 0 (boss, quest/equipment, offline, reconnect, restart, native token audit/logout).
- Mage full attempt: boss victory, quest/equipment, offline retry and process restoration observed, but command exited 1 at the added simulated-cloud assertion. The initial fixture used wall-clock +2 seconds and one fixed startup wait; its failure is retained as a failure.
- Revised cloud fixture now chooses a revision above both the existing persisted revision and wall clock, checks that exactly one disposable row was updated, and polls for hydrated UI. `DUNGEONBOUND_HERO=Mage node scripts/android-smoke.mjs --persistence-only` then exited 0: offline pending/retry, session/progress restart, newer simulated cloud-client gold restored in native UI, exact original cloud revision retained, logout and both token deletions passed. The test changes do not establish which of fixture ordering versus startup timing caused the first assertion failure. This is not actual two-device evidence or a claim that the earlier combined command passed.
- Final native audits: 8 non-sensitive per-user cached progress entries, expected game snapshot shape, no sensitive credential keys and neither session token in AsyncStorage. Both SecureStore tokens absent after logout. Disposable database accounts removed. Screenshots evidence/victory-ranger.png and evidence/victory-mage.png captured during their boss runs.
- Mobile 17 tests / server 3 tests / live API 16 assertions pass. TypeScript and dependency check pass. Latest Expo Doctor 20/20 and Android export (630 modules) pass. EAS preview/production profiles now pin locally tested Node 24.11.0; this setting has not been cloud-built. Preview/local URL rejection gate rechecked successfully after pinning. Node prerequisite docs distinguish native TypeScript support from the old SDK minimum.
- EAS ignore-rule checks passed for environment variants/signing output exclusion and app source/atlas inclusion. Local Render YAML parse checks passed, not remote account/schema validation. No publishing or source upload occurred.
- Local debug APK prerequisites remain missing: Build Tools 37.0.0, NDK 27.1.12297006 and CMake 3.30.5. Installer consent remains pending; no SDK package install was performed and no APK was produced. Native prebuild source and backup restrictions are verified, compiled APK/backup restore remain Not run.
- Still blocked on user choice/approval: host/cost/private-source and EAS publishing, required Android SDK installer actions. Render/Neon account integrations remain unconnected. Physical phone still absent. Eight upstream dependency advisories remain unresolved. No EAS link, hosted API URL, production signing credentials or Git commit hash obtained.

Current reviewed source checkpoint: C:\D\Final Year\7th Sem\MAD\Project\dungeonbound-codex-ready\dungeonbound-complete\.checkpoints\remaining-2026-10-29-214219. This is a local snapshot, not a Git commit. It excludes secrets, native signing output, dependency caches and APKs.

## Approved installation and publishing — 2026-10-29

User explicitly replied "all approved" to SDK installation and the Render/Neon/EAS/private-source plan with a $0 cap. This approval persists; account access is separate from approval.

Executed so far in this turn:

- Initialized local Git using the PC's existing configured author identity. Reviewed 60 staged source/evidence files and checked exclusions/known local JWT secret/private-key/token signatures before committing. Local .env files, native debug keys, caches and APKs are excluded.
- GitHub connector has no repository-creation operation, so used the existing Git Credential Manager login in process memory after verifying it belonged to MaazAliMurtaza. No credential value was printed. Created and pushed private repository https://github.com/MaazAliMurtaza/dungeonbound; connector metadata confirmed visibility=private. Initial source commit: 968e4853fc7342f976dad484783ea35b1abb2f3c.
- Created and linked EAS project https://expo.dev/accounts/maazay.py/projects/dungeonbound (project ID 9b17cdde-bfcc-4054-9499-363f940ca1d1) using the existing signed-in personal Expo account. No signing credentials or build job created. Updated app identity to com.maazay.dungeonbound; build helper now reads identity from app.json. Commit b1c10985d9fbae90b020116677db38fb348b56ae pushed for linkage/identity/approval metadata.
- Downloaded official Windows Android command-line tools 23.0 from Google's repository and matched the published archive SHA-1. Latest sdkmanager redirects to the new Android CLI: old semicolon names and top-level package@version attempts skipped packages despite exit 0, so those attempts are NOT installation passes. New Android CLI uses SDK-style paths (build-tools/37.0.0, ndk/27.1.12297006, cmake/3.30.5).
- Correct Android CLI install commands downloaded/extracted all three approved components. Metrics disabled for explicit new CLI calls. Existing accepted SDK license was present. `node scripts/build-android-local.mjs --check`: PASS, API 37/platform-tools plus Build Tools 37.0.0, NDK 27.1.12297006 and CMake 3.30.5 present.
- `node scripts/build-android-local.mjs --install` is running: native prebuild succeeded, Gradle first native compilation/configuration still in progress. No APK or successful installation is claimed yet. Local API and Metro remain healthy; emulator-5554 is connected, no physical device.
- Mobile 17 tests rerun PASS; server 3 tests rerun PASS; TypeScript rerun PASS after project identity/linkage. Expo dependency-check result pending collection.
- Render and Neon integrations are still uninstalled/unconnected according to fresh discovery; their authenticated service tools are unavailable. Requested provider sign-in while continuing the local build. No Render/Neon resource, hosted health URL or EAS preview build exists yet. No paid action or external message sent.
