# WALLET_VERIFIER_INTEGRATION

One mark for the whole ecosystem. Each app shows the same People First symbol next to its own name; there is no per-app logo.

## Shared design system (`packages/ui`)

| Item | Change |
|---|---|
| `IQDIBrand` | Variants `symbol`, `compact`, `horizontal`, `logo` (plus `mark` as an alias of `symbol` for compatibility).<br>Tones `auto`, `light`, `dark`, `monochrome`.<br>Width is set with `size`; height follows the artwork's own ratio, so nothing is stretched.<br>`decorative` hides it from screen readers when adjacent text names the app |
| `BrandMark` | Unchanged API. Now renders the People First symbol (decorative) |
| CSS | `--iqdi-*` brand tokens updated; the header symbol has no tile shadow (it is a transparent symbol); `.vf-nav__brand` added for the verifier sidebar |
| `tokens.brand` | People First palette (see `LIGHT_DARK_AND_MONOCHROME.md`) |

## IQDI Wallet

| Placement | Now | Before (PR #14) |
|---|---|---|
| Header (every screen) | Symbol, 40 px (34 px when compact), Light/Dark by theme, decorative | Palm/arch app icon |
| Welcome `/welcome` (first step) | **Primary logo**, 248 px, with «People First • Human Centered» | Palm/arch logo |
| Settings → «حول» | **Horizontal lockup**, 248 px, named. Text: «… — «المواطن أولاً». نموذج تجريبي … غير مرتبط بأي جهة حكومية ولا يحمل أي اعتماد رسمي» | Palm/arch mark |
| Favicon | Compact mark on an off-white tile (SVG + 32 px PNG) | Palm/arch app icon |
| PWA manifest | People First icons; `theme_color` `#0B2A4A`; `background_color` `#F8F7F4` | Palm/arch icons |
| `theme-color` meta | `#0B2A4A` | `#0B2450` |
| Loading or splash screen | None exists in the app, so nothing was added | — |

**Unchanged:**
- «مستمسكاتي» and the card stack;
- data-sharing requests and the consent flow;
- privacy mode;
- activity;
- responsive layouts;
- light/dark;
- RTL.

## IQDI Verifier

| Placement | Now | Before (PR #14) |
|---|---|---|
| Header | Symbol, as in the wallet | Palm/arch app icon |
| **Sidebar** | **Horizontal lockup** under the menu, behind a divider, decorative.<br>**Hidden** when the sidebar becomes a tab bar (≤ 860 px wide) or the window is short (≤ 760 px high), because the header symbol is enough there | — (new) |
| Settings → «حول» | Horizontal lockup + prototype / no-government statement | Palm/arch mark |
| Favicon, `theme-color` | As in the wallet | Palm/arch |
| Page title | `IQDI Verifier — بوابة التحقق المؤسسي (DEMO)` (unchanged) | — |
| Dashboard | Branded through the header and sidebar only. No large logo inside the working area | — |

**Unchanged:**
- request creation;
- session results;
- the simulation logic;
- reject and expiry states;
- per-organisation data separation;
- API contracts and trust adapters.

## Reusable assets for future work (not started)

The primary, horizontal and monochrome masters and the PNGs are ready for:
- a future project website;
- a government presentation deck;
- modern project documents;
- a demo opening screen.

**None of those was built** (that is TASK-14 or later).
