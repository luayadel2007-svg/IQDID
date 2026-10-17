# IQDI_DESIGN_TOKENS

There is one source per layer:
- **Artwork palette:** `tools/branding/generate_brand.py` (`ORIGINAL`, `DARK`).
- **UI brand tokens:** `packages/ui/src/tokens.ts` → `tokens.brand`, mirrored as CSS custom properties `--iqdi-*` in `packages/ui/src/styles.css`.

The values started from the request's reference values. They were then adjusted by eye against the approved image. **They are not instrument-measured samples:** the reference is a lit 3-D render, so no single pixel is "the" colour.

## UI brand tokens (`tokens.brand`, `--iqdi-*`)

| Token | Value | Reference value in the request | Use |
|---|---|---|---|
| `navy` / `--iqdi-navy` | `#0B2450` | `#0B2450` | Wordmark, app-icon background, PWA `theme_color`, header `theme-color` |
| `blue` / `--iqdi-blue` | `#1E5AA8` | `#1E5AA8` (Digital Blue) | Rivers in the app icon, accents |
| `tile` / `--iqdi-tile` | `#1A4590` | — | Babylonian tile blue in the Original mark (deeper than Digital Blue, closer to the reference cobalt) |
| `gold` / `--iqdi-gold` | `#D4AF37` | `#D4AF37` | Artwork gold (gradient mid-stop) |
| `goldOnDark` / `--iqdi-gold-on-dark` | `#E3BE55` | — | Gold on night navy (Dark artwork, large text) |
| `ivory` / `--iqdi-ivory` | `#F8F6F1` | `#F8F6F1` | Original background, arch opening in the app icon |
| `night` / `--iqdi-night` | `#0D1B33` | — | Dark background: a night navy instead of black |

The app UI keeps its existing V3 tokens (`tokens.color.light/dark`). The brand tokens are added alongside them, and the app's colour system was not replaced.

## Artwork palettes

| Role | Original | Dark |
|---|---|---|
| Tiles / tile grid | `#1A4590` / `#143A7C` | `#2457AE` / `#1C4793` |
| Gold gradient (hi · mid · lo) | `#E9CB72` · `#D4AF37` · `#A9842C` | `#F5DC8E` · `#E3BE55` · `#BC9334` |
| River 1 (top → bottom) | `#2A66BC` → `#163F86` | `#4A8BE3` → `#2E68C4` |
| River 2 (top → bottom) | `#2A66BC` → `#163F86` | `#3471CD` → `#21529F` (deliberately different from river 1) |
| Fronds | `#2A5DB0` → `#14387A` | `#3A72CC` → `#1F4F9F` |
| Trunk | `#0B2450` | `#183766` (lighter than the night background) |
| «IQDI» wordmark | `#0B2450` fill, `#C39A33` rim | Gold gradient `#F7E3A1` → `#C79E3C`, `#F5DC8E` rim |
| Arabic name / tagline | `#0B2450` / `#0B2450` | `#EBD9A0` / `#D9C48A` |

## Measured contrast (WCAG relative luminance)

| Pair | Ratio | Rule |
|---|---|---|
| Navy `#0B2450` on ivory | **14.07 : 1** | Text: AAA |
| Digital Blue `#1E5AA8` on ivory | **6.31 : 1** | Text: AA |
| Tile `#1A4590` on ivory | **8.46 : 1** | Graphic: ≥ 3 : 1 |
| Gold `#D4AF37` on ivory | **1.95 : 1** | **Never text.** Artwork only, always framing a blue or navy shape |
| Gold line `#C39A33` on ivory | 2.43 : 1 | Decorative frame only; the shapes it frames are ≥ 7 : 1 |
| Gold `#E3BE55` on night `#0D1B33` | **9.63 : 1** | Text and graphic OK |
| Arabic name `#EBD9A0` on night | **12.25 : 1** | Text AAA |
| Tagline `#D9C48A` on night | **10.00 : 1** | Text AAA |
| App-icon gold `#D9B54A` on navy | **7.71 : 1** | Graphic OK |
| App-icon river `#1E5AA8` on the ivory opening | **6.31 : 1** | Graphic OK |
| Dark river 1 `#4A8BE3` on night | 4.99 : 1 | Graphic OK |
| Dark river 2 `#3471CD` on night | 3.59 : 1 | Graphic OK (≥ 3 : 1) |
| Dark tile `#2457AE` on night | 2.50 : 1 | Below 3 : 1 on its own. **The tile body is always outlined by the 12-unit gold frame (9.63 : 1)**, which carries the arch's silhouette |

The unit test `test/brand-assets.test.ts` locks the key pairs: navy and blue text on ivory, gold on night, and the gold-on-ivory restriction.

## Typography tokens

| Use | Font | Weight |
|---|---|---|
| Wordmark «IQDI», tagline | Cinzel (OFL), outlined | 700 / 400 |
| Arabic name in the logo | Noto Sans Arabic (OFL), outlined | 700 |
| App UI (unchanged) | `"Noto Sans Arabic", "Segoe UI", Tahoma, Arial, system-ui` | — |
