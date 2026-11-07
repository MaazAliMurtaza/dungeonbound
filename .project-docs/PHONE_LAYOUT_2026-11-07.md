# Phone layout, action poses and visible armor

## Changes

Reviewed the supplied dungeonbound-home-screen-oppo-f19.jpeg (720 x 1600). Replaced the previous absolute-positioned home composition with a measured, flexible layout. The character, outfit name and achievement title now occupy their own space above the travel controls. Compact viewports shorten the lore excerpt and scale the character and menu rails.

Removed the Eclipse Protocol UI branding and added the Dungeonbound title. Bundled Barlow Semi Condensed Medium and Bold to avoid device-specific generic serif/font substitutions. Controls use constrained font scaling and measured widths; HUD columns flex instead of assuming a fixed phone width. The guild background is a portrait asset with explicit rendered width/height and preserved aspect ratio.

Added transparent class-specific atlases with eight action poses and four armor appearances per class. Equipped armor selects Starter/Common/Rare/Epic appearance in the home, HUD and combat. Basic attacks, power attacks, piercing attacks, rituals, guarding, item use and incoming hits select different frames. Skill effects also vary by effect type. Rendering uses atlas crops and native transforms; no new game engine or per-frame JavaScript animation loop.

Runtime files: mobile/src/HunterHome.tsx, GameText.tsx, HeroSprite.tsx, appearance.ts, BattleScene.tsx and GameWorld.tsx. App.tsx loads fonts and passes the selected skill into combat events. Existing progress format is unchanged.

## Executed verification

| Check | Actual result |
| --- | --- |
| npm.cmd run typecheck (mobile) | Passed |
| npm.cmd test (mobile) | 35 passed, 0 failed |
| npm.cmd test (server) | 4 passed, 0 failed |
| EXPO_OFFLINE=1 npm.cmd run doctor | Dependencies up to date; Expo explicitly warns offline validation is less reliable |
| git diff --check | Passed; Git emitted line-ending normalization warnings |
| Local Wi-Fi API /health | HTTP 200, status ok |
| Native visual regression | Exit 0 for all three classes, all four armor appearances, attack/skill/guard captures |
| Final Warrior art/layout retest | Exit 0, including compact/tall layouts after final atlas refinement |

Android evidence came from emulator-5554: AOSP Android 11, approximately 2 GB RAM and two virtual CPUs. Phone-sized configuration: 720 x 1600 at density 320 (360 x 800 dp), font scale 1.3. Additional native layouts: 640 x 1136 at density 320 (320 x 568 dp), and 786 x 1746 at density 320 (393 x 873 dp). UI assertions checked the outfit/title/travel-button order and presence, absence of old branding, and the model corresponding to equipped armor.

scripts/android-visual-v3.mjs uses a disposable account and an explicit emulator serial. Armor was equipped through the real native controls and persisted to the account save. Synthetic battle fixtures have elevated HP/gold and a durable enemy to capture action poses; screenshot numbers are not normal campaign balance. The fixture was logged out and its database user removed. The user's phone account/progress was not modified by this harness.

Final evidence: evidence/phone-v3-warrior-starter.png, phone-v3-warrior-common.png, phone-v3-warrior-rare.png, phone-v3-warrior-epic.png, phone-v3-warrior-attack.png, phone-v3-warrior-skill.png, phone-v3-warrior-guard.png, phone-v3-home-compact.png and phone-v3-home-large-tall.png. Ranger and Mage captures have the corresponding filenames. The final Warrior-only retest refreshed its captures after the final art/deck refinements; other classes were checked in the preceding full native run. The floating gray gear/Tool overlay visible in some captures belongs to the Expo Go development host.

## Wireless review and remaining limits

API remains available at http://192.168.1.7:4000/health. Expo Go uses exp://192.168.1.7:8082 and the existing phone-qr-wifi.png. Metro now watches source changes for reload/Fast Refresh. The firewall rule remains limited to the private home Wi-Fi interface and LocalSubnet. This supersedes the localhost-only connection description in the earlier verification report.

Physical OPPO F19 rendering and performance still require the user's reload/check; emulator screenshots do not establish device FPS. No standalone APK performance benchmark was run for this visual change. Action art uses discrete poses with transforms/effects rather than full frame-by-frame animation strips. Same-rarity armors share a class model; individual weapon models remain future work.

Original asset prompts, tool modes and font license attribution: mobile/assets/ARTWORK-v3.md. Runtime Warrior uses warrior-poses-v4.png; warrior-poses-v3.png is retained as the source iteration. Existing project work and old evidence were preserved.
