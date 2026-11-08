# Deployment continuation

## Owner decisions

- Keep all project files locally for now. Remove only task-generated temporary files; no checkout/dependency removal without a later instruction.
- Private source repository: https://github.com/MaazAliMurtaza/dungeonbound
- Supabase PostgreSQL, not Neon; Render Express API. Free resources only under the existing zero-spend limit.
- Confirmed responsibilities: Syed Muhammad Rayyan frontend, Syed Ahmer Ali backend, Maaz Ali Murtaza game systems/QA. Do not infer individual contribution percentages or semester dates.

## Connection state

The owner installed Render and Supabase and sent explicit plugin mentions. Their skills subsequently loaded, but the running tool registry still exposes no provider management commands. Official MCP connections were therefore added through the installed Codex CLI: dungeonbound-render at https://mcp.render.com/mcp (documented OAuth client ID codex) and dungeonbound-supabase at https://mcp.supabase.com/mcp. Render browser OAuth completed successfully and codex mcp list verifies enabled=true/auth_status=o_auth for dungeonbound-render. Supabase OAuth subsequently completed too. The latest codex mcp list confirms both dungeonbound-render and dungeonbound-supabase are enabled with auth_status=o_auth. Do not restart either sign-in flow. This running session still has no provider tools; fully restart/reopen Codex to load the newly registered connections, then verify read-only account access and the intended workspace before creating resources. Credentials belong in the client's secure credential store, never this repository. Do not reinstall plugins or ask for pasted tokens. Check actual authentication/tool availability first after the owner completes the browser pages; a reload may be needed to hydrate tools. No provider resource has been created.

## Current work

Source/report checkpoint fe2e518 and optional-art/audio/cloud-workflow checkpoint b5b184e were pushed. Cloud validation for b5b184e succeeded: https://github.com/MaazAliMurtaza/dungeonbound/actions/runs/42399693620 (48 mobile tests, 9 backend tests, TypeScript, migration and live API checks). Read the current remote head for subsequent small fixes/evidence commits.

Final implementation and native evidence are pushed in f52e68d276c674e7c913f1b72c92d02bb9048b4a. Its Linux CI also passed: https://github.com/MaazAliMurtaza/dungeonbound/actions/runs/42441632543 (48 mobile, 10 backend, TypeScript, Expo compatibility, fresh private-schema migration, live API integration). The additional backend regression checks pg.Client's resolved TLS/search path against all supported URL override forms. Final all-class Legendary/weapon grip and compact/tall enlarged-text visual checks passed. Subsequent commits update documentation/report only.

The optional polish adds separate held-weapon layers, unique Legendary class outfits, timed anticipation/strike/follow-through/hit/recovery poses, original procedural music/effects and optional synthesized voice announcements. Asset prompts and modes: mobile/assets/ARTWORK-v4.md. No human voice cast is claimed.

The final native proposal walkthrough passed on Android 11: v2-to-v3 cloud migration, skills/mastery, accessory/Legendary shopping and equip, restart, eight-room guardian clear, achievement and logout. The fixture account was removed and emulator display settings restored. See evidence/proposal-v3-native-final.txt and DEPLOYMENT_VERIFICATION_2026-11-07.md. The verified Word report includes this pass and the confirmed team roles; physical phone performance and a standalone APK remain unverified.

## Next provider actions

1. Use actual connected Render/Supabase account tools to inspect projects and select/create only the dedicated Dungeonbound resources. Never create paid projects, add-ons or instances.
2. Create or select Supabase PostgreSQL. Use a private dungeonbound schema; server/db/migrate.js creates it and revokes PUBLIC schema access. Do not expose password hashes or refresh-session hashes through the public Data API.
3. Use its IPv4 session pooler with verified TLS. server/src/db-config.js supports DATABASE_SCHEMA and optional DATABASE_CA_CERT; it strips URL TLS overrides and never disables certificate verification. Store credentials only as Render host secrets, not Git, app bundles or chat messages.
4. Deploy deploy/render.yaml. Generated JWT_SECRET and DATABASE_URL are private. Confirm actual public HTTPS /health advertises saveVersion 3 and run the authenticated integration suite against that URL.
5. Preserve the owner's existing local adventure/account before switching APIs. If moving data, migrate directly over secure database connections; never commit database dumps, password hashes, refresh sessions or credentials. Remove disposable example.test fixtures instead of migrating them. Prefer new sessions after migration.
6. Trigger .github/workflows/android.yml with the verified HTTPS API origin. It builds on a disposable Linux runner, validates the URL, packages ARM64/x86_64 standalone internal-preview APK, records SHA-256, and retains it in private GitHub release assets plus a seven-day Actions artifact. No Windows native build or duplicated local staging is needed.
7. Download one verified APK only for installation testing, check checksum, install on emulator/physical device when available, test auth/SecureStore, restart, offline saves and upgrade behavior, then delete that temporary download after recording results.
8. Update the verified Word report using scripts/update-word-report.py only with actual final native/build results. Original supplied Word documents are archived in docs/source and must remain unchanged.

## Local preview

API: http://192.168.1.7:4000/health. Expo: exp://192.168.1.7:8082. Existing private-Wi-Fi firewall rule remains scoped to Node, Wi-Fi, LocalSubnet and ports 4000/8082. Local PostgreSQL secrets remain in ignored .env files. Never print their values.

Known obsolete temporary Android staging directory TEMP/db3-v4px6aik was removed after verification logs were backed up; 1.22 GB recovered. Shared Android SDKs, user directories and project files were preserved.
