# Eclipse Protocol artwork

Created 2026-11-07 with the built-in imagegen tool. Original AI-generated assets for Dungeonbound; no game or manhwa artwork was downloaded or copied. Existing hero art and authorship are retained.

## Environment atlas

`realms-v2.png`: 1536 × 1024, RGB, two columns by three rows. Used directly by `RealmArt.tsx` with a clipped, cover-scaled cell; no runtime image manipulation or six separate downloads.

Final prompt:

> Use case: stylized-concept. Asset type: background environment atlas for an original mobile dark fantasy RPG Dungeonbound. Create one landscape image divided into a precise 2 columns by 3 rows grid of six equally sized landscape environment panels, NO GAPS, no borders, no text, no lettering, no characters. Highly detailed hand-painted anime/manhwa fantasy environment art with dramatic lighting, strong silhouettes, beautiful high-end game art. Every panel must have a clearly visible flat ground at bottom third for fighters to stand. Top left: ruined gothic hunter guild courtyard with a colossal glowing cyan portal and floating black stones, moonlight. Top right: underground emerald forest with luminous mushrooms and ancient roots. Middle left: frozen cathedral and icy bridge, blue white light. Middle right: volcanic forge and lava canals, amber orange. Bottom left: astral library with floating books and violet magic runes, deep purple. Bottom right: throne of a shadow monarch, crimson eclipse and obsidian stairs. Clean dramatic compositions with empty central spaces for overlay UI and sprites. No UI, no watermarks. Each of the six panels must be separately usable as a battle background. Target landscape canvas 1536x1024.

## Monster atlas

`monsters-v2.png`: 1254 × 1254, RGBA with transparency, four columns by four rows. The first ten cells are regular foes, followed by the golem and five guardian illustrations. Eclipse Monarch uses the Void Sentinel illustration at guardian scale; it does not have a separate seventeenth illustration. Existing heroes remain in `dungeon-atlas.png`.

Final prompt:

> Use case: stylized-concept. Asset type: original mobile RPG monster sprite atlas. Exactly 4 columns by 4 rows of 16 equally sized square cells in a square image. Each monster centered fully inside its cell with generous padding, no overlapping, full body front three-quarter view facing slightly left. Transparent background in every cell, no floor, no shadow ground, no words, no labels, no frames. Beautiful crisp detailed fantasy pixel-art sprites matching a dark anime dungeon game. Row 1 left to right: goblin with dagger, skeleton warrior, giant purple cave bat, green slime. Row 2: hooded violet dark acolyte, emerald venom spider stalker, blue ice armored revenant, orange flaming ember wolf. Row 3: obsidian void sentinel knight, wooden chest mimic with teeth, massive grey stone golem, ash warden armored knight with orange sword. Row 4: huge thorn vine sovereign monster, white ghostly frost queen, lava furnace colossus, cosmic violet robed archivist. Distinct readable silhouettes, saturated luminous magic accents, premium retro RPG quality. No human heroes. Every sprite has roughly equal visual height, maximum 80 percent of its cell.

The sprites are single-pose cutouts animated with native transforms, floating feedback, impact rings and optional eight-shard bursts. They are not frame-by-frame character animation sheets. Performance mode disables idle loops and shard bursts and shortens combat effects; OS reduced-motion preferences take priority.

## Design references

- Hades, official Supergiant page: https://www.supergiantgames.com/games/hades/ — inspiration for varied build choices and a repeated ascent loop.
- Darkest Dungeon, official site: https://www.darkestdungeon.com/ — inspiration for a clear dungeon identity and tactical encounters.
- Original hunter/guild/tower fiction and visual motifs; no named manhwa character, logo, dialogue, or artwork reproduced.

## Ability illustrations and interface study

`abilities-v2.png`: original AI-generated four-by-four atlas, fifteen class abilities and one flask illustration. Generated with the built-in imagegen tool on 2026-11-07 and consumed by `AbilityIcon.tsx`, the in-world command deck, and equipment/skill/merchant menus.

Final prompt:

> Use case: stylized-concept. Asset type: original illustrated ability icon atlas for a dark fantasy RPG. One square image in exactly FOUR columns by FOUR rows of SIXTEEN equal square icon cells, no gaps. Each icon is a richly hand-painted fantasy game ability illustration, dark charcoal backdrop, vivid colored magical light, distinct readable central silhouette, narrow antique bronze square rim, no text, no numbers, no letters, no logos. These will be actual small skill buttons in a game, not a UI mockup. Row 1: orange sword cleaving a violet rift; blue iron shield with magical sparks; red sword shattering armor; golden hammer seismic ground impact. Row 2: crimson blade drawing a spiral of blood; silver ghostly arrow flying through darkness; green venom fang arrow; golden archer eye and piercing arrow. Row 3: steel thorn snare trap; silver crescent moon arrow with red life wisps; bright violet astral energy bolt; blooming orange fireball. Row 4: turquoise healing stars and a spectral hand; blue hourglass encased in ice; black hole with luminous purple event horizon; ornate ruby potion bottle with blue glass stopper. Premium hand-painted RPG icon art, strong contrast, no gradients used as substitutes for actual illustration, no icons outside cells. Match original dark fantasy guild hunter setting, avoid copying any named game's assets.

Screenshots were downloaded into the ignored `.checkpoints` directory for visual study, not bundled in the game. References: publisher Steam screenshots for Slay the Spire and Darkest Dungeon; an Epic Seven gameplay screenshot posted to the official STOVE community (https://page.onstove.com/epicseven/global/view/3862203). Their composition informed scene dominance, edge HUDs, larger actors and illustrated command slots. No reference pixels or characters are part of the shipped assets.
