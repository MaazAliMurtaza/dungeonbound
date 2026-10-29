import * as SecureStore from 'expo-secure-store';
import { request } from './http';
import { validateApiUrl } from './api-url';

const ACCESS_KEY = 'dungeonbound_access_v1';
const REFRESH_KEY = 'dungeonbound_refresh_v1';
export type User = { id: string; email: string };
type Tokens = { accessToken: string; refreshToken: string; user: User };
const API = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
let access: string | null = null;
let renewal: Promise<Tokens | null> | null = null;


function apiUrl(path: string) {
  return `${validateApiUrl(API, !__DEV__)}${path}`;
}
async function parse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}
export async function storeTokens(tokens: Tokens): Promise<void> {
  // Token credentials are NEVER written to AsyncStorage or to console logs.
  await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken);
  await SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken);
  access = tokens.accessToken;
}
export async function clearTokens(): Promise<void> {
  access = null;
  await Promise.all([SecureStore.deleteItemAsync(ACCESS_KEY), SecureStore.deleteItemAsync(REFRESH_KEY)]);
}
export async function signIn(email: string, password: string, register: boolean): Promise<User> {
  const response = await request(apiUrl(register ? '/auth/register' : '/auth/login'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  });
  const tokens = await parse(response) as Tokens;
  await storeTokens(tokens);
  return tokens.user;
}
async function actuallyRefresh(): Promise<Tokens | null> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
  if (!refreshToken) return null;
  try {
    const res = await request(apiUrl('/auth/refresh'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      if (res.status === 401) await clearTokens();
      throw new Error(res.status === 401 ? 'Session expired. Please sign in again.' : 'Could not refresh session.');
    }
    const tokens = (await res.json()) as Tokens;
    await storeTokens(tokens);
    return tokens;
  } catch (error) {
    // Network outages do not delete valid credentials.
    throw error;
  }
}
export async function refreshSession(): Promise<Tokens | null> {
  if (!renewal) renewal = actuallyRefresh().finally(() => { renewal = null; });
  return renewal;
}
export async function restoreSession(): Promise<User | null> {
  // SecureStore is the only source for stored credentials.
  const oldAccess = await SecureStore.getItemAsync(ACCESS_KEY);
  access = oldAccess;
  const refreshed = await refreshSession();
  return refreshed?.user ?? null;
}
export async function authorized(path: string, options: RequestInit = {}) {
  if (!access) {
    const t = await refreshSession();
    if (!t) throw new Error('Not signed in');
  }
  const send = () => request(apiUrl(path), { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}), Authorization: `Bearer ${access}` } });
  let response = await send();
  if (response.status === 401) {
    const tokens = await refreshSession();
    if (!tokens) throw new Error('Session expired');
    response = await send();
  }
  return parse(response);
}
export async function signOut(): Promise<void> {
  try {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
    if (refreshToken) await request(apiUrl('/auth/logout'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
  } finally { await clearTokens(); }
}
