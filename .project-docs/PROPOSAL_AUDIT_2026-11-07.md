# Dungeonbound: audit against the supplied Word documents

> Subsequent implementation closes the tree, accessories, Legendary rarity, speed, catalog and milestone gaps identified below. See [PROPOSAL_IMPLEMENTATION_2026-11-07.md](PROPOSAL_IMPLEMENTATION_2026-11-07.md) for current implementation and verification; this audit retains the before-change findings.

Reviewed 2026-11-07. This audit compares the actual supplied proposal and report with the current local source and existing test evidence. It supersedes earlier statements that the original proposal was unavailable. No game code or original Word document was changed by this audit.

## Sources and method

- ../(SE-067_092_099) MAD Dungeonbound_Project_Proposal.docx
- ../(SE-067_092_099) MAD Dungeonbound_Project_Report.docx
- Extracted document-body text and table cells: SOURCE_PROPOSAL.txt and SOURCE_REPORT.txt. P numbers refer to XML paragraph positions, including empty paragraphs, not Word page numbers.
- Proposal SHA-256: 8a05517e3b0783c2a12f7786bfe77b15db64b5cae70898b5fea7bce179c3c35d
- Report SHA-256: af5c8b587b6a15e3f5ec786245f75e5e62c937020725728161ce699efc94d17c

Inspected mobile/src/content.ts, game.ts, state-schema.js, appearance.ts, useAdventure.ts, auth.ts, HeroSprite.tsx, BattleScene.tsx, GameWorld.tsx, mobile/App.tsx, server/src/server.js, server/db/schema.sql and automated tests. Executed a fresh read-only content inventory through Node: six floors, ten regular enemy archetypes, fifteen skills, twelve quests, four relic types, four shop equipment templates, two consumables and one rest service. Earlier passing tests are cited as existing evidence; this document review did not rerun gameplay tests or establish a new physical-device benchmark.

## MVP counts (proposal section 15, P163-P173)

| Proposal target | Current source | Assessment |
| --- | --- | --- |
| Three classes | Warrior, Ranger, Mage | Met |
| 8-10 enemy types | Ten regular archetypes, plus an elite and six named guardians | Met for content count; behavior diversity is modest |
| 5-10 dungeon floors | Six floors, eight rooms each | Met |
| 15-20 item types | Six named class loot templates, four shop equipment templates, two consumables; four additional relic types | Ambiguous/partial: 12 ordinary templates, or 16 when relics count. No documented item catalog defines this count. Random IDs, bonuses and rarity combinations are not additional designed item types |
| 10-15 skills | Fifteen total, five per class | Met for count; skill tree remains partial |
| 10+ quests | Twelve contracts | Met |
| Several bosses | Six named floor guardians | Met; unique art/behavior per boss is not complete |
| Inventory/equipment, XP/levels, procedural generation, persistent accounts | Implemented locally and through the API | Met for the core loop; caveats below |

## Feature coverage

| Requirement and proposal reference | Evidence and actual behavior | Status / remaining work |
| --- | --- | --- |
| Accounts and character selection (P121-P122) | Registration/login, class selection, authenticated per-user saves | Implemented. One active character/save per account; multiple character slots are not specified in the proposal |
| Dynamic layouts with combat, treasure, events, elites and boss; valid path (P35-P37, P123-P124) | makeRooms shuffles six middle rooms between start and boss; each floor has a linear eight-room route | Implemented as a linear procedural sequence. Branching map topology would be an enhancement |
| Turn-based normal attack, skill, defend and items (P38-P39, P125-P126) | combatAction, skill cooldowns/mana, consumables, armor, criticals, status effects and loss/victory | Implemented. Damage/crit exact-formula and loot-distribution tests remain thinner than the report's requested QA table |
| Rule-based AI and different patterns (P40, P127) | strike/heavy/guard rotation; Dark Acolyte and Venom Stalker use hex; boss below-half-HP damage bonus; archetype stat modifiers | Implemented baseline. Most enemies share a rotation. The health-aware defense/player-low-HP strong-attack examples are not implemented literally; P40 gives them as examples, not separate mandatory acceptance cases |
| Class identities (P44-P47) | Warrior has most HP/defense; Mage has most attack/mana and least defense; Ranger critical chance is 30% versus 12% | Partial: no speed stat, initiative or speed-based mechanic for the promised fast Ranger |
| Simple skill tree supporting builds (P48, P96, P131) | Five class skills unlocked by gold and hunter level; UI calls this an Awakening Tree | Partial: a purchase list, with no prerequisite links, branching paths, skill points or build choices. A simple actual tree is proposal scope; a large specialization system is not necessary |
| Weapons, armor, accessories and consumables (P50, P128-P129) | Slot only permits weapon/armor; potions and ethers are counters; relic bonuses exist separately | Partial: no accessory item/slot/equip effects. Relics do not currently behave as equippable accessories |
| Common/Rare/Epic/Legendary rarity (P50) | Loot generation, shop and shared validator permit Common/Rare/Epic | Partial: Legendary is absent from types, generator, validation, UI and appearance mapping. Adding it requires a compatible save/schema update |
| Probability-based loot (P51) | Seeded random drops with rarity and elite bonuses; class-specific weapon/armor names | Implemented for three rarities. Broader catalog and probability regression evidence remain |
| XP, leveling and quest rewards (P29, P42, P130, P132) | Battle/contract XP, level stat gains and rewards | Implemented |
| Achievements (P53, P134) | Eight triggers including Boss Slayer, level-10 S-Rank Hunter, campaign win, learning skills and relic collection | Implemented generally, partial against the named examples. No dedicated 100-kill or Legendary Hunter achievement. Dungeon clears are tracked but there is no First Dungeon named trigger. P53 says 'such as', so equivalent achievements are acceptable if documented; adding the omitted milestones would align more closely |
| Backend persistence (P7, P31, P54, P72-P73, P133) | PostgreSQL JSONB contains character, inventory, quests and achievements; authenticated save endpoints, strict shared validation, migration and conflict choice | Implemented. Separate inventory/quest tables are not required by the proposal. Hosting is still local |
| Optional leaderboard (P54, P135) | Opt-in public aliases, score from stored save, publish/remove and ranks | Implemented beyond the mandatory core. Competitive anti-cheat is not claimed and is not an MVP requirement |
| Lightweight/offline processing (P73, P75-P86) | Local rules/cache, limited actors, performance mode, native transforms and batched save sending | Implemented design measures. Texture budgets, source-iteration exclusion from release, compression/loading behavior and actual device costs still need release measurement |
| Low-to-medium-end responsiveness, approximately 3-4 GB RAM (P87, P138) | Low-end emulator and compact/tall enlarged-text checks; user supplied OPPO screenshot exposed the previous layout problem | Unverified on physical target devices after the latest fix. Need startup time, responsiveness, FPS/frame stalls, memory and longer-session tests; emulator RAM is not equivalent to a physical-phone benchmark |
| Usability and small screens (P140) | Measured portrait layout, bundled fonts and constrained/scaled controls | Improved and emulator-tested. Needs OPPO confirmation and new-player playtesting |
| Recoverable progress (P142) | Local/cloud snapshots, offline cold start, session restore, explicit conflicts and local candidate backups | Verified in existing emulator/API evidence. Standalone install/update/backup behavior remains unverified |
| Extensibility and maintainability (P144-P146) | TypeScript game modules and data tables; React Native UI and shared validation | Partly met. IDs and caps are repeated in shared validation, floor/skill/slot assumptions are hardcoded in places; extending content requires coordinated changes |

## What the Word report still needs

The supplied report explicitly identifies itself as a scope-based template (P4, P40). Its 'To be updated' and 'Not run / update' cells are not evidence that the current implementation is absent or tests failed. They need replacement with truthful current results and limitations.

- Section 3: replace status placeholders using the matrix above.
- Section 4: record actual existing results: 35 mobile tests, four backend unit tests, TypeScript pass, previously executed 26 live API assertions, emulator floor/persistence tests and the phone-layout/armor tests. Distinguish source review, unit simulation, emulator execution and physical-device testing.
- Section 4: deterministic known-damage assertions, configured critical probability/multiplier evidence and explicit rarity/stat distribution tests are not independently established by the current test names/assertions. Existing broad simulations and HP invariants are useful but do not substitute for all those exact acceptance cases.
- Section 5: document actual issues such as the OPPO clipping/OEM font substitution, save conflict handling and emulator profile failures with their dated evidence. Do not invent bug history.
- Section 6: the week 8-15 table still needs real dates, commits/issues and assignments. Current session logs do not establish a semester-long development history.
- Section 9: include the actual source repository, exact release commit, tested APK/build link and evidence locations when available. The latest work is local/uncommitted; no completed current release APK is established.
- Section 10: team contribution evidence must come from the team's actual work and repository history. No percentages or human authorship allocation were inferred.

There are two document inconsistencies to resolve with the team: proposal section 10 assigns Maaz frontend and Rayyan game systems/QA, while report sections 2/6 assign Rayyan frontend and Maaz game systems/QA. The report's responsibility table also spells Rayyan's name 'Syed Muhannad Rayyan', while its cover uses 'Syed Muhammad Rayyan'. Neither source was silently corrected.

## Required work versus enhancements

Prioritize proposal alignment: (1) a simple actual skill tree and meaningful build choices; (2) accessory equipment and Legendary loot with compatible persistence; (3) an explicit 15-20-type item catalog and decision on counting relics; (4) Ranger speed/initiative behavior or an explicitly agreed design revision; (5) achievement coverage and focused combat/crit/loot checks; (6) physical-device performance/usability, final APK and report evidence.

Hosted HTTPS API is needed for reliable remote/public use; the Word proposal's core architecture does not mandate a specific host. The Word report includes a final APK/build deliverable. Standalone install/session/offline/update/backup checks belong to release verification, not new gameplay feature counts.

Proposal section 14 (P150-P161) explicitly puts additional classes/environments, advanced AI, daily challenges, cloud synchronization, multiplayer dungeon runs, player guild systems, PvP, procedural quests and recommendation/balancing algorithms outside the initial MVP. Some additional environments and cloud synchronization are already delivered. A menu named guild is not a multiplayer guild system. Music, voice acting, account recovery/email verification, individual weapon models and full frame-by-frame animation are also not stated MVP requirements; they may remain enhancements under the user's broader polish request.

## Relevant existing evidence

- PHONE_LAYOUT_2026-11-07.md: latest responsive layout, fonts, poses, armor, 35 mobile/four backend tests and native visual checks.
- VERIFICATION_2026-11-07.md: earlier 26 live API assertions, campaign simulations, native floor/persistence and low-end emulator outcomes.
- mobile/assets/ARTWORK-v3.md: new asset prompts, runtime choices and font attribution.

No claim of 100% proposal completion is justified yet. The numeric class/enemy/floor/skill/quest targets and main playable loop are present, while the specific mechanics and release evidence above remain partial.
