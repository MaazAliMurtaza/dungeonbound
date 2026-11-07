import test from "node:test";
import assert from "node:assert/strict";
import { newGame, equipItem } from "../src/game.ts";
import {
  commandDeckLayout,
  actionPose,
  armorAppearance,
  battlefieldActorSize,
  homeLayout,
  HERO_POSES,
} from "../src/appearance.ts";

test("five illustrated skills stay inside the command deck on narrow phones", () => {
  for (const width of [280, 320, 360, 393, 480, 600])
    for (const count of [1, 2, 3, 4, 5]) {
      const layout = commandDeckLayout(width, count);
      assert.ok(
        layout.slotWidth * count + layout.gap * (count - 1) <= width - 32,
      );
      assert.ok(layout.iconSize + 6 <= layout.slotWidth);
      assert.ok(layout.slotWidth >= 44);
    }
});
import { SKILLS } from "../src/content.ts";

test("equipped armor drives distinct starter/Common/Rare/Epic models for every class", () => {
  for (const cls of ["Warrior", "Ranger", "Mage"]) {
    let g = newGame(cls, 42);
    assert.equal(armorAppearance(g).row, 0);
    for (const [index, rarity] of ["Common", "Rare", "Epic"].entries()) {
      const item = {
        id: `armor-${rarity}`,
        name: `${rarity} armor`,
        slot: "armor",
        rarity,
        bonus: 5 + index,
      };
      g.inventory.push(item);
      g = equipItem(g, item.id);
      assert.deepEqual(armorAppearance(g), {
        row: index + 1,
        tier: rarity,
        name: item.name,
      });
    }
    g.equipment.armor = null;
    assert.equal(armorAppearance(g).row, 0);
  }
});
test("basic attacks, skills, guarding and consumables select actual different poses", () => {
  assert.equal(actionPose("attack"), "attack");
  assert.equal(actionPose("defend"), "guard");
  assert.equal(actionPose("potion"), "item");
  assert.equal(actionPose("ether"), "item");
  assert.equal(actionPose("skill", "w-cleave"), "power");
  assert.equal(actionPose("skill", "w-break"), "pierce");
  assert.equal(actionPose("skill", "w-stun"), "ritual");
  for (const skill of SKILLS)
    assert.ok(HERO_POSES.includes(actionPose("skill", skill.id)));
});
test("measured home and battle actors fit small, tall-phone and tablet widths", () => {
  for (const width of [280, 320, 360, 393, 480, 600])
    for (const height of [150, 190, 300, 450, 600]) {
      const home = homeLayout(width, height);
      assert.ok(home.heroSize + 2 * (home.rail + home.gutter) + 12 <= width);
      assert.ok(home.heroSize + 70 <= height);
      for (const boss of [false, true]) {
        const size = battlefieldActorSize(width, height, boss);
        assert.ok(size * 2 + 32 <= width);
        assert.ok(size + 52 <= height);
      }
    }
});
