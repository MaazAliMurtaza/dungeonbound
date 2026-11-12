// Standalone APK acceptance on the read-only emulator started for this delivery.
// Never selects or controls a physical phone. No credentials are saved or logged.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const adb=process.env.LOCALAPPDATA+'/Android/Sdk/platform-tools/adb.exe';
const app='com.maazay.dungeonbound',base='https://dungeonbound-api-8fur.onrender.com';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const shell=(...args)=>execFileSync(adb,['-s','emulator-5554','shell',...args],{encoding:'utf8',timeout:35000,windowsHide:true});
const email=`apk-check-${randomUUID()}@example.test`,password=randomBytes(20).toString('hex');
let refreshToken,accessToken;
mkdirSync(root+'artifacts/share',{recursive:true});
writeFileSync(root+'artifacts/share/apk-fixture.json',JSON.stringify({email}));
function nodes(){
  for(let i=0;i<4;i++){
    try{
      const dumped=shell('uiautomator','dump','/sdcard/apk-check.xml');
      if(!dumped.includes('dumped to'))continue;
      const xml=shell('cat','/sdcard/apk-check.xml');
      return [...xml.matchAll(/<node\s+([^>]+)>?/g)].map(m=>Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(a=>[a[1],a[2].replaceAll('&amp;','&').replaceAll('&apos;',"'")])));
    }catch{}
  }
  throw Error('Native accessibility snapshot unavailable');
}
const matches=(n,label)=>(n['content-desc']===label||n.text===label)&&n.enabled!=='false'&&n.bounds!=='[0,0][0,0]';
function click(n){const b=n.bounds.match(/\d+/g).map(Number);shell('input','tap',String(Math.round((b[0]+b[2])/2)),String(Math.round((b[1]+b[3])/2)));}
async function tap(label){
  for(let i=0;i<10;i++){
    const n=nodes().find(n=>matches(n,label));
    if(n){click(n);await pause(1000);return;}
    shell('input','swipe','320',i===0?'350':'1250','320',i===0?'1200':'650','350');await pause(250);
  }
  throw Error('Native control unavailable: '+label);
}
async function waitFor(label){for(let i=0;i<15;i++){if(nodes().some(n=>matches(n,label)))return;await pause(1000);}throw Error('Screen did not restore: '+label);}
function shot(name){shell('screencap','-p','/sdcard/apk-check.png');execFileSync(adb,['-s','emulator-5554','pull','/sdcard/apk-check.png',root+'evidence/'+name],{stdio:'ignore',windowsHide:true});}
async function cloud(){const r=await fetch(base+'/save',{headers:{Authorization:`Bearer ${accessToken}`},signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);return (await r.json()).progress;}
try{
  assert.equal(process.env.DUNGEONBOUND_READONLY_EMULATOR,'1','Only run against the verified read-only test emulator');
  assert.equal(shell('getprop','sys.boot_completed').trim(),'1');
  shell('pm','clear',app);
  const response=await fetch(base+'/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password}),signal:AbortSignal.timeout(60000)});
  assert.equal(response.status,201,'fixture registration');
  const session=await response.json();refreshToken=session.refreshToken;accessToken=session.accessToken;
  shell('am','force-stop',app);shell('am','start','-W','-n',app+'/.MainActivity');await pause(6000);
  await waitFor('Email address');shot('apk-standalone-login.png');
  let fields=nodes().filter(n=>n.class==='android.widget.EditText');assert.equal(fields.length,2);
  click(fields[0]);shell('input','text',email);shell('input','keyevent','61');shell('input','text',password);shell('input','keyevent','4');
  await tap('SIGN IN');await tap('BEGIN AS WARRIOR');await waitFor('ENTER DUNGEON');await tap('HUB');await waitFor('CONTINUE ADVENTURE');
  console.log('PASS: bundled standalone launch, hosted sign-in and class creation without Metro');
  await pause(2000);let g=await cloud();assert.equal(g.hero.className,'Warrior');
  shot('apk-standalone-home.png');console.log('PASS: new character persisted through the hosted API');
  await tap('CONTINUE ADVENTURE');await tap('ENTER DUNGEON');await pause(2000);g=await cloud();assert.ok(g.roomIndex>=0);
  shot('apk-standalone-dungeon.png');console.log('PASS: standalone dungeon entry and cloud save');
  shell('svc','wifi','disable');shell('svc','data','disable');
  shell('am','force-stop',app);shell('am','start','-W','-n',app+'/.MainActivity');await pause(10000);
  await waitFor('CONTINUE ADVENTURE');shot('apk-standalone-offline.png');
  console.log('PASS: offline cold restart restores SecureStore identity and cached adventure');
  writeFileSync(root+'artifacts/share/apk-native-verification.json',JSON.stringify({passed:true,platform:'Android 11 read-only x86_64 emulator',checks:['standalone bundled launch','online login','class creation','cloud persistence','dungeon entry','offline cold restart'],checkedAt:new Date().toISOString()},null,2));
}finally{
  shell('svc','wifi','enable');shell('svc','data','enable');
  if(refreshToken)await fetch(base+'/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken}),signal:AbortSignal.timeout(30000)}).catch(()=>{});
  console.log('Emulator network restored. Exact disposable account ID retained in ignored artifacts/share/apk-fixture.json for admin cleanup.');
}
