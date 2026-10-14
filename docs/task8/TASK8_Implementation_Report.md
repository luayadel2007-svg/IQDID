# TASK-8 — Implementation report

| Item | Value |
|---|---|
| Date | 2026-10-14 |
| Branch | `task8/monorepo-demo` (from `main` `879a262`; does not touch task1/2/3 or the TASK-6 branch) |
| Commits | `0b24671` (workspace + apps + tests), `ed283b2` (dependency patches, favicon, CI output), report commit = the commit containing this file |
| PR | Draft — see the PR linked from the branch (not merged) |
| Classification | TEST ONLY — synthetic data — not affiliated with any government body |

## 1. Verdict

**TASK-8 local acceptance: PASS** (all criteria in §15 of the task met with evidence on Linux). **CI on GitHub (Ubuntu + Windows): see `TASK8_Test_Evidence.md` §3** — the first CI run failed only at the browser E2E step on both runners; status of the follow-up run is recorded there. G1a/G1b remain **NOT PASSED**; no owner decision changed.

## 2. What was built

| Part | Content |
|---|---|
| `apps/wallet-web` | Citizen app, Arabic RTL, mobile-first bottom tab bar. Screens: home (pending-request notice, credentials, recent activity), my digital card, credential detail, data-sharing requests (pending/previous), request detail with countdown + approve/reject confirmation dialog, usage history, settings (theme, demo notifications, demo reset, about). |
| `apps/verifier-web` | Staff app, desktop side nav (collapses on small screens), organisation switcher. Screens: dashboard (status counters, latest sessions), create request (template + purpose with validation), sessions, session detail (live status, countdown, cancel, result), results, operations log, settings (organisation, theme, demo reset). |
| `packages/mock-services` | `DemoStore` (in-memory rules) + `node:http` server on loopback. Enforced server-side: single decision, expiry (120 s default), no approval when the credential is not active, organisation-scoped reads/cancel/activity, strict JSON validation (unknown fields, 16 KB, content type), correlation id, `X-Environment: DEMO`, `no-store`. |
| `packages/api-client` | `Transport` interface; `DemoHttpTransport` (timeout, GET-only retry on transient errors with the same correlation id, caller cancellation, typed `ApiError`, runtime decoding); `RealTransportPlaceholder` behind `VITE_IQDID_TRANSPORT=real`; `WalletGateway` / `VerifierGateway`; Arabic error messages. |
| `packages/shared-types` | `DemoCredentialSummary`, `DemoVerificationRequest`, `DemoVerificationSession`, `DemoConsentDecision`, `DemoActivityEvent`, … + guards and validators. |
| `packages/ui` | Tokens (colour light/dark, typography, spacing, radius, shadow, breakpoints), stylesheet, Button, Card, Badge, Alert, Modal, Input/TextArea/Select, Loading/Empty/Error states, DemoBanner, AppShell, ThemeToggle, status badges, ActivityList, hooks `useAsync` (abortable, polling), `useTheme`, `useCountdown`. Font: Noto Sans Arabic (SIL OFL, bundled via @fontsource). |
| Cross-app sync | Option **A**: one local Mock API server; both apps reach it through the Vite proxy and poll. Works across tabs, browsers and devices on the machine. |

Design choices: npm workspaces (no other tool present); packages consumed as TS source (no package build step); Node's built-in TS stripping runs the server (no ts-node/tsx). No crypto libraries were added or changed; `@sd-jwt/crypto-nodejs` is not used.

## 3. File tree (top level)

```
.github/workflows/task8-ci.yml   Ubuntu + Windows CI (npm ci → typecheck → lint → test → build → e2e)
apps/wallet-web/                 index.html, vite.config.ts, src/{App,main,gateway,poll,prefs}.tsx, src/pages/* (7 screens)
apps/verifier-web/               index.html, vite.config.ts, src/{App,main,gateway,poll,OrgSwitcher,SessionTable}.tsx, src/pages/* (7 screens)
packages/shared-types/src/       index.ts (+ test)
packages/api-client/src/         errors.ts, transport.ts, gateways.ts (+ test)
packages/mock-services/src/      seed.ts, store.ts, server.ts, server-main.ts (+ 2 tests)
packages/ui/src/                 tokens.ts, styles.css, components.tsx, Modal.tsx, hooks.ts, status.tsx, shell.tsx, activity.tsx (+ test)
scripts/                         stack.mjs, dev.mjs, e2e.mjs, evidence.mjs
test/                            cross-app.test.tsx, setup-dom.ts
evidence/task8/                  logs, commands.json, vitest-results.json, npm-audit.json, e2e/ (results + 12 screenshots), mutation-results.txt, round1/, round2-pre-upgrade/
docs/task8/                      this report, test evidence, known limitations
README.md, DEVELOPMENT.md
```

## 4. Commands and environment

`npm ci` · `npm run typecheck` · `npm run lint` · `npm test` · `npm run build` · `npm run e2e` · `npm run evidence -- --ci` (all of them, with logs). Local environment: Linux x64, Node v22.22.0, npm 10.9.4; Chromium 1194 via playwright-core 1.56.1. Pinned toolchain: TypeScript 5.9.3, React 19.1.9, react-router-dom 7.18.4, Vite 7.3.6, Vitest 4.1.11, ESLint 9.39.5, typescript-eslint 8.70.1.

## 5. Verified demo journey (browser, production builds, two separate browser contexts)

1. Verifier (org A) creates an age request → session shows "pending".
2. Wallet (other context, mobile viewport) lists it within one poll; detail shows organisation, purpose, requested field.
3. Wallet approves through a confirmation dialog → wallet shows the recorded decision.
4. Verifier updates **without reload** to `DEMO_ACCEPTED` with the "no cryptographic or protocol verification" notice and the synthetic value; no "VERIFIED" text anywhere.
5. Identity request → wallet rejects → verifier shows rejection and no values.
6. Unanswered request expires (15 s TTL in E2E) on both sides; server refuses late decisions (integration test).
7. Both activity logs show the events; org B sees none of org A's sessions; dark mode changes colours in both apps; demo reset clears both; no browser console errors.

Screenshots: `evidence/task8/e2e/screenshots/` (12).

## 6. Results summary

| Check | Result |
|---|---|
| typecheck (6 workspaces + tests) | exit 0 |
| lint (`--max-warnings=0`) | exit 0 |
| Vitest | 57/57 (26 node + 31 jsdom, incl. 9 cross-app tests against a real server) |
| Build (2 apps) | exit 0 |
| Browser E2E | 12/12 steps |
| Control mutations | 5/5 detected |
| npm audit | 0 vulnerabilities (all deps and runtime-only) |
| Secret / personal-data scan | 0 findings |

Earlier failing rounds are kept: E2E round 1 (9/12, ambiguous selector in the test script), lint round 1 (browser globals in the E2E script), and a pre-upgrade run before the security patches.

## 7. Self-assessment (out of 10)

| # | Axis | Score | Reason |
|---|---|---|---|
| 1 | Working applications | 1 | Both run (dev and production preview), every screen reachable, browser-verified |
| 2 | Cross-app integration | 1 | One server, separate browser contexts, live update without reload, tested in jsdom and browser |
| 3 | Code structure | 1 | Clear package boundaries; gateways reused by both apps; no global state beyond explicit context |
| 4 | UI quality | 1 | Consistent tokens, RTL, light/dark, mobile/desktop layouts (screenshots) |
| 5 | UX functionality | 1 | No dead buttons; loading/empty/error/expired/cancelled states; confirmations; reset |
| 6 | Type safety | 1 | strict + `noUncheckedIndexedAccess` + runtime guards at the network boundary |
| 7 | Testing | 1 | unit + integration + browser E2E + mutations, failing rounds kept |
| 8 | Runtime reproducibility | **0.5** | Locally reproducible from `npm ci`; Windows CI passed install/typecheck/lint/tests/build, but browser E2E on CI failed in the first run (see evidence §3) |
| 9 | Documentation | 1 | README, DEVELOPMENT (API, env, Windows), report, evidence, limitations |
| 10 | TASK-9 readiness | 1 | Wallet screens, gateway and shell ready to extend; real transport seam defined |
| | **Total** | **9.5 / 10** | Updated in §1/evidence if CI changes |

## 8. Next-task readiness (TASK-9)

Ready: wallet shell, card/credential/requests/history screens, gateway seam, design system, test harness. Needs owner input before or during TASK-9: G1a exception wording (L-11), OD-01/OD-02 for any real authentication, and the G1b criteria (G1B-AC) if TASK-9 is meant to count toward G1b.
