# RESPONSIVE_BREAKPOINTS

Breakpoints follow **content needs**, not device names. The 15 test widths (320 … 2560) are **test points**, not CSS breakpoints. All rules live in the one shared stylesheet (`packages/ui/src/styles.css`); there is no per-device stylesheet.

## Wallet (`.shell--mobile`)

| Range | Layout | Why |
|---|---|---|
| < 380 px | Floating bottom nav with tighter padding; items size to their labels | «مستمسكاتي» did not fit an equal 1/5 slot (measured overlap at 320–375 px, fixed in TASK-13) |
| < 760 px | Single column, max 680 px; bottom nav | Phone |
| ≥ 760 px | **Home: two-column grid** in explicit rows (summary\|requests, quick\|favourites, «مستمسكاتي»\|activity). Reading pages keep a 720 px measure. **Card stack capped at 460 px**, centred | Tablet: real use of width without stretching cards or text |
| ≥ 1100 px | **Navigation rail** (216 px, beside the content) instead of the floating phone bar; main area up to 1,040 px | Desktop: no phone-sized controls stretched across a monitor |
| height ≤ 520 px | Header not sticky (scrolls away) | Phone landscape and 400 % zoom: content is not squeezed between two bars |

## Verifier (`.shell--desktop`)

| Range | Layout |
|---|---|
| < 600 px | Header wraps: brand row, then organisation and theme row (TASK-10) |
| < 700 px | «مرّر الجدول أفقياً لعرض كل الأعمدة» hint above full tables. All columns stay reachable in a keyboard-focusable scroll region (no columns dropped) |
| < 860 px | Sidebar becomes a horizontal tab bar (group labels hidden) |
| ≥ 900 px | Filter toolbar on one row |
| ≥ 980 px | Create and detail pages: two columns (form/preview, details/aside) |
| ≥ 1100 px | Dashboard split: sessions and pending/activity side by side |

## Shared

| Concern | Technique |
|---|---|
| Fluid type | `clamp()` for headings and display text (`--fs-xl`, `--fs-xxl`, `--fs-display`) |
| RTL | Logical properties (`inset-inline-*`, `padding-inline-*`, `margin-inline`). Physical `left`/`right` only for safe-area insets |
| Safe areas | `viewport-fit=cover` (both apps). `max(gutter, env(safe-area-inset-left/right))` on header, main and banner. Bottom nav offset by `env(safe-area-inset-bottom)` and side insets |
| Dialogs | `max-height: calc(100dvh − 2·gutter)`, scrollable (TASK-12 M4) |
| Text size | User setting (normal/large/larger) scales `rem`. Fixed-height card stack falls back to auto height with larger text |
| Container queries | Not used: no component currently needs to adapt to its container rather than the viewport. Kept as an option |
