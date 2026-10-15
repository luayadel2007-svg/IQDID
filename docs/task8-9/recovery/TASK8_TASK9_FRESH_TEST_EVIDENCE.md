# TASK8_TASK9_FRESH_TEST_EVIDENCE

All results below are from **fresh runs on this branch**. The historical 87/87 and 13/13 in `TASK9_Test_Evidence.md` are past results and are not reused here.

Environment: Linux container, Node 22.22, npm 10.9.4, Chromium (`/opt/pw-browsers/chromium`) driven by playwright-core 1.56.1. Source commit tested: `5b31493` (code); the reports commit after it changes docs only.

## 1. Runs

| Run | Command | Result | Evidence (`evidence/task8-9-recovery/`) |
|---|---|---|---|
| Clean install | `rm -rf node_modules && npm ci` | exit 0, 379 packages | `npm-ci.log.txt` |
| Verify run 1 | `npm run modernization:verify` (evidence env vars → task8-9-recovery) | **FAIL**: Vitest 87/88 (duplicate-decision test failed); coverage guard FAIL "vitest reported failures" | `verify-run1.txt`, `final-run1-FAILED/` |
| Fixes | `bf3a21b`, `88c83ae`, `5b31493` | see recovery report §5 | — |
| Verify run 2 | same command | **PASS**, every required step exit 0 | `verify-run2.txt`, `final/commands.json` (exit codes + SHA-256 of every log) |

Stability after the fixes: offline test 15/15, duplicate-decision test 15/15, full Vitest suite 6/6 runs at 89/89.

## 2. Required checks (verify run 2)

| Check | Result | Evidence |
|---|---|---|
| Typecheck (6 workspaces + tests) | PASS | `final/typecheck.*` |
| Lint (0 warnings) | PASS | `final/lint.*` |
| Vitest, all files | PASS 89/89 in 10 files | `final/vitest-results.json` |
| — Wallet Premium component tests | 14/14 (`test/wallet-premium.test.tsx`) | same |
| — Cross-app integration | 9/9 (`test/cross-app.test.tsx`) | same |
| — Provider replacement / real transport fails closed | 2/2 | same |
| — Crypto contract (ports, branded VerifiedByProtocol) | 4/4 | same |
| Production build | PASS. Wallet JS 101.6 kB gz, verifier 84.4 kB gz | `final/build.stdout.log` |
| API compatibility contracts | PASS 4/4 | `final/compatibility.*` |
| Existing cross-app browser E2E | PASS 12/12 | `e2e/e2e-results.json` |
| Wallet browser E2E | PASS 13/13 | `wallet-e2e/wallet-e2e-results.json` |
| UX + accessibility (axe WCAG 2.2 AA, keyboard, reflow, reduced motion) | PASS 20/20 | `ux/results.json`, `ux/*-axe.json` |
| PDF criteria browser audit | PASS 27/27 (round 1: 25/27, see `pdf-audit-round1-FAILED.txt`) | `pdf-audit/audit.json` |
| Coverage guard | PASS | `final/coverage-guard.stdout.log` |
| Secrets (index vs base, 228 files) | PASS | `final/secrets-diff.*` |
| Secrets (all index) | BLOCKED, non-required. Only the 12 `evidence/task8/e2e/*.png` already in the base branch | `final/secrets-all-index.*` |

## 3. The specific scenarios you asked for

| Scenario | Fresh evidence |
|---|---|
| Full journey: Verifier creates → Wallet receives → reviews disclosure → approve/reject → Verifier updates → both histories | wallet E2E j1–j5 PASS; cross-app approve/reject PASS; e2e 12/12 |
| Demo/Protocol trust separation | wallet-premium "every wallet screen … never claims protocol verification" + "typed trust adapter" (`@ts-expect-error` forgery) PASS; crypto-contract 4/4; wallet E2E j4 checks both apps' text |
| Organisation isolation | e2e "organisation B sees none of organisation A sessions"; wallet E2E j5 (org A cannot see org B session, API check) and j6 |
| Session expiry | wallet E2E j8 (TTL 20 s, late decision refused by API); e2e expiry (15 s); cross-app expiry test |
| Duplicate decision rejection | wallet-premium (deterministic stale screen; server refused exactly 1); wallet E2E j7 (stale second tab) |
| Network failure and retry | wallet-premium network test; wallet E2E j9; ux "offline API error … retry" |
| Offline | wallet-premium offline (after the `useOnline` fix); wallet E2E j10 |
| Page reload during review | wallet E2E j3 |
| Accessibility | ux 20/20 (axe on 13 wallet routes + verifier routes × light/dark, keyboard, skip link); PDF audit. **Automated only, not full accessibility compliance.** |

## 4. Why the counts changed

| Measure | Historical (d8009fb) | Fresh | Reason |
|---|---|---|---|
| Vitest | 87 | 89 | +1 adaptive-header test (`ui.test.tsx`), +1 `useOnline` regression test. None removed. |
| Wallet Premium tests | 14 | 14 | same tests; one made deterministic |
| Wallet browser E2E | 13 | 13 | unchanged |
| UX/axe | 20 | 20 | unchanged |
| PDF audit | — | 27 | new |

## 5. Screenshots (real, from the browser)

`evidence/task8-9-recovery/pdf-audit/*.png` — 18 captures: wallet and verifier at 320, 390, 768 and 1366 px, plus 683 px at 200 % text (home, request review, settings, new request, session detail). Journey states are in `wallet-e2e/screenshots/`. PNGs are delivered outside git, following the repository's secret-scanner rule.

## 6. Not run

Real screen readers (NVDA/VoiceOver/TalkBack); physical low-end devices; Firefox/WebKit; a Windows **local** run (Windows is covered by hosted CI only).
