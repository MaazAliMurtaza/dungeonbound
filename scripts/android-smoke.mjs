// Historical prototype runner. Current game: use android-v2-smoke.mjs.
// Local emulator walkthrough. Credentials exist only in process memory.
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../server/package.json', import.meta.url));
require('dotenv').config({ path: root + 'server/.env', quiet: true });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adb = process.env.LOCALAPPDATA + '/Android/Sdk/platform-tools/adb.exe';
const appId = process.env.ANDROID_APP_ID || 'host.exp.exponent';
const heroClass = process.env.DUNGEONBOUND_HERO || 'Warrior';
if (!['Warrior', 'Ranger', 'Mage'].includes(heroClass)) throw new Error('Invalid walkthrough class');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function shell(...args) { return execFileSync(adb, ['shell', ...args], { encoding: 'utf8', timeout: 30000 }); }
function openApp() {
  shell('am', 'force-stop', appId);
  if (appId === 'host.exp.exponent') shell('am', 'start', '-a', 'android.intent.action.VIEW', '-d', 'exp://127.0.0.1:8082?__expo_disable_onboarding=1', appId);
  else shell('am', 'start', '-n', `${appId}/.MainActivity`);
}
function nodes() {
  // Continuous native animation prevents UIAutomator from reaching idle.
  // Pause motion only while taking a snapshot; restore it before the tap.
  shell('settings', 'put', 'global', 'transition_animation_scale', '0');
  let snapshot = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = shell('uiautomator', 'dump', '/sdcard/dungeonbound-ui.xml');
    if (result.includes('dumped to')) { snapshot = true; break; }
  }
  if (!snapshot) throw new Error('Android accessibility snapshot did not reach idle; stale snapshots ignored');
  const xml = shell('cat', '/sdcard/dungeonbound-ui.xml');
  return [...xml.matchAll(/<node\s+([^>]+)>?/g)].map(match => Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2].replaceAll('&amp;', '&').replaceAll('&apos;', "'")])));
}
function tapNode(node) {
  const [x1,y1,x2,y2] = node.bounds.match(/\d+/g).map(Number);
  shell('input', 'tap', String(Math.floor((x1+x2)/2)), String(Math.floor((y1+y2)/2)));
}
async function tap(label) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const list = nodes();
    const semantic = list.find(n => n['content-desc'] === label);
    const target = semantic ? (semantic.enabled !== 'false' ? semantic : null) : list.find(n => n.text === label && n.enabled !== 'false' && n.bounds !== '[0,0][0,0]');
    if (target) {
      shell('settings', 'put', 'global', 'transition_animation_scale', graphicsOnly ? '1' : originalTransition);
      await pause(150);
      tapNode(target); await pause(1200); return true;
    }
    const visible = text => list.some(n => n.text === text || n['content-desc'] === text);
    if ((['NEXT ROOM', 'ENTER DUNGEON'].includes(label) && visible('ATTACK')) ||
      (['ATTACK', 'SKILL (8 MP)', 'DEFEND', 'POTION (+40 HP)'].includes(label) && visible('NEXT ROOM'))) {
      console.log('WAIT: displayed room advanced before the cloud snapshot; reading state again');
      await pause(1200); return false;
    }
    shell('input', 'swipe', '270', attempt === 0 ? '320' : '1000', '270', attempt === 0 ? '1000' : '350', '350');
  }
  throw new Error(`UI control unavailable: ${label}`);
}
async function state(email) {
  const result = await pool.query('SELECT progress FROM saves JOIN users ON saves.user_id=users.id WHERE email=$1', [email]);
  return result.rows[0]?.progress;
}
const email = `android-${Date.now()}@example.test`;
const password = randomBytes(18).toString('hex');
const persistenceOnly = process.argv.includes('--persistence-only');
const graphicsOnly = process.argv.includes('--graphics-only');
const originalTransition = shell('settings', 'get', 'global', 'transition_animation_scale').trim();
let apiStopped = false;
function startApi() {
  const child = spawn(process.execPath, ['src/server.js'], { cwd: root + 'server', detached: true, windowsHide: true, stdio: 'ignore' });
  child.unref(); apiStopped = false;
}
function audit(signedOut = false) {
  console.log(execFileSync(process.execPath, [root + 'scripts/android-storage-audit.mjs', ...(signedOut ? ['--signed-out'] : [])], { encoding: 'utf8', timeout: 30000 }).trim());
}
try {
  openApp();
  await pause(6000);
  if (nodes().some(n => n.text === 'LOG OUT')) await tap('LOG OUT');
  if (!nodes().some(n => n.text === 'CREATE AN ADVENTURER ACCOUNT')) await tap('New player? Create account');
  const fields = nodes().filter(n => n.class === 'android.widget.EditText');
  if (fields.length !== 2) throw new Error('Expected two authentication fields');
  tapNode(fields[0]); shell('input', 'text', email);
  tapNode(fields[1]); shell('input', 'text', password); shell('input', 'keyevent', '4');
  await tap('CREATE ACCOUNT'); await pause(2000);
  await tap(`BEGIN AS ${heroClass.toUpperCase()}`);
  console.log(`PASS: Android registration and ${heroClass} selection (${appId})`);
  audit();
  let usedDefend = false, usedPotion = false, usedSkill = false, usedAttack = false, equipped = false, quest = false, victory = false;
  for (let step = 0; !persistenceOnly && step < 100; step++) {
    await pause(1200);
    const game = await state(email);
    if (!game) throw new Error('Android cloud save was not created');
    if (game.hero.hp <= 0) throw new Error('Character died during walkthrough');
    if (graphicsOnly && usedDefend && usedPotion && usedSkill && usedAttack) {
      for (let count = 0; count < 3; count++) shell('input', 'swipe', '270', '300', '270', '1050', '300');
      shell('input', 'swipe', '270', '1050', '270', '550', '400');
      mkdirSync(root + 'evidence', { recursive: true });
      shell('screencap', '-p', '/sdcard/dungeonbound-graphics.png');
      execFileSync(adb, ['pull', '/sdcard/dungeonbound-graphics.png', root + 'evidence/graphics-emulator.png']);
      console.log('PASS: graphics walkthrough exercised all four actions; screenshot captured');
      break;
    }
    if (game.ended) {
      victory = true;
      mkdirSync(root + 'evidence', { recursive: true });
      shell('screencap', '-p', '/sdcard/dungeonbound-victory.png');
      execFileSync(adb, ['pull', '/sdcard/dungeonbound-victory.png', root + `evidence/victory-${heroClass.toLowerCase()}.png`]);
      console.log(`PASS: Android ${heroClass} boss victory`); break;
    }
    if (!equipped && game.inventory.length) {
      await tap('INVENTORY'); await tap('EQUIP ITEM'); await tap('DUNGEON'); equipped = true;
      console.log('PASS: Android inventory equipment'); continue;
    }
    if (!quest && game.kills >= 3) {
      await tap('QUESTS'); await tap('CLAIM QUEST REWARD'); await tap('DUNGEON'); quest = true;
      console.log('PASS: Android quest reward'); continue;
    }
    if (!game.enemy) await tap(game.roomIndex < 0 ? 'ENTER DUNGEON' : 'NEXT ROOM');
    else if (!usedDefend) { if (!await tap('DEFEND')) continue; usedDefend = true; console.log('PASS: Android defend'); }
    else if ((!usedPotion || game.hero.hp < game.hero.maxHp * .45) && game.hero.potions) {
      if (!await tap('POTION (+40 HP)')) continue; usedPotion = true; console.log('PASS: Android potion');
    } else {
      const action = game.hero.mana >= 8 ? 'SKILL (8 MP)' : 'ATTACK';
      if (!await tap(action)) continue; console.log(`PASS: Android ${action}`);
      if (action === 'ATTACK') usedAttack = true; else usedSkill = true;
    }
  }
  if (!graphicsOnly) {
  if (!persistenceOnly && !victory) throw new Error('Walkthrough did not reach victory');
  if (!persistenceOnly) await tap('NEXT DUNGEON');
  await pause(2000);
  if (!process.env.DUNGEONBOUND_API_PID) throw new Error('Set DUNGEONBOUND_API_PID to the local project API PID for the offline test');
  process.kill(Number(process.env.DUNGEONBOUND_API_PID)); apiStopped = true;
  await tap('ENTER DUNGEON');
  await pause(17000);
  for (let count = 0; count < 3; count++) shell('input', 'swipe', '270', '1050', '270', '300', '300');
  if (!nodes().some(n => n.text?.includes('cloud sync pending'))) throw new Error('Expected offline pending save status');
  console.log('PASS: Android offline gameplay and pending save status');
  startApi();
  let synced = false;
  for (let attempt = 0; attempt < 20; attempt++) {
    await pause(2000);
    if ((await state(email))?.roomIndex === 0) { synced = true; break; }
  }
  if (!synced) throw new Error('Offline changes did not retry after reconnection');
  console.log('PASS: Android reconnect uploads pending progress without another game action');
  openApp();
  await pause(6000);
  await tap('CONTINUE ADVENTURE');
  await tap('NEXT ROOM');
  console.log('PASS: Android process restart restored session/progress');
  audit();
  // Simulate a newer save from another client without requiring a second phone.
  await pause(2000);
  const restored = await state(email);
  const cloudGold = restored.hero.gold + 11;
  restored.hero.gold = cloudGold;
  const currentRevision = await pool.query('SELECT client_updated_at FROM saves JOIN users ON saves.user_id=users.id WHERE email=$1', [email]);
  const cloudRevision = Math.max(Date.now(), Number(currentRevision.rows[0].client_updated_at)) + 10000;
  const injected = await pool.query(`UPDATE saves SET progress=$1::jsonb, client_updated_at=$2, updated_at=NOW()
    FROM users WHERE saves.user_id=users.id AND users.email=$3`, [JSON.stringify(restored), cloudRevision, email]);
  if (injected.rowCount !== 1) throw new Error('Cloud-conflict fixture did not update the disposable save');
  openApp(); await pause(6000);
  let cloudShown = false;
  for (let attempt = 0; attempt < 8; attempt++) {
    if (nodes().some(n => n.text === String(cloudGold))) { cloudShown = true; break; }
    await pause(1000);
  }
  if (!cloudShown) throw new Error('Newer cloud state was not restored in the native UI');
  await pause(1500);
  const revision = await pool.query('SELECT client_updated_at FROM saves JOIN users ON saves.user_id=users.id WHERE email=$1', [email]);
  if (Number(revision.rows[0]?.client_updated_at) !== cloudRevision) throw new Error('Hydration incorrectly created a new save revision');
  console.log('PASS: newer simulated cloud-client save restored; original revision preserved');
  }
  await tap('LOG OUT');
  console.log('PASS: Android logout UI');
  audit(true);
} finally {
  shell('settings', 'put', 'global', 'transition_animation_scale', originalTransition);
  if (apiStopped) startApi();
  execFileSync(adb, ['reverse', 'tcp:4000', 'tcp:4000']);
  await pool.query('DELETE FROM users WHERE email=$1', [email]);
  await pool.end();
}
