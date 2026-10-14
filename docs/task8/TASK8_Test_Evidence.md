# TASK-8 — Test evidence

All raw files are under `evidence/task8/`. Re-run everything with `npm run evidence -- --ci` (writes `commands.json` with exit code, duration and SHA-256 of every log). Earlier failing rounds are kept, not overwritten.

## 1. Local run (Linux x64, Node v22.22.0, npm 10.9.4)

| Step | Command | Exit | Evidence |
|---|---|---|---|
| Clean install | `npm ci` | 0 | `npm-ci.log` |
| Typecheck (6 workspaces + tests, strict) | `npm run typecheck` | 0 | `typecheck.log` |
| Lint (`--max-warnings=0`, TS strict + react-hooks + jsx-a11y) | `npm run lint` | 0 | `lint.log` |
| Unit + integration tests | `vitest run` | 0 — **58/58** | `test.log`, `vitest-results.json` |
| Production build (both apps) | `npm run build` | 0 | `build.log` |
| Browser E2E on the builds | `npm run e2e` | 0 — **12/12** | `e2e.log`, `e2e/e2e-results.json`, `e2e/screenshots/` |
| Dependency audit | `npm audit` | 0 vulnerabilities | `npm-audit.json` |
| Control mutations | see below | 6/6 detected | `mutation-results.txt` |
| Flake check | cross-app suite ×10 | 10/10 | `flake-check.txt` |

### Test inventory (58)

| File | Tests | What it proves |
|---|---|---|
| `packages/shared-types/src/index.test.ts` | 4 | guards reject tampered DTOs (e.g. status `VERIFIED`); strict request/decision validation |
| `packages/mock-services/src/store.test.ts` | 8 | org-scoped visibility, accept discloses only requested synthetic fields, reject discloses nothing, single decision, expiry at exactly TTL (recorded once), inactive credential blocks approval, cancel rules, reset |
| `packages/mock-services/src/server.test.ts` | 6 | loopback bind, demo headers, correlation id echo/replace, no CORS, full HTTP cycle, cross-org 404, malformed/oversized/wrong-type bodies, method check, reset |
| `packages/api-client/src/transport.test.ts` | 8 | correlation id header, GET retry with same id on 503, no POST retry, typed 4xx errors without retry, timeout, cancellation, network vs decode errors, real-transport placeholder refuses |
| `packages/ui/src/ui.test.tsx` | 23 | Button loading, Input a11y wiring, Modal (dialog role, focus trap, Escape, focus restore), theme toggle, ErrorState retry, Badge text, **16 WCAG contrast pairs ≥ 4.5:1 (light + dark)**, useAsync no stale-data flash |
| `test/cross-app.test.tsx` | 9 | both real apps + one real server: approve journey with both activity logs, reject journey, org isolation, expiry on both sides + server refuses late decision, unreachable-server error state with retry, full navigation of both apps, demo reset, purpose validation |

### Browser E2E steps (Chromium, wallet 390×844 and verifier 1366×860 in separate contexts)

1. Arabic RTL + demo banner on both apps · 2. first Tab reaches skip link · 3. verifier creates age request · 4. request appears in wallet with org/purpose/fields · 5. approve → verifier updates live to `DEMO_ACCEPTED`, page never says `VERIFIED` · 6. identity request rejected → verifier shows rejection without values · 7. expiry (15 s TTL) on both sides · 8. both activity logs · 9. org B sees no org A sessions · 10. dark mode changes colours in both apps · 11. demo reset clears both · 12. no browser console errors.

### Mutations (each control removed in turn; the suite must fail)

M1 expiry check · M2 single decision · M3 inactive-credential guard · M4 organisation scoping · M5 disclose-on-reject · M6 previous `useAsync` implementation — **6/6 KILLED**.

### Scans

No private keys, tokens, JWTs or personal e-mail addresses in tracked files; no `VERIFIED` claim in app code (only in a test asserting its absence). All demo data is synthetic (`TEST-001`, `TEST-DOC-0001`, invented organisation names).

## 2. Rounds kept as evidence

| Round | Result | Cause | Fix |
|---|---|---|---|
| E2E round 1 (`e2e/e2e-results-round1.json`) | 9/12 | test script used an ambiguous link selector ("الطلبات" also matched a back link) | selectors scoped to the navigation landmark |
| Lint round 1 (`round1/`) | exit 1 | E2E script uses browser globals inside `page.evaluate` | browser globals declared for that file |
| Pre-upgrade run (`round2-pre-upgrade/`) | all green, but `npm audit`: 15 vulns incl. runtime `react-router-dom` 7.9.6 (13 advisories) | outdated pins | patched to react-router-dom 7.18.4, vite 7.3.6, vitest 4.1.11, typescript-eslint 8.70.1, eslint 9.39.5 → 0 vulns |

## 3. GitHub Actions (Ubuntu 24.04 + Windows Server 2022, Node 22, system Chrome)

| Run | Commit | Ubuntu | Windows | Finding |
|---|---|---|---|---|
| [38551165309](https://github.com/luayadel2007-svg/IQDID/actions/runs/38551165309) | `0b24671` | install/typecheck/lint/tests/build ✓, **E2E ✗** | same | system Chrome requested `/favicon.ico` (404 → console error) — fixed with an inline favicon; runner now prints failing-step output |
| [38552083869](https://github.com/luayadel2007-svg/IQDID/actions/runs/38552083869) | `ed283b2` | E2E ✓, **1 test ✗** (org isolation) | E2E ✓ (**real Chrome on Windows**), **same 1 test ✗** | real UI bug: stale data flashed on organisation change — fixed in `useAsync` + regression test |
| [38552444640](https://github.com/luayadel2007-svg/IQDID/actions/runs/38552444640) | `3bf1ca2` | **✓ all steps** (npm ci, typecheck, lint, 58 tests, build, E2E 12/12) | **✓ all steps** (same, real Chrome on Windows Server 2022, PowerShell runner) | — |

Each run uploads its full `evidence/task8` folder as an artifact (`task8-evidence-<os>-<run id>`, 30 days).
