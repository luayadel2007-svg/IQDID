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

`scripts/ci-coverage-floors.json` holds the reviewed minimums. Lowering one is a visible diff. The guard fails CI when:

- a required test file or E2E script is missing (9 files);
- an npm script no longer runs its file, or a verify step is removed or marked optional (`, false]`);
- the workflow contains `continue-on-error`, stops running `npm run modernization:verify`, or drops the ubuntu/windows matrix;
- Vitest ran fewer than **89** tests, reported a failure, or did not run one of the 4 required test files;
- e2e (<12), ux (<20), wallet (<13) or PDF (<27) results are missing, contain a non-PASS step, or are **older than the current run** (file mtime). Committed evidence therefore cannot satisfy it.

## 3. Proof that the guard fails when it should

`evidence/task8-9-recovery/guard/negative-tests.txt`, each case run against a deliberately broken tree and then restored:

| Case | Guard exit |
|---|---|
| N1 delete `test/wallet-premium.test.tsx` | 1 |
| N2 remove the `browser-wallet` verify step | 1 |
| N3 mark `browser-wallet` as not required | 1 |
| N4 add `continue-on-error: true` to the workflow | 1 |
| N5 browser results not from this run (stale) | 1 |
| N6 Vitest total below the floor (73) | 1 |
| P1 restored tree | 0 |

These cases ran before the PDF step and the 89 floor existed. The guard logic is unchanged since; only the floors file grew.

A real failure also took the intended path: in verify run 1 a required test failed, and both `tests` and `coverage-guard` failed with exit 1 (`final-run1-FAILED/`).

## 4. Why the earlier regression passed CI

At `02658b3` the wallet tests were deleted **together with** their verify step and npm script, so CI ran fewer checks and stayed green. Step-level `required` flags cannot catch a step that no longer exists. The guard checks the list of steps and the test counts themselves, and is itself listed as a required step.

## 5. Hosted CI (GitHub Actions)

PR [luayadel2007-svg/IQDID#7](https://github.com/luayadel2007-svg/IQDID/pull/7). Results are recorded after the run completes (see §6).

## 6. Hosted results

_Pending at the time of writing; updated in the next commit once the run finishes._
