// Forward only local services over an authorized Android USB debugging link.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const adb = path.join(process.env.LOCALAPPDATA || '', 'Android/Sdk/platform-tools/adb.exe');
function adbCall(args) { return execFileSync(adb, args, { encoding: 'utf8', timeout: 20000 }); }
const rows = adbCall(['devices']).split(/\r?\n/).map(line => line.trim().split(/\s+/)).filter(row => row.length >= 2 && row[0] !== 'List');
const phones = rows.filter(([serial]) => !serial.startsWith('emulator-'));
const authorized = phones.filter(([, state]) => state === 'device');
const requested = process.env.ANDROID_SERIAL;
const phone = requested ? authorized.find(([serial]) => serial === requested) : authorized.length === 1 ? authorized[0] : null;
if (!phone) {
  if (phones.some(([, state]) => state === 'unauthorized')) throw new Error('Unlock the phone and accept its Allow USB debugging prompt, then retry.');
  if (authorized.length > 1) throw new Error('More than one phone is connected; select one with ANDROID_SERIAL.');
  throw new Error('Connect an Android phone by USB, enable USB debugging, accept the PC authorization, then retry.');
}
for (const [name, url] of [['API', 'http://127.0.0.1:4000/health'], ['Metro', 'http://127.0.0.1:8082/status']]) {
  let response;
  try { response = await fetch(url, { signal: AbortSignal.timeout(5000) }); } catch { throw new Error(`${name} is not running; follow the run guide first.`); }
  if (!response.ok) throw new Error(`${name} is not healthy; follow the run guide first.`);
}
const serial = phone[0];
if (!adbCall(['-s', serial, 'shell', 'pm', 'list', 'packages', 'host.exp.exponent']).includes('package:host.exp.exponent')) {
  throw new Error('Install SDK 58-compatible Expo Go on the Android phone, then retry.');
}
for (const port of ['4000', '8082']) adbCall(['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`]);
adbCall(['-s', serial, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', 'exp://127.0.0.1:8082', 'host.exp.exponent']);
console.log('Local API/Metro forwarded to the authorized Android phone; Expo Go launch requested. Keep USB connected.');
