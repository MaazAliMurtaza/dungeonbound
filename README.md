# Dungeonbound

A portrait Android turn-based roguelite RPG built with React Native, Expo and TypeScript. Choose Warrior, Ranger or Mage, explore six dungeon floors, collect equipment, unlock skills and save progress locally and through an Express/PostgreSQL API.

## Start here

- [Code walkthrough and viva guide](docs/CODE_WALKTHROUGH.md)
- [Detailed project documentation](.project-docs/README.md)
- [Local quick start](.project-docs/QUICK_START.md)
- [Latest APK releases](https://github.com/MaazAliMurtaza/dungeonbound/releases)
- [Android build workflow](.github/workflows/android.yml)
- [Confirmed team responsibilities](.project-docs/TEAM_ROLES.md)

`mobile/` contains the game and mobile tests. `server/` contains authentication, saves, ranking routes and database code. `deploy/` contains hosting configuration. `evidence/` contains dated screenshots and test records. `docs/source/` preserves the original project documents.

## Verification

On November 12, 2026: 48 mobile tests, 10 backend tests and TypeScript checks passed locally. The offline Expo dependency check passed with its offline-validation warning. Historical native Android walkthroughs and screenshots are recorded in `evidence/`; screenshots are not performance benchmarks.

The standalone APK and current hosting status must be checked in the release notes. The temporary demonstration hosting window ends **November 13, 2026 at 12:00 noon Asia/Karachi (07:00 UTC)**. New sign-ins and cloud services require a running API.

## Development

Install dependencies with `npm ci` in both `mobile/` and `server/`. Copy the `.env.example` files to local `.env` files and supply your own configuration. Follow the quick start for PostgreSQL and migration instructions. Use `npm.cmd` on Windows if PowerShell blocks `npm.ps1`.

```powershell
cd mobile
npm.cmd test
npm.cmd run typecheck
```

```powershell
cd server
npm.cmd test
```

Never commit real environment files, passwords, access/refresh tokens, database dumps or signing keys. Release builds require a real public HTTPS API origin. Preview APKs are for direct installation and use internal preview signing, not Play Store release signing.

The project includes Codex-assisted changes. See the code walkthrough and preserved documentation for implementation details and limitations.
