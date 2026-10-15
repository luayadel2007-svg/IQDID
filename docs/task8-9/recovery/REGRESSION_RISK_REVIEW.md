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

_Recorded in the next commit once the reviewer finishes._
