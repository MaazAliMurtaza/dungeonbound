# Dungeonbound sprite artwork

`dungeon-atlas.png` is an original AI-generated transparent PNG created for this project with the built-in imagegen tool on 2026-10-29. It is not a purchased asset or artwork credited to a team member. No third-party sprite pack was used. Final dimensions: 1448 × 1086 pixels, four columns and three rows (362-pixel cells).

Cells, left to right:

| Row | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| 1 | Warrior | Ranger | Mage | Goblin |
| 2 | Skeleton | Cave Bat | Slime | Dark Acolyte |
| 3 | Elite Stone Golem | The Ash Warden | Treasure chest | Dungeon gate |

`src/visuals.ts` maps game characters to cells. `src/BattleScene.tsx` clips the atlas into sprites, builds the dungeon backdrop from native Views and applies native-driver transforms/opacity. Idle bobbing, attack/counterattack movement, floating damage, spell rings, shield/healing overlays and defeat fading are presentation only; game rules and saved data are unchanged. These are animated single-pose cutouts, not frame-by-frame walking sprite sheets. Motion respects Android/iOS reduced-motion settings and pauses idle loops when backgrounded.

## Initial generation prompt

Create ONE production-ready 2D game sprite atlas for a lightweight fantasy dungeon RPG. Transparent background, orthographic full-body chunky pixel-art illustrations, crisp clean silhouettes, restrained pixel shading, readable on a small phone, charming dark fantasy. EXACT layout: FOUR equal-width columns by THREE equal-height rows, all 12 cells equal square, entire image 4:3 aspect ratio. Each sprite centered in its cell, entirely contained within central 75% width and 85% height, feet aligned at same baseline, generous transparent margins. No cell borders, no text, no letters, no UI, no cast shadows outside each character. All heroes face RIGHT in three-quarter side view; all enemies face LEFT. ROW 1 left-to-right: armored silver Warrior with crimson cape, sword and shield; forest-green hooded Ranger with bow and quiver; violet-robed Mage with tall hat and glowing cyan staff; small green Goblin with dagger and leather scraps. ROW 2: ivory Skeleton swordsman with rusty helmet; purple Cave Bat with outstretched wings; turquoise translucent Slime with bright eyes; Dark Acolyte in charcoal robe with magenta magic. ROW 3: massive Elite Stone Golem with moss and amber rune; boss The Ash Warden black horned armor lava cracks huge flaming sword; wooden treasure chest with gold spilling; glowing ancient stone dungeon doorway. Match visual scale, pixel density and art direction across the atlas; boss and golem somewhat larger within their own cells. Original artwork only.

## Final edit prompt

Edit this exact 4-column x 3-row sprite atlas for correct game-engine slicing. Preserve the same 12 subjects and their positions/order, pixel art style, colors and transparent background. CRITICAL change: SHRINK EACH CHARACTER/OBJECT to 65% of its cell width and 75% of its cell height, centered inside its own equal square cell. Leave large fully transparent gutters on ALL sides of EVERY sprite including bottom row. No sword, wing, cape, hand, glow or foot may cross any cell boundary. In particular shrink golem and Ash Warden so the whole hand and flaming sword fit inside their own cells. The image is exactly 4 equal columns and 3 equal rows; position sprite centers at x=12.5%,37.5%,62.5%,87.5%; y=16.667%,50%,83.333%. All twelve cells must have transparent padding and sprites must not touch each other. No grid lines, no text. Original appearance unchanged except scaling and centering for safe atlas extraction.

The first output was inspected and discarded because oversized bottom-row characters crossed cell boundaries. The edited image is the project asset. Both prompts used the built-in imagegen tool with transparency enabled, without API keys or a paid external asset service.
