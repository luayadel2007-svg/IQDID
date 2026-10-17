# IQDI_BRAND_IMPLEMENTATION

**IQDI — Iraqi Digital Identity · الهوية الرقمية العراقية.** TEST ONLY prototype, not government-approved.

- **Branch:** `branding/iqdi-identity-finalization`, from the green TASK-13 point (`9a5a137`, which contains `de88397`).
- **PR:** Draft, base `feature/iqdi-task13-universal-experience`.

## 1. Scope

The owner chose one visual identity for the whole IQDI ecosystem:
- the Iraqi palm;
- an Ishtar-gate arch;
- the Tigris and Euphrates;
- a Babylon lion;
- Babylonian blue and gold.

This change does four things:
- turns that concept into a **brand asset system** of editable vectors, derived rasters and app icons;
- applies the owner's refinements: smaller dates, one lion, two clean rivers, a real Dark variant and a simplified icon;
- **integrates** the brand into IQDI Wallet and IQDI Verifier through one shared component;
- adds tests and evidence.

**Not changed:**
- API contracts, mock services, crypto ports and trust adapters;
- the consent flow;
- «مستمسكاتي» and the card-stack interaction;
- page layouts;
- storage. No service worker was added.

## 2. What was delivered

| Area | Files |
|---|---|
| **Generator** (single source of geometry) | `tools/branding/generate_brand.py`: parametric palm, arch, rivers, lion, dates; text to outlines (Cinzel, Noto Sans Arabic, HarfBuzz shaping); Original, Dark and monochrome palettes; simplified icon |
| **Vector masters** | `assets/branding/iqdi-logo-{original,dark,monochrome}.svg`, `iqdi-mark-{original,dark,monochrome}.svg`, `iqdi-icon-small.svg`, `iqdi-app-icon.svg` |
| **Derived PNGs** | `assets/branding/png/`: logo 512/1024, mark 256/512/1024, monochrome, and icons at 16–1024. Rendered in Chromium by `scripts/brand-assets.mjs --png` |
| **App icons** | Wallet PWA icons 192, 512 and maskable 512, apple-touch 180; `favicon.svg` + `favicon-32.png` for **both** apps |
| **Shared component** | `packages/ui/src/IQDIBrand.tsx`: `variant` (`symbol`, `mark`, `logo`), `size`, `tone` (`auto`, `light`, `dark`), `label`, `decorative`. Follows the active theme. `BrandMark` is kept as a compatibility wrapper |
| **Tokens** | `tokens.brand` in `packages/ui/src/tokens.ts`, plus `--iqdi-*` CSS custom properties |
| **Tests** | `test/brand-assets.test.ts` (17), 4 `IQDIBrand` tests in `packages/ui/src/ui.test.tsx`, and the browser check `scripts/brand-check.mjs` (new **required** verify step `browser-brand`, floor 68) |
| **Evidence tooling** | `scripts/brand-visual.mjs`: real before/after captures of both apps and comparison sheets |
| **Docs** | This folder (11 reports + guidelines + images) and the README header |

## 3. Where the brand appears

| App | Placement | Variant | Notes |
|---|---|---|---|
| Wallet + Verifier | Header (`AppShell`) | `symbol`, 40 px (34 px compact), decorative | Replaces the old generic diamond mark; the app name is still read once |
| Wallet + Verifier | Browser tab | `favicon.svg` + 32 px PNG | Replaces the inline «IQDI» text favicon |
| Wallet + Verifier | `theme-color` | `#0B2450` | — |
| Wallet | `/welcome`, first step | `logo`, 232 px, named | The onboarding steps are unchanged below it |
| Wallet | PWA manifest | New icons; `theme_color` `#0B2450` | Still no service worker |
| Wallet | Settings → «حول» | `mark`, 112 px | Text states it is a prototype ecosystem, not linked to any government body, with no official approval |
| Verifier | Settings → «حول» (new card) | `mark`, 112 px | Same statement |
| Repository | `README.md` | Logo PNG (Original; Dark via `prefers-color-scheme`) | — |

**Deliberately not added:**
- logos on every page;
- a verifier "login" screen (none exists, and none was invented);
- landscape or cinematic backgrounds;
- 3-D or animated effects;
- the logo on any identity-card mock-up.

## 4. How to regenerate

```bash
npm pack @fontsource/cinzel@5.3.0 && tar xzf fontsource-cinzel-5.3.0.tgz   # OFL font, outlines only
pip install fonttools uharfbuzz brotli
python3 tools/branding/generate_brand.py --cinzel-dir package/files       # writes assets/branding/*.svg
node scripts/brand-assets.mjs --png                                       # PNGs, app icons, favicons
node scripts/brand-assets.mjs --qa docs/branding/iqdi-final/images        # QA sheets
npm run build && node scripts/brand-visual.mjs branding/visual/after      # app screenshots
```

## 5. Git

- **Branch:** `branding/iqdi-identity-finalization`. Draft PR only; **not merged**.
- **Fix branch:** the TASK-13 CI fix had already been committed on the TASK-13 branch (see `docs/task13/TASK13_FINAL_CI_RECOVERY.md`). This branch starts from that green commit plus the recovery report.
- **Not done:**
  - no force push;
  - no history rewrite;
  - no historical evidence modified (verify runs here write to `evidence/branding/verify/*`);
  - no repository rename;
  - the `@iqdid/*` identifiers are kept.
