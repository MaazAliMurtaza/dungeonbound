# Supabase PostgreSQL and Render API

Selected by the project owner. Supabase hosts PostgreSQL; Render hosts the existing Express API. Supabase Auth is not substituted for the current tested JWT/SecureStore flow.

1. Sign in at https://supabase.com/dashboard and https://dashboard.render.com, then connect the Supabase and Render ChatGPT apps so deployment can be carried out through their account integrations.
2. Use a Free Supabase project and Free Render web service. Do not select a paid plan or add-ons without separate approval.
3. For an IPv4-only API host, use Supabase's session-pooler PostgreSQL connection from the project's Connect panel. Keep its password in Render's DATABASE_URL secret, never the app bundle or repository.
4. Keep database TLS certificate verification enabled. Supply the project's CA certificate as a host secret if required; never work around a connection error by disabling TLS verification.
5. Set DATABASE_SCHEMA=dungeonbound and run npm run db:migrate from server (the Render start command does this). The migration creates the private schema and revokes PUBLIC schema access before applying its tables. Do not paste schema.sql into the default public schema. Account, session, player-save and leaderboard tables belong to the backend; mobile clients talk only to the authenticated Express API.
6. Deploy deploy/render.yaml with DATABASE_URL as a host secret and generated JWT_SECRET. Validate public HTTPS /health, authentication, per-user save access and refresh/logout before building the release APK.
7. Set the actual HTTPS origin as EXPO_PUBLIC_API_URL in the cloud build environment. No placeholder/local release origin is accepted.

References: [Supabase connection options](https://supabase.com/docs/guides/database/connecting-to-postgres), [Supabase plans](https://supabase.com/pricing), [Render Free services](https://render.com/docs/free). Free-plan inactivity/usage limits affect availability and must be documented in the final handoff.

Render Free services sleep after 15 idle minutes and can take about a minute to wake. Its monthly included bandwidth/build allowances can incur supplemental charges when a payment method permits them. Before creating resources, inspect account billing/spend controls and retain a zero-spend configuration; a Free instance label alone does not establish a zero-cost account. Never add a payment method or enable paid overages for this project. Saves remain in PostgreSQL, not Render's ephemeral filesystem.
