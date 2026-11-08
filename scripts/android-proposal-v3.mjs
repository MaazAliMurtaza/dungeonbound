// Native proposal regression on emulator-5554. Never controls a physical phone.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { newGame, enterNextRoom, chooseRoomReward } from '../mobile/src/game.ts';
import { SKILLS } from '../mobile/src/content.ts';
import { validProgress } from '../server/src/validators.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../server/package.json', import.meta.url));
require('dotenv').config({path:root+'server/.env',quiet:true});
const {Pool}=require('pg'),pool=new Pool({connectionString:process.env.DATABASE_URL});
const adb=process.env.LOCALAPPDATA+'/Android/Sdk/platform-tools/adb.exe';
const origin=process.env.VISUAL_EXPO_ORIGIN||'192.168.1.7:8082';
const email=`proposal-v3-${Date.now()}@example.test`,password=randomBytes(20).toString('hex');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const shell=(...args)=>execFileSync(adb,['-s','emulator-5554','shell',...args],{encoding:'utf8',timeout:35000});
function nodes(){
  let lastError;
  for(let attempt=0;attempt<5;attempt++){
    try{
      const dump=shell('uiautomator','dump','/sdcard/visual-v3.xml');
      if(!dump.includes('dumped to'))throw new Error('Android returned no accessibility root');
      const xml=shell('cat','/sdcard/visual-v3.xml');return [...xml.matchAll(/<node\s+([^>]+)>?/g)].map(match=>Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2].replaceAll('&#10;','\n').replaceAll('&amp;','&').replaceAll('&apos;',"'")])));
    }catch(error){lastError=error;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,700);}
  }
  throw lastError;
}
const bounds=n=>n.bounds.match(/\d+/g).map(Number);
function click(node){const b=bounds(node);shell('input','tap',String(Math.round((b[0]+b[2])/2)),String(Math.round((b[1]+b[3])/2)));}
function find(list,label){return list.find(n=>(n['content-desc']===label||n.text===label||n['resource-id']?.endsWith(label))&&n.enabled!=='false'&&bounds(n)[3]>bounds(n)[1]);}
async function tap(label){for(let i=0;i<25;i++){const node=find(nodes(),label);if(node){click(node);await pause(1000);return;}shell('input','swipe','360',i===0?'320':'1270','360',i===0?'1200':'850','450');await pause(200);}throw new Error('Native visual control missing: '+label);}
function shot(name){shell('screencap','-p','/sdcard/visual-v3.png');execFileSync(adb,['-s','emulator-5554','pull','/sdcard/visual-v3.png',root+'evidence/'+name],{stdio:'ignore'});}
async function open(){
  if(origin.startsWith('127.0.0.1:')){
    const port=new URL('http://'+origin).port;
    execFileSync(adb,['-s','emulator-5554','reverse',`tcp:${port}`,`tcp:${port}`],{stdio:'ignore'});
    execFileSync(adb,['-s','emulator-5554','reverse','tcp:4001','tcp:4001'],{stdio:'ignore'});
  }
  shell('am','force-stop','host.exp.exponent');shell('am','start','-a','android.intent.action.VIEW','-d',`exp://${origin}?__expo_disable_onboarding=1`,'host.exp.exponent');await pause(6500);
}
async function saved(){return(await pool.query('SELECT saves.progress,saves.client_updated_at FROM saves JOIN users ON users.id=saves.user_id WHERE users.email=$1',[email])).rows[0];}
async function advance(label){
  const before=await saved();await tap(label);
  for(let i=0;i<120;i++){const row=await saved();if(Number(row.client_updated_at)>Number(before.client_updated_at))return;await pause(500);}
  throw new Error('Native action did not reach cloud save: '+label);
}
async function waitSave(predicate){for(let i=0;i<120;i++){const row=await saved();if(row&&predicate(row.progress))return row;await pause(500);}throw new Error('Expected native save did not arrive');}
function assertHome(list){
  assert.ok(!list.some(n=>/ECLIPSE\s*PROTOCOL/i.test(n.text??'')),'Old branding is absent');
  const title=find(list,'hunter-title'),outfit=find(list,'hunter-outfit-name'),button=find(list,'CONTINUE ADVENTURE');
  assert.ok(title&&outfit&&button,'Home title, outfit name, and primary action visible');
  const t=bounds(title),o=bounds(outfit),b=bounds(button);assert.ok(t[1]>=o[3],'Outfit and title do not overlap');assert.ok(t[3]<b[1],'Title is above the travel button');
  return {title:t,outfit:o,button:b};
}

const originalFont=shell('settings','get','system','font_scale').trim();
async function waitHome(){for(let i=0;i<60;i++){const list=nodes();if(find(list,'CONTINUE ADVENTURE')){assertHome(list);return;}await pause(500);}throw new Error('Native home did not finish rendering after restart');}
async function resetScroll(){shell('input','swipe','360','350','360','1400','400');await pause(300);}
try {
  shell('wm','size','720x1600');shell('wm','density','320');shell('settings','put','system','font_scale','1.3');
  await open();await tap('New hunter? Create account');
  const fields=nodes().filter(n=>n.class==='android.widget.EditText');assert.equal(fields.length,2);
  click(fields[0]);shell('input','text',email);shell('input','keyevent','61');shell('input','text',password);shell('input','keyevent','4');
  await tap('CREATE ACCOUNT');await tap('BEGIN AS WARRIOR');await waitSave(p=>p.version===3);await tap('HUB');
  console.log('PASS: new native account writes version-three save');
  // A disposable existing v2 hunter is loaded through normal app hydration.
  shell('am','force-stop','host.exp.exponent');
  let legacy=newGame('Warrior',42);legacy.version=2;delete legacy.hero.speed;delete legacy.equipment.accessory;delete legacy.specialization;
  legacy.hero.level=5;legacy.hero.gold=2000;legacy.hero.maxHp=legacy.hero.hp=1000;legacy.hero.mana=legacy.hero.maxMana=100;
  legacy.inventory.push({id:'preserved-armor',name:'Preserved Warden Plate',slot:'armor',rarity:'Rare',bonus:8});legacy.equipment.armor='preserved-armor';
  assert.ok(validProgress(legacy));let row=await saved();
  await pool.query('UPDATE saves SET progress=$1::jsonb,client_updated_at=$2 FROM users WHERE users.id=saves.user_id AND users.email=$3',[JSON.stringify(legacy),Math.max(Date.now(),Number(row.client_updated_at)+1),email]);
  console.log('CHECK: reopening the legacy fixture through normal hydration');
  await open();await waitSave(p=>p.version===3&&p.hero.gold===2000);
  let g=(await saved()).progress;assert.equal(g.equipment.armor,'preserved-armor');assert.equal(g.equipment.accessory,null);assert.equal(g.hero.speed,12);
  assertHome(nodes());console.log('PASS: native v2 cloud migration preserves gear, level and gold');
  await tap('SKILLS');
  let lockedNode;
  for(let scan=0;scan<12&&!lockedNode;scan++){
    lockedNode=nodes().find(n=>(n['resource-id']||'').endsWith('learn-w-stun'));
    if(!lockedNode){shell('input','swipe','360','1250','360','700','450');await pause(250);}
  }
  assert.ok(lockedNode&&lockedNode.enabled==='false','Child skill is locked before prerequisite');
  await tap('learn-w-aegis');await waitSave(p=>p.skills.includes('w-aegis'));
  await tap('learn-w-stun');await waitSave(p=>p.skills.includes('w-stun'));
  await resetScroll();shot('proposal-v3-skill-tree.png');
  await tap('mastery-assault');await waitSave(p=>p.specialization==='assault');
  const before=(await saved()).progress.hero.gold;
  await tap('mastery-survival');await waitSave(p=>p.specialization==='survival'&&p.hero.gold===before-25);
  shot('proposal-v3-mastery.png');console.log('PASS: native prerequisite learning and paid mastery switch');
  await tap('MARKET');await tap('buy-ash-talisman');await waitSave(p=>p.inventory.some(i=>i.name==='Ash Talisman'));
  await tap('buy-sunplate');await waitSave(p=>p.inventory.some(i=>i.rarity==='Legendary'));
  console.log('PASS: native accessory and Legendary purchases');
  await tap('GEAR');g=(await saved()).progress;
  const accessory=g.inventory.find(i=>i.name==='Ash Talisman'),armor=g.inventory.find(i=>i.rarity==='Legendary');
  await tap('equip-'+accessory.id);await waitSave(p=>p.equipment.accessory===accessory.id);
  await tap('equip-'+armor.id);await waitSave(p=>p.equipment.armor===armor.id);
  await resetScroll();shot('proposal-v3-equipment.png');
  await tap('HUB');assertHome(nodes());assert.ok(nodes().some(n=>(n['resource-id']||'').includes('hero-warrior-legendary-idle')));
  shot('proposal-v3-legendary-home.png');console.log('PASS: native accessory/Legendary equip and visible Legendary appearance');
  await open();await waitHome();await waitSave(p=>p.specialization==='survival'&&p.equipment.accessory===accessory.id);
  assertHome(nodes());console.log('PASS: session restart restores new equipment and mastery');
  await tap('CONTINUE ADVENTURE');let photographed=false,guarded=false;
  for(let turn=0;turn<90;turn++) {
    g=(await saved()).progress;assert.ok(g.hero.hp>0);
    if(g.ended)break;
    if(g.pendingChoice){await advance(g.pendingChoice==='relic'?"\u2668 Ember Heart \u00b7 +4 attack.":'HELP THE HUNTER \u00b7 +1 flask, +15 XP');continue;}
    if(!g.enemy){await advance(g.roomIndex<0?'ENTER DUNGEON':'NEXT ROOM');continue;}
    if(!photographed){shot('proposal-v3-battle.png');photographed=true;}
    if(!guarded){await advance('\u25c8 DEFEND');guarded=true;}
    else if(g.hero.mana>=8)await advance('\u2694 Rift Cleave\n8 MP');
    else await advance('\u2694 ATTACK');
  }
  g=(await saved()).progress;assert.ok(g.ended&&g.bosses===1);assert.ok(g.achievements.includes('First Dungeon'));
  shot('proposal-v3-victory.png');console.log('PASS: native eight-room guardian clear and First Dungeon achievement');
  await tap('HUB');await tap('MENU');await tap('LOG OUT');console.log('PASS: native fixture logout');
} catch(error) {
  try{shot('proposal-v3-failure.png');}catch{}
  throw error;
} finally {
  shell('wm','size','480x800');shell('wm','density','160');shell('settings','put','system','font_scale',originalFont);
  await pool.query('DELETE FROM users WHERE email=$1',[email]);await pool.end();
}
