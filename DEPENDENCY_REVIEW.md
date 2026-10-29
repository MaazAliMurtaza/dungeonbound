# Dependency review — 2026-10-29

`mobile/npm audit --json` was rerun: 8 advisories (5 low, 3 high). This is not a clean audit. The report includes affected parent packages as well as two underlying packages:

| Installed package | Dependency path | Published remediation | Decision |
|---|---|---|---|
| zod 3.25.76 | Expo 58.0.21 → @expo/cli 58.1.17 → zod ^3.25.76 | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) lists 4.6.6 as patched | Registry check found no newer Zod 3 release. Forcing Zod 4 violates the CLI's major-version requirement; not applied. |
| deepmerge 4.3.1 | Expo 58.0.21 → @expo/config 58.0.9 → deepmerge ^4.3.1 | [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) lists no patched version | Registry latest remains 4.3.1. No unverified fork, downgrade or advisory suppression applied. |

The registry check found Expo 58.0.21 to be the latest SDK 58 patch. npm's suggested automatic remediation downgrades Expo to SDK 51.0.39, which is incompatible with this app's current SDK/native modules. No `npm audit fix --force`, `--legacy-peer-deps`, or major-version override was used.

These reported dependency paths are through Expo's build/config tooling. The separately installed Express API dependency tree reported 0 vulnerabilities. This distinction does not establish that every tooling exploit is unreachable. Keep Metro bound to localhost for development and load only trusted project configuration. Compatible upstream fixes and a fresh audit remain required before claiming the advisories resolved.

Expo compatibility, Doctor, TypeScript, unit tests and bundle export continue to be verified independently; passing them does not erase the audit findings. Do not describe this project as vulnerability-free.
