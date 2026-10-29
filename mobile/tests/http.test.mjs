import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from '../src/http.ts';

test('an unreachable API is aborted instead of leaving authentication busy forever', async t => {
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }));
  await assert.rejects(request('http://example.test', {}, 10), /API request timed out/);
});

test('API network errors remain failures and do not get mistaken for expired credentials', async t => {
  const error = new Error('Network unavailable');
  t.mock.method(globalThis, 'fetch', async () => { throw error; });
  await assert.rejects(request('http://example.test'), failure => failure === error);
});

test('caller cancellation still cancels a request', async t => {
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => {
    signal.throwIfAborted();
    return new Response('{}');
  });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(request('http://example.test', { signal: controller.signal }), { name: 'AbortError' });
});
