> Current implementation: [proposal follow-up](PROPOSAL_IMPLEMENTATION_2026-11-07.md), including trees, accessories, Legendary items and speed. Scope baseline: [Word-document audit](PROPOSAL_AUDIT_2026-11-07.md). Earlier phone-layout evidence: [PHONE_LAYOUT_2026-11-07.md](PHONE_LAYOUT_2026-11-07.md). Older descriptions/checklists below are historical.

# Dungeonbound — Android RPG + SecureStore + Express + PostgreSQL

A runnable **source-code starter project** for the SE-458 Mobile App Development project. This archive has **not** been published to a cloud host and does **not** contain an APK. A backend, database, Expo account and user-owned deployment credentials are needed for a live release.

## What's implemented in source

- Three character classes: Warrior / Ranger / Mage with different stats.
- Original 2D pixel-art sprites for all three heroes and seven enemies, class portraits, and a dungeon battle stage with idle motion, attack/counterattack movement, damage, spell, guard and healing effects. Reduced-motion settings are respected. Artwork provenance and generation prompts are in `mobile/assets/ARTWORK.md`.
- Seeded procedural generator: 8 connected rooms per run, start-to-boss path guaranteed.
- Turn-based fights: attack / class-independent skill / defend / potion, critical hits, enemy defensive AI, boss enrage.
- Five ordinary enemy archetypes, one elite archetype and one boss, randomized rewards.
- HP, MP, XP, level-ups, gold, weapon/armor equipment and loot.
- One quest, two achievements; next dungeon after victory.
- Signup, login, JWT access tokens (15 min), rotating random refresh tokens (30 days), logout, password hashing, server-side session-revocation endpoint, protected save/load API.
- **SecureStore for BOTH JWT access and refresh tokens.** AsyncStorage contains only non-sensitive game progress cache.
- PostgreSQL database for users, hashed refresh sessions and saved progress.
- 20 automated unit tests plus a live API integration sequence. Their actual results are in `TEST_REPORT.md` and `VERIFICATION_LOG.md`.

Cloud writes carry a client timestamp, so an older in-flight save does not overwrite a newer one; this is still not full conflict-free multi-device sync.

The game is a course-project MVP and is not a complete implementation of every item from the original proposal (which mentions 5–10 floors, 8–10 enemies, 10–15 skills, 10+ quests and leaderboard). It does not implement anti-cheat, conflict-free multi-device sync, account recovery, email verification, or production-grade monitoring.

## Requirements

- Windows 10/11 or macOS/Linux, VS Code and Git.
- **Node.js 24.11+ recommended and verified locally**. The TypeScript config requires native type stripping (Node 22.18+); EAS profiles pin the tested Node 24.11.0.
- Docker Desktop (easiest local PostgreSQL) OR an existing PostgreSQL server.
- Android Studio emulator, or an Android device.
- Internet connection when installing packages and creating EAS builds.

For Windows PowerShell, open the extracted `dungeonbound-complete` directory in VS Code and use the integrated terminal. Run commands inside the specified folders.

## 1 — Local database

From the *project root*, start Docker Desktop then:

```powershell
docker compose up -d
docker compose ps
```

Database: `localhost:5432`, DB/user `dungeonbound`, dev password `dungeonbound_dev_password`. These are **development-only** credentials. The Docker database is bound to localhost.

## 2 — Backend API

```powershell
cd server
Copy-Item .env.example .env
```

Edit `server/.env` and replace `JWT_SECRET` with a random value you generate:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste it into `JWT_SECRET=...`. Never commit `.env` or post your secret in screenshots.

```powershell
npm install
npm run db:migrate
npm test
npm run dev
```

Open a *new* terminal and check:

```powershell
Invoke-RestMethod http://localhost:4000/health
```

Expected JSON: `{ "status": "ok", "service": "dungeonbound-api" }`.

## 3 — Mobile app

Open a second terminal from the project root:

```powershell
cd mobile
Copy-Item .env.example .env
npm install
npx expo install --fix
npx expo-doctor
npm test
npm run typecheck
npx expo start --clear
```

`mobile/.env` sets `EXPO_PUBLIC_API_URL`:

| How you're running Android | URL |
|---|---|
| Android Studio **emulator** talking to API on same computer | `http://10.0.2.2:4000` |
| Physical phone on same Wi-Fi | `http://YOUR_PC_LAN_IP:4000` |
| EAS preview/release APK | `https://YOUR_DEPLOYED_BACKEND_HOST` |

Find your PC LAN IPv4 address with `ipconfig`. For physical-device LAN testing allow incoming port 4000 through Windows Firewall on *private* networks only. Do not use localhost in the Android app (`localhost` refers to the phone itself). Expo SDK 58 may require a **development build** until the compatible Expo Go app is available in your app store. See Expo build docs below.

Use `a` in the Expo terminal for an Android emulator (if Android Studio is configured), or scan the QR code with a compatible Expo Go / development client.

If package installation warns about versions, run `npx expo install --fix` and follow Expo's SDK 58 compatibility recommendations. Avoid `npm install --force` and `--legacy-peer-deps`.

## 4 — Verify gameplay

1. Register a new user with an email and a password of 10+ characters.
2. Select Warrior, Ranger or Mage.
3. Enter the dungeon, move from room to room and defeat enemies.
4. Use all four combat actions; try a potion and your skill.
5. Open inventory, equip loot, return to combat and verify improved stats.
6. Defeat three enemies and claim the quest reward.
7. Defeat the final boss, start the next dungeon.
8. Close and reopen the app, verify login session restoration and game state.
9. Disable the internet temporarily: local game changes should be cached. Reconnect before closing and verify cloud save status.
10. Sign out and sign in again; confirm progress is restored.

Local Windows testing on 2026-10-29 demonstrated Warrior, Ranger and Mage boss victories on the API 37 emulator across the dated runs. Ranger's updated combined sequence and a separate Mage persistence/cloud-revision simulation passed; the Mage full command failed later at an initial cloud-fixture assertion, so it is not reported as one all-green combined run. See `VERIFICATION_LOG.md` for exact commands, restart/offline results and limitations. Physical-device performance and a standalone APK remain unverified.

## 5 — Deployment: PostgreSQL and Express API

Selected route: Supabase PostgreSQL + Render web service. This keeps the existing Express authentication and validated saves. See [SUPABASE_RENDER.md](../deploy/SUPABASE_RENDER.md).

1. Create a managed PostgreSQL database. Copy its **private connection URL** (including host, username, password and any TLS settings).
2. Push this project to a new GitHub repo; verify `.env` and `node_modules` files are **not tracked**.
3. In Render, create **New > Web Service**, connect the repo.
4. Set **Root Directory** to `server` and **Runtime** to Node.
5. Set **Build Command** to `npm install`.
6. Set **Start Command** to `npm run db:migrate && npm start`. Migration statements are safe to repeat for this first schema.
7. Set Render environment variables: `DATABASE_URL` (database URL), `JWT_SECRET` (new random long secret), `NODE_ENV=production`, `TRUST_PROXY=1` *only if Render terminates HTTPS in one trusted proxy hop*.
8. Set health-check path `/health` if provided, then deploy.
9. Open `https://YOUR-RENDER-HOST/health`; it must return `status: ok`.
10. Use Postman or PowerShell to test registration, login, protected saves and refresh. Watch the Render logs for failed migrations/DB connection errors.

**Never put `DATABASE_URL` or `JWT_SECRET` in the mobile app or under `EXPO_PUBLIC_`.** Server access is through HTTPS; the JWT is a bearer token. Deploy with an appropriately secured managed database. Configure rate limiting based on the actual proxy topology.

## 6 — Build an installable Android APK with EAS

From `mobile`:

```powershell
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest env:set --name EXPO_PUBLIC_API_URL --value https://YOUR-RENDER-HOST --environment preview --visibility plaintext
npx eas-cli@latest env:list --environment preview
npx eas-cli@latest build --platform android --profile preview
```

Choose/configure your unique Android application ID, and generate EAS signing credentials when asked. The supplied `eas.json` **preview** build creates an installable `.apk`. The **production** profile creates a Play-Store-oriented `.aab`. Install the completed APK from the URL displayed by EAS, or download and run `adb install name.apk` on an attached Android device.

`EXPO_PUBLIC_API_URL` is a **public build setting**, not a secret. Verify it is an HTTPS URL. The app intentionally refuses non-HTTPS API addresses in release builds.

If Expo asks you to connect your app to an EAS project, confirm it so the generated project ID is included in `app.json`. Use a unique Android package name (avoid collisions with other developers). A hosted backend does not mean the APK is built automatically; they are distinct deployments.

## 7 — Submission checklist

- [ ] Hosted `/health` endpoint responds, and sign-in works on Android.
- [ ] Instructor can demonstrate encrypted SecureStore token storage code in `mobile/src/auth.ts`.
- [ ] User progress survives an app restart and online session renewal.
- [ ] Combat, procedural path, inventory, quests and victory demonstrated.
- [ ] Run tests and record output (including manual integration tests).
- [ ] Android release APK installs and launches on a physical device.
- [ ] Record device model, Android version, bugs, fixes and performance.
- [ ] Add actual GitHub URL, EAS APK URL and evidence to report.
- [ ] Update report role allocations to match *actual* contributions; the uploaded report differs from the original handoff's suggested roles.
- [ ] Clearly distinguish implemented MVP features from future work.

## Security discussion for viva

**Question: Why not AsyncStorage for JWT?** AsyncStorage is unencrypted. The app uses Expo SecureStore, which uses native Android Keystore-backed encrypted storage / iOS Keychain as supported by Expo. `mobile/src/auth.ts` stores the access token and refresh token with `SecureStore.setItemAsync`, restores with `SecureStore.getItemAsync` and deletes on logout.

**Question: How are sessions handled?** A short-lived signed JWT is used in the `Authorization: Bearer` header. A random long-lived refresh token is stored encrypted on-device, but only its SHA-256 digest is stored in PostgreSQL. `/auth/refresh` rotates the token and `/auth/logout` revokes it. Passwords are salted/hashed using bcrypt, never stored in plaintext.

**Question: Why is game state in AsyncStorage?** Game state is non-secret local data used for offline caching; no token, password, database credential or encryption key is written there. The server also persists the game state in PostgreSQL.

**Important security limits:** This is a student MVP: no email verification, password reset, MFA, abuse monitoring, forced revocation of currently issued 15-minute JWTs, anti-cheat validation, or robust offline/multi-device conflict resolution. Do not claim complete OWASP MASVS compliance based only on SecureStore usage. SecureStore protects at rest, not against a compromised/rooted device.

## Useful official documentation

- Expo SDK 58: https://docs.expo.dev/versions/v58.0.0/
- Expo SecureStore: https://docs.expo.dev/versions/v58.0.0/sdk/securestore/
- Expo APK build: https://docs.expo.dev/build-reference/apk/
- EAS environment variables: https://docs.expo.dev/eas/environment-variables/manage/
- Render Express deployment: https://render.com/docs/deploy-node-express-app
- OWASP MASVS-STORAGE-1: https://mas.owasp.org/MASVS/controls/MASVS-STORAGE-1/

## Codex-assisted Windows completion

If you want Codex to perform setup, run tests, fix issues and prepare deployment **on your own Windows PC**, see [`CODEX_WINDOWS_SETUP.md`](CODEX_WINDOWS_SETUP.md), [`AGENTS.md`](AGENTS.md) and [`CODEX_TASK.md`](CODEX_TASK.md). The PowerShell helpers are in `scripts/`. Codex cannot deploy to external services or sign in on your behalf without account access, approvals and credentials entered through the proper providers.
