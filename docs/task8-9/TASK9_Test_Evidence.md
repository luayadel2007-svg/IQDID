# TASK9_Test_Evidence

Environment: Linux container, Node 22.22, npm 10.9.4 (`npm ci` clean install OK), Chromium at `/opt/pw-browsers/chromium` via playwright-core 1.56.1.

## 1. Full run

```
IQDID_VERIFY_DIR=task9/final IQDID_EVIDENCE_DIR=task9/e2e IQDID_UX_EVIDENCE_DIR=task9/ux \
IQDID_WALLET_EVIDENCE_DIR=task9/wallet-e2e npm run modernization:verify
```

| Check | Result | Evidence (`evidence/task9/…`) |
|---|---|---|
| typecheck | PASS | `final/typecheck.*.log` |
| lint (0 warnings) | PASS | `final/lint.*.log` |
| vitest | PASS 87/87 (73 TASK-8 + 14 TASK-9) | `final/vitest-results.json` |
| compatibility contracts | PASS 4/4 | `final/compatibility.*.log` |
| build | PASS — wallet JS 101.5 kB gzip (TASK-8: 84.3 kB), CSS 8.9 kB gzip | `final/build.stdout.log` |
| regression browser E2E | PASS 12/12 | `e2e/e2e-results.json` |
| UX / a11y browser | PASS 20/20 — axe WCAG 2.2 AA on **13 wallet routes** × light/dark + verifier routes | `ux/results.json`, `ux/wallet-routes-axe.json` |
| wallet journeys (new) | PASS 13/13 | `wallet-e2e/wallet-e2e-results.json` |
| secrets-diff (index vs base, 220 files) | PASS | `final/secrets-diff.*` |
| secrets-all-index | BLOCKED, non-required — only 12 pre-existing `evidence/task8/e2e/*.png` from the base branch | `final/secrets-all-index.*` |

Command list, exit codes and SHA-256 of every log: `final/commands.json`.

## 2. New component/integration tests (`test/wallet-premium.test.tsx`, real demo HTTP server)

1. four credentials; search; "needs attention" filter; empty result
2. sensitive claim masking; suspended credential blocked
3. national ID is the only answering credential (wallet = server rule)
4. disclosure: 1 shared / 3 withheld; withheld value never rendered; approve → verifier DEMO_ACCEPTED; no protocol claim
5. duplicate decision from stale screen refused; real outcome shown; no extra event
6. network failure → error + retry → recovery → later drop shows weak-connection notice with data → refresh clears
7. offline → bar + both decision buttons disabled → online re-enables
8. two organisations → filter isolates
9. QR screen: SVG present; invalid code / unknown code messages; lowercase valid code opens request
10. new request → unread notification in bell label → mark all read → persisted across remount
11. favorites: tampered storage sanitised; max 6 enforced; home grid order
12. onboarding flow and prompt removal
13. all 13 routes render an h1, finish loading, contain no `VERIFIED_BY_PROTOCOL`/`VERIFIED`
14. typed trust adapter: demo never yields `PROTOCOL`; forged view rejected by the type checker (`@ts-expect-error`)

## 3. Browser journeys (`scripts/wallet-e2e.mjs`, production builds, two browser contexts, TTL 20 s)

j1 verifier creates → wallet bell/nav badge/home alert · j2 review + disclosure 1/3 · j3 reload mid-review · j4 approve → verifier live update → both histories, no protocol claim · j5 org B request opened by short code on QR screen → reject → verifier B sees DEMO_REJECTED, org A cannot see it · j6 multi-org filter · j7 duplicate decision from stale 2nd tab refused, state unchanged · j8 expiry closes request, late API decision refused · j9 network failure + retry · j10 offline bar + disabled decisions · j11 dark theme persists across reload and screens · j12 11 routes × 320 (larger text)/390/768 no overflow, RTL · j13 no console errors (resource-load errors from deliberately aborted requests excluded).

## 4. Rounds (honest history)

| Round | Outcome | Fix |
|---|---|---|
| unit r1 | 10/14 | expiring threshold 30→14 days (national ID was flagged); Card regions named; refusal alert lost on reload; offline test passed after |
| wallet-e2e r1 | 11/13 | refusal hidden behind reload error state; ID card overflow at 320 + larger text |
| wallet-e2e r2 | 12/13 | (above fixed) |
| ux r1 | 18/20 | `aria-label` on a `span` (axe); skip-link check raced first render (now waits for h1 and focus) |
| verify r1 | wallet badge race + secrets-diff BLOCKED by committed PNGs | wait for badge; PNGs untracked per PR #5 rule (separate TASK-8 follow-up commit) |
| verify r2 | all required PASS | — |

## 5. Screenshots (real, not generated)

`evidence/task9/screenshots/` — 33 captures from `scripts/task9-shots.json`: all 13 routes light 390, 10 dark 390, 4 at 768, 3 at 320×640, full-page home, verifier dashboard after journeys. `evidence/task9/wallet-e2e/screenshots/` — 11 journey states (notified, disclosure, QR, duplicate refused, expired, network error, offline, dark help, activity on both sides). Contact sheets: `evidence/task9/contact-sheet-{light,dark}.png`. PNGs are delivered in the ZIP (not committed; secret-scanner rule).

## 6. Not run

Real screen readers (NVDA/VoiceOver/TalkBack); physical devices; Firefox/WebKit; hosted CI for this branch is reported separately after push.
