// Development-only inspection through the existing Metro/Hermes debugger.
// Never returns or prints token values or stored game data.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../mobile/package.json', import.meta.url));
const WebSocket = require('ws');
const targets = await (await fetch('http://localhost:8082/json/list')).json();
const appId = process.env.ANDROID_APP_ID || 'host.exp.exponent';
const target = targets.find(item => item.appId === appId);
if (!target) throw new Error('Open the app in the local emulator first');
const socket = new WebSocket(target.webSocketDebuggerUrl.replace('ws://localhost:', 'ws://127.0.0.1:'), { origin: 'http://127.0.0.1:8082' });
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = () => reject(new Error('Could not connect to Hermes debugger')); });
const expression = `(async () => {
  if (typeof __r !== 'function' || !__r.getModules) return { available: false };
  const modules = Array.from(__r.getModules().entries());
  const secureId = modules.find(([id, m]) => /secure-store\\/build\\/SecureStore\\.js$/.test(m.verboseName || ''))?.[0];
  const cacheId = modules.find(([id, m]) => /async-storage.*AsyncStorage\\.native/.test(m.verboseName || ''))?.[0];
  if (secureId == null || cacheId == null) return { available: false };
  const secure = __r(secureId), cache = __r(cacheId).default;
  const access = await secure.getItemAsync('dungeonbound_access_v1');
  const refresh = await secure.getItemAsync('dungeonbound_refresh_v1');
  const keys = await cache.getAllKeys();
  const entries = await cache.multiGet(keys);
  const progress = entries.filter(([key]) => key.startsWith('dungeonbound_progress_'));
  return { available: true, accessPresent: !!access, refreshPresent: !!refresh,
    asyncStorageKeys: keys.length, progressEntries: progress.length,
    sensitiveKeyFound: keys.some(key => /token|password|jwt|credential/i.test(key)),
    sessionTokenFoundInAsyncStorage: entries.some(([,value]) => value && ((access && value.includes(access)) || (refresh && value.includes(refresh)))),
    progressShapeValid: progress.every(([,value]) => { const data = JSON.parse(value); return Object.keys(data).sort().join(',') === 'progress,savedAt' && data.progress?.version === 1; }) };
})().then(value => { globalThis.__dungeonboundAudit = value; }, () => { globalThis.__dungeonboundAudit = { available: false }; })`;
let sequence = 0;
function evaluate(expression) { return new Promise((resolve, reject) => {
  const id = ++sequence;
  const timer = setTimeout(() => reject(new Error('Debugger audit timed out')), 15000);
  socket.onmessage = event => { const data = JSON.parse(event.data); if (data.id === id) { clearTimeout(timer); resolve(data); } };
  socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true } }));
});
}
await evaluate('delete globalThis.__dungeonboundAudit');
const initial = await evaluate(expression);
if (initial.result?.exceptionDetails || initial.error) { socket.close(); throw new Error('Debugger evaluation unavailable'); }
let reply;
for (let attempt = 0; attempt < 20; attempt++) {
  await new Promise(resolve => setTimeout(resolve, 500));
  reply = await evaluate('globalThis.__dungeonboundAudit || { pending: true }');
  if (!reply.result?.result?.value?.pending) break;
}
await evaluate('delete globalThis.__dungeonboundAudit');
socket.close();
if (reply.result?.exceptionDetails || reply.error) throw new Error('Debugger evaluation unavailable');
console.log(JSON.stringify(reply.result?.result?.value));
const result = reply.result?.result?.value;
assert.equal(result?.available, true, 'Native storage audit unavailable');
assert.equal(result.sensitiveKeyFound, false, 'Sensitive AsyncStorage key detected');
assert.equal(result.sessionTokenFoundInAsyncStorage, false, 'Session token detected in AsyncStorage');
assert.equal(result.progressShapeValid, true, 'Unexpected progress cache shape');
const signedOut = process.argv.includes('--signed-out');
assert.equal(result.accessPresent, !signedOut, 'Unexpected SecureStore access-token presence');
assert.equal(result.refreshPresent, !signedOut, 'Unexpected SecureStore refresh-token presence');
