# CI_COVERAGE_VERIFICATION

## 1. What CI runs

`.github/workflows/task8-ci.yml` runs on every pull request (plus push to the integration branches and manual dispatch). Matrix: `ubuntu-24.04` and `windows-2022` with `fail-fast: false`. Steps: pinned checkout → Node 22 → `npm ci` → `npm run modernization:verify` → upload evidence (`if: always()`, artifact step only). There is **no `continue-on-error`** anywhere in the workflow.

`npm run modernization:verify` (`scripts/modernization-checks.mjs`) runs these steps in order. Any required step that exits non-zero makes the process exit 1, which fails the job.

| Step | Command | Required | Covers |
|---|---|---|---|
| typecheck | `npm run typecheck` | yes | TypeScript strict, 6 workspaces + tests |
| lint | `npm run lint` | yes | ESLint, 0 warnings |
| tests | `vitest run` (JSON report) | yes | **all** Vitest files, including `test/wallet-premium.test.tsx`, cross-app, provider replacement, crypto contract |
| compatibility | `scripts/compatibility-contract.mjs` | yes | API compatibility contracts |
| build | `npm run build` | yes | production builds of both apps |
| browser-regression | `npm run e2e` | yes | cross-app browser E2E (12) |
| browser-ux | `npm run test:ux` | yes | UI/UX + axe accessibility (20) |
| browser-wallet | `npm run test:wallet` | yes | wallet browser E2E (13), **restored** |
| browser-pdf-ux | `npm run test:pdf-ux` | yes | PDF criteria audit (27), **new** |
| coverage-guard | `scripts/ci-coverage-guard.mjs` | yes | no silent loss of coverage, **new** |
| secrets-diff | secret scanner vs base | yes | no secrets or PII in changed files |
| secrets-all-index | secret scanner, whole index | no | informational (blocked by pre-existing PNGs in the base) |

DEMO/PROTOCOL separation is enforced by required tests: `crypto-contract.test.ts` (4), the wallet-premium tests "never claims protocol verification" and "typed trust adapter" (including a `@ts-expect-error` forgery that typecheck must reject), and the cross-app and wallet E2E text checks.

## 2. Coverage guard

`scripts/ci-coverage-floors.json` holds the reviewed minimums. Lowering one is a visible diff. The guard (version 2, hardened after the independent review) fails CI when:

- a required test file or E2E script is missing (9 files);
- an npm script no longer runs its file;
- a verify step is missing or optional. The `commands` array is **parsed** with comments stripped, so a commented-out step counts as missing, and any 4th element (`false`, `0`, …) makes a step optional;
- `modernization-checks.mjs` no longer exits non-zero when a required step fails;
- the workflow contains `continue-on-error`, the verify line is not exactly `run: npm run modernization:verify` (so `|| true` or chaining fails), the verify step has an `if:`, or the ubuntu/windows matrix is dropped;
- Vitest **passed** fewer than **89** tests, has any skipped or todo test, reported a failure, or did not run one of the 4 required test files;
- e2e (<12), ux (<20), wallet (<13) or PDF (<27) results are missing, contain a non-PASS step, or are older than this run;
- it is not given this run's start time (`since` = 0 or older than 6 h).

## 3. Proof that the guard fails when it should

`evidence/task8-9-recovery/guard/negative-tests-v2.txt` (guard v2, final floors). Each case breaks one thing, runs the guard, and restores the tree:

| Case | Exit | Guard message |
|---|---|---|
| N1 delete `test/wallet-premium.test.tsx` | 1 | missing required file |
| N2 remove `browser-wallet` step | 1 | step missing |
| N3a `browser-wallet` made optional with `false` | 1 | must stay required |
| N3b … with `0` (review bypass c) | 1 | must stay required |
| N3c `lint` step commented out (review bypass b) | 1 | step missing |
| N3d verify exits 0 on required failure | 1 | verify must exit non-zero |
| N4a `continue-on-error` | 1 | not allowed |
| N4b `\|\| true` on the verify line (review bypass d) | 1 | must run exactly … |
| N4c `if: false` on the verify step | 1 | must not be conditional |
| N5a results older than the run | 1 | stale (vitest, e2e, ux, wallet, pdf) |
| N5b `since=0` (review finding) | 1 | needs this run's start time |
| N6a 73 passing tests | 1 | floor 89 |
| N6b 10 tests `.skip`ped, total unchanged (review bypass a) | 1 | floor + skipped not allowed |
| N6c a todo test | 1 | todo not allowed |
| P1 intact tree | 0 | PASS |

Version 1 of the guard and its 6 cases are kept in `guard/negative-tests.txt` as history; the reviewer showed v1 could be bypassed. A real failure also took the intended path: in verify run 1, a failing test failed both `tests` and `coverage-guard` (`final-run1-FAILED/`). On hosted Windows (§6), a failing e2e step failed the guard too.

## 4. Why the earlier regression passed CI

At `02658b3` the wallet tests were deleted **together with** their verify step and npm script, so CI ran fewer checks and stayed green. Step-level `required` flags cannot catch a step that no longer exists. The guard checks the list of steps and the test counts themselves, and is itself listed as a required step.

## 5. Hosted CI (GitHub Actions)

PR [luayadel2007-svg/IQDID#7](https://github.com/luayadel2007-svg/IQDID/pull/7).

| Commit | Ubuntu | Windows | Note |
|---|---|---|---|
| `5b31493` | cancelled | cancelled | superseded by the next push (`cancel-in-progress`) |
| `6986b61` | **success** | **failure** | Windows: all e2e assertions passed, but the first full-page evidence screenshot threw Chrome "Unable to capture screenshot". `browser-regression` and `coverage-guard` correctly failed the job. Fix `6e9f202` retries that one screenshot error once; no assertion is retried. |
| `f71359c` | **success** ([job](https://github.com/luayadel2007-svg/IQDID/actions/runs/38763839147/job/116521783037)) | **success** ([job](https://github.com/luayadel2007-svg/IQDID/actions/runs/38763839147/job/116521782425)) | Windows log: typecheck, lint, tests, compatibility, build, browser-regression, browser-ux, browser-wallet, browser-pdf-ux, coverage-guard, secrets-diff all PASS (exit 0); secrets-all-index BLOCKED (optional, pre-existing PNGs). Later commits change docs only. |

Windows was not run locally; it is covered only by hosted CI.
