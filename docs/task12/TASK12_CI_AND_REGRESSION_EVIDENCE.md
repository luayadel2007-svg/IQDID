# TASK12_CI_AND_REGRESSION_EVIDENCE

Both runs below are fresh. The historical TASK-11 numbers were used only as a reference.

## 1. `npm run modernization:verify`

Local Linux runs. Each run's `commands.json` records the command, exit code and output hashes for every step.

| Step | Baseline `564f062` (`evidence/task12/baseline/`) | TASK-12 (`evidence/task12/final/`) |
|---|---|---|
| typecheck | PASS | PASS |
| lint | PASS | PASS |
| tests (Vitest) | PASS, 168/168 | PASS, **183/183** |
| compatibility | PASS | PASS |
| build | PASS | PASS |
| browser-regression | 12/12 | 12/12 |
| browser-ux (axe) | 20/20 | 20/20 |
| browser-wallet | 16/16 | 16/16 |
| browser-verifier | 14/14 | 14/14 |
| browser-pdf-ux | 27/27 | 27/27 |
| browser-scenarios | 9/9 | 9/9 |
| perf-measure (recorded) | PASS | PASS |
| coverage-guard | PASS | PASS |
| secrets-diff | PASS | PASS |
| **secrets-all-index** | **BLOCKED** (12 PNGs), optional | **PASS**, now **required** |

The TASK-12 run ran on the working tree on top of `564f062`, before the TASK-12 commit. The GitHub Actions run on the TASK-12 commit (Ubuntu + Windows) is recorded in the PR #12 thread.

## 2. Test changes in TASK-12

**15 tests added; none removed or weakened.**

| File | Tests | What they cover |
|---|---|---|
| `packages/ui/src/ui.test.tsx` | +2 | H1 modal focus stability; M1 polling overlap (both mutation-checked) |
| `packages/mock-services/src/server.test.ts` | +1 | L3: foreign-Origin POST refused; loopback and origin-less accepted |
| `test/secret-scanner-png.test.ts` (new) | +12 | PNG text chunks scanned; malformed PNGs block; repository PNGs clean |
| `test/crypto-contract.test.ts` | 0 new `it` | New compile-time brand test (fails typecheck if the brand is removed); 2 new lint cases for casts |
| `test/verifier-task10.test.tsx` | 0 new | T1: waits for rendered state instead of a sleep; also checks `aria-label`s |

## 3. Coverage-guard changes (only tightened)

- `minVitestTests` 168 → **183**.
- **New required Vitest files:**
  - the 6 package test files;
  - `test/secret-scanner-png.test.ts`.
- **New required verify step:** `secrets-all-index`.
- **OS check:** the guard now requires a real `os: ubuntu-…` / `os: windows-…` matrix entry. A word inside a comment no longer satisfies it.

## 4. Regression comparison: base `564f062` → TASK-12

| Check | Result |
|---|---|
| Tests deleted or skipped | None. Only `it(` lines were added (`git diff 564f062 -- test packages/*/src/*.test.*`) |
| Assertions weakened | None. One vacuous assertion was made stronger (T1) |
| API contract changes | None to routes or DTOs. The demo API now refuses foreign-Origin POSTs, which no legitimate client sends |
| Crypto ports | Unchanged |
| Wallet features | All wallet suites pass (25 + 14 Vitest, 16 E2E, scenarios). Privacy mode now also masks request-preview values |
| Organisation isolation | Unchanged behaviour; UI wording corrected |
| Protocol claims | None (text and accessible names) |
