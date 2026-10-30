# Codex + Dungeonbound: Windows setup and finish-to-deployment guide

> Use only the official Codex and Expo tooling. This repository is not deployed; you run Codex locally and approve requested actions. Never paste a password, JWT or private key into Codex prompts.

## 1. Install prerequisites
- VS Code: https://code.visualstudio.com/
- Node.js LTS: https://nodejs.org/
- Git for Windows: https://git-scm.com/downloads/win
- Docker Desktop: https://www.docker.com/products/docker-desktop/
- Android Studio with an Android Virtual Device: https://developer.android.com/studio
- Optionally, ChatGPT desktop app with Codex: https://chatgpt.com/download/

Use native Windows/PowerShell; you do not need WSL. Before running anything, check that Node/npm, Docker Desktop and Android Studio are installed and running.

## 2. Extract the source and install Codex
Extract `dungeonbound-codex-ready.zip` so you have a folder named `dungeonbound-complete`. From that folder, open **PowerShell** in VS Code:

```powershell
& .\scripts\install-codex.ps1
```

The script installs the official `@openai/codex` CLI globally via npm; if the `code` command is on PATH, it also installs official VS Code extension `OpenAI.chatgpt`. It does **not** change your Windows account, grant remote access, log into ChatGPT or install prerequisites. PowerShell may block scripts depending on your PC's security policy. If that happens, read/review the file and use the manual commands:

```powershell
npm.cmd install -g @openai/codex@latest
code.cmd --install-extension OpenAI.chatgpt
```

Restart PowerShell, then run:

```powershell
codex --version
codex
```

Sign in with your ChatGPT account when the official Codex client asks. **Do not** share login codes with others.

Or use the newer ChatGPT desktop app: open **Codex**, select **Open folder / project**, choose your extracted `dungeonbound-complete` folder, and keep approvals enabled. VS Code: use **Codex: Open Codex Sidebar** in the Command Palette if needed.

## 3. Kick off the exact coding assignment
In Codex, paste:

> Read AGENTS.md, CODEX_TASK.md, README.md, and TEST_REPORT.md. Execute Phase A now on this PC: inspect prerequisites, install compatible project dependencies with approval, run tests and type checks, fix failures, and record actual outcomes. Continue through Phase B to get a working emulator game and local PostgreSQL backend. For Phase C, ask me before publishing to services, spending money or using deployment credentials. Keep the Expo SecureStore authentication requirement intact and do not fabricate test passes.

Codex can read those files because they are in the opened project. Review and approve its proposed terminal commands. Prefer incremental steps and checkpoint commits. If something fails, ask Codex to inspect the terminal output and repair it.

## 4. Manual local setup (if Codex is not yet ready)
Make sure Docker Desktop is **running**. From the project root:

```powershell
& .\scripts\setup-local.ps1
```

This creates `server/.env` with a generated JWT secret (if missing), creates `mobile/.env` (if missing), starts Docker PostgreSQL, installs both packages, runs DB migrations and source tests, and executes the mobile typecheck. It won't overwrite existing `.env` files. It does not create an Android APK.

In **two separate PowerShell terminals**:

```powershell
& .\scripts\start-api.ps1
```

```powershell
& .\scripts\start-mobile.ps1
```

With Android emulator running, press `a` in Expo's terminal. The emulator connects to Windows-hosted API at `http://10.0.2.2:4000`. Check server: `http://localhost:4000/health`. From a real phone, `10.0.2.2` will **not** work; change the URL to your LAN IP or public HTTPS API.

Run verification (after installs):

```powershell
& .\scripts\verify-local.ps1
```

## Local PC adjustments verified on 2026-10-29

On this PC port 5432 is already occupied. The ignored project-root `.env` sets `POSTGRES_PORT=5433`; `server/.env` uses the same database port. Compose still defaults to 5432 for other machines. Do not overwrite an existing server secret.

The unsigned PowerShell helpers were blocked by the PC's execution policy. Run their reviewed commands individually in the indicated directories; no execution-policy change is necessary. Setup, migration, server tests and mobile checks have been run this way.

For this PC's emulator, the direct `10.0.2.2` connection stalled. The verified local development alternative is ADB forwarding. In PowerShell from the project root:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
& "$env:ANDROID_HOME\platform-tools\adb.exe" reverse tcp:4000 tcp:4000
cd mobile
# The local ignored .env uses EXPO_PUBLIC_API_URL=http://127.0.0.1:4000
npx expo start --android --localhost --port 8082
```

Reapply API forwarding after emulator/ADB restarts. Keep the Node API running in another terminal. For live API regression checks, run `npm run test:integration` from `server` (creates and removes disposable accounts; auth rate limits still apply).

The Android runner uses disposable local accounts and temporarily stops/restarts this project's API to verify offline sync. First set `DUNGEONBOUND_API_PID` to the verified process ID of this project's Node API. From the root, run `node scripts/android-smoke.mjs` for gameplay plus persistence, or add `--persistence-only` for the shorter persistence check. It uses the forwarded API and Metro port 8082. The full gameplay and shorter persistence sequences were verified separately; see the log for actual command exit results.

`node scripts/android-storage-audit.mjs` checks the running signed-in app using its existing local Hermes debugger. Add `--signed-out` after logout. It outputs only booleans and counts, never token values; no app-source instrumentation is needed.

The API 37 AVD warns about recommended host RAM (16384 MiB versus 16198 MiB reported). This session used 2048 MB guest RAM, two cores and a cold boot. Emulator display overrides can be reverted with `adb shell wm size reset` and `adb shell wm density reset`. These are local development settings; release builds still require an approved HTTPS backend.

## 5. Instructor's SecureStore demonstration

- Open `mobile/src/auth.ts`. Show imports from `expo-secure-store`, the login token writes with `setItemAsync`, token read on app restart, rotating refresh token, and deletion on logout.
- Show that `mobile/App.tsx` uses AsyncStorage only for non-sensitive progress data.
- Test signing in, fully closing/reopening the app, and signing out on Android. Do not show the token contents or screenshots with credentials.
- Real device evidence and the test log are required before marking this verification passed.

## 6. Cloud API and APK (not automatic or free-guaranteed)

Local native preparation is available without EAS upload: `node scripts/build-android-local.mjs --check` verifies SDK prerequisites and refuses automatic SDK installation. Following explicit user approval, this PC now has Build Tools 37.0.0, NDK 27.1.12297006 and CMake 3.30.5; its prerequisite check passes. `node scripts/build-android-local.mjs --install` prepares, builds and installs an **x86_64 emulator debug APK** using Metro/API forwarding. It is not a standalone release APK and is not suitable for an ARM phone. A successful build writes the actual APK hash to `artifacts/debug-build.json`; consult the latest verification log for compilation/install results.

The native walkthrough supports `DUNGEONBOUND_HERO=Warrior`, `Ranger` or `Mage`. For the locally installed app, set `ANDROID_APP_ID=com.maazay.dungeonbound`; otherwise it defaults to Expo Go. The full runner requires the verified local API PID for its temporary offline test and then restores that API. It also simulates a newer cloud-client save and checks its restoration without timestamp inflation. This is a single-emulator conflict simulation, not two-device evidence.

Approved deployment settings and the $0 boundary are in `deploy/README.md` and `deploy/render.yaml`; user approval was received on 2026-10-29. The private source repository is `MaazAliMurtaza/dungeonbound`, and EAS project `@maazay.py/dungeonbound` is linked. Hosting account sign-ins and actual build/deployment results are separate requirements. The EAS upload ignore file excludes local environment variants and generated native/signing output. Preview/production config refuses local or placeholder API endpoints before upload.
- Ask Codex to help deploy the `server/` service and create managed PostgreSQL on an approved host (e.g. Render). Confirm costs and create/enter hosting secrets in the provider's dashboard, not in Git.
- Set production DB connection (`DATABASE_URL`), random `JWT_SECRET`, and proxy settings appropriate to the host. Run migration securely before opening API to traffic. Test the real `https://.../health` URL.
- Configure the EAS preview environment variable `EXPO_PUBLIC_API_URL` to the actual public HTTPS URL; this variable is **public** and must not hold secrets.
- Sign in to your Expo account interactively, run `npx eas-cli@latest build:configure`, then `npx eas-cli@latest build -p android --profile preview` from `mobile/`.
- Install the real APK from the EAS build link on Android, test the end-to-end flow, record the build URL, and only then claim deployment succeeded.

References: https://docs.expo.dev/versions/latest/sdk/securestore/ and https://docs.expo.dev/build-reference/apk/.

## Optional: start Codex with one command
After installing Codex and signing in, run from the extracted project root:

```powershell
& .\scripts\start-codex.ps1
```

This opens the Codex CLI in the project with the Phase A task. It is **not** unattended access or automatic deployment; review command approval prompts.
