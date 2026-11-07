# Dungeonbound: Eclipse Protocol

> Historical implementation note. The original Word documents are now available and have been audited in [PROPOSAL_AUDIT_2026-11-07.md](PROPOSAL_AUDIT_2026-11-07.md). Later phone/fonts/action-pose/armor work and current tests are recorded in [PHONE_LAYOUT_2026-11-07.md](PHONE_LAYOUT_2026-11-07.md). The app title is Dungeonbound; the older document title and descriptions below are retained as history.

Implementation update: 2026-11-07. This builds on the existing Expo / React Native / Express / PostgreSQL project. Existing authorship is retained. Code, tests, art generation and integration in this update were Codex-assisted.

## Proposal coverage

| Proposal target available in this repository | Implementation |
| --- | --- |
| 5–10 floors | Six themed floors, eight seeded rooms each; 48 rooms per campaign |
| 8–10 enemy types | Ten regular enemy archetypes with stat differences, one elite and six named guardians |
| 10–15 skills | Fifteen skills: five each for Warrior, Ranger and Mage |
| 10+ quests | Twelve contracts with saved thresholds and one-time rewards |
| Leaderboard | Database-backed, optional public aliases, publish/remove controls; no emails or account IDs exposed |
| Shop | Earned-gold supplies, mana flasks, rare/epic weapons and armor, sanctuary rest and skill tomes |
| Combat and progression | Enemy intents, cooldowns, armor piercing, shield, poison, burn, stun, life steal, XP and levels |
| Additional replay systems | Four stackable relic choices, branching shrine events, eight achievements and harder repeat cycles |

The original university proposal document was not supplied. Coverage above refers to the targets recorded in the existing project README, not a claim to have inspected an unavailable original report.

## Presentation and flow

Original hunter-guild / cursed-tower fiction, illustrated environment atlas, sixteen monster illustrations, retained hero sprites, six gate identities, a full-screen guild hub and battlefield, actor-aligned HUD overlays, a fixed illustrated command deck, framed gear/merchant/contract menus and readable enemy intents. Combat does not scroll or display the menu tab bar. The final guardian shares the Void Sentinel illustration at guardian scale. Story content is short floor introductions and room events, not a full dialogue campaign.

Combat uses native-driver movement, impact text, damage feedback, skill rings, guard/healing effects and optional eight-shard bursts. Performance mode is enabled by default: no idle sprite loops, no shard burst, shorter effects while retaining the full-screen battlefield. OS reduced-motion preferences take priority. Haptics are optional. There is no music or voice acting, and sprites are animated cutouts rather than frame-by-frame character sheets.

Assets and exact imagegen prompts: `mobile/assets/ARTWORK-v2.md`. No reference-game or manhwa artwork was copied.

## Persistence and backend

- Both tokens and the last user identity remain in Expo SecureStore. No credential goes to AsyncStorage.
- Local saves and cloud revision metadata are per user. A cached SecureStore identity permits offline cold-start restoration when the API is unreachable; a server-declared revoked session is rejected.
- Shared device/API validation checks nested hero stats, rooms, equipment references, inventory, class skills, cooldowns, quest IDs and relics. Unknown fields, including credential fields, are rejected.
- Complete version-one saves migrate to version two while preserving character progress. A migration is treated as a new save revision; merely opening an existing version-two save preserves its revision.
- Expected cloud revisions prevent a device from silently overwriting a different device's update. Conflicts pause game mutations and offer local/cloud choice. Both candidate snapshots are backed up locally before the choice. The last successful cloud revision is remembered across offline restarts.
- Access JWTs carry a session ID checked against PostgreSQL. Logout and refresh rotation invalidate access to the removed session immediately. Old pre-update access tokens must refresh once.
- Leaderboard records derive from the authenticated user's stored save, with constrained public aliases. This is a community progress board, not an anti-cheat verified competitive ranking. Gameplay and shop transactions run locally to support offline play; client-edited saves cannot be made competitive-authoritative by shape validation alone.
- Password hashes, hashed rotating refresh tokens, parameterized SQL, rate limits and per-user authorization remain in place. Production hosting configuration includes the shared schema source and requires a real HTTPS API URL.

## Run locally

Keep the existing local `.env` files private; do not replace them with examples.

1. Start Docker Desktop; from the root: `docker compose up -d --wait`.
2. In `server`: `npm run db:migrate`, then `npm start`.
3. In `mobile`, set development `EXPO_PUBLIC_API_URL=http://127.0.0.1:4000` in the process environment, then run `npx expo start --go --localhost --port 8082 --max-workers 2`.
4. Use the existing `Dungeonbound_LowEnd_API30` AVD / cached SDK 58-compatible Expo Go. `scripts/start-low-end.ps1` launches the separate profile and forwards the API and Metro ports. It preserves `Medium_Phone_API_37.0`.

Low-end emulator setup: Android 11 AOSP x86_64, Nexus S display 480×800, density 160, two cores, actual 2 GB guest RAM. The installed emulator enforces a 2 GB minimum for this image; the attempted 1536 MB flag was increased automatically. Android 17 enforces 4 GB and repeatedly stalled in System UI on this host; it was stopped. A lower screen resolution on Android 17 did not constitute a lower-RAM test.

If recreating this profile, install the official `system-images/android-30/default/x86_64` SDK package and use `avdmanager create avd --name Dungeonbound_LowEnd_API30 --package "system-images;android-30;default;x86_64" --device "Nexus S"`. Install compatible Expo Go and run the launch helper. The helper does not install SDKs or publish anything.

## Verification and remaining release work

See `VERIFICATION_2026-11-07.md` and `TEST_REPORT.md` for actual outcomes and failed attempts. Current verification: 31 mobile tests, 4 backend tests, 26 API assertions, the full current-layout native floor/persistence walkthrough, and the targeted online-startup conflict regression all pass. The six-floor automated simulation is not a claim that all six floors were manually traversed on a phone. Emulator checks do not establish real low-end phone FPS, battery use or release APK memory.

Hosted API deployment, standalone APK completion, standalone backup/restore and physical-device verification remain separate release tasks. No new public deployment, source push or paid service was performed by this update. Account recovery/email delivery, multiplayer, server-authoritative anti-cheat and a full skill specialization tree are not implemented.
