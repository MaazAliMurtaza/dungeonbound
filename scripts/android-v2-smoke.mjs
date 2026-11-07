// Native UI walkthrough for Eclipse Protocol. Disposable account; no tokens logged.
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(new URL('../server/package.json',import.meta.url));
require('dotenv').config({path:root+'server/.env',quiet:true});
const {Pool}=require('pg'),pool=new Pool({connectionString:process.env.DATABASE_URL});
const adb=process.env.LOCALAPPDATA+'/Android/Sdk/platform-tools/adb.exe',app='host.exp.exponent';
const email=`v2-native-${Date.now()}@example.test`,password=randomBytes(18).toString('hex');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function shell(...args){return execFileSync(adb,['shell',...args],{encoding:'utf8',timeout:35000});}
function nodes(){const result=shell('uiautomator','dump','/sdcard/dungeon-v2.xml');if(!result.includes('dumped to'))throw new Error('Fresh Android UI snapshot unavailable');const xml=shell('cat','/sdcard/dungeon-v2.xml');return [...xml.matchAll(/<node\s+([^>]+)>?/g)].map(m=>Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2].replaceAll('&amp;','&').replaceAll('&apos;',"'").replaceAll('&#10;','\n').replaceAll('&quot;','"')])));}
function click(n){const [x1,y1,x2,y2]=n.bounds.match(/\d+/g).map(Number);shell('input','tap',String(Math.floor((x1+x2)/2)),String(Math.floor((y1+y2)/2)));}
async function tap(label){for(let attempt=0;attempt<9;attempt++){const list=nodes(),match=n=>(n['content-desc']===label||n.text===label)&&n.enabled!=='false'&&n.bounds!=='[0,0][0,0]'&&(()=>{const b=n.bounds.match(/\d+/g).map(Number);return b[3]>b[1]&&b[2]>b[0];})();const node=list.find(n=>n['content-desc']===label&&match(n))??list.find(match);if(node){click(node);await pause(1200);return;}
 shell('input','swipe','240',attempt===0?'220':'630','240',attempt===0?'580':'390','450');await pause(250);
 }throw new Error('UI control unavailable: '+label);}
async function tapPrefix(prefix){for(let i=0;i<8;i++){const node=nodes().find(n=>(n['content-desc']||n.text).startsWith(prefix)&&n.enabled!=='false');if(node){await tap(node['content-desc']||node.text);return;}shell('input','swipe','240','630','240','390','450');}throw new Error('UI prefix unavailable: '+prefix);}
async function game(){return (await pool.query('SELECT progress FROM saves JOIN users ON users.id=saves.user_id WHERE email=$1',[email])).rows[0]?.progress;}
async function waitGame(predicate,label){for(let i=0;i<25;i++){const g=await game();if(g&&predicate(g))return g;await pause(800);}throw new Error(label);}
async function open(){shell('am','force-stop',app);shell('am','start','-a','android.intent.action.VIEW','-d','exp://127.0.0.1:8082?__expo_disable_onboarding=1',app);await pause(6500);}
function shot(name){shell('screencap','-p','/sdcard/dungeon-v2.png');execFileSync(adb,['pull','/sdcard/dungeon-v2.png',root+'evidence/'+name],{stdio:'ignore'});}
function audit(out=false){console.log(execFileSync(process.execPath,[root+'scripts/android-storage-audit.mjs',...(out?['--signed-out']:[])],{encoding:'utf8',timeout:35000}).trim());}
let apiStopped=false;
function startApi(){const child=spawn(process.execPath,['src/server.js'],{cwd:root+'server',detached:true,windowsHide:true,stdio:'ignore'});child.unref();apiStopped=false;}
try{
 await open();let list=nodes();if(list.some(n=>n.text==='LOG OUT'))await tap('LOG OUT');
 shot('redesign-login.png');await tap('New hunter? Create account');
 let fields=nodes().filter(n=>n.class==='android.widget.EditText');if(fields.length!==2)throw new Error('Expected native auth inputs');click(fields[0]);shell('input','text',email);shell('input','keyevent','61');shell('input','text',password);shell('input','keyevent','4');await tap('CREATE ACCOUNT');await tap('BEGIN AS WARRIOR');
 console.log('PASS: native registration and Warrior awakening');await waitGame(g=>g.version===2,'First save missing');
 await tap('SKILLS');await tap('LEARN · 45 GOLD');await waitGame(g=>g.skills.includes('w-aegis'),'Skill purchase missing');shot('redesign-skills.png');console.log('PASS: native skill shop purchase');await tap('GATE');
 let defended=false,potion=false,attacked=false,skill=false,ether=false;
 for(let i=0;i<75;i++){
 const g=await game();assert.ok(g.hero.hp>0,'Hunter died');
 if(g.ended){shot('redesign-victory.png');console.log('PASS: native eight-room guardian victory');break;}
 if(g.pendingChoice){await tap(g.pendingChoice==='relic'?'♨ Ember Heart · +4 attack.':'HELP THE HUNTER · +1 flask, +15 XP');continue;}
 if(!g.enemy){await tap(g.roomIndex<0?'ENTER DUNGEON':'NEXT ROOM');continue;}
 if(!defended){shot('redesign-battle.png');await tap('◈ DEFEND');defended=true;}
 else if((!potion||g.hero.hp<g.hero.maxHp*.45)&&g.hero.potions){await tapPrefix('♥ FLASK (');potion=true;}
 else if(!attacked){await tap('⚔ ATTACK');attacked=true;}
 else if(!ether){await tapPrefix('✦ ETHER (');ether=true;}
 else if(g.hero.mana>=8){await tap('⚔ Rift Cleave\n8 MP');skill=true;}
 else await tap('⚔ ATTACK');
 }
 assert.ok((await game()).ended,'No native boss victory');assert.ok(defended&&potion&&attacked&&skill&&ether,'Not all actions used');
 await tap('GUILD');await tap('CLAIM CONTRACT');await waitGame(g=>g.claimedQuests.length>0,'Quest reward missing');console.log('PASS: native contract reward');
 await tap('MARKET');await tap('BUY RIFTFORGED WEAPON · 65 GOLD');await waitGame(g=>g.inventory.some(i=>i.name==='Riftforged Weapon'),'Equipment purchase missing');shot('redesign-shop.png');console.log('PASS: native equipment purchase');
 await tap('GEAR');await tap('EQUIP ITEM');console.log('PASS: native equipment UI');audit();
 await tap('HUB');shot('redesign-hub.png');await open();await tap('CONTINUE ADVENTURE');console.log('PASS: native session and progress restart');
 // Block only the project API's forwarded port, leaving Metro reachable.
 execFileSync(adb,['reverse','--remove','tcp:4000']);await tap('ASCEND TO NEXT FLOOR');await open();await pause(12000);await tap('CONTINUE ADVENTURE');assert.ok(nodes().some(n=>(n.text||'').includes('Root of Ruin')),'Offline floor restoration missing');console.log('PASS: offline cold start restores account and adventure');
 const remote=await game();remote.hero.gold+=7;await pool.query('UPDATE saves SET progress=$1::jsonb, client_updated_at=$2 FROM users WHERE saves.user_id=users.id AND users.email=$3',[JSON.stringify(remote),Date.now()+1000,email]);
 execFileSync(adb,['reverse','tcp:4000','tcp:4000']);
 // Offline reconnect discovers remote divergence and must ask rather than overwrite.
 await pause(16000);let dialog=false;for(let i=0;i<8;i++){if(nodes().some(n=>n.text==='Two paths. Your choice.')){dialog=true;break;}await pause(2000);}
 assert.ok(dialog,'Expected explicit reconnect conflict');await tap('KEEP THIS ADVENTURE');await waitGame(g=>g.floor===2,'Conflict resolution did not upload local floor');console.log('PASS: native explicit conflict resolution preserves local adventure');
 await tap('HUB');await tap('MENU');await tap('LOG OUT');audit(true);console.log('PASS: native logout and SecureStore deletion');
}catch(e){try{shot('redesign-failure.png');}catch{}throw e;}
finally{if(apiStopped)startApi();execFileSync(adb,['reverse','tcp:4000','tcp:4000']);await pool.query('DELETE FROM users WHERE email=$1',[email]);await pool.end();}
