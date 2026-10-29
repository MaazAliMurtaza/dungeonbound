# Approved deployment plan — account setup in progress

The user approved the proposed resources, SDK installation and source/EAS uploads with a $0 spending ceiling on 2026-10-29. This is not completed-deployment evidence. The private source repository is https://github.com/MaazAliMurtaza/dungeonbound and the linked EAS project is https://expo.dev/accounts/maazay.py/projects/dungeonbound. No hosted API or EAS build APK link is available yet.

## Proposed resources and cost boundary

- One Render Node web service, **Free** plan, configured by `deploy/render.yaml`.
- One Neon PostgreSQL project, **Free** plan, created only after approval.
- EAS preview Android APK using remaining free quota only. Stop if payment or an upgrade is required.
- Proposed spending ceiling: **$0**. A private source repository/upload needs approval too; this extracted folder is not currently a Git repository.

Pricing checked 2026-10-29: [Render free service limits](https://render.com/docs/free), [Neon free plan](https://neon.com/blog/neon-free-plan-1-gb-per-project), [Expo billing plans](https://docs.expo.dev/billing/plans/). Free Render services can sleep and have usage limits; the first request may take longer than this app's 15-second timeout. A user may need to retry sign-in after cold start. Render's free Postgres expires after 30 days, so it is not the proposed persistent database. Free quotas are not a guarantee of unrestricted availability.

## What will be published, only after approval

The server source and dependency lockfile in a user-owned source repository; an HTTPS API exposing health, registration/login/refresh/logout and per-user saves; an EAS upload of mobile source/assets to compile an internal-distribution APK. Local `.env`, generated native debug keys, account credentials and disposable test data must not be uploaded. Hosted user emails, password hashes, refresh hashes and saves will live in the chosen Neon database.

## Host secrets and release gates

Use the Neon-provided TLS connection URL as the Render **secret** `DATABASE_URL`. Let Render generate `JWT_SECRET` as a host secret; never reuse the local secret. Keep `NODE_ENV=production`. `TRUST_PROXY=1` is for Render's one trusted proxy hop and must be reviewed if hosting changes. Verify migrations, HTTPS health, account isolation, refresh rotation and logout on the actual host. The draft is not claimed validated against a connected Render account.

After obtaining the real HTTPS API URL, configure `EXPO_PUBLIC_API_URL` in the EAS preview environment. It is public, not a secret. The dynamic Expo config rejects missing, local, non-HTTPS or placeholder URLs for preview/production profiles. `DUNGEONBOUND_RELEASE_BUILD=1` enables the same check for a local release-config check. EAS profiles pin the locally tested Node 24.11.0 for the TypeScript config loader; no EAS build has validated that setting yet. Confirm application identity and Expo project ownership before linking/signing; keep account/signing prompts interactive.

Build and install the preview APK, then repeat the Android auth/session, SecureStore, full dungeon and save/restart checks. Record the actual API URL, EAS build URL, signing/build identity and device results only once obtained. Local debug APK builds are separate development evidence and do not satisfy this hosted release checklist.

## Account access still needed

Approval is recorded; do not ask for it again for this scope. Render and Neon integrations must be installed and authorized through the providers before their resources can be created. Stop if a paid plan or upgrade is required. Keep signing/account prompts interactive and never paste private credentials into chat. The Android package is `com.maazay.dungeonbound`; no prior standalone APK was distributed under the prototype package. Physical-device checks require a connected Android phone; none is connected yet.
