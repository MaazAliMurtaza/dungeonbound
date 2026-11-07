# Eclipse Protocol verification - 2026-11-07

Local Windows PC, Node 24.11.0. This records actual work, including failed attempts. It supplements the older verification log; no original university report was supplied.

## Implementation

- Six themed floors, eight rooms each; ten regular enemies, an elite and six named guardians. Fifteen class skills, twelve contracts, four relic choices, eight achievements, status effects, enemy intents, earned-gold item/equipment/skill shop, equipment sales, and harder replay cycles.
- After user feedback on the initial card layout, inspected actual Slay the Spire, Darkest Dungeon and Epic Seven screenshots. Replaced the scrolling hub/battle paths with `GameWorld.tsx`: full-screen world, larger actors, edge HUDs, fixed illustrated command deck and in-world victory/relic/event presentation. Combat has no page scrolling or menu tab bar. Secondary menus use framed panels and illustrated items.
- Original generated environment, monster and ability atlases saved in `mobile/assets`. Exact built-in imagegen prompts, reference provenance, shared final-guardian illustration and animated-cutout limitations are in `ARTWORK-v2.md`.
- Shared strict save schema and safe complete-v1 migration; remembered cloud revisions; optimistic conflicts with explicit local/cloud choice and local backups; offline SecureStore identity restoration; immediate access-session revocation; opt-in leaderboard with public aliases. Hosting configuration includes the shared schema source.

## Executed checks

| Check | Result |
| --- | --- |
| Mobile unit tests | 31 passed, 0 failed |
| Full campaign simulation | All three classes across ten seeds each: 30 complete six-floor campaigns |
| Mobile TypeScript | Passed |
| Offline Expo compatibility check | Passed; Expo warns offline validation is less reliable |
| Final Android scene bundle | HTTP 200; 747 modules |
| Backend unit tests | 4 passed, 0 failed |
| Local PostgreSQL migration | Passed |
| Live API integration | 26 assertions passed |
| Mobile dependency audit | 5 moderate; 0 high or critical |
| Server dependency audit | 0 findings |

The mobile tests also protect pending local edits during online startup when another cloud revision exists. They exercise all fifteen skills, shop affordability/class/level/ownership rules, equipment sales, twelve one-time contracts, relic decisions, full campaigns, malformed nested saves, migration, offline auth, revoked sessions and refresh single-flight. Targeted expansion regressions passed again after rejecting v2 fields injected into legacy saves. API tests cover protected saves, optimistic/equal/stale revisions, unknown credential fields, user isolation, leaderboard publish/remove/privacy, refresh rotation, and immediate logout revocation.

Local health URL: `http://127.0.0.1:4000/health`. API and Metro are localhost-only and reached from Android through ADB reverse ports 4000/8082. This is not a hosted public service.

## Android setup and failed attempts

- Android 17 / API 37 Medium Phone booted but repeatedly stalled in Android System UI. Attempts at 1536/2048 MB were automatically increased to the image's 4096 MB minimum; these did not establish lower-RAM performance. The original profile was stopped and preserved.
- Installed the official AOSP Android 11 x86_64 image and created the separate `Dungeonbound_LowEnd_API30` Nexus S profile. Cold boot completed in about 173 seconds. Actual guest memory: 2028600 KiB (about 2 GB); the requested 1536 MB was raised to the image's 2048 MB minimum. `/proc/cpuinfo` confirmed two CPUs. Display: 480x800, density 160. Existing cached Expo Go 58.0.5 installed successfully.
- An intermediate card-layout runner passed registration, skill purchase, all combat actions, eight-room victory and contract reward, then failed at shop control lookup because its fling skipped stock. Full-screen-layout attempts failed at SKILLS because the harness excluded visible footer controls at y=787. These were failed combined commands. The corrected runner uses slower incremental scrolling, fresh UI snapshots and positive-area bounds checks.
- New current-layout runner has passed registration, Warrior awakening, skill purchase, all five basic/skill action types, eight-room guardian victory, contract reward, equipment purchase and equip UI. Signed-in native storage audit: access/refresh present, no sensitive AsyncStorage keys, no session tokens in AsyncStorage, valid game snapshot shapes. The same combined command completed successfully: process/session restore, offline cold-start restore, reconnect conflict selection retaining the local adventure, logout and both SecureStore token deletions. Command exit: 0.
- Development Expo Go memory sample in the full-screen scene: TOTAL PSS 243068 KiB, TOTAL RSS 379332 KiB. This includes the Expo Go/debug host. It is not a standalone APK benchmark, an FPS measurement, or proof of physical low-end phone performance.

## Dependency changes

Compatible `npm audit fix --ignore-scripts` changed the mobile lockfile without changing Expo SDK or forcing a downgrade. Before: ten findings (one low, seven moderate, two high). After: five moderate, no high/critical. Remaining glob/minimatch findings flow through Expo CLI/fingerprint/Expo; npm proposes an incompatible Expo 53 downgrade with `--force`, which was not applied. Expo's compatible safe-area package was added; installation still reports five moderate findings. No global dependency upgrade was performed.

## Release limits

No new public deployment, source push, signing build, paid service or external message. Hosted HTTPS API, standalone APK completion, standalone backup/restore and physical-device performance remain unverified. Full campaigns were simulated in rules tests; the native walkthrough covers a floor plus persistence, not six manually played floors on a phone. Leaderboard records are player-save progress, not anti-cheat verified competition. No music, voice acting, multiplayer, account recovery/email delivery, or full skill specialization tree is claimed.


## Final targeted startup regression

`node --experimental-strip-types scripts/android-startup-conflict.mjs`: exit 0. A disposable account, two different saved progress snapshots and a remembered older cloud revision were injected through the native SecureStore/AsyncStorage modules and the authenticated API. On online cold start, the native UI asked before replacing the unsent local adventure. Choosing cloud restored the cloud snapshot and preserved both snapshots in the local conflict backup. The fixture was logged out and local fixture keys/database account removed. This is an injected fixture on one emulator, not two physical clients.

The first targeted attempt failed because the harness expected an absolute module path but Metro reports `src/auth.ts`. After fixing the path, a fixed startup delay asserted before hydration completed; a later fresh UI dump showed the expected dialog. The final condition-based wait passed. These attempts did not establish a game-state loss. The final startup protection has a separate passing unit regression, and the complete suite is 31/31 with TypeScript and offline compatibility checks passing. Backend unit tests (4/4) and the live API integration (26 assertions) passed again after the final schema hardening.

Current source remains local and uncommitted. API, Metro and the low-end emulator are left running on localhost for review; the last targeted fixture was logged out. Screenshots: evidence/redesign-battle.png, redesign-hub.png, redesign-shop.png, redesign-skills.png, redesign-victory.png and redesign-login.png. Earlier Android system and selector-failure screenshots are named explicitly as failures.
