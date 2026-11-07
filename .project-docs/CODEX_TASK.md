> Current proposal gaps and deliverables: [PROPOSAL_AUDIT_2026-11-07.md](PROPOSAL_AUDIT_2026-11-07.md), checked against the supplied Word documents. Latest test evidence: [PHONE_LAYOUT_2026-11-07.md](PHONE_LAYOUT_2026-11-07.md). Earlier checklists/counts below are historical.

# First Codex assignment: Finish Dungeonbound end-to-end

You are working **locally on the user's Windows computer** in the Dungeonbound source folder. Follow `AGENTS.md`.

## Phase A — Inspect and repair
1. Inspect `mobile`, `server`, `compose.yaml`, project docs, and `git status`.
2. Report local prerequisites found/missing: Node/npm, Git, Docker engine, Android Studio/SDK, Android emulator/ADB, Codex auth, Expo/EAS login. Do not pretend they are installed.
3. Install *project* dependencies with the user-approved network permissions; verify Expo SDK/React Native versions actually resolve and are compatible. Avoid blind dependency upgrades.
4. Run `npm test` in each package, mobile TypeScript typecheck, and Expo dependency check. Fix failures and create a checkpoint.

## Phase B — Functional app + database
5. Start the development PostgreSQL container (`docker compose up -d`), migrate schema, start API, and check `/health`.
6. Run a true end-to-end auth flow with disposable local test credentials: register, save, read, refresh (old token must fail), logout (refresh must fail). Verify one user's API cannot read another user's save. Store only hashed refresh tokens in DB.
7. Run Expo on Android emulator or connected phone; verify login, class choice, generated dungeon path, combat actions, inventory, quest, boss and restored progress after app restart. Debug any runtime errors.
8. Explicitly verify that `mobile/src/auth.ts` stores all session tokens with Expo SecureStore and `AsyncStorage` contains only non-sensitive saved game data. Inspect Android backup implications and verify no log exposures. Document evidence without printing token values.
9. Fix and rerun tests, including added regression tests for bugs found. Log actual outcomes in `VERIFICATION_LOG.md`.

## Phase C — Deployment, with user approval
10. Ask which hosted database/API service to use if one is not connected, check cost plan, and request explicit approval before deployment. Recommend a manageable managed PostgreSQL + Node host. Configure production environment variables as **host secrets**, not repo files. Deploy API/migrate DB, then test public HTTPS `/health` and auth endpoints.
11. Configure a unique Android package identity if needed, EAS project link and `EXPO_PUBLIC_API_URL` preview build environment to the actual HTTPS endpoint. Have user sign in to Expo when prompted. Build Android preview APK with `npx eas-cli@latest build --platform android --profile preview`.
12. Install the resulting APK on an Android device, run smoke tests for SecureStore/session restart, dungeon loop, save/reload. Provide the real APK link, actual commit hash, evidence and remaining risks.
13. Update the university project report ONLY with verified implementation, test and deployment evidence. Do not fabricate 8-week timeline or contributions.

## Completion checklist
- [x] Mobile and backend dependencies resolve (8 mobile audit advisories remain)
- [x] Mobile typecheck passes
- [x] Mobile unit tests pass (17 tests, 2026-10-29)
- [x] Server tests pass (3 tests plus live integration sequence)
- [x] Database migrations and API smoke tests pass locally
- [x] Registration / login / refresh / logout pass locally
- [x] SecureStore-only token persistence demonstrated on the emulator
- [x] Full dungeon run and progress restoration demonstrated in Expo Go; see dated per-class results
- [x] Android emulator test results recorded
- [ ] Physical Android device tested (none connected)
- [ ] Hosted HTTPS API deployed (if user approves)
- [ ] Android APK built and installed (if user logs into Expo)
- [ ] Actual links, issue log and contribution evidence available
- [x] Local issue log, source checkpoint and factual implementation supplement available; external links/commit remain unavailable

**Begin by reading AGENTS.md, then run the prerequisites and tests in Phase A. Execute rather than merely describe actions, but request approval for external publishing and costs.**
