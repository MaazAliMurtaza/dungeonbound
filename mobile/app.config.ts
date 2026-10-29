import type { ConfigContext, ExpoConfig } from 'expo/config';
import { validateApiUrl } from './src/api-url.ts';

export default ({ config }: ConfigContext): ExpoConfig => {
  const release = ['preview', 'production'].includes(process.env.EAS_BUILD_PROFILE ?? '') || process.env.DUNGEONBOUND_RELEASE_BUILD === '1';
  if (release) validateApiUrl(process.env.EXPO_PUBLIC_API_URL ?? '', true);
  return { ...config, name: config.name ?? 'Dungeonbound', slug: config.slug ?? 'dungeonbound' };
};
