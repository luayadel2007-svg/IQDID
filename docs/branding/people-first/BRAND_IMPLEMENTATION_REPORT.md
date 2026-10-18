# BRAND_IMPLEMENTATION_REPORT: IQDI «People First — Human Centered»

**IQDI — Iraqi Digital Identity · الهوية الرقمية العراقية.** TEST ONLY: an independent prototype, not linked to or approved by any Iraqi government body.

## 1. What changed

The owner replaced the earlier palm/Ishtar-arch identity with the **People First** human symbol:
- a head circle;
- a royal-blue band with a folded top;
- a deep-navy body;
- a gold leaf rising to the upper right;
- an open V between the head and the body.

The meaning: the citizen is the centre of the identity system, and institutions exist to serve them.

The People First symbol is now the **single mark of the IQDI ecosystem**: IQDI Wallet and IQDI Verifier use the same symbol, next to their own names.

## 2. Repository state checked first

| Item | Finding |
|---|---|
| PRs #5–#14 | All **open drafts**, stacked, none merged. Base chain: #14 → #13 (TASK-13) → #12 → #11 → #10 → #9 → #8 → … |
| PR #14 (`branding/iqdi-identity-finalization`, `fb4ce80`) | CI green (run 39016564120). Contains the useful engineering: the `IQDIBrand` component, generator plus render pipeline, asset tests, the `browser-brand` verify step, and visual-regression tooling |
| TASK-13 head | `9a5a137` (PR #13), CI green (run 38982652564) |

## 3. Git strategy and why

- **New branch `branding/iqdi-people-first-final`, created from `fb4ce80`** (PR #14's head). The new Draft PR is stacked on PR #14 (base `branding/iqdi-identity-finalization`).
  - **Why:** PR #14's engineering is reused, not rewritten; only the artwork and its wiring change.
  - **Why:** PR #14 stays intact as a record of the earlier direction. The owner can merge #14 then this PR, or close #14 and merge this PR's combined diff onto #13.
  - **Why:** no cherry-picking or history rewriting is needed.
- **Not done:** no force push, no hard reset, no merge, no repository rename. `@iqdid/*` identifiers are kept.
- **Old identity:** archived, not deleted:
  - assets: `git mv` to `assets/branding/archive/palm-arch-v1/`;
  - generator: `tools/branding/archive/generate_palm_arch_v1.py`;
  - old reports: unchanged, plus `docs/branding/iqdi-final/SUPERSEDED.md`.

## 4. Delivered

| Area | Files |
|---|---|
| Generator | `tools/branding/people_first.py`: one parametric geometry; text converted to outlines (Montserrat 700/600/400 and Noto Sans Arabic Bold, both SIL OFL 1.1; Arabic shaped with HarfBuzz) |
| Vector masters (14) | `assets/branding/people-first/`:<br>• primary: light, dark, monochrome<br>• horizontal: light, dark, monochrome<br>• symbol: light, dark, monochrome<br>• compact symbol: light and dark<br>• app icon: light and dark<br>• favicon |
| PNG derivatives (43) | `assets/branding/people-first/png/`. App icons at 16–1024 in both tones; symbol, primary and horizontal at the useful sizes. Rendered in Chromium from the SVGs |
| App icons | Wallet PWA `icon-192`, `icon-512`, `icon-maskable-512`, `apple-touch-icon`. `favicon.svg` and `favicon-32.png` for **both** apps |
| Component | `IQDIBrand` gains `horizontal`, `compact` and `tone="monochrome"`; `mark` is kept as an alias of `symbol`. It follows the active theme. `BrandMark` keeps its API |
| Tokens | `tokens.brand` and `--iqdi-*`: navy `#0B2A4A`, blue `#1565C0`, gold `#D4A853`, gold-on-dark `#E0B867`, off-white `#F8F7F4`, night `#0B1F38` |
| Apps | See `WALLET_VERIFIER_INTEGRATION.md` |
| Tests | `test/brand-people-first.test.ts` (39); `IQDIBrand` component tests (6); `scripts/brand-check.mjs` (73 browser checks, required step `browser-brand`); archive guard `test/brand-assets.test.ts` (old files stay safe vectors) |
| Docs | This folder, with QA and comparison images in `images/` |

## 5. Regenerate

```bash
npm pack @fontsource/montserrat@5.3.0 && tar xzf fontsource-montserrat-5.3.0.tgz
pip install fonttools uharfbuzz brotli
python3 tools/branding/people_first.py --montserrat-dir package/files   # SVG masters
node scripts/brand-assets.mjs --png --qa docs/branding/people-first/images
npm run build && node scripts/brand-visual.mjs branding/people-first/visual/after
```

## 6. Not touched

- API contracts, mock services and data.
- `crypto-ports.ts`, the trust adapters and `VerifiedByProtocol`.
- Consent (approve/reject) and session logic; verifier request creation, results, expiry and per-organisation separation.
- «مستمسكاتي» and the card stack.
- Storage. There is still **no service worker**.
- TASK-14 and TASK-15 were not started.
