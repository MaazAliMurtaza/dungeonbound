# Dungeonbound — verified implementation supplement

Verification date: 2026-10-29, Windows PC. This supplements the course report; no original Word/PDF university report was supplied in this workspace. It is not a fabricated development timeline or team contribution allocation. See `VERIFICATION_LOG.md` and `TEST_REPORT.md` for dated commands, failures and actual results.

## Implemented vertical slice

The existing React Native/Expo/TypeScript prototype was retained and repaired. The single-player game provides Warrior, Ranger and Mage classes; seeded eight-room dungeons from start to boss; attack, skill, defend and potion actions; rule-based enemies; equipment and loot; XP/levels; one quest and two achievements; local cached progress and account-authorized PostgreSQL saves. A generated 2D pixel-art atlas supplies character/enemy portraits and animated cutouts with combat effects. This is a lightweight native UI, not a 3D engine or a complete implementation of every original expansion proposal feature.

## Security architecture and evidence

Both session tokens are stored through Expo SecureStore in `mobile/src/auth.ts`. AsyncStorage is used only for non-sensitive per-user game snapshots. Native API audits on the emulator returned token-presence booleans and cache-shape checks without revealing values: tokens existed while signed in and were absent after logout; neither session token was found in AsyncStorage. The API hashes passwords, verifies expiring JWTs, stores only hashed rotating refresh tokens, uses parameterized SQL, applies rate limits and authorizes saves by authenticated user ID. Live tests rejected refresh-token reuse, post-logout refresh and unauthenticated saves, and showed user isolation.

The generated Android manifest disables backup and references SecureStore backup/data-extraction exclusions. A standalone APK and actual backup/restore test are not yet verified. Release URL validation now rejects local, placeholder or non-HTTPS API configuration; local secret files and generated signing material are excluded from EAS uploads. Currently issued access JWTs can remain valid for their 15-minute lifetime after refresh-session logout; no complete OWASP MASVS compliance claim is made.

## Executed verification

- Mobile: 17 unit tests pass, TypeScript passes, Expo compatibility check passes. Earlier Expo Doctor run passed 20/20 checks. Game-rule tests finish all three classes across 30 seeds each.
- Server: three validator tests pass. The local integration sequence passes 16 assertions covering health, registration/login, authenticated saves, stale writes, refresh hashes/rotation and logout.
- PostgreSQL 17 runs locally on port 5433 and migrations pass. Actual local API health URL: `http://localhost:4000/health`; it is not a hosted public endpoint.
- The installed Android 17/API 37 emulator rendered the graphics update and exercised all four combat actions. Warrior has earlier dated boss evidence. The updated Ranger combined sequence passed. Mage reached boss victory but its combined command later failed at a new cloud-fixture assertion; a separate corrected persistence sequence passed, including newer cloud-state restoration and revision preservation. This simulation used an injected disposable database save, not two physical clients. Detailed command outcomes remain in `VERIFICATION_LOG.md`.
- Battle screenshot: `evidence/graphics-emulator.png`. Animation capture: `evidence/graphics-animation.mp4`. Screenshots do not establish FPS, memory consumption or physical-device performance.

## Deployment and remaining work

`deploy/render.yaml` and `deploy/README.md` prepare a free Render API/Neon PostgreSQL route with a proposed $0 ceiling, subject to explicit host/cost/source-upload approval. No cloud resources, HTTPS deployment, EAS build link or installable release APK are claimed. Native debug prebuild generated Android source; compilation needs additional SDK components and is paused for installer consent. No physical Android device is connected.

Eight mobile dependency advisories remain: the supported Expo CLI requires Zod 3 while the available advisory fix is Zod 4; deepmerge has no published patched version. No forced incompatible upgrade/downgrade or disabled security check was used. Offline sync rejects older writes but is not full conflict-free multi-device synchronization. Offline tests covered an already-open signed-in session and reconnected before restart; an offline cold-start restoration pass is not claimed. Account recovery, email verification, anti-cheat, multiplayer and leaderboard are outside the verified slice.

## Attribution

Existing project authorship is preserved. The setup, repair, test automation, release preparation and graphics integration recorded in this session were Codex-assisted. Artwork was created with the built-in imagegen tool; exact prompts and AI attribution are in `mobile/assets/ARTWORK.md`. Human team role assignments and time contributions require the team's own accurate records. This directory has no Git repository or commit hash; local source checkpoints are not commits.
