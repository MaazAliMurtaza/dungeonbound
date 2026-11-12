# Understanding Dungeonbound

Dungeonbound has two applications. `mobile/` is the Android game. `server/` is the account and cloud-save API. PostgreSQL stores accounts and progress. Combat runs on the phone, so every attack does not need an internet request.

## Read the code in this order

| File | What to learn |
| --- | --- |
| `mobile/src/game.ts` | The `Game` state and actions that transform it: `newGame`, `enterNextRoom`, `combatAction`, equipment, rewards and quests. |
| `mobile/src/content.ts` | Floors, enemies, skills, shop items and contracts. Change content here after understanding the rules. |
| `mobile/src/items.ts` | Equipment slots, rarity and the catalog. |
| `mobile/App.tsx` | Screen selection, account form, user actions and rendering. |
| `mobile/src/GameWorld.tsx` | Home and dungeon presentation and the combat command deck. |
| `mobile/src/useAdventure.ts` | Restores an account, loads progress, saves locally, synchronizes with the API and handles conflicts. |
| `mobile/src/auth.ts` | SecureStore credentials, login, refresh, authorized requests and logout. |
| `mobile/src/saves.ts` | Rules for selecting local/cloud saves without discarding unsent progress. |
| `mobile/src/state-schema.js` | Shared strict validation for game saves. The server imports this same schema. |
| `server/src/server.js` | HTTP routes, authentication, database transactions and access control. |
| `server/db/schema.sql` | The four database tables and their relationships. |
| `server/src/db-config.js` | Verified TLS, connection pool and private database schema. |

## Trace one attack

1. The player taps Attack in the combat UI.
2. The UI calls the action handler in `App.tsx`.
3. `combatAction` in `game.ts` copies the current state, calculates damage, applies effects and processes the enemy response.
4. The handler gives the next state to `useAdventure.update` and plays the corresponding animation/audio.
5. React renders the updated HP, resources and combat log.
6. `useAdventure` writes progress to AsyncStorage and attempts a cloud save after a short delay.

The copied state is useful: an old state remains available for comparison and tests can verify that an action did not mutate its input. The seeded random generator makes the same starting seed reproducible.

## Trace login and saving

The form calls `signIn`. Express validates the input, bcrypt checks the password hash, and the server creates a session. The phone stores the access token, refresh token and account identity in SecureStore. Passwords and tokens never belong in AsyncStorage.

The API verifies the JWT and the database session before serving `/save`. The user ID comes from authentication, not a user-supplied save owner. Parameterized SQL prevents values from becoming SQL commands. A refresh rotates the session credentials; logout revokes the session and clears stored credentials.

AsyncStorage holds non-sensitive game progress. PostgreSQL holds the cloud copy. A saved revision records which cloud version the phone last saw. If both copies changed, the game asks which to keep and retains conflict snapshots. A newer timestamp alone is not enough to discard an unsent adventure.

## Database model

`users` has one account per unique email. `sessions` belongs to a user and stores a hash of the refresh token. `saves` has one JSONB progress document per user. `leaderboard` has an optional public alias and score per participating user. The account email is not the public alias.

## Run and test

Use a current Node version compatible with the committed packages (the cloud workflows use Node 24.11.0).

```powershell
cd mobile
npm.cmd ci
npm.cmd test
npm.cmd run typecheck
npm.cmd run doctor
```

For local accounts, follow `.project-docs/QUICK_START.md` and configure the ignored `.env` files from the examples. Never share the real `.env` files. The API requires a running PostgreSQL database, schema migration and a strong JWT secret.

```powershell
cd server
npm.cmd ci
npm.cmd run db:migrate
npm.cmd test
npm.cmd start
```

Set `EXPO_PUBLIC_API_URL` to the reachable API origin before starting Expo. A physical phone cannot use the emulator-only `10.0.2.2` address. Standalone release builds require the actual public HTTPS origin.

## Explain it in a viva

- **Why turn-based?** It permits deliberate decisions and local game rules without a continuously simulated multiplayer world.
- **Why a seed?** Repeatable dungeon/combat sequences help reproduce bugs and verify probability rules.
- **Why two kinds of storage?** SecureStore protects credentials; AsyncStorage caches game state; PostgreSQL synchronizes account progress.
- **What does the backend trust?** It authenticates users and validates save structure, but gameplay remains client-side. Rankings are not a competitive anti-cheat system.
- **What is procedural?** The seed varies room order and game outcomes within the designed content. It does not generate unlimited new artwork or an arbitrary branching maze.
- **What happens after hosting stops?** Existing signed-in players can continue from their cached account and save during an outage. Fresh registration, online sign-in, cloud sync and rankings need the API.

## Work together

Clone the public repository, create a feature branch, make a focused change and open a pull request. Review changes to both rules and schema together. Run the relevant tests before requesting review. Report exact reproduction steps and a seed when filing a gameplay bug. Keep credentials, device saves, keystores and database dumps out of Git.

Confirmed responsibilities: Syed Muhammad Rayyan — frontend; Syed Ahmer Ali — backend/database; Maaz Ali Murtaza — game systems/QA. The repository also contains Codex-assisted work; role assignments do not imply individual authorship of every commit.
