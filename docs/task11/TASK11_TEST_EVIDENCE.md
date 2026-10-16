# TASK11_TEST_EVIDENCE

Every number below comes from a run on real code. Historical results are not reused as evidence for newer code.

## 1. Commits

| Point | SHA | Branch / PR |
|---|---|---|
| Base (TASK-8/9 V3 + «مستمسكاتي») | `998b14f` | `fix/iqdi-mustamsakati-terminology` — Draft PR #9 |
| TASK-10 | `a103642` | `feature/iqdi-task10` — Draft PR #10 (base: #9) |
| TASK-11 | the TASK-11 commit on `feature/iqdi-task10-11`, listed in PR #11 | `feature/iqdi-task10-11` — Draft PR #11 (base: `feature/iqdi-task10`) |
| Final head | head of `feature/iqdi-task10-11` | — |

## 2. Commands and exit codes (local, Linux, Node 22.22.0)

`npm run modernization:verify`. Evidence: `evidence/<dir>/verify/commands.json`, which holds the command, exit code, duration and SHA-256 of the output for each step.

| Step | Base `998b14f` | TASK-10 `a103642` | TASK-11 working tree |
|---|---|---|---|
| typecheck | PASS (0) | PASS (0) | PASS (0) |
| lint | PASS (0) | PASS (0) | PASS (0) |
| tests (Vitest) | PASS (0), 132/132 | PASS (0), 147/147 | PASS (0), **168/168** |
| compatibility | PASS (0) | PASS (0) | PASS (0) |
| build | PASS (0) | PASS (0) | PASS (0) |
| browser-regression | 12/12 | 12/12 | 12/12 |
| browser-ux (axe) | 20/20 | 20/20 | 20/20 |
| browser-wallet | 16/16 | 16/16 | 16/16 |
| browser-verifier | — | 14/14 | 14/14 |
| browser-pdf-ux | 27/27 | 27/27 | 27/27 |
| **browser-scenarios** | — | — | **9/9** (A–H + console) |
| perf-measure (optional, recorded) | — | — | PASS (0) |
| coverage-guard | PASS | PASS | PASS |
| secrets-diff | PASS | PASS | PASS |
| secrets-all-index (optional) | BLOCKED (2) | BLOCKED (2) | BLOCKED (2), PNG files already in the base |

Evidence directories: `evidence/task10-11/baseline/`, `evidence/task10/` and `evidence/task11/`. The TASK-11 local run ran on the uncommitted working tree on top of `a103642`. The run on the committed TASK-11 SHA is the CI run in §3.

## 3. GitHub Actions (hosted, `.github/workflows/task8-ci.yml`, ubuntu-24.04 + windows-2022)

| Commit | Run | Ubuntu | Windows |
|---|---|---|---|
| `998b14f` (base, PR #9) | [38930777368](https://github.com/luayadel2007-svg/IQDID/actions/runs/38930777368) | success | success |
| `a103642` (TASK-10, PR #10) | [38939084471](https://github.com/luayadel2007-svg/IQDID/actions/runs/38939084471) | success | success |
| TASK-11 (PR #11) | See PR #11 checks. The result is recorded in the PR thread once complete | — | — |

## 4. Test inventory (passed tests per file, from the three Vitest reports)

| File | Base | TASK-10 | TASK-11 |
|---|---|---|---|
| packages/api-client/src/transport.test.ts | 8 | 8 | 8 |
| packages/mock-services/src/server.test.ts | 6 | 6 | 6 |
| packages/mock-services/src/store.test.ts | 8 | 8 | 8 |
| packages/shared-types/src/index.test.ts | 4 | 4 | 4 |
| packages/ui/src/preferences.test.tsx | 7 | 7 | 7 |
| packages/ui/src/ui.test.tsx | 29 | 29 | 29 |
| test/cross-app.test.tsx | 9 | 9 | 9 |
| test/crypto-contract.test.ts | 4 | 4 | 4 |
| test/iqdi-branding.test.tsx | 16 | 16 | 16 |
| test/provider-replacement.test.tsx | 2 | 2 | 2 |
| test/wallet-cards-v3.test.tsx | 25 | 25 | 25 |
| test/wallet-premium.test.tsx | 14 | 14 | 14 |
| **test/verifier-task10.test.tsx** | — | 15 | 15 |
| **test/ecosystem-contract.test.ts** | — | — | 18 |
| **test/ecosystem-ui.test.tsx** | — | — | 3 |
| **Total** | **132** | **147** | **168** |

No test file was deleted and no `it(` or `test(` line was removed (`git diff 998b14f -- test packages/*/src/*.test.*`). The coverage floors only went up:

- Vitest: 132 → 147 → **168**
- browser floors: verifier **14** and scenarios **9** added

## 5. Performance (measured by `scripts/perf-measure.mjs`; `evidence/task11/perf/perf.json`)

**Environment:** Linux container, 4 vCPU, Node 22.22.0, Chromium (Playwright 1.56), loopback, `DEMO_LATENCY_MS=0`, production builds. Each value is the median of 3 cold loads. ×4 means Chrome DevTools CPU throttling 4×, used as a mid-range device proxy.

**Startup:** demo API + both preview servers ready in **591 ms**.

**Bundles (all JS / CSS per app):**

| App | JS | JS gzip | CSS | CSS gzip |
|---|---|---|---|---|
| Wallet | 329,163 B | 106,119 B | 58,446 B | 12,136 B |
| Verifier | 285,654 B | 90,777 B | 58,446 B | 12,136 B |

**Page loads** («data ready» = first `h1` visible and no skeleton left in `main`):

| App | Route | FCP ×1 | Data ready ×1 | FCP ×4 | Data ready ×4 | Max CLS |
|---|---|---|---|---|---|---|
| Wallet | `/` | 224 ms | 295 ms | 688 ms | 1,044 ms | **0.143** (pre-existing, see limitations) |
| Wallet | `/cards` | 216 | 301 | 584 | 936 | 0.003 |
| Wallet | `/requests` | 188 | 239 | 592 | 877 | 0.014 |
| Wallet | `/requests/:id` | 184 | 246 | 536 | 915 | 0.036 |
| Verifier | `/` | 232 | 293 | 736 | 1,111 | 0.011 (was 0.099 before the TASK-11 fix) |
| Verifier | `/new` | 220 | 279 | 640 | 991 | 0.011 |
| Verifier | `/sessions` | 240 | 275 | 692 | 1,001 | 0.011 |
| Verifier | `/sessions/:id` | 232 | 283 | 660 | 964 | 0.018 |

**Repeated network requests** (idle, 10 s window):

| Screen | Requests | By endpoint |
|---|---|---|
| Wallet home | 20 | `/wallet/requests` 10, `/wallet/activity` 10 |
| Verifier dashboard | 14 | `/verifier/sessions` 7, `/verifier/activity` 7 |
| Verifier session | 7 | `/verifier/sessions/:id` 7 |

**Console errors:** 0. **Horizontal overflow:** none.

Reduced motion and light/dark stability are covered by the browser suites (P3/P11/P12, U, VE «reduced motion», axe in both themes).

## 6. Independent regression comparison (base → TASK-10 → TASK-11)

| Check | Result |
|---|---|
| Wallet features lost | None. All 25 + 14 wallet UI tests and 16 wallet E2E steps pass at every point. Only 3 wallet files changed (`DecisionPanel`, `DisclosurePage`, `RequestDetailPage`: optional `credentialStatus` notice) |
| Tests deleted | None (§4) |
| TypeScript errors | None (typecheck PASS at all three points) |
| Crypto ports changed | No. `git diff 998b14f -- packages/api-client packages/shared-types` is empty. The only `packages/` source change is `mock-services/src/server-main.ts` (demo launcher env) |
| Cross-organisation leaks | None. Verified by Scenario E, V, VE, C, X and E |
| Real-verification claims | None. Every screen and every journey API response was checked |
| IQDI naming | `test/iqdi-branding.test.tsx` 16/16. The new UI says «IQDI Verifier» / «IQDI Wallet». `@iqdid/*` remains as the legacy package scope |

## 7. Screenshots and traces

**Real Chromium captures:**
- `evidence/task10/verifier-e2e/screenshots/` (20)
- `evidence/task11/scenarios/screenshots/` (16)
- `evidence/task11/scenarios/traces/` (Scenario A, Playwright trace viewer)

**Plus the PNG files produced by the regression, UX and PDF suites** for each run.

PNG and ZIP files are git-ignored by repository policy and delivered in the ZIP package.
