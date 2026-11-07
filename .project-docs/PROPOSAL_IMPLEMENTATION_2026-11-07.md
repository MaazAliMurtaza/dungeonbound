# Proposal implementation follow-up

This follows PROPOSAL_AUDIT_2026-11-07.md and the supplied Word proposal/report. Existing work and the original Word files are preserved.

## Implemented

- Prerequisite-based, two-branch class skill trees for all fifteen skills. Learning through the tree or shop enforces the same class, parent skill, level, gold, ownership and combat rules. Previously owned skills are retained during migration.
- Level-three Assault/Survival mastery: one active choice; first choice free, switching costs 25 gold. Assault multiplies attack/skill power by 1.1 before armor; Survival reduces incoming damage by 10% before guard/shield.
- Twenty defined item types: eighteen equipment templates (six weapons, six armors and six accessories) plus Crimson Flask and Astral Ether. Relics, random IDs, rarity combinations and skills do not inflate this count. See mobile/src/items.ts for the catalog.
- Accessories equip in a third slot and add their specified attack, defense or speed bonus. Swapping does not stack bonuses; equipped accessories cannot be sold.
- Legendary equipment in loot and level-gated shop stock. Standard drop rarity probabilities: 50% Common, 41% Rare, 7.5% Epic, 1.5% Legendary. Elite/guardian loot: 50% Common, 20% Rare, 25% Epic, 5% Legendary, conditional on receiving a drop. Guardian loot is guaranteed; regular drop probability remains 50%, elite 90%.
- Base speed: Warrior 12, Ranger 20, Mage 10; later level-ups add one, capped at 60. Accessories can add speed. Evasion is max(0, min(25%, (hero speed - enemy speed)/100)); fast bats/stalkers and guardians have higher comparison speeds. Evasion avoids an attack/hex, not guard or status ticks. Turn-based combat and one action per turn remain intact.
- Added the proposal's First Dungeon, 100 Enemies Defeated, Level 10 and Legendary Hunter milestones while retaining previous achievements. Quest level-ups update achievements immediately.
- Save format three, validated on both API and device. Complete v1/v2 saves migrate without clearing inventory, equipment, learned skills, gold or campaign progress. New slot/stat/mastery defaults are added. Current-version saves keep their revision; migrations receive a new revision through normal hydration. The API atomically prevents a lower-format client overwriting an upgraded save.
- Gold Legendary styling and a static crest/ground seal distinguish it in the HUD/home/combat. Legendary currently reuses the Epic base sprite row; no new unique frame sheet is claimed.

## Executed automated checks

- Mobile unit tests: 46 passed, zero failed, including all-class six-floor campaign simulations.
- Mobile TypeScript: passed after gameplay/schema/UI integration.
- Backend unit tests: six passed, zero failed.
- Live API: 30 passing checks on the separate local test API, then 30 on the corrected home-network API. Includes actual Legendary accessory/mastery JSONB round trip and rejected schema downgrade retaining the equipped item.
- New focused coverage includes exact combat damage/critical/piercing/guard outcomes, 30,000 seeded critical/evasion samples, 12,000 actual treasure generations with rarity-frequency checks and every equipment template reached, legacy migration, prerequisites, mastery costs and accessory stacking/sales.

Evidence: evidence/proposal-v3-tests.txt, proposal-v3-api-tests.txt and proposal-v3-wifi-api-tests.txt. These are distinct test assertions and simulations, not physical-device performance measurements.

## Runtime troubleshooting and verification in progress

The first live tests hit a stale port-4000 process and rejected the new format. Windows listener discovery and PowerShell process stopping did not replace that old listener. Replacing only the separately verified PID succeeded; /health now advertises saveVersion 3. API startup now reports bind failures rather than printing a misleading success on an Express listen callback error. The exact one-off restart is recorded in evidence/api-restart-verified.json.

Native walkthrough attempts encountered Expo Go download failure/stalls. Android logcat reported a ProtocolException while processing a multipart bundle response. The matching upstream report is https://github.com/expo/expo/issues/49111; its JavaScript-response workaround informed mobile/metro.config.cjs. It changes Windows dev bundle responses while preserving normal asset/manifest/HMR middleware. Treat the middleware as pending native verification until the final result below is updated. One harness attempt also failed when the emulator returned no accessibility root during an activity restart; that attempt did not establish a game-rule failure.

Offline ARM64/x86_64 debug APK attempt failed because io.github.expo:expo-modules-v2-gradle-plugin:0.2.7 was not cached. A normal Maven-dependency build retry is in progress; SDK auto-download and external publishing remain disabled. No completed APK is claimed here yet.

## Remaining evidence and deliverables

Finish native feature/floor/restart verification and inspect screenshots; confirm the bundle workaround on the actual home-network Metro server. Physical OPPO responsiveness, memory/frame stalls/heat and standalone APK install/update/backup tests remain outstanding. Hosted HTTPS API and the final release build are separate deployment tasks. The Word report still needs factual test/build fields and team-provided role/timeline/contribution corrections; no human contribution history will be invented.
