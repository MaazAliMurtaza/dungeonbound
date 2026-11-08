# Final equipment layers and game audio

Built-in imagegen mode was used for the following final raster assets. Existing outfits/positions were preserved in the body edits, with held weapons removed so actual equipment can be rendered separately. Legendary has a distinct ivory/gold outfit per class, not an Epic recolor. Body atlases are 8 x 4; Legendary atlases 4 x 2; weapon atlas 4 x 3 (Warrior swords, Ranger bows, Mage staffs; starter/Riftforged/Eclipse/Dawnsunder columns).

The Mage Legendary v1 is a retained source iteration whose alpha background failed inspection. Runtime uses v2, a fresh generation with transparent margins. No Python/image manipulation was used to remove raster backgrounds.

HeroSprite anchors weapon layers at pose-specific hand grips, compensates for each weapon column's uneven silhouette position, and uses native transforms. Combat sequences include anticipation, strike, Warrior follow-through, hit reaction and recovery, with reduced-motion alternatives. This is a timed pose sequence, not a frame-by-frame walking-animation set.

## Original audio

scripts/generate-audio.py synthesizes three short looping musical cues and nine effects as 16 kHz mono PCM. No third-party recordings or songs were used. The assets live in mobile/assets/audio/. The game pauses audio outside the foreground, persists independent music/effect switches and provides optional device-synthesized voice announcements (off by default). No recording or microphone permission is requested.

## Exact prompts

### warrior-body-v5.png

Mode: built-in imagegen edit.

```text
Technical sprite atlas edit for an RPG equipment-layer renderer. Preserve the EXACT 8-column by 4-row grid, all 32 existing full-body characters, their precise positions, scale, armor, capes, shields, poses, transparent margins and transparent background. Remove ONLY the handheld SWORDS and every sword blade/hilt fragment from all cells. Reconstruct closed glove hands naturally in the identical grip position, ready to hold a separately rendered weapon layer. Keep all shields; keep the red potion in column 7. Do not move any character or hand; do not add new scenery, effects, text or borders. This is a weapon-removal technical edit, not a redesign. Preserve alpha transparency.
```

### ranger-body-v5.png

Mode: built-in imagegen edit.

```text
Technical sprite atlas edit for an RPG equipment-layer renderer. Preserve the EXACT 8-column by 4-row grid, all 32 existing full-body Rangers, precise positions, scale, armor, cloaks, quivers, poses, transparent margins and transparent background. Remove ONLY the held BOWS, bow strings, nocked/held ARROWS and green arrow/projectile effects from every cell. Keep quivers/backpack arrows. Reconstruct the hands naturally in their identical positions, ready to hold a separately rendered bow layer. Keep the trap in column 5 and potion in column 7. Do not move hands, characters, armor or cells. No new scenery, text, grid lines or effects. Preserve alpha transparency.
```

### mage-body-v5.png

Mode: built-in imagegen edit.

```text
Technical sprite atlas edit for an RPG equipment-layer renderer. Preserve the EXACT 8-column by 4-row grid and all 32 full-body Mages, precise positions, scale, hats, beards, robes, armor, poses and transparent margins. Remove ONLY the held STAFFS and all detached staff pieces from every cell. Reconstruct glove hands at the identical gripping positions to receive a separately rendered staff layer. Preserve the red potion in column 7 and small magic effects in free hands. Do not move any body, hand, cell or outfit. No scenery, labels, borders or new effects. Preserve real alpha transparency.
```

### warrior-legendary-v1.png

Mode: built-in imagegen generation.

```text
Use case: stylized-concept. Original transparent 2D dark fantasy RPG sprite atlas. EXACTLY FOUR equal columns and TWO equal rows, eight full-body sprites of the SAME helmeted Warrior, facing RIGHT, identical scale and baseline, each fully isolated with 15 percent transparent padding. Canvas wide 2:1. One new Legendary armor set: luminous ivory sunsteel plate, intricate solar-gold pauldrons, long crimson-and-white royal cape, closed crowned helm, large sun-emblem shield. Visibly different silhouette and materials from black-and-gold Epic armor. Weapon hand EMPTY with closed grip for a separately rendered sword; retain shield. Poses in reading order: idle standing hand near waist; horizontal attack arm extended right; overhead power cleave hands raised; forward piercing thrust arm extended; kneeling seismic slam; crouching shield guard; drinking a small red potion; hit recoil leaning back. Crisp detailed pixel-art matching a mobile fantasy RPG, same character identity across cells. No swords, text, scenery, grids or shadows. Real transparent alpha.
```

### ranger-legendary-v1.png

Mode: built-in imagegen generation.

```text
Use case: stylized-concept. Original transparent 2D dark fantasy RPG sprite atlas. EXACTLY FOUR equal columns and TWO equal rows, eight full-body sprites of the SAME female hooded Ranger facing RIGHT, consistent scale and baseline, 15 percent transparent padding inside every cell. Wide 2:1 canvas. New Legendary outfit: ivory dragonscale armor with gold leaf-shaped shoulder plates, emerald and white hooded cape, ornate gold bracers, white boots, quiver. Distinct from ordinary black/violet Epic outfit. EMPTY weapon hands in bow-gripping positions for separately rendered equipment. Poses in reading order: idle standing; drawing bow pose at shoulder height; kneeling charged shot pose aiming diagonally upward; lunging piercing shot pose; crouching setting trap; defensive side-step; drinking red potion; hit recoil leaning back. No held bow, bowstring, held arrow or projectiles. Crisp detailed pixel-art, coherent character across cells. No scenery, labels or grids. Real transparent alpha.
```

### mage-legendary-v2.png

Mode: built-in imagegen generation.

```text
Original transparent game sprite atlas, exactly FOUR columns and TWO rows, eight isolated full-body pixel-art sprites of the same elderly white-bearded Mage facing right. Genuine alpha transparency: every pixel outside the character silhouettes must be completely transparent, including all cell margins. No white/cream/colored background, floor, texture or shadow. Legendary outfit: luminous ivory and solar-gold armored robes, winged golden pauldrons, white fur shoulder mantle, emerald clasp, tall sun-crowned pointed wizard hat. Consistent scale and baseline, 15 percent transparent padding in each square cell, wide 2:1 canvas. Weapon hands empty for separate staff layer. Reading-order poses: idle standing; low sweeping attack; forward spellcasting; both hands raised overhead; kneeling healing; cross-body defensive ward; drinking a small red potion; hit recoil. Keep outfit and face identical across all eight cells. No staff, labels, border or grid.
```

### weapons-v1.png

Mode: built-in imagegen generation.

```text
Use case: stylized-concept. Original MOBILE RPG EQUIPMENT SPRITE ATLAS, transparent background. EXACTLY FOUR equal columns and THREE equal rows, twelve isolated weapons, one per cell, centered and completely inside with 15 percent padding. Canvas 4:3. No characters, hands, words, scenery, effects covering adjacent cells, labels or borders. Detailed crisp fantasy pixel-art matching illustrated 2D character sprites. All weapons upright with grips at bottom-center. Row 1 Warrior swords: worn straight steel longsword with red leather grip; blue crystalline Riftforged broadsword; ornate black-and-violet Eclipse Edge curved sword; legendary white-and-gold Dawnsunder solar greatsword. Row 2 Ranger bows: plain wood recurve; crystalline blue crescent recurve; black-and-purple dragonwing bow; legendary ivory-and-gold sun bow. Row 3 Mage staffs: simple wood staff with spiral head; blue crystal Riftforged staff; black-violet ornate Eclipse staff; legendary ivory-gold sun staff with green crystal. Make the differences structural and obvious. Clean real transparent alpha, no cast shadows.
```


