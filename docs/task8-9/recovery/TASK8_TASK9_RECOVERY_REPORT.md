# TASK8_TASK9_RECOVERY_REPORT

TEST ONLY · synthetic data · no rebuild · TASK-10 not started · PR #6 not merged.

## 1. State checked before any change

| Ref | SHA | Checked |
|---|---|---|
| `task8-9/premium-wallet` (PR #6 head) | `5811691` | fetched, working tree clean |
| `checkpoint/task9` | `d8009fb` | fetched |
| `checkpoint/task8-v2` | `128cfe4` | fetched, untouched |
| `integration/crypto-ready-ux` | `6cb22c3` | fetched, untouched |

`git log checkpoint/task9..task8-9/premium-wallet` = 2 commits: `02658b3` (removal) and `5811691` (CI axe fix).

## 2. Cause of the deletion

Commit `02658b3` (2026-10-15 14:38 UTC) deleted the eight files. It was made in this session in response to the owner's instruction to undo the files created in the previous turn. It also removed their wiring (`test:wallet`, the `browser-wallet` verify step, the ESLint override, the CI artifact path), so CI stayed green with **fewer tests**. That green run masked the loss of coverage. Section 4 of `CI_COVERAGE_VERIFICATION.md` covers the guard that now prevents this.

## 3. Restoration

Branch `fix/task8-9-quality-recovery` was created from `origin/task8-9/premium-wallet` (`5811691`). No reset and no force push were used, and no reference branch was modified.

| File | Source | Result |
|---|---|---|
| docs/task8-9/TASK8_Modernization_Report.md | checkpoint/task9 | byte-identical (historical, unchanged) |
| docs/task8-9/TASK9_Implementation_Report.md | checkpoint/task9 | byte-identical (historical) |
| docs/task8-9/TASK9_Feature_Matrix.md | checkpoint/task9 | byte-identical (historical) |
| docs/task8-9/TASK9_Test_Evidence.md | checkpoint/task9 | byte-identical (historical; its 87/87 and 13/13 are past results) |
| docs/task8-9/TASK9_UI_UX_Compliance.md | checkpoint/task9 | byte-identical (historical; written before the PDF text was available) |
| docs/task8-9/TASK9_Known_Limitations.md | checkpoint/task9 | byte-identical (historical) |
| scripts/wallet-e2e.mjs | checkpoint/task9 | byte-identical |
| test/wallet-premium.test.tsx | checkpoint/task9 | restored identical in `869187e`; one test later made deterministic in `88c83ae` (§5) |

Wiring restored: npm `test:wallet`, required verify step `browser-wallet`, ESLint browser globals, and CI evidence upload. The CI fix from `5811691` (the axe audit waits for transitions to finish) is kept.

## 4. Commits on the fix branch

| Commit | Purpose |
|---|---|
| `869187e` | restore the 8 files and their wiring |
| `45a492e` | CI coverage guard (required step) |
| `049ae93` | UI changes for gaps found against the PDF criteria |
| `5f8f889` | required browser audit of the PDF criteria (`scripts/pdf-ux-audit.mjs`) |
| `bf3a21b` | bug fix: `useOnline` missed an offline change (found by the fresh run) |
| `88c83ae` | the restored stale-screen duplicate-decision test made deterministic |
| `5b31493` | Vitest floor raised 87 → 89 |

The reports commit follows these.

## 5. Changes beyond restoring the files, and why

1. **`useOnline` bug.** In run 1 the restored offline test failed about 1 run in 8. Root cause: the hook read `navigator.onLine` during render but subscribed to events in an effect. A change in that window left the decision buttons enabled while the offline bar was showing. Fix: re-read the state after subscribing. A regression test fails without the fix and passes with it.
2. **Duplicate-decision test.** It depended on the stale page not polling (every 150 ms) before the second decision, and failed about 40% of the time. When it failed, the page had already updated and correctly sent no duplicate, so the test was not exercising its stated purpose. The test now makes the screen stale on purpose (its reads fail while decision POSTs still go out), as the browser E2E does. Every original expectation is kept, plus one more: the server refused exactly one decision.
3. **PDF gaps.** Four were measured as failing and fixed in the UI only: motion 160 ms → 200 ms; an animated success confirmation; a top bar that compacts on scroll without hiding controls; and reduced transparency now removes the backdrop filter completely (`saturate(1.4)` remained before).

No application logic changed apart from the `useOnline` fix. `packages/api-client`, `packages/shared-types`, `packages/mock-services`, the crypto ports, `WalletTrustAdapter`, the verifier app and the session lifecycle are untouched (the diff against `5811691` lists every file).

## 6. Not done

- The original PDF file was not provided. The pasted text stops at §7.2, so §7.2 onward is **BLOCKED** (see `PDF_UI_UX_COMPLIANCE_REVIEW.md`).
- No real screen reader, physical device, or Firefox/WebKit run.
- Hosted CI result and the independent review are recorded in `CI_COVERAGE_VERIFICATION.md` and `REGRESSION_RISK_REVIEW.md`.
