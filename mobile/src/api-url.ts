export function validateApiUrl(value: string, release: boolean): string {
  if (!value.trim()) throw new Error('Set EXPO_PUBLIC_API_URL before launching or building.');
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error('EXPO_PUBLIC_API_URL must be a valid API URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('API URL must use HTTP(S) without credentials, query parameters or fragments.');
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const local = host === 'localhost' || host === '::1' || host === '0.0.0.0' || /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) || /^(f[cd][\da-f]{2}|fe[89ab][\da-f]):/i.test(host) || host.startsWith('::ffff:');
  const placeholder = /(^|\.)(example\.(com|org|net)|invalid|test|localhost|local)$/.test(host) || /your[-_.]|replace[-_.]|placeholder/.test(host);
  if (release && (url.protocol !== 'https:' || local || placeholder)) {
    throw new Error('Preview/release builds require the actual public HTTPS API URL, not a local or placeholder address.');
  }
  return url.toString().replace(/\/$/, '');
}
