# TASK12_ACCESSIBILITY_BASELINE

**Automated** results come from test runs on the TASK-12 code (`evidence/task12/final/`). **Manual** results are reported separately. No manual assistive-technology session was possible in this environment, and none is claimed.

## 1. Automated (PASS on the TASK-12 code)

| Area | Check | Where |
|---|---|---|
| Keyboard navigation | Skip link is the first Tab stop and focuses `#main`. Verifier create flow works keyboard-only. Wallet card stack works with Arrow keys, Enter and Escape | `ux-e2e` (both apps), `verifier-e2e`, `wallet-e2e` |
| Focus order and restoration | The card stack restores focus after Escape and after returning from details | `wallet-cards-v3.test.tsx`, `wallet-e2e` |
| Modal focus management | Focus moves into the dialog and is trapped; Escape closes it and focus returns. **New:** focus stays put while the parent re-renders (fixes H1) | `ui.test.tsx` |
| Screen-reader labels | Role and name queries throughout the Vitest suites. axe `aria-*` and `label` rules | All Vitest suites; axe |
| Contrast | axe WCAG 2.2 AA contrast in light and dark. Token contrast unit tests (≥ 4.5:1) | `ux-e2e` (wallet 17 routes × 2 themes, verifier 6 × 2), `verifier-e2e` (12 states × 2), `ui.test.tsx` |
| Text scaling and 200 % | No horizontal overflow at 320–1366 px and 200 % text | `pdf-ux-audit` P14, `ux-e2e`, `verifier-e2e` |
| RTL | `dir="rtl"` and `lang="ar"`; logical CSS properties | P1, all suites |
| Reduced motion | No element animates or transitions with `prefers-reduced-motion` or the in-app switch | P12, `ux-e2e`, `verifier-e2e` |
| Reduced transparency | User switch removes `backdrop-filter`; preference persists | P10, `ux-e2e` |
| Live regions | Per-second countdown announcements removed (M5). Result counts are polite `status` regions | Code review |

**axe totals on this run:** 0 violations in every audited state.

## 2. Manual

| Check | Status |
|---|---|
| NVDA on Windows | **NOT RUN**: no Windows desktop with NVDA in this environment |
| JAWS | **NOT RUN** |
| VoiceOver (macOS, iOS) | **NOT RUN**: physical Apple device required |
| TalkBack (Android) | **NOT RUN**: physical device required |
| 400 % zoom by a person | **NOT RUN**. An automated reflow check at 320×256 CSS px is in TASK-13 |
| Cognitive and plain-language review by users | **NOT RUN** |

## 3. Open items

- **L4: route changes are not announced.** Focus and `document.title` do not change on SPA navigation. Recommended pattern: focus the `<h1>` and update the title. This needs a decision on the announcement style. Deferred.
- **L5: residual focus loss.** Focus can briefly fall to `body` while a confirm button shows its loading state. It is pulled back into the dialog on the next key press.
- A manual session with at least NVDA and VoiceOver is required before any claim beyond "automated WCAG 2.2 AA checks pass".
