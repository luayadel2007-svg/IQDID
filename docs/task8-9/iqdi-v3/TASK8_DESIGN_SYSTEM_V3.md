# TASK8_DESIGN_SYSTEM_V3

Commit `78966b8`. Style: Government Premium + Future Identity + subtle liquid glass. One shared package (`packages/ui`) for both apps. Wallet is mobile-first; Verifier is desktop-first (sidebar, tables), not an enlarged phone UI.

## Tokens
- **Light:** background `#f3f6fc` with a soft blue radial wash; navy titles `#0a1630`; digital blue `#1a4fd0`; brand gradient navy → blue → `#3b82f6`; radii 14/22/28; soft navy-tinted shadows.
- **Dark:** background `#040b1a`; surfaces `#0b1730` / `#11203f`; text `#eaf0fb`; primary `#7aa7ff`; limited glow (shadows on primary only).
- **Card palette** (`cardPalette` in tokens.ts + CSS vars):

  | Card | Light | Dark |
  |---|---|---|
  | National ID | blue | deep blue |
  | Licence | teal | teal |
  | Residence | sand/gold | sand/gold |
  | Education | purple | purple |
  | Health | rose | rose |

  Card text ≥ 7:1 and muted text ≥ 4.5:1 on both gradient stops in both themes (unit test).

## Glass policy
Glass is used on the top bar, bottom nav, sidebar and `.card--glass` (secondary/decorative only). It is never used on credential cards, consent, disclosure, errors or form fields: those are opaque. Reduced transparency (`html[data-glass=off]` or the OS setting) removes every backdrop filter.

## Components updated
- **Top bar:** dark band → light glass, navy text, IQDI mark; compacts on scroll.
- **Bottom nav:** floating glass pill, active item filled with label; 5 items.
- **Sidebar:** same family; active soft fill.
- **Cards and badges:** softer cards; `badge--demo`.
- **Icons:** 8 new (car, graduation, heart, share, wallet, stack, activity, chevron-down).
- **Credential card system:** `.cred-card--*`, motif, DEMO watermark.
- **Stack rules:** for TASK-9.

Buttons, forms, modals, loading, error and empty states, typography, focus (3 px yellow ring) and motion (200–400 ms, reducible) carry over from v2, verified by the existing suites.

## Tests (TASK-8 checkpoint)
typecheck, lint, Vitest 106/106, e2e 12/12, UX/axe 20/20 (light/dark, RTL reflow, keyboard, reduced motion), PDF audit 27/27. Before/after screenshots are in `evidence/task8-9/iqdi-v3/screenshots/` (delivered in the ZIP; PNGs are not committed).
