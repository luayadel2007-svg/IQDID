# ACCESSIBILITY_REPORT

**Automated (PASS):**
- axe WCAG 2.2 A/AA: 0 violations on 17 wallet routes (including `/cards`, `/cards?card=…`, `/cards?view=list`) and the verifier routes, in light and dark (`evidence/task8-9/iqdi-v3/ux/wallet-routes-axe.json`).
- Keyboard: skip link reaches `main`; card stack Arrow/Enter/Escape; dialogs close with Escape.
- Reflow: no horizontal scroll at 320/390/768/1366 and 200 % text (UX, PDF P14, wallet E2E 11 routes × 3 widths).
- Reduced motion: no running animation on any element (PDF P12); 0 running animations after selecting a card (E2E).
- Reduced transparency: removes all backdrop filters (P10).

**By design:**
- Card buttons carry the title, status and position in their accessible name, plus `aria-expanded`. A live region announces selection.
- List view is the reading-order alternative to the visual stack.
- Covered card rows are `visibility: hidden`, so they are not read twice.
- Decorative icons are `aria-hidden`.

**Not done (NOT RUN):**
- No NVDA, VoiceOver or TalkBack session.
- No physical device.
- No Firefox/WebKit.

Automated results are not full WCAG conformance.
