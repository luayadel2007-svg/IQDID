# CARD_STACK_INTERACTION_SPEC

**Route:** `/cards` (`apps/wallet-web/src/pages/CardsPage.tsx`, `components/useFlip.ts`, CSS `.stack*`, `.cred-card*`).

## Layout
- Cards are a vertical `<ul aria-label="مجموعة المستمسكات">`. Each card is a `<button>` 252 px tall, overlapping the previous one by 168 px, so every card shows an 84 px header strip (icon, title, issuer). Covered rows are `visibility: hidden`.
- With text scaling (large/larger), height is auto and the overlap is reduced.
- When a card is selected, it is rendered first, at full height, followed by its action panel. The remaining cards collapse into a pile below it (214 px overlap).

## Interaction
1. Open «مستمسكاتي». The stack shows; the view comes from the stored preference or `?view=`.
2. Scroll natively; swiping is never required.
3. Tap or press Enter on a card. The selection goes into the URL (`?card=<id>`, history `replace`). The card moves to the front with a FLIP translate (transform only, 320 ms, `cubic-bezier(.2,.7,.2,1)`) and a 0.97 → 1 lift. Focus stays on that card, and a live region announces «تم اختيار …».
4. A second tap/Enter, or «عرض المستمسك», opens `/credentials/<id>?from=cards`.
5. Back (browser or «العودة إلى مستمسكاتي») returns to `/cards?card=<id>` with the same card expanded.
6. Escape or «رجوع إلى المجموعة» collapses back to the stack. ArrowUp/ArrowDown move focus between cards.

## Accessibility
- **Accessible names:** each card's name is "‹title›، ‹state›، المستمسك n من N" (plus "اضغط لفتح التفاصيل" when selected), with `aria-expanded`.
- **List view:** «عرض القائمة» is a full alternative with search and filters (status, needs attention). The choice persists (`iqdi-wallet-cards-view`).
- **Reduced motion:** `prefers-reduced-motion` or the app's reduced-motion setting skips FLIP and the lift. The browser test confirms 0 running animations.
- **Motion is never the only signal:** state is shown in text (status badge and `aria-expanded`).
- **Touch targets:** full-width header strip ≥ 84 px; buttons ≥ 46 px.
- **Layout:** RTL; no overflow at 320/390/768 or with larger text (wallet E2E).

## Tests
- `test/wallet-cards-v3.test.tsx`: names and status, select/front/expanded/focus/URL, details and Back restore, keyboard, list view persistence.
- Wallet E2E steps:
  - real tap on the header strip, then details and Back;
  - keyboard plus reduced motion plus list view.
