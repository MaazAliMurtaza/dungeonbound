# Dungeonbound phone artwork and typography

Created 2026-11-07 using the built-in imagegen tool (not the CLI). These are original generated game assets; no third-party game artwork was copied.

## Runtime layout

- Portrait guild courtyard: guild-portrait-v3.png, rendered with cover at the actual screen dimensions.
- Hero atlases: 8 columns x 4 rows with transparent backgrounds. Rows are Starter, Common, Rare and Epic armor. Columns are idle, attack, power, pierce, ritual, guard, item and hit.
- Runtime Warrior uses the refined v4 atlas. v3 is retained as the source iteration. Ranger and Mage use v3.
- Equipment appearance follows the equipped armor rarity and class. Two armor items in the same rarity share the same model. Weapons do not yet have individual equipment models.
- Action frames are discrete poses animated with lightweight native transforms/effects; these are not full frame-by-frame walk/attack animation strips.
- The later Legendary tier reuses the Epic atlas row with a native gold crest and ground seal. It does not add a fifth raster row or a unique Legendary armor sheet.

## Fonts

Barlow Semi Condensed Medium and Bold were downloaded from the official Google Fonts repository. Bundled files are in fonts/. Font license: fonts/OFL.txt (SIL Open Font License 1.1). Source: https://github.com/google/fonts/tree/main/ofl/barlowsemicondensed

## Exact generation and edit prompts

### guild-portrait-v3.png

Mode: built-in imagegen generation, opaque portrait background.

```text
Use case: stylized-concept. Asset type: ORIGINAL PORTRAIT background for a mobile 2D fantasy RPG home screen, tall 9:20 composition, target 1080x2400. An abandoned hunter guild courtyard at twilight, gothic stone buildings framing a magical cyan portal in the UPPER center background, full view of doorway and architecture, strong depth with distant forested cliffs and the moon. Lower half is a spacious flat stone courtyard floor in perspective, with a subtle circular summoning sigil near 70 percent height for a separate character sprite to stand on. Hand-painted fantasy game environment art, detailed and atmospheric, readable shapes, cool blue-gray architecture with warm amber lanterns. No characters or monsters. No text, no logo, no interface, no frames, no oversized foreground walls. Compose specifically for a phone portrait screen; do not enlarge or crop a landscape scene. Clear empty center foreground. Distinct horizontal ground plane, no stretched buildings, no repeating tiles, no watermark.
```

### warrior-poses-v3.png (source iteration)

Mode: built-in imagegen generation, transparent sprite atlas.

```text
Use case: stylized-concept. Asset type: original mobile RPG CHARACTER SPRITE ATLAS, not a screenshot. A wide 2:1 canvas with EXACTLY EIGHT EQUAL COLUMNS and FOUR EQUAL ROWS, 32 full-body character sprites, ONE sprite centered per cell, transparent background throughout. All sprites share the SAME character identity, same facing RIGHT, consistent scale, full body and all weapons fully inside each cell, same baseline, ample transparent padding. Crisp high-quality detailed 2D pixel-art matching a dark fantasy RPG. No labels, text, numbering, shadows, scenery, UI, grids or borders. Each ROW is a visually DISTINCT armor set, not just recoloring. Each COLUMN is a visibly DIFFERENT pose. Target 2048x1024. Character: sturdy helmeted Warrior wielding sword and shield with red cape. Row 1: starter worn iron breastplate and small round wooden shield, red cape. Row 2: Common full silver chainmail, broad iron shoulder plates, square steel shield. Row 3: Rare cobalt blue crystalline plate with winged shoulder pauldrons, kite shield. Row 4: Epic black-and-gold spiked monarch armor, violet cape and horned helm, massive ornate shield. Columns left to right, REPEAT SAME POSES in each armor row: 1 idle standing sword lowered; 2 basic attack horizontal sword swing with body lunging; 3 power cleave sword held high overhead mid-slash; 4 armor-breaking thrust with sword pointed directly right body extended; 5 seismic skill kneeling sword slammed into ground; 6 defensive crouch shield held fully in front; 7 drinking a red potion with sword lowered; 8 hit recoil body leaning back shield pushed aside. Poses must differ in actual arm and leg positions, not just attached effects.
```

### warrior-poses-v4.png (runtime Warrior)

Mode: built-in imagegen edit of Warrior v3, preserving transparency.

```text
Edit this sprite atlas for safe in-game cell clipping. Preserve the EXACT 8 columns by 4 rows layout, 32 sprites, same Warrior identity, same four armor tiers per row, same eight action poses per column, transparent background and 2:1 canvas. Crucial correction: every character including its entire sword, shield and cape must fit completely within its own cell with at least 12 percent transparent padding on all four sides. Shrink each whole pose inside its cell as necessary. Shorten extended swords slightly if needed, but do not cut off body parts or weapons. No sprite or weapon may touch or cross a cell boundary; remove stray weapon fragments belonging to neighbors. Keep the top row starter iron and red cape, second row full silver Common armor, third row cobalt crystalline Rare armor, fourth row black-and-gold Epic armor with purple cape. Column sequence remains idle, horizontal attack, overhead cleave, thrust, ground slam, shield guard, drinking potion, hit recoil. No text, borders or visible cell grid. This is a technical cleanup of padding and isolation, not a redesign.
```

### ranger-poses-v3.png

Mode: built-in imagegen generation, transparent sprite atlas.

```text
Use case: stylized-concept. Asset type: original mobile RPG CHARACTER SPRITE ATLAS, not a screenshot. A wide 2:1 canvas with EXACTLY EIGHT EQUAL COLUMNS and FOUR EQUAL ROWS, 32 full-body character sprites, ONE sprite centered per cell, transparent background throughout. All sprites share the SAME character identity, same facing RIGHT, consistent scale, full body and all weapons fully inside each cell, same baseline, ample transparent padding. Crisp high-quality detailed 2D pixel-art matching a dark fantasy RPG. No labels, text, numbering, shadows, scenery, UI, grids or borders. Each ROW is a visually DISTINCT armor set, not just recoloring. Each COLUMN is a visibly DIFFERENT pose. Target 2048x1024. Character: agile green-hooded Ranger with longbow, quiver, brown boots. Row 1: starter green cloth cloak over light brown leather. Row 2: Common studded brown leather chest armor and metal shoulder guard, short green cape. Row 3: Rare blue-silver scale mail with feathered shoulder guards and pale blue hood. Row 4: Epic ornate black-and-gold dragon scale armor, violet hood, gold spiked arm guards. Columns left to right, REPEAT SAME POSES in each armor row: 1 idle standing bow lowered; 2 basic arrow shot drawing bow sideways at shoulder level; 3 charged phantom shot kneeling drawing bow upward diagonally; 4 venom/piercing shot lunging with glowing arrow pulled back by cheek; 5 snare trap skill crouching and setting trap on ground with bow at back; 6 defensive side-step bow raised in guard; 7 drinking a red potion bow lowered; 8 hit recoil leaning back with arms thrown back. Poses must differ in actual arm and leg positions, not just attached effects.
```

### mage-poses-v3.png

Mode: built-in imagegen generation, transparent sprite atlas.

```text
Use case: stylized-concept. Asset type: original mobile RPG CHARACTER SPRITE ATLAS, not a screenshot. A wide 2:1 canvas with EXACTLY EIGHT EQUAL COLUMNS and FOUR EQUAL ROWS, 32 full-body character sprites, ONE sprite centered per cell, transparent background throughout. All sprites share the SAME character identity, same facing RIGHT, consistent scale, full body and all weapons fully inside each cell, same baseline, ample transparent padding. Crisp high-quality detailed 2D pixel-art matching a dark fantasy RPG. No labels, text, numbering, shadows, scenery, UI, grids or borders. Each ROW is a visually DISTINCT armor set, not just recoloring. Each COLUMN is a visibly DIFFERENT pose. Target 2048x1024. Character: elderly white-bearded Mage with pointed hat and wooden staff. Row 1: starter worn purple robe, soft pointed hat, simple wooden staff. Row 2: Common burgundy reinforced leather coat with silver chest clasp, broad-brim hat, bronze staff. Row 3: Rare blue-and-silver runic battle robes with armored pauldrons and crystal crown hat, icy crystal staff. Row 4: Epic black-and-gold heavily ornamented archmage vestments with winged mantle, violet wizard crown, elaborate gold staff. Columns left to right, REPEAT SAME POSES in each armor row: 1 idle standing staff vertical; 2 basic attack sweeping staff horizontally forward; 3 astral bolt spell casting staff aimed right arm outstretched; 4 cinder/nova spell casting both hands overhead with staff floating alongside; 5 frozen-hour/healing spell kneeling one palm on ground staff planted at back; 6 defensive stance staff held cross-body as a ward; 7 drinking a red potion with staff in other hand; 8 hit recoil body leaning back staff knocked sideways. Poses must differ in actual arm and leg positions, not just attached effects.
```

