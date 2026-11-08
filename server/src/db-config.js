// Shared by runtime and migrations. Supabase data stays in a private schema.
export function databaseConfig(env) {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const schema = env.DATABASE_SCHEMA || (env.NODE_ENV === 'production' ? 'dungeonbound' : 'public');
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(schema)) throw new Error('Invalid DATABASE_SCHEMA.');
  let url;
  try { url = new URL(env.DATABASE_URL); } catch { throw new Error('Invalid DATABASE_URL.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('PostgreSQL connection required.');
  const local = ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  const ssl = env.NODE_ENV === 'production' || !local;
  // URL SSL/options parameters must not replace verified TLS or our search path.
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith('ssl') || key === 'uselibpqcompat' || key === 'options') url.searchParams.delete(key);
  }
  return {
    schema,
    config: { connectionString:url.toString(), max:8, idleTimeoutMillis:15000, connectionTimeoutMillis:10000,
      options:`-c search_path=${schema}`,
      ...(ssl ? {ssl:{rejectUnauthorized:true,...(env.DATABASE_CA_CERT ? {ca:env.DATABASE_CA_CERT.replace(/\\n/g,'\n')} : {})}} : {}),
    },
  };
}
