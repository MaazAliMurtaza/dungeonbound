# Dungeonbound — Quick Start (Windows PowerShell)

Open the extracted folder in VS Code. Install Node.js 22.13+, Docker Desktop and Android Studio first.

### Terminal 1 — database
```powershell
docker compose up -d
```

### Terminal 2 — API
```powershell
cd server
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Paste the random output into `server/.env` for `JWT_SECRET` (replace the example placeholder):
```powershell
npm install
npm run db:migrate
npm test
npm run dev
```

### Terminal 3 — Android app
```powershell
cd mobile
Copy-Item .env.example .env
npm install
npx expo install --fix
npm test
npx expo start --clear
```

With Android Studio emulator, press `a` in Expo terminal and use `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000`. A physical Android device needs your computer's LAN IP or a deployed HTTPS backend.

### Go live
Push the repository to GitHub; create a PostgreSQL database; deploy `server` to Render; set `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`, `TRUST_PROXY`; check `/health`; point EAS preview environment `EXPO_PUBLIC_API_URL` at your HTTPS API; run:

```powershell
cd mobile
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest env:set --name EXPO_PUBLIC_API_URL --value https://YOUR-RENDER-HOST --environment preview --visibility plaintext
npx eas-cli@latest build --platform android --profile preview
```

Download/install the APK from your own EAS build page. **The ZIP is source code, not a prebuilt APK and not an already deployed app.** See README.md for complete explanations and testing steps.
