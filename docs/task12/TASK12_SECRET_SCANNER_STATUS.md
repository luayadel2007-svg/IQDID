# TASK12_SECRET_SCANNER_STATUS

## 1. The historical problem

`node tools/secret-scanner.mjs --all-index` returned **BLOCKED (exit 2)** from TASK-8 onward. The step was optional (`false` in `modernization-checks.mjs`), so a scan of the whole tree never gated CI.

**Root cause** (`tools/lib/secret-scanner-engine.mjs`, before TASK-12):

1. In `--all-index` mode, `inspect()` runs on every staged blob.
2. A PNG is not a ZIP and has no `.zip`-like extension, so it falls through to `decode()`.
3. PNG chunk lengths contain `0x00` bytes, so `decode()` throws `UNSUPPORTED_BINARY`.
4. Any error makes the scan `BLOCKED`.

Measured at baseline `564f062`: 538 files staged, **12 errors, all `UNSUPPORTED_BINARY` on `.png`** (`evidence/task8/e2e/screenshots/*.png`). There were 0 findings in the other 526 files.

**A BLOCKED scan does not show the repository is free of secrets.** It shows that 12 files were not scanned.

## 2. Fix (narrow; detection not weakened)

`inspectPng()` handles a blob only when it starts with the 8-byte PNG signature.

**What it scans**
- Every PNG text chunk is decoded and passed through the **same** `inspectText()` rules (private keys, tokens, secret assignments, JWK, PII):
  - `tEXt` (latin1);
  - `zTXt` (inflated, capped at `maxBlobBytes`);
  - `iTXt` (UTF-8; inflated if compressed).
- The existing whole-blob latin1 scan for key and token signatures still runs first.

**What still blocks** (`UNSUPPORTED_BINARY`)
- an unknown chunk type;
- a CRC mismatch;
- IHDR not first;
- missing IEND, or data after IEND;
- a truncated chunk;
- a bad compression method or a corrupt stream.

**Not detected**
- Text drawn *as pixels* in a screenshot. Pixel data is CRC-checked, not decoded. This needs human review of the image.
- The 12 historical PNGs are synthetic-data UI captures.

No rule was removed, no exception was added, and `.security/secret-scanner-rules.json` is unchanged. No historical file was deleted or rewritten.

## 3. Tests

`test/secret-scanner-png.test.ts` (12 tests), now a required Vitest file:

- A clean PNG passes.
- A token in `tEXt` is found (KNOWN_TOKEN).
- A private key in `zTXt` is found (PRIVATE_KEY).
- A secret assignment in compressed and in uncompressed `iTXt` (UTF-8 with Arabic metadata) is found.
- The scan still BLOCKS on:
  - a CRC mismatch;
  - an unknown chunk;
  - trailing data;
  - a missing IEND;
  - an IHDR in the wrong place;
  - a truncated file;
  - a corrupt `zTXt` stream.
- Every PNG tracked in the repository parses and is clean.

The test builds its secret strings at run time, so the test file itself contains no secret patterns.

## 4. Result and CI change

| | Before (`564f062`) | After (TASK-12) |
|---|---|---|
| `--all-index` | BLOCKED (exit 2), 12 × UNSUPPORTED_BINARY | **PASS (exit 0)**, 538 files, 0 findings, 0 errors |
| Verify step `secrets-all-index` | optional | **required** (also listed in `requiredVerifySteps`, so the coverage guard fails if it is made optional again) |

## 5. Remaining decision for the owner

Screenshots are evidence of the synthetic UI. If a future screenshot could show real data, a manual image review step (or not committing screenshots) is needed. The repository policy already keeps new screenshots out of git (`.gitignore`).
