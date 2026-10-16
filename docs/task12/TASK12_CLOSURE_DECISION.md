# TASK12_CLOSURE_DECISION

## Acceptance gate (§3.9)

| Criterion | Result |
|---|---|
| Typecheck | PASS |
| Lint | PASS |
| Build | PASS |
| Required unit and integration tests | PASS: 183/183 |
| Required browser tests | PASS: e2e 12, UX 20, wallet 16, verifier 14, PDF 27, scenarios 9 |
| CI coverage guard | PASS (tightened) |
| No critical regression | None found; the 1 High was fixed |
| Known blockers documented | `TASK12_KNOWN_RISKS.md` |
| Stable baseline SHA | The TASK-12 commit on `audit/iqdi-task12` (Draft PR #12). GitHub Actions on it is recorded in the PR thread |

**Decision: TASK-12 CLOSED.** It is the stable baseline for TASK-13, with the following conditions:

- Hosted CI on Ubuntu and Windows confirms the commit, recorded in PR #12.
- The owner decisions R1 and R2 remain open. They do not block TASK-13.

## Checkpoint and tags

The checkpoint is the branch `audit/iqdi-task12`. Tags cannot be pushed from the automation environment. To tag locally:

```
git fetch origin audit/iqdi-task12
git tag -a iqdi-task12 origin/audit/iqdi-task12 -m "TASK-12 stable baseline (TEST ONLY)"
git push origin iqdi-task12
```

## Historical evidence

No file under `evidence/` from earlier tasks was modified or deleted. The 12 historical PNGs are unchanged; they are now scanned instead of blocking the scan.
