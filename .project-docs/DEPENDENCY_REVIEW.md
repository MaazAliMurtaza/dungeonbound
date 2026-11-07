# Current review: 2026-11-07

A compatible `npm audit fix --ignore-scripts` updated the mobile lockfile without changing the Expo SDK or forcing a downgrade. Before: 10 findings (1 low, 7 moderate, 2 high). After: 5 moderate findings, 0 high, 0 critical. The remaining chain is glob/minimatch through Expo CLI/fingerprint and Expo. npm proposes an incompatible Expo 53 downgrade with `--force`; it was not applied. Server audit: 0 findings. `react-native-safe-area-context` was added using Expo's SDK 58-compatible installer; the subsequent installation still reports 5 moderate findings.

Mobile tests, typecheck and offline Expo compatibility validation pass after these dependency changes. The offline check warns that validation is less reliable without online metadata. No global package upgrade was performed.

The dated notes below are historical and describe the earlier dependency state.

# Dependency review — 2026-10-29

`mobile/npm audit --json` was rerun: 8 advisories (5 low, 3 high). This is not a clean audit. The report includes affected parent packages as well as two underlying packages:

| Installed package | Dependency path | Published remediation | Decision |
|---|---|---|---|
| zod 3.25.76 | Expo 58.0.21 → @expo/cli 58.1.17 → zod ^3.25.76 | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) lists 4.6.6 as patched | Registry check found no newer Zod 3 release. Forcing Zod 4 violates the CLI's major-version requirement; not applied. |
| deepmerge 4.3.1 | Expo 58.0.21 → @expo/config 58.0.9 → deepmerge ^4.3.1 | [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) lists no patched version | Registry latest remains 4.3.1. No unverified fork, downgrade or advisory suppression applied. |

The registry check found Expo 58.0.21 to be the latest SDK 58 patch. npm's suggested automatic remediation downgrades Expo to SDK 51.0.39, which is incompatible with this app's current SDK/native modules. No `npm audit fix --force`, `--legacy-peer-deps`, or major-version override was used.

These reported dependency paths are through Expo's build/config tooling. The separately installed Express API dependency tree reported 0 vulnerabilities. This distinction does not establish that every tooling exploit is unreachable. Keep Metro bound to localhost for development and load only trusted project configuration. Compatible upstream fixes and a fresh audit remain required before claiming the advisories resolved.

Expo compatibility, Doctor, TypeScript, unit tests and bundle export continue to be verified independently; passing them does not erase the audit findings. Do not describe this project as vulnerability-free.
