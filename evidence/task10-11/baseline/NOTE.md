# Baseline run — note

Run of `npm run modernization:verify` on `998b14f` (head of `fix/iqdi-mustamsakati-terminology`), before any TASK-10 change.

- typecheck, lint, tests (132/132), compatibility and build finished at 16:46:23Z, before the first TASK-10 file was written (16:47:26Z).
- The browser steps ran against the `dist/` built from `998b14f`.
- `commands.json → sourceHashes` is computed when the run ends (16:49Z). It therefore hashes some TASK-10 files that were already being edited. Use the step results, not those hashes, as the baseline.
- Independent confirmation: GitHub Actions on `998b14f` is green on ubuntu-24.04 and windows-2022 (run 38930777368, PR #9).
