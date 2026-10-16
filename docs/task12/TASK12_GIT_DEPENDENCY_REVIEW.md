# TASK12_GIT_DEPENDENCY_REVIEW

The branches and PR states below come from `git` and GitHub at TASK-12 start. Nothing was merged, rebased or force-pushed.

## 1. Two independent stacks

**Stack 1 (TASK-1–3), not part of the application line**

```
main 879a262
 └─ task1/windows-validation 8f1db75 (PR #1 → main)
     ├─ task3/g1a-openapi-review 120d626 (PR #2 → task1)
     └─ task2/secret-scanner     1500841 (PR #3 → task1)
```

**Stack 2: the application line, linear and verified with `merge-base --is-ancestor`**

| Branch | HEAD | Ahead of its base | Behind its base | PR (Draft, open) | Base |
|---|---|---|---|---|---|
| `task8/monorepo-demo` | `1f51b51` | 4 | 0 | #4 | `main` |
| `integration/crypto-ready-ux` | `6cb22c3` | 2 | 0 | #5 | #4 |
| `task8-9/premium-wallet` | `5811691` | 5 | 0 | #6 | #5 |
| `fix/task8-9-quality-recovery` | `01dfc74` | 12 | 0 | #7 | #6 |
| `design/iqdi-premium-wallet-v3` | `4433c55` | 10 | 0 | #8 | #7 |
| `fix/iqdi-mustamsakati-terminology` | `998b14f` | 1 | 0 | #9 | #8 |
| `feature/iqdi-task10` | `a103642` | 1 | 0 | #10 | #9 |
| `feature/iqdi-task10-11` | `564f062` | 1 | 0 | #11 | #10 |
| **`audit/iqdi-task12`** | TASK-12 commit | 1 | 0 | #12 (new) | #11 |
| **`feature/iqdi-task13-universal-experience`** | TASK-13 commit | 1 | 0 | #13 (new) | #12 |

Each branch contains its base exactly: ahead > 0 and behind = 0 at every link.

## 2. Findings

| # | Finding | Severity | Status |
|---|---|---|---|
| G1 | Stack 1 (TASK-1–3) is **not** an ancestor of the application line. `tools/` in stack 2 is a separate copy: it has 560 lines fewer than `task2/secret-scanner` (no `verify-task2-integrity.mjs`, etc.) | Medium | Documented. The owner must decide whether stack 1 merges separately or is superseded. This is not decided here |
| G2 | Merging stack 2 into `main` needs PRs #4 → #13 to be merged **in order**. Merging a later PR first would bring in all earlier commits without their review | Informational | The PR bodies state their bases |
| G3 | `git merge-tree origin/main origin/feature/iqdi-task10-11` shows **no conflicts** | — | OK |
| G4 | Generated evidence is committed as JSON. PNG and ZIP files are ignored by path rules per task folder; 12 historical PNGs from TASK-8 (`evidence/task8/e2e/screenshots/`) are tracked | Informational | Historical evidence is left untouched. See `TASK12_SECRET_SCANNER_STATUS.md` |
| G5 | Older evidence folders hold Vitest reports with lower counts (e.g. 68 tests in `evidence/modernization/final`). They are frozen history, not current results | Informational | Not edited. The current floor is enforced by the coverage guard on every run |
| G6 | Git tags cannot be pushed from the automation environment (the proxy cuts the connection) | Low | Checkpoints are branches. The owner can tag them locally (commands in `TASK12_CLOSURE_DECISION.md`) |
| G7 | No unmerged changes exist outside these branches. `claude/wizardly-carson-3b4ute` (the session's default branch) has no unique application commits | Informational | — |

## 3. Unmerged and missing work

- Every PR from #1 to #11 is an open Draft. **None is merged.**
- No branch has a merge conflict with its base.
- Missing tests found by the audit: package-level test files were not protected by the coverage guard (fixed in TASK-12; see `TASK12_CI_AND_REGRESSION_EVIDENCE.md`).
