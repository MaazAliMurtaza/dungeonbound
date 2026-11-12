// HTTPS acceptance checks. Credentials stay in process memory; only fixture IDs
// and pass labels are written. Cleanup the exact fixture accounts via admin SQL.
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {randomBytes, randomUUID} from 'node:crypto';
import {mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {newGame} from '../mobile/src/game.ts';
import {validateApiUrl} from '../mobile/src/api-url.ts';
const base=validateApiUrl(process.env.API_BASE_URL??'',true);
const directory=fileURLToPath(new URL('../artifacts/share/',import.meta.url));
mkdirSync(directory,{recursive:true});
const emails=[], sessions=[];
let checks=0;
const check=(condition,label)=>{assert.ok(condition,label); checks++; console.log(`PASS: ${label}`);};
async function request(path,method='GET',body,token){
  const response=await fetch(base+path,{method,signal:AbortSignal.timeout(60000),headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:response.status,data:await response.json().catch(()=>null)};
}
try{
  const health=await request('/health');
  check(health.status===200&&health.data?.status==='ok'&&health.data?.saveVersion===3,'HTTPS database-backed health and save format 3');
  const password=randomBytes(24).toString('hex');
  async function register(){
    const email=`release-check-${randomUUID()}@example.test`; emails.push(email);
    writeFileSync(directory+'hosted-fixtures.json',JSON.stringify({emails}));
    const result=await request('/auth/register','POST',{email,password});
    check(result.status===201,'registration with limited database role');
    sessions.push(result.data.refreshToken);return result.data;
  }
  const first=await register(),second=await register();
  check((await request('/auth/login','POST',{email:emails[0],password:randomBytes(24).toString('hex')})).status===401,'incorrect password rejected');
  check((await request('/save')).status===401,'unauthenticated save access denied');
  const login=await request('/auth/login','POST',{email:emails[0],password});
  check(login.status===200,'online login'); sessions.push(login.data.refreshToken);
  const progress=newGame('Warrior',42),timestamp=Date.now();
  check((await request('/save','PUT',{progress,clientUpdatedAt:timestamp},first.accessToken)).status===200,'new save accepted');
  check(isDeepStrictEqual((await request('/save','GET',undefined,first.accessToken)).data.progress,progress),'complete game save round trip');
  check((await request('/save','GET',undefined,second.accessToken)).data.progress===null,'per-account save isolation');
  check((await request('/save','PUT',{progress:{version:3},clientUpdatedAt:timestamp+1},first.accessToken)).status===400,'malformed save rejected');
  check((await request('/save','PUT',{progress:{...progress,accessToken:'fixture'},clientUpdatedAt:timestamp+1},first.accessToken)).status===400,'credential fields rejected from saves');
  check((await request('/save','PUT',{progress,clientUpdatedAt:timestamp+1,baseRevision:timestamp-1},first.accessToken)).status===409,'stale base revision rejected');
  const upgraded=structuredClone(progress); upgraded.hero.gold++; upgraded.hero.speed=24; upgraded.specialization='survival';
  upgraded.inventory.push({id:'release-check-seal',name:'Sovereign Seal',slot:'accessory',rarity:'Legendary',bonus:8,stat:'speed'});
  upgraded.equipment.accessory='release-check-seal';
  check((await request('/save','PUT',{progress:upgraded,clientUpdatedAt:timestamp+2,baseRevision:timestamp},first.accessToken)).status===200,'Legendary accessory, speed and mastery persisted');
  const loaded=(await request('/save','GET',undefined,first.accessToken)).data.progress;
  check(loaded.equipment.accessory==='release-check-seal'&&loaded.specialization==='survival','upgraded equipment round trip');
  const legacy=structuredClone(progress);legacy.version=2;delete legacy.hero.speed;delete legacy.equipment.accessory;delete legacy.specialization;
  check((await request('/save','PUT',{progress:legacy,clientUpdatedAt:timestamp+3,baseRevision:timestamp+2},first.accessToken)).status===409,'older app cannot downgrade save');
  check((await request('/leaderboard','POST',{alias:'Release Test Hunter'},first.accessToken)).status===200,'opt-in ranking publish');
  const board=await request('/leaderboard','GET',undefined,first.accessToken);
  check(board.status===200&&board.data.entries.some(r=>r.alias==='Release Test Hunter')&&board.data.entries.every(r=>!('email'in r)&&!('user_id'in r)),'ranking excludes account identity');
  check((await request('/leaderboard','DELETE',undefined,first.accessToken)).status===204,'ranking opt-out');
  const refreshed=await request('/auth/refresh','POST',{refreshToken:first.refreshToken});
  check(refreshed.status===200&&refreshed.data.refreshToken!==first.refreshToken,'refresh rotation');sessions.push(refreshed.data.refreshToken);
  check((await request('/auth/refresh','POST',{refreshToken:first.refreshToken})).status===401,'old refresh token rejected');
  check((await request('/save','GET',undefined,refreshed.data.accessToken)).status===200,'renewed access accepted');
  check((await request('/auth/logout','POST',{refreshToken:refreshed.data.refreshToken})).status===204,'logout accepted');
  check((await request('/save','GET',undefined,refreshed.data.accessToken)).status===401,'logout immediately revokes access');
  writeFileSync(directory+'hosted-verification.json',JSON.stringify({origin:base,checks,passed:true,checkedAt:new Date().toISOString()},null,2));
  console.log(`Hosted acceptance checks passed: ${checks}`);
}finally{
  for(const refreshToken of sessions)await request('/auth/logout','POST',{refreshToken}).catch(()=>{});
  console.log('Fixture sessions revoked; exact account IDs retained in ignored artifacts/share/hosted-fixtures.json for cleanup.');
}
