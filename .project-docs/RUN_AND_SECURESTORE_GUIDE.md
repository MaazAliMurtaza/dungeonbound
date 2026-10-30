# Dungeonbound: run the app and demonstrate SecureStore

Updated: 2026-10-30. These instructions use the existing source and Expo Go. APK building and cloud deployment remain paused; an installable standalone APK and hosted API are not claimed.

This file is inside the hidden `.project-docs` folder as requested. Open it through its full path or enable Windows Explorer → View → Show → Hidden items. VS Code also excludes that folder from its Explorer; use File → Open File and enter the path if needed.

## 1. What you need

- This Windows PC, Docker Desktop, Node/npm and the existing project dependencies.
- Either the installed Android Studio emulator, or an Android phone with SDK 58-compatible Expo Go.
- For the phone route below: a USB **data** cable, USB debugging enabled, and the phone's authorization for your own PC.
- Internet for installing/updating Expo Go and signing in to Expo if prompted. The game account is separate from the Expo account.

**Current network facts:** this PC's Wi-Fi address was `192.168.1.3` when checked; Windows classifies the network as **Public**. Starting a LAN Expo server was rejected by automatic security review. No firewall/profile change was made. The supplied QR therefore uses the Android USB route, with localhost ports forwarded through ADB. It is not a wireless QR or a cloud URL.

Do not run `npm run android` for this demonstration: that invokes native compilation. Use Expo Go commands below.

## 2. Project directory

Open this folder in VS Code:

```text
C:\D\Final Year\7th Sem\MAD\Project\dungeonbound-codex-ready\dungeonbound-complete
```

Open two PowerShell terminals. In each terminal, start from that project root:

```powershell
Set-Location -LiteralPath 'C:\D\Final Year\7th Sem\MAD\Project\dungeonbound-codex-ready\dungeonbound-complete'
```

The local `.env` files are already configured on this PC. Do not overwrite them, open them on the projector, commit them, or share their contents. Dependencies are already installed. If `node_modules` is genuinely missing, run `npm ci` in `server` and `mobile`; no native Android build is needed for Expo Go.

## 3. Terminal 1: database and API

Open Docker Desktop and wait for its engine to be ready. From the project root:

```powershell
docker compose up -d --wait
docker compose ps
cd server
npm run db:migrate
npm start
```

Keep this terminal open. The development database uses port **5433** on this PC because 5432 is already occupied. Existing local environment settings match that port. The API listens on port **4000**.

In a browser, open:

```text
http://127.0.0.1:4000/health
```

Expected:

```json
{"status":"ok","service":"dungeonbound-api"}
```

If this response already works and `npm start` says port 4000 is occupied, keep the existing API running instead of starting a duplicate. Do not use `docker compose down -v`: that would delete the saved database volume.

## 4. Terminal 2: Metro / Expo Go

From the project root:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:EXPO_PUBLIC_API_URL = 'http://127.0.0.1:4000'
cd mobile
npx expo start --go --localhost --port 8082
```

Keep this terminal open. The API URL override is public development configuration for this terminal; it does not overwrite `.env` or store any token.

Check Metro if needed:

```text
http://127.0.0.1:8082/status
```

Expected: `packager-status:running`. If Metro is already healthy on 8082, keep that instance instead of launching another. If it is frozen, stop your Metro terminal with Ctrl+C and run the command again. Do not terminate all Node processes: that would also stop the API.

## 5A. Run in the emulator

1. Open Android Studio → Device Manager → start `Medium_Phone_API_37.0` if it is not already running.
2. Open a third terminal at the project root and run:

   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" -s emulator-5554 reverse tcp:4000 tcp:4000
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" -s emulator-5554 reverse tcp:8082 tcp:8082
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" -s emulator-5554 shell am start -a android.intent.action.VIEW -d 'exp://127.0.0.1:8082' host.exp.exponent
   ```

   These commands assume the emulator is listed as `emulator-5554`; check `adb devices` if its identifier changed.
3. Wait for bundling/loading to finish. The Dungeonbound login page should show the three hero sprites.
4. Choose **New player? Create account**, use an email and a password of at least 10 characters, then choose Warrior, Ranger or Mage.

## 5B. Run on an Android phone using USB and the supplied QR

1. Install/update **Expo Go** from the Play Store. This project requires **Expo SDK 58** support. If Expo reports a mismatch, use the official version selector at https://expo.dev/go. Do not install an APK from an unrelated download site.
2. Enable Android Developer Options (usually About phone → Build number, tap seven times), then Developer Options → USB debugging. Menu names vary by manufacturer.
3. Connect the phone to this PC using a USB data cable. Unlock it and accept **Allow USB debugging** for your own PC. Keep the cable connected while running the app.
4. Keep the API and Metro running as described above. From the project root:

   ```powershell
   node scripts/connect-phone-usb.mjs
   ```

   The helper selects an authorized physical Android device, checks the local services, forwards ports 4000 and 8082, checks Expo Go is installed, and requests launch. It does not install an APK, publish anything, change a firewall, or print a token.
5. The helper normally opens the app directly. Alternatively, open Expo Go's QR scanner and scan **`phone-qr-usb.png`** in the project root, or enter:

   ```text
   exp://127.0.0.1:8082
   ```

   This localhost URL works on the phone **only after USB forwarding**. Without forwarding, localhost means the phone itself and the QR cannot load the PC's app/API.
6. If Expo asks for an Expo account, sign in through Expo Go. The linked development project is owned by `maazay.py`; project access may need the matching owner/member account. Afterwards, use your separate Dungeonbound game account on the game's login page.
7. To check the forwarded backend from the phone, open `http://127.0.0.1:4000/health` in its browser while USB forwarding is active.

If the helper says **unauthorized**, unlock the phone and accept its debugging prompt. If it finds no phone, try another data cable/USB mode, then:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices -l
```

If several physical phones are connected, set `ANDROID_SERIAL` to the intended device's identifier in that terminal before running the helper. Device connection/launch is not a completed physical-device test until you actually see and use the game.

To regenerate the same USB QR:

```powershell
node scripts/make-phone-qr.mjs
```

### Wi-Fi or iPhone

The supplied QR is for **Android USB forwarding**. It does not provide iPhone USB support or a wireless connection. A wireless Expo setup requires both the development bundle and API to be reachable from the phone on a trusted private network. `10.0.2.2` is for the standard Android emulator, not a phone. The previously checked LAN API address is `http://192.168.1.3:4000`, but the IP can change and phone reachability has not been verified.

Do not open development ports on the current Public network or disable Windows Firewall to force this to work. A Metro tunnel alone does not tunnel the separate Express API. For wireless/iPhone use, first arrange a trusted private network or the approved hosted HTTPS backend and a compatible Expo connection. See the official Expo device setup reference below. No working wireless QR is claimed here.

## 6. A short gameplay demonstration

1. Register or sign in; select a class.
2. Enter rooms and use Attack, Skill, Defend and Potion.
3. Equip loot in Inventory and claim the quest after three kills.
4. Let the save status reach **Saved to cloud** before closing the app.

Use a disposable demo account, not an important password reused elsewhere. Enter passwords only in the masked app input, not commands or chat.

## 7. Explain SecureStore in the viva

Say:

> “Both the access token and refresh token use Expo SecureStore. On Android, SecureStore encrypts the stored values using keys protected by Android Keystore. AsyncStorage is unencrypted, so I use it only for non-sensitive game progress. Logout deletes both local tokens and revokes the server refresh session.”

Open these source files:

- `mobile/src/auth.ts`: SecureStore import; `storeTokens` uses `setItemAsync` for both token keys; `restoreSession`/refresh read with `getItemAsync`; `clearTokens` deletes both with `deleteItemAsync`.
- `mobile/App.tsx`: AsyncStorage is written with `{ savedAt, progress }` under a per-user progress key. It is not the token store.
- `server/src/server.js`: short-lived access JWTs, rotating refresh sessions and logout revocation.
- `server/src/validators.js`: SHA-256 digest for refresh tokens. Passwords use bcrypt on the server and are not persisted on the phone.

Key names in source are safe to show. Actual token values, Authorization headers, raw storage dumps, `.env` files and passwords must not appear in logs, screenshots or on the projector.

## 8. Demonstrate the native storage checks

Keep API, Metro, and the chosen app session open. For the default emulator on port 8082, from the project root:

```powershell
node scripts/android-storage-audit.mjs
```

Run it **after signing in**. Expected fields:

```json
{
  "accessPresent": true,
  "refreshPresent": true,
  "sessionTokenFoundInAsyncStorage": false,
  "sensitiveKeyFound": false,
  "progressShapeValid": true
}
```

The audit calls the existing local Hermes/native storage APIs and returns booleans/counts only. It does not return or print tokens. Cached-entry counts can differ and are not a failure by themselves.

### When auditing the physical phone

Avoid accidentally auditing the emulator instead. Close Expo Go on the emulator while keeping the phone's app open:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" -s emulator-5554 shell am force-stop host.exp.exponent
node scripts/android-storage-audit.mjs
```

If multiple matching sessions remain, the audit refuses to choose silently. Set `AUDIT_DEVICE` to a distinctive part of the phone model/name, then rerun. If using another Metro port in a future permitted setup, set `METRO_PORT` to that port; the default is 8082. Do not call an emulator result a phone result.

## 9. Demonstrate restart restoration and logout

1. While signed in, finish a game action and wait for **Saved to cloud**.
2. Close the app fully while keeping the API/Metro and USB forwarding active. On the phone, force-stop Expo Go through Android Settings → Apps → Expo Go, then reopen it through the helper/QR. Do **not** clear app data or uninstall it. For the emulator, use:

   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" -s emulator-5554 shell am force-stop host.exp.exponent
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" -s emulator-5554 shell am start -a android.intent.action.VIEW -d 'exp://127.0.0.1:8082' host.exp.exponent
   ```

3. Show the restored account and game progress. Rerun the signed-in audit. Restart behavior by itself is not proof of encryption; show the code and storage audit as well.
4. Press **LOG OUT**, then run:

   ```powershell
   node scripts/android-storage-audit.mjs --signed-out
   ```

5. Expected: `accessPresent: false` and `refreshPresent: false`, with no session token found in AsyncStorage. Non-sensitive cached game entries may remain.

If the native audit is unavailable, state that it could not be rerun; do not invent a pass. Use the recorded evidence in `.project-docs/VERIFICATION_LOG.md` and `.project-docs/TEST_REPORT.md`.

## 10. Useful examiner answers

| Question | Answer |
|---|---|
| Is the JWT encrypted? | It is signed, not encrypted. SecureStore protects it at rest; a hosted API must use HTTPS in transit. |
| Why two tokens? | Access JWT: 15-minute lifetime. Refresh session: up to 30 days, rotated when used; server stores only a digest. |
| Does logout revoke every issued JWT immediately? | No. Local tokens are deleted and refresh is revoked; an already issued access JWT can last until its 15-minute expiry. |
| What about backups? | App config disables Android backup and references SecureStore exclusions. Actual standalone APK backup/restore was not verified. |
| What if the phone is rooted? | SecureStore is not complete protection against a compromised device/process. Server authorization remains necessary. |
| Have you tested a real phone? | Until you complete the phone steps and record the result, say only the emulator was verified. |
| Is the APK/deployment done? | No standalone APK or hosted API is claimed in the current verified setup. A private repository and EAS project exist; those are not APK build links. |

## 11. Stop safely

- Ctrl+C in the Metro terminal, then Ctrl+C in the API terminal when finished.
- `docker compose stop` stops the local database while preserving its volume.
- Disconnect USB after the demonstration. Reapply the helper after reconnect/reboot; ADB port forwarding is temporary.
- Never use `docker compose down -v` as a normal shutdown command.

## Actual status when this guide was written

- Database/API and emulator setup were verified running on this PC.
- Core gameplay and SecureStore-only token checks were demonstrated in Expo Go on Android 17/API 37 emulator.
- USB helper syntax and QR generation were checked; **no physical phone was connected**, so phone launch/login/SecureStore have not been marked passed.
- LAN server startup was blocked by automatic security review; no firewall bypass or new public development endpoint was created.
- Existing unit tests, earlier runtime evidence and incomplete APK/cloud outcomes are in the hidden verification documents. Native builds/deployment remain paused.

Official references:

- Expo device development: https://docs.expo.dev/get-started/start-developing/
- Expo Go/version selector: https://expo.dev/go
- SDK 58 release: https://expo.dev/changelog/sdk-58
- Expo SecureStore: https://docs.expo.dev/versions/v58.0.0/sdk/securestore/
