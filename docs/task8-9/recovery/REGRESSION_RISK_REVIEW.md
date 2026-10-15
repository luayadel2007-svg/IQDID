# REGRESSION_RISK_REVIEW

Diff reviewed: `origin/task8-9/premium-wallet` (`5811691`) → `fix/task8-9-quality-recovery`.

## 1. Areas untouched (verified with `git diff --quiet` against the base)

`apps/wallet-web/**`, `apps/verifier-web/**`, `packages/api-client/**` (including `crypto-ports.ts`), `packages/shared-types/**` (including `verification.ts`), `packages/mock-services/**`, `apps/wallet-web/src/trust.ts` (WalletTrustAdapter). Session lifecycle, org isolation and the demo/protocol types have **no code change**. The `5811691` CI fix (`getAnimations` wait in `scripts/ux-e2e.mjs`) is kept.

## 2. Changed areas and risk

| Change | Files | Risk | Mitigation / evidence |
|---|---|---|---|
| Restored files | 6 docs, wallet test, wallet E2E | low (identical to the checkpoint) | hashes compared; recovery report §3 |
| `useOnline` re-reads after subscribing | `packages/ui/src/hooks.ts` (+2 lines) | low: one extra state set on mount | regression test fails without it; offline tests 15/15 |
| Adaptive header (scroll listener, `data-scrolled`) | `packages/ui/src/shell.tsx` | low: passive listener, attribute only, no control hidden | U test; P9 both apps; all E2E pass |
| CSS: motion 200 ms, confirm animation, compact header, no backdrop when transparency is off | `packages/ui/src/styles.css` | low, visual only | axe 20/20, PDF 27/27, reflow at 4 widths + 200 % |
| Duplicate-decision test made deterministic | `test/wallet-premium.test.tsx` | could hide a product race if done wrong | original expectations kept, plus "server refused exactly 1"; the scenario where the page updates first is still correct product behaviour (outcome shown, no duplicate sent) |
| New required CI steps (wallet E2E, PDF audit, guard) | `scripts/*`, workflow | longer CI time; a flaky browser step now fails CI | intended; flake fixes above; Windows covered by the hosted matrix |
| Vitest floor 89 | `ci-coverage-floors.json` | adding tests is fine; removing any needs a reviewed floor change | intended |

## 3. Residual risks

- **Hidden-dialog case.** If a decision is made on another device while the confirm dialog is open, the next poll closes the dialog and shows the real outcome. No duplicate is sent, but the user gets no explicit "decided elsewhere" message. UX note, not fixed (would change app logic).
- **CI duration.** CI now runs three browser suites on each OS. A slow Windows runner could time out; watch the hosted results.
- **PDF scope.** The original PDF was not provided and the pasted text is truncated at §7.2. Unreviewed criteria may exist.
- **Accessibility.** Automated checks only; no screen-reader or device session.

## 4. Independent review

A separate read-only reviewer agent (another Claude instance, not a human auditor) reviewed `5b31493`/`6986b61` with git diffs, blob hashes, test runs and bypass experiments on a copy of the repo. **Score given: 7.5/10.** It was not re-run after the fixes below, so that score stands as given.

| # | Severity | Finding | Disposition |
|---|---|---|---|
| 1 | Medium | Guard counted skipped/todo tests toward the floor (`.skip` on 10 tests → PASS) | **Fixed** `b7d61ee`: floor on passed tests; pending and todo must be 0 (N6b, N6c) |
| 2 | Medium | Text-matching holes: commented-out step, `, 0]`, `\|\| true`, `since=0` | **Fixed** `b7d61ee`: commands array parsed; exact verify line; no `if:`; start time required (N3b–N5b) |
| 3 | Low | Negative tests predated the final guard | **Fixed**: re-run as v2 with 14 cases (`negative-tests-v2.txt`) |
| 4 | Low | PDF checks were proxies (P8 hard-coded clicks; P6/P7 stylesheet; P12 one button) | **Fixed/relabelled**: P8 now clicks each service and checks the page changed; P12 checks every element; P6/P7 labelled "stylesheet rule present" |
| 5 | Low | Local verify without env vars overwrote committed PDF evidence | **Fixed**: default output is now `evidence/modernization/pdf-audit` |
| 6 | Nit | `--dur-fast` 160 → 200 ms changed to satisfy the audit | Kept: the PDF asks for 200–400 ms. Visual only |
| 7 | Nit | `useOnline` test spy not restored on failure | **Fixed**: `try/finally` |

Items the reviewer CONFIRMED: 7/8 files byte-identical; the rewritten duplicate-decision test is stricter and still tests its name; no skip/only/todo added; no weakened expectation; recent code (incl. the `5811691` `getAnimations` wait) preserved; crypto ports, `verification.ts` and `trust.ts` identical to the base; no path to `VERIFIED_BY_PROTOCOL` from a demo approval; evidence counts match (89/89, 12, 20, 13, 27, run-1 failure logs present); `useOnline` fix correct and its test fails without it.

One more change after the review: Windows CI hit a Chrome screenshot error in `scripts/e2e.mjs`, fixed in `6e9f202` (retries the screenshot only). The restored `scripts/wallet-e2e.mjs` was deliberately left byte-identical.
