import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, migrateGame, isGame, combatAction, enterNextRoom, buyItem, equipItem,
  sellItem, effectiveStat, effectiveSpeed, evasionChance, chooseSpecialization, skillLockReason,
  claimQuest } from '../src/game.ts';
import { SKILLS, SKILL_PATHS } from '../src/content.ts';
import { EQUIPMENT_CATALOG, ITEM_CATALOG } from '../src/items.ts';

function encounter(cls='Warrior', seed=0) {
  const g=newGame(cls,seed);
  g.roomIndex=1; g.rooms[1].kind='combat';
  g.enemy={name:'Goblin',hp:1000,maxHp:1000,attack:20,defense:5,boss:false,elite:false,intent:'strike',turn:0,poison:0,burn:0};
  g.log=[];
  return g;
}
function oldSave(cls='Warrior') {
  const g=newGame(cls,42); g.version=2;
  delete g.hero.speed; delete g.equipment.accessory; delete g.specialization;
  return g;
}
test('version-two upgrades preserve class, owned skills, equipment, campaign and currency',()=>{
  for(const cls of ['Warrior','Ranger','Mage']) {
    const old=oldSave(cls); old.hero.gold=1234; old.floor=4;
    old.skills=SKILLS.filter(s=>s.className===cls).map(s=>s.id);
    old.inventory.push({id:'existing',name:'Previous armor',slot:'armor',rarity:'Epic',bonus:17});
    old.equipment.armor='existing'; const before=structuredClone(old),g=migrateGame(old);
    assert.ok(isGame(g)); assert.equal(g.version,3); assert.equal(g.floor,4);
    assert.equal(g.hero.gold,1234); assert.deepEqual(g.skills,old.skills);
    assert.deepEqual(g.inventory,old.inventory); assert.equal(g.equipment.armor,'existing');
    assert.equal(g.equipment.accessory,null); assert.equal(g.specialization,null);
    assert.deepEqual(old,before); assert.deepEqual(migrateGame(g),g);
  }
  assert.equal(migrateGame({...oldSave(),specialization:'assault'}),null);
  assert.equal(migrateGame({...oldSave(),hero:{...oldSave().hero,speed:999}}),null);
});
test('catalog contains twenty distinct obtainable types without counting relics or tomes',()=>{
  assert.equal(ITEM_CATALOG.length,20); assert.equal(new Set(ITEM_CATALOG.map(i=>i.id)).size,20);
  assert.equal(new Set(ITEM_CATALOG.map(i=>i.name)).size,20);
  assert.equal(EQUIPMENT_CATALOG.filter(i=>i.slot==='accessory').length,6);
  assert.equal(EQUIPMENT_CATALOG.filter(i=>i.rarity==='Legendary').length,3);
});
test('tree prerequisites are enforced through both the learn and shop transaction paths',()=>{
  for(const cls of ['Warrior','Ranger','Mage']) {
    let g=newGame(cls,1); g.hero.gold=5000;g.hero.level=5;
    for(const skill of SKILLS.filter(s=>s.className===cls&&SKILL_PATHS[s.id].requires.length)) {
      const parent=SKILL_PATHS[skill.id].requires[0];
      const missing=structuredClone(g); missing.skills=missing.skills.filter(id=>id!==parent);
      // Keep the root; test a second-tier node when its parent is non-root.
      if(parent!==g.skills[0]) {
        assert.match(skillLockReason(missing,skill.id),/^Requires /);
        assert.deepEqual(buyItem(missing,skill.id),missing);
      }
      if(!g.skills.includes(parent)) g=buyItem(g,parent);
      assert.equal(skillLockReason(g,skill.id),null);
      const before=g.hero.gold;g=buyItem(g,skill.id);
      assert.ok(g.skills.includes(skill.id));assert.equal(g.hero.gold,before-skill.price);
      assert.deepEqual(buyItem(g,skill.id),g);
    }
    assert.ok(isGame(g)); assert.equal(g.skills.length,5);
  }
});
test('mastery has one active choice, applies actual combat effects and charges only for switching',()=>{
  const base=encounter();base.hero.level=3;
  const assault=chooseSpecialization({...base,enemy:null},'assault');
  assert.equal(assault.hero.gold,base.hero.gold);assert.equal(assault.specialization,'assault');
  assert.equal(chooseSpecialization(assault,'survival').hero.gold,base.hero.gold-25);
  assert.deepEqual(chooseSpecialization(base,'assault'),base);
  assert.deepEqual(chooseSpecialization(newGame('Warrior',1),'assault'),newGame('Warrior',1));
  const ordinary=combatAction(base,'attack');
  const aggressive=combatAction({...base,specialization:'assault'},'attack');
  const defensive=combatAction({...base,specialization:'survival'},'attack');
  assert.ok(aggressive.enemy.hp<ordinary.enemy.hp);
  assert.ok(defensive.hero.hp>ordinary.hero.hp);
});
test('accessories occupy their own slot and apply only their specified stat without stacking',()=>{
  let g=newGame('Ranger',1);g.hero.gold=2000;g.hero.level=5;
  g=buyItem(g,'wind-ring');const ring=g.inventory.at(-1);
  g=equipItem(g,ring.id);assert.equal(effectiveSpeed(g),24);
  assert.equal(effectiveStat(g,'weapon'),22);assert.equal(effectiveStat(g,'armor'),5);
  g=equipItem(g,ring.id);assert.equal(effectiveSpeed(g),24);
  assert.deepEqual(sellItem(g,ring.id),g);
  g=buyItem(g,'moon-pendant');g=equipItem(g,g.inventory.at(-1).id);
  assert.equal(effectiveSpeed(g),20);assert.equal(effectiveStat(g,'weapon'),26);
  assert.equal(g.inventory.length,2);assert.ok(isGame(g));
});
test('Legendary shop purchases honor levels, persist and unlock the proposal achievement',()=>{
  let g=newGame('Mage',1);g.hero.gold=5000;
  assert.deepEqual(buyItem(g,'sunplate'),g);g.hero.level=5;
  g=buyItem(g,'sunplate');const item=g.inventory.at(-1);
  assert.equal(item.rarity,'Legendary');g=equipItem(g,item.id);
  assert.equal(g.equipment.armor,item.id);assert.ok(g.achievements.includes('Legendary Hunter'));
  assert.ok(isGame(JSON.parse(JSON.stringify(g))));
});
test('strict saves reject malformed accessories, missing speed, invalid mastery and injected credentials',()=>{
  const base=newGame('Ranger',42);
  for(const mutate of [g=>delete g.hero.speed,g=>g.hero.speed=-1,g=>delete g.equipment.accessory,
    g=>g.specialization='both',g=>g.hero.token='private',
    g=>g.inventory.push({id:'a',name:'Bad ring',slot:'accessory',rarity:'Legendary',bonus:4}),
    g=>g.inventory.push({id:'a',name:'Bad ring',slot:'accessory',rarity:'Legendary',bonus:4,stat:'gold'}),
    g=>g.inventory.push({id:'a',name:'Bad sword',slot:'weapon',rarity:'Epic',bonus:4,stat:'speed'}),
    g=>g.equipment.accessory='missing']) {
    const g=structuredClone(base);mutate(g);assert.equal(isGame(g),false);
  }
});
test('known attack, critical, armor-piercing and defend formulas produce exact outcomes',()=>{
  const normal=combatAction(encounter('Warrior',0),'attack');
  assert.equal(normal.enemy.hp,987);assert.equal(normal.hero.hp,117);
  const critical=combatAction(encounter('Warrior',2000),'attack');assert.equal(critical.enemy.hp,977);
  const ranger=combatAction(encounter('Ranger',0),'attack');assert.equal(ranger.enemy.hp,970);
  const guard=combatAction(encounter('Warrior',0),'defend');assert.equal(guard.hero.hp,127);
  const g=encounter();g.skills.push('w-break');
  const pierce=combatAction(g,'skill','w-break');assert.equal(pierce.enemy.hp,968);assert.equal(pierce.enemy.defense,2);
});
test('configured critical chances and speed-based evasion hold over deterministic seed samples',()=>{
  for(const [cls,chance] of [['Warrior',.12],['Ranger',.3],['Mage',.12]]) {
    let criticals=0,evades=0;
    for(let i=0;i<10000;i++) {
      const g=encounter(cls,Math.imul(i,2654435761)>>>0),after=combatAction(g,'attack');
      if(after.log.includes('CRITICAL HIT!'))criticals++;
      if(after.log.some(x=>x.startsWith('SWIFT EVADE')))evades++;
    }
    assert.ok(Math.abs(criticals/10000-chance)<.01,`${cls}: ${criticals}`);
    if(cls==='Ranger')assert.ok(evades>650&&evades<950,`Ranger evades: ${evades}`);
    else assert.equal(evades,0);
  }
  const fast=encounter('Ranger');fast.hero.speed=100;
  assert.equal(evasionChance(fast),.25);
});
test('real treasure generation reaches every catalog equipment type with configured rarity frequencies',()=>{
  const counts={Common:0,Rare:0,Epic:0,Legendary:0},seen=new Set();
  for(const cls of ['Warrior','Ranger','Mage'])for(let i=0;i<4000;i++) {
    const g=newGame(cls,Math.imul(i,2654435761)>>>0);g.roomIndex=0;g.rooms[1].kind='treasure';
    const after=enterNextRoom(g),item=after.inventory[0];counts[item.rarity]++;seen.add(item.name);
    assert.ok(item.bonus>0);assert.ok(isGame(after));
    if(item.slot==='accessory')assert.ok(['attack','defense','speed'].includes(item.stat));
  }
  for(const template of EQUIPMENT_CATALOG)assert.ok(seen.has(template.name),template.name);
  for(const [rarity,expected]of Object.entries({Common:.5,Rare:.41,Epic:.075,Legendary:.015}))
    assert.ok(Math.abs(counts[rarity]/12000-expected)<.015,JSON.stringify(counts));
});
test('proposal milestones award once and level-ten quest rewards update achievements immediately',()=>{
  let g=newGame('Warrior',1);g.hero.level=9;g.hero.xp=9*55-1;g.kills=100;g.dungeons=1;
  g=claimQuest(g,'hunter');assert.ok(g.achievements.includes('Level 10'));
  assert.ok(g.achievements.includes('100 Enemies Defeated'));assert.ok(g.achievements.includes('First Dungeon'));
  assert.deepEqual(claimQuest(g,'hunter'),g);
  assert.equal(new Set(g.achievements).size,g.achievements.length);
});
