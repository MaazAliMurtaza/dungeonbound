import test from 'node:test';
import assert from 'node:assert/strict';
import { validateApiUrl } from '../src/api-url.ts';

test('development can reach the forwarded local API', () => {
  assert.equal(validateApiUrl('http://127.0.0.1:4000/', false), 'http://127.0.0.1:4000');
});
test('release rejects local, non-HTTPS and placeholder APIs', () => {
  for (const url of ['', 'http://api.onrender.com', 'https://127.0.0.1:4000', 'https://10.0.2.2:4000', 'https://localhost', 'https://[::1]', 'https://[fd00::1]', 'https://[::ffff:127.0.0.1]', 'https://example.com', 'https://YOUR_DEPLOYED_BACKEND_HOST']) {
    assert.throws(() => validateApiUrl(url, true));
  }
});
test('public API URL cannot contain credentials or query secrets', () => {
  for (const url of ['https://name:private@api.onrender.com', 'https://api.onrender.com?token=private', 'https://api.onrender.com#secret']) assert.throws(() => validateApiUrl(url, true));
});
test('release validator accepts a public HTTPS origin without contacting it', () => {
  // URL fixture only; this is not an obtained deployment endpoint.
  assert.equal(validateApiUrl('https://dungeonbound-api.onrender.com/', true), 'https://dungeonbound-api.onrender.com');
});
