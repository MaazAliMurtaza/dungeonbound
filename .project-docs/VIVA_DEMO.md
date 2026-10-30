# SecureStore viva demonstration

Use the verified Expo Go emulator setup unless the latest verification log explicitly records the separately built APK passing its own checks. Do not claim physical-device verification or a hosted API: those remain pending. Keep the demo online and reconnect before restarting; offline cold-start login is not a verified feature.

## The 30-second answer

“AsyncStorage is unencrypted, so I use it only for non-sensitive game progress. Both the access token and refresh token are stored with Expo SecureStore, which uses Android Keystore-backed protection. On restart the app reads the secure session and rotates its refresh token. Logout deletes both local tokens and revokes the server refresh session.”

## Prepare before the viva

Keep Docker Desktop, the API, emulator and Metro running. If needed, use separate PowerShell terminals from the project root:

```powershell
docker compose up -d --wait
```

```powershell
cd server
npm start
```

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
& "$env:ANDROID_HOME\platform-tools\adb.exe" reverse tcp:4000 tcp:4000
cd mobile
npx expo start --go --android --localhost --port 8082
```

Do not start duplicate servers if they are already running. This PC's ignored mobile environment file points to the forwarded API at `http://127.0.0.1:4000`. Check `http://localhost:4000/health`. The local development API is HTTP; release builds reject non-HTTPS addresses. The approved cloud deployment is not yet verified.

Register a disposable demonstration account through the app before presentation. Type its password only in the app's masked password input. Do not put credentials in commands, chat, slides or screenshots.

## Five-minute demonstration

1. Open `mobile/src/auth.ts`. Show the `expo-secure-store` import, `storeTokens` calling `setItemAsync` twice, session reads through `getItemAsync`, and `clearTokens` calling `deleteItemAsync` for both keys. These are key names in source, not actual token values. Passwords are not persisted by this code.
2. Open `mobile/App.tsx`. Show the per-user `cacheKey` and `AsyncStorage.setItem` call: its payload is `{ savedAt, progress }`. Explain that game stats, inventory and rooms are cache data, while session credentials belong in SecureStore.
3. Sign in, choose a class and play a room. From another project-root terminal, run `node scripts/android-storage-audit.mjs`. The existing local Hermes debugger invokes the native storage APIs and returns only booleans/counts. Expected while signed in: `accessPresent: true`, `refreshPresent: true`, `sessionTokenFoundInAsyncStorage: false`, `sensitiveKeyFound: false`, `progressShapeValid: true`.
4. Fully close and reopen the app while online. For the Expo Go emulator demonstration:

   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell am force-stop host.exp.exponent
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell am start -a android.intent.action.VIEW -d 'exp://127.0.0.1:8082?__expo_disable_onboarding=1' host.exp.exponent
   ```

   Show restored account/progress, then rerun the signed-in audit. Explain that successful restart alone does not prove encryption; source/native SecureStore checks and the absence of credentials in AsyncStorage provide the supporting evidence.
5. Press **LOG OUT**, then run `node scripts/android-storage-audit.mjs --signed-out`. Expected: `accessPresent: false`, `refreshPresent: false`. Cached game entries can remain because they are non-sensitive and isolated by user ID. Do not display their raw contents or any token contents.

If the separately built app is installed and verified, use its own launch component and set `ANDROID_APP_ID=com.maazay.dungeonbound` for the audit. Expo Go is the default audit target; using its result does not prove the separate APK was tested.

## Likely examiner questions

| Question | Accurate answer |
|---|---|
| Why not AsyncStorage for tokens? | It is unencrypted. SecureStore protects credential data at rest using native platform facilities. |
| Where are tokens protected on Android? | SecureStore encrypts the stored values using keys protected by Android Keystore. Do not claim that plaintext token strings are themselves stored directly as Keystore keys. |
| Is a JWT encrypted? | JWTs here are signed, not encrypted. SecureStore protects them at rest, and a hosted API must use HTTPS in transit. Never reveal the complete bearer token. |
| Are you encrypting the password on the phone? | The password is used for the sign-in request and is not persisted. The server stores a bcrypt password hash. Session tokens use SecureStore. Hosted transport must use HTTPS. |
| Why two tokens? | Access JWTs expire after 15 minutes. Refresh sessions last up to 30 days and rotate when used. Only refresh-token SHA-256 digests are stored in the database. |
| How do you know rotation/logout works? | The live API integration test rejected the old rotated refresh token and the logged-out refresh token. Native audits verified local token deletion. |
| Are all access JWTs immediately revoked by logout? | No. Local tokens are deleted and refresh is revoked; an already issued access JWT can remain valid until its 15-minute expiry. |
| What about Android backup? | App configuration disables backup and includes SecureStore exclusions. Generated native manifest restrictions were inspected; do not claim actual backup/restore testing until the APK/device test is recorded. |
| Does SecureStore solve every security problem? | No. It protects storage at rest, not a rooted device, compromised process, insecure server or authorization bug. Server validation and per-user authorization are still necessary. |
| Which device was tested? | The installed Android 17/API 37 x86_64 emulator. A physical-device pass is not claimed. |

## Evidence to show and limitations to state

- `VERIFICATION_LOG.md`: actual dates, commands, passes and failures.
- `TEST_REPORT.md`: unit/integration and Android outcomes; 17 mobile and 3 server unit tests currently pass.
- `PROJECT_STATUS_REPORT.md`: factual report supplement and attribution.
- `evidence/graphics-emulator.png`, `evidence/victory-ranger.png`, `evidence/victory-mage.png`: actual gameplay captures, not security-storage proof or performance measurements.
- Real private source repository: https://github.com/MaazAliMurtaza/dungeonbound. The examiner needs access to open it.
- EAS project: https://expo.dev/accounts/maazay.py/projects/dungeonbound. A project page is not an APK/build link.

If the runtime audit cannot connect, show the recorded checks and source, and say the live audit could not be rerun. Never turn a failed or unexecuted check into a pass. Do not claim the remaining dependency advisories, physical-device testing, APK backup/restore or hosted deployment are finished without new evidence.

Official storage reference: https://docs.expo.dev/versions/v58.0.0/sdk/securestore/
