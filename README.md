# iqdid-prototype — Iraqi National Digital ID (Prototype / MVP)

> **TEST ONLY.** Synthetic data and TEST keys only. Not an official or government system.
> Gates **G1a and G1b are NOT passed.** The 62 passing tests are in-process library tests, not system, device or security tests.

## Status (Task 1)
| Item | State |
|---|---|
| Git repository, `.gitignore`, `.gitattributes` | created |
| Frozen G1 evidence package | `evidence/g1-suite-v1.0/` (byte-identical; manifest `evidence/g1-suite-v1.0.SHA256SUMS`) |
| Re-runs of the G1 suite | `evidence/runs/<run-id>/` (separate from the original evidence) |
| Services, wallet, secret scan, `.env.example` | not yet (Tasks 2+) |

## Rules
- Never edit anything under `evidence/g1-suite-v1.0/`. Never run tests inside it (its runner writes into `./evidence`).
- Keys and secrets live **outside** the repository (planned: `%LOCALAPPDATA%\iqdid-test\keys`).
- Re-runs happen in `.work/` (git-ignored) and their outputs are copied to `evidence/runs/`.

## Windows — one command (re-run + verify + store evidence)
Requires Git for Windows and Node.js (baseline: 22; other majors run but are recorded as an environment deviation).

```powershell
Set-Location C:\dev\iqdid-prototype
git config core.autocrlf false
git config core.longpaths true
tools\run-g1-suite.cmd            # exit code: 0 = PASS, 1 = FAIL, 2 = BLOCKED
```
If `.cmd` is not desired: `powershell -NoProfile -ExecutionPolicy Bypass -File tools\run-g1-suite.ps1`

What it does (fail-closed):
1. Verifies all 18 frozen files against `evidence\g1-suite-v1.0.SHA256SUMS` **before** the run.
2. Copies `tests_suite` to `.work\g1-run-<id>` (git-ignored), deletes the copied original evidence, checks the lockfile hash before and after `npm ci`.
3. Runs main, `skip-chain` and `skip-role`; copies `results.json` after **each** run.
4. Decides from the JSON, **not** from `run.mjs` exit codes: main must be 62/62 with matching rejection reasons and identical to the original report; mutations must fail exactly `REV-05,REV-08,SIG-05,SIG-06,VER-12,X-17` and `REV-05,VER-12`.
5. Re-verifies the frozen folder **after** the run (hashes + `git status`).
6. Writes everything to `evidence\runs\<id>\`: `env.json`, `*.stdout.log` / `*.stderr.log`, `results_*.json`, `hashes_frozen_before/after.txt`, `verification.json`, `VERIFICATION.md`.

`PASS` here means only "the frozen library suite reproduced"; **G1a and G1b remain NOT passed.**
