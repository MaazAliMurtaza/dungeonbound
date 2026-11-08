// Isolated visual regression on emulator-5554. Never controls a physical phone.
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
const polish=process.env.VISUAL_POLISH==='1';
const email=`visual-v3-${Date.now()}@example.test`,password=randomBytes(20).toString('hex');
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
async function tap(label){for(let i=0;i<12;i++){const node=find(nodes(),label);if(node){click(node);await pause(1000);return;}shell('input','swipe','360',i===0?'320':'1270','360',i===0?'1200':'850','450');await pause(200);}throw new Error('Native visual control missing: '+label);}
function shot(name){shell('screencap','-p','/sdcard/visual-v3.png');execFileSync(adb,['-s','emulator-5554','pull','/sdcard/visual-v3.png',root+'evidence/'+name],{stdio:'ignore'});}
async function open(){shell('am','force-stop','host.exp.exponent');shell('am','start','-a','android.intent.action.VIEW','-d',`exp://${origin}?__expo_disable_onboarding=1`,'host.exp.exponent');await pause(6500);}
async function saved(){return(await pool.query('SELECT saves.progress,saves.client_updated_at FROM saves JOIN users ON users.id=saves.user_id WHERE users.email=$1',[email])).rows[0];}
async function waitSave(predicate){for(let i=0;i<120;i++){const row=await saved();if(row&&predicate(row.progress))return row;await pause(500);}throw new Error('Expected native save did not arrive');}
function assertHome(list){
  assert.ok(!list.some(n=>/ECLIPSE\s*PROTOCOL/i.test(n.text??'')),'Old branding is absent');
  const title=find(list,'hunter-title'),outfit=find(list,'hunter-outfit-name'),button=find(list,'CONTINUE ADVENTURE');
  assert.ok(title&&outfit&&button,'Home title, outfit name, and primary action visible');
  const t=bounds(title),o=bounds(outfit),b=bounds(button);assert.ok(t[1]>=o[3],'Outfit and title do not overlap');assert.ok(t[3]<b[1],'Title is above the travel button');
  return {title:t,outfit:o,button:b};
}
async function inject(cls){shell('am','force-stop','host.exp.exponent');let g=newGame(cls,42);g.hero.level=4;g.hero.gold=1000;g.hero.maxHp=g.hero.hp=1000;g.hero.mana=g.hero.maxMana=100;g.skills=SKILLS.filter(s=>s.className===cls).map(s=>s.id);for(const [i,rarity]of ['Common','Rare','Epic','Legendary'].entries())g.inventory.push({id:`visual-${rarity.toLowerCase()}`,name:`${rarity} Hunter Armor`,slot:'armor',bonus:2+i*3,rarity});if(polish){g.inventory.push({id:'visual-weapon',name:'Dawnsunder',slot:'weapon',bonus:10,rarity:'Legendary'});g.equipment.weapon='visual-weapon';}assert.ok(validProgress(g));const previous=await saved(),revision=Math.max(Date.now(),Number(previous.client_updated_at)+1);await pool.query('UPDATE saves SET progress=$1::jsonb, client_updated_at=$2, updated_at=NOW() FROM users WHERE users.id=saves.user_id AND users.email=$3',[JSON.stringify(g),revision,email]);await open();await waitSave(p=>p.hero.className===cls);for(let i=0;i<60;i++){if(find(nodes(),'CONTINUE ADVENTURE'))return;await pause(500);}throw new Error('Home hydration did not complete');}
async function captureAction(label,name){const list=nodes(),node=find(list,label)??list.find(n=>(n['content-desc']||'').startsWith(label)&&n.enabled!=='false');assert.ok(node,'Combat action exists: '+label);const b=bounds(node),x=Math.round((b[0]+b[2])/2),y=Math.round((b[1]+b[3])/2);shell(`input tap ${x} ${y}; sleep 0.10; screencap -p /sdcard/action-v3.png`);execFileSync(adb,['-s','emulator-5554','pull','/sdcard/action-v3.png',root+'evidence/'+name],{stdio:'ignore'});await pause(1000);}
const originalFont=shell('settings','get','system','font_scale').trim();
try{
  shell('wm','size','720x1600');shell('wm','density','320');shell('settings','put','system','font_scale','1.3');
  await open();await tap('New hunter? Create account');const fields=nodes().filter(n=>n.class==='android.widget.EditText');assert.equal(fields.length,2);click(fields[0]);shell('input','text',email);shell('input','keyevent','61');shell('input','text',password);shell('input','keyevent','4');await tap('CREATE ACCOUNT');await tap('BEGIN AS WARRIOR');await waitSave(p=>p.version===3);await tap('HUB');
  for(const cls of (process.env.VISUAL_CLASSES||'Warrior,Ranger,Mage').split(',')){
    await inject(cls);assertHome(nodes());shot(`phone-v3-${cls.toLowerCase()}-starter.png`);
    for(const rarity of (polish?['legendary']:['common','rare','epic','legendary'])){await tap('GEAR');await tap('equip-visual-'+rarity);await waitSave(p=>p.equipment.armor==='visual-'+rarity);await tap('HUB');const list=nodes();assertHome(list);assert.ok(list.some(n=>(n['resource-id']||'').includes(`hero-${cls.toLowerCase()}-${rarity}-idle`)),`${cls} ${rarity} model is rendered`);shot(`phone-v3-${cls.toLowerCase()}-${rarity}.png`);}
    console.log(`PASS: ${cls} ${polish?"starter/Legendary and separate Dawnsunder weapon":"starter/Common/Rare/Epic/Legendary models"} through native equip controls`);
    if(polish)continue;
    shell('am','force-stop','host.exp.exponent');let row=await saved(),g=row.progress;while(!g.enemy)g=g.pendingChoice?chooseRoomReward(g,g.pendingChoice==='relic'?'ember':'safe'):enterNextRoom(g);g.enemy.hp=g.enemy.maxHp=100000;g.enemy.attack=1;const revision=Math.max(Date.now(),Number(row.client_updated_at)+1);await pool.query('UPDATE saves SET progress=$1::jsonb,client_updated_at=$2 FROM users WHERE users.id=saves.user_id AND users.email=$3',[JSON.stringify(g),revision,email]);await open();await tap('CONTINUE ADVENTURE');
    await captureAction('⚔ ATTACK',`phone-v3-${cls.toLowerCase()}-attack.png`);const skill=SKILLS.find(s=>s.className===cls);await captureAction(`${skill.icon} ${skill.name}`,`phone-v3-${cls.toLowerCase()}-skill.png`);await captureAction('◈ DEFEND',`phone-v3-${cls.toLowerCase()}-guard.png`);console.log(`PASS: ${cls} native attack, skill and guard captures`);await tap('HUB');
  }
  for(const [size,density,name]of [['640x1136','320','compact'],['786x1746','320','large-tall']]){shell('wm','size',size);shell('wm','density',density);await pause(1700);assertHome(nodes());shot(`phone-v3-home-${name}.png`);console.log(`PASS: native ${name} viewport with enlarged text`);}
  await tap('MENU');await tap('LOG OUT');console.log('PASS: visual fixture logout');
}catch(error){try{shot('phone-v3-failure.png');}catch{}throw error;}
finally{shell('wm','size','480x800');shell('wm','density','160');shell('settings','put','system','font_scale',originalFont);await pool.query('DELETE FROM users WHERE email=$1',[email]);await pool.end();}
