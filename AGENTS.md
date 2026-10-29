# Dungeonbound — Codex project instructions

## Mission
Turn this existing university Android RPG prototype into a **tested, installable, demonstrable application**. Start from the code already in this repository; do not replace it with an unrelated template. Follow `CODEX_TASK.md` and `README.md`. The source is an initial prototype, **not** a verified deployed app. Report factual verification only.

## Course / scope
- Android first. Lightweight 2D, single-player, turn-based roguelite. Direct React Native UI, no Figma.
- Mobile: React Native + Expo + TypeScript in `mobile/`.
- API: Node/Express in `server/`, PostgreSQL via `compose.yaml` locally.
- Features: register/login; Warrior/Ranger/Mage; procedural start-to-boss dungeon; turn-based attack/defend/skill/potion; rule-based enemy behavior; equipment and loot; XP and levels; quests/achievements; persistent local/cloud progress; buildable Android APK.
- Prioritize a reliable **vertical slice** over implementing every aspirational proposal feature. Do not claim optional leaderboard or full original expansion is finished if it isn't.
- Team project. Preserve authorship, attribution and accurate evidence. Do not invent work, test results or performance numbers.

## Security — instructor's mandatory acceptance criterion
- **Never store access tokens, refresh tokens, passwords, JWTs or private credentials in AsyncStorage.**
- Token store: `expo-secure-store` in `mobile/src/auth.ts`. SecureStore for both access/refresh tokens; clear on logout, rotate on refresh. AsyncStorage is permitted only for non-sensitive game-state cache.
- Verify platform behavior on an Android emulator **and physical device when available**. The actual values of tokens must not appear in logs, committed files or screenshots.
- Server: validate input, use password hashing, JWT expiry and verification, per-user save authorization, parameterized SQL, rate limiting, refresh-token hashes and refresh rotation. Use HTTPS for hosted API.
- `.env` files are local secrets. Never commit them, display secrets in a chat, or copy real secrets into test evidence. Do not disable security to make builds pass.
- Prefer official docs when resolving dependency/version discrepancies, especially Expo SDK, EAS, and SecureStore.

## Working rules
1. Inspect the repository and its existing scripts before modifying anything. Use `git status` and create a checkpoint commit if repository is already initialized and user authorizes commits.
2. Execute local unit tests and TypeScript checks. Fix real failures. `mobile`: `npm test`, `npm run typecheck`, `npx expo install --check`; `server`: `npm test`.
3. Start local PostgreSQL and apply migrations; validate `/health`, registration, login, authenticated saves, refresh, logout. Do not leak credentials into logs.
4. Run Expo on Android, fix screen/render/runtime errors and verify a complete dungeon run. Check offline/online sync conflicts and app restart.
5. Record **actual** results, commands, platform and issues in `VERIFICATION_LOG.md`. Tests not executed must be marked Not run.
6. Upgrade only compatible dependencies. Do not introduce multiplayer, heavy graphics or unnecessary libraries.
7. Deploy the API with managed PostgreSQL only after confirming the user's choice of host and any cost. Ask for approval before external publishing, spending money, changing ownership or uploading private content.
8. Build a preview APK using EAS. Keep Expo account login and signing credential prompts interactive; never request or print passwords or tokens in chat.
9. Final summary must clearly distinguish completed, verified, incomplete and blocked items; include actual API health URL and EAS build link **only if obtained**.

## Key files
- `mobile/src/auth.ts`: SecureStore + authenticated fetch
- `mobile/src/game.ts`: game rules
- `mobile/App.tsx`: screens and orchestration
- `server/src/server.js`: REST API + sessions
- `server/db/schema.sql`: schema
- `compose.yaml`: development PostgreSQL
- `mobile/eas.json`: APK build profile
- `CODEX_TASK.md`: ordered, practical acceptance task
- `scripts/`: Windows PowerShell onboarding/testing scripts

## Avoid assumptions
- The Windows machine may lack Node, Docker, Android Studio, Git, Expo/EAS login or cloud hosting permissions; test prerequisites first.
- `10.0.2.2` works from the standard Android emulator to a Windows-hosted API, not from a physical phone.
- For APK/production use a real HTTPS URL and publish **only** after user approval. No hardcoded placeholders in release.
- Minimize automatic modifications to global machine configuration. Explain installer actions and obtain user consent.
