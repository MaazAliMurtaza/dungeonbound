import test from 'node:test';
import assert from 'node:assert/strict';
import { validProgress } from '../src/validators.js';
// Server tests do not require TypeScript or installed mobile dependencies.
const sample = {version:1,seed:42,hero:{className:'Warrior',level:1,xp:0,hp:100,maxHp:100,attack:16,defense:7,gold:0,potions:3,mana:18,maxMana:18},rooms:['start','combat','treasure','rest','combat','elite','event','boss'].map((kind,id)=>({kind,id,cleared:false})),roomIndex:-1,enemy:null,inventory:[],equipment:{weapon:null,armor:null},kills:0,bosses:0,dungeons:0,questClaimed:false,achievements:[],log:['Ready'],ended:false};
test('accepts complete legacy save and rejects corrupted nested payloads',()=>{
 assert.equal(validProgress(sample),true);
 for(const mutate of [g=>delete g.equipment,g=>g.rooms[0].kind='boss',g=>g.hero.hp=101,g=>g.inventory.push({id:'a'}),g=>g.log=Array(100).fill('x'),g=>g.enemy={name:'bad'},g=>g.hero.refreshToken='private',g=>g.roomIndex=8,g=>g.skills=null]){const g=structuredClone(sample);mutate(g);assert.equal(validProgress(g),false);}
});

const v2 = {...sample, version:2, floor:1, skills:['w-cleave'],cooldowns:{},ethers:2,shield:0,
 roomsCleared:0,lootFound:0,purchases:0,claimedQuests:[],relics:[],pendingChoice:null,campaignWins:0};
test('accepts existing version-two accounts without allowing new fields to bypass legacy validation',()=>{
 assert.equal(validProgress(v2),true);
 assert.equal(validProgress({...v2,specialization:'assault'}),false);
 assert.equal(validProgress({...v2,hero:{...v2.hero,speed:12}}),false);
});
test('validates version-three speed, mastery, Legendary gear and accessory references',()=>{
 const g={...structuredClone(v2),version:3,hero:{...v2.hero,speed:12},specialization:'survival',
  equipment:{weapon:null,armor:null,accessory:'seal'},
  inventory:[{id:'seal',name:'Sovereign Seal',slot:'accessory',rarity:'Legendary',bonus:8,stat:'speed'}]};
 assert.equal(validProgress(g),true);
 for(const mutate of [g=>delete g.hero.speed,g=>delete g.equipment.accessory,g=>g.specialization='both',
  g=>g.inventory[0].stat='token',g=>g.equipment.accessory='missing',g=>g.inventory[0].password='private']){
  const bad=structuredClone(g);mutate(bad);assert.equal(validProgress(bad),false);
 }
});
