// Targeted native regression: two diverged startup saves; fixtures are not two real devices.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {newGame} from '../mobile/src/game.ts';
const root=fileURLToPath(new URL('../',import.meta.url));
const serverRequire=createRequire(new URL('../server/package.json',import.meta.url));
const mobileRequire=createRequire(new URL('../mobile/package.json',import.meta.url));
serverRequire('dotenv').config({path:root+'server/.env',quiet:true});
const {Pool}=serverRequire('pg'),pool=new Pool({connectionString:process.env.DATABASE_URL}),WebSocket=mobileRequire('ws');
const adb=process.env.LOCALAPPDATA+'/Android/Sdk/platform-tools/adb.exe',base='http://127.0.0.1:4000';
const email=`startup-fixture-${Date.now()}@example.test`,password=randomBytes(20).toString('hex');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function shell(...args){return execFileSync(adb,['shell',...args],{encoding:'utf8',timeout:30000});}
async function open(){shell('am','force-stop','host.exp.exponent');shell('am','start','-a','android.intent.action.VIEW','-d','exp://127.0.0.1:8082?__expo_disable_onboarding=1','host.exp.exponent');await sleep(6500);}
async function native(expression){
 const targets=await(await fetch('http://127.0.0.1:8082/json/list')).json(),matches=targets.filter(t=>t.appId==='host.exp.exponent');assert.equal(matches.length,1,'One native test target required');
 const ws=new WebSocket(matches[0].webSocketDebuggerUrl.replace('ws://localhost:','ws://127.0.0.1:'),{origin:'http://127.0.0.1:8082'});await new Promise((ok,no)=>{ws.onopen=ok;ws.onerror=no;});let sequence=0;
 function evaluate(expression){return new Promise((ok,no)=>{const id=++sequence,timer=setTimeout(()=>no(new Error('Native regression evaluation timed out')),15000);ws.onmessage=e=>{const r=JSON.parse(e.data);if(r.id===id){clearTimeout(timer);if(r.error||r.result?.exceptionDetails)no(new Error('Native regression expression failed'));else ok(r.result?.result?.value);}};ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true}}));});}
 try{await evaluate('delete globalThis.__dungeonStartupCheck');await evaluate(`(async()=>{${expression}})().then(value=>{globalThis.__dungeonStartupCheck={done:true,value};},()=>{globalThis.__dungeonStartupCheck={done:true,error:true};})`);for(let i=0;i<30;i++){await sleep(150);const r=await evaluate('globalThis.__dungeonStartupCheck');if(r?.done){assert.ok(!r.error,'Native regression rejected');return r.value;}}throw new Error('Native regression did not finish');}finally{ws.close();}
}
const findModules=`const modules=Array.from(__r.getModules().entries());const auth=__r(modules.find(([,m])=>(m.verboseName||'').replaceAll('\\\\','/').endsWith('src/auth.ts'))[0]);const cache=__r(modules.find(([,m])=>/async-storage.*AsyncStorage\\.native/.test(m.verboseName||''))[0]).default;`;
let userId;
try{
 const res=await fetch(base+'/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});assert.equal(res.status,201,'Native regression account creation');const tokens=await res.json();userId=tokens.user.id;
 const local=newGame('Warrior',11),cloud=newGame('Warrior',22);local.hero.gold=777;cloud.hero.gold=333;const known=Date.now()-10000,localTime=known+2000,cloudTime=known+4000;
 const saved=await fetch(base+'/save',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tokens.accessToken},body:JSON.stringify({progress:cloud,clientUpdatedAt:cloudTime})});assert.equal(saved.status,200);
 await open();await native(findModules+`await auth.storeTokens(${JSON.stringify(tokens)});await cache.setItem('dungeonbound_progress_${userId}',${JSON.stringify(JSON.stringify({savedAt:localTime,progress:local}))});await cache.setItem('dungeonbound_cloud_revision_${userId}','${known}');return true;`);
 await open();let xml='';for(let attempt=0;attempt<12;attempt++){const dump=shell('uiautomator','dump','/sdcard/startup-check.xml');if(dump.includes('dumped to'))xml=shell('cat','/sdcard/startup-check.xml');if(xml.includes('Two paths. Your choice.'))break;await sleep(500);}assert.ok(xml.includes('Two paths. Your choice.'),'Startup must ask before dropping unsent progress');
 assert.equal(await native(findModules+`return JSON.parse(await cache.getItem('dungeonbound_progress_${userId}')).progress.hero.gold===777;`),true);
 console.log('PASS: native online startup preserves unsent local save and asks about newer cloud state');
 const nodes=[...xml.matchAll(/<node\s+([^>]+)>?/g)].map(m=>Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]))),button=nodes.find(n=>n['content-desc']==='LOAD CLOUD ADVENTURE');assert.ok(button);const b=button.bounds.match(/\d+/g).map(Number);shell('input','tap',String((b[0]+b[2])/2),String((b[1]+b[3])/2));await sleep(2000);
 assert.equal(await native(findModules+`const backup=JSON.parse(await cache.getItem('dungeonbound_progress_${userId}_conflict'));const current=JSON.parse(await cache.getItem('dungeonbound_progress_${userId}'));return current.progress.hero.gold===333&&backup.local.progress.hero.gold===777&&backup.cloud.progress.hero.gold===333;`),true);
 console.log('PASS: native cloud choice restores cloud progress and retains both conflict backups');
 await native(findModules+`await auth.signOut();await cache.multiRemove(['dungeonbound_progress_${userId}','dungeonbound_progress_${userId}_conflict','dungeonbound_cloud_revision_${userId}']);return true;`);await open();console.log('PASS: native regression fixture logged out and local fixture data removed');
}finally{await pool.query('DELETE FROM users WHERE email=$1',[email]);await pool.end();}
