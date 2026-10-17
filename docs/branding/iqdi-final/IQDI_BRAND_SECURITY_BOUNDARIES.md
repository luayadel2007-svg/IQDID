# IQDI_BRAND_SECURITY_BOUNDARIES

## What the brand change does **not** touch

- API contracts, the mock services and the demo data.
- `crypto-ports.ts` and the trust adapters, including the `VerifiedByProtocol` brand and its lint guard.
- The consent flow (approve/reject plus confirmation), polling and session handling.
- The «مستمسكاتي» card stack and its interaction.
- Storage. **No new storage keys.** The theme key `iqdid-demo-theme` already existed.
- **No service worker** (the unit test still checks there is no `sw.js`). Nothing is cached for offline use, so no identity data or consent decision can be served from a cache.

## Asset safety (enforced by `test/brand-assets.test.ts`)

Every master SVG:
- contains **no `<script>`, no `on*=` handlers, no `javascript:` and no external `href`**;
- contains **no embedded raster** (`<image>`, `data:image/png|jpeg|webp`, base64). It is a real vector, not a picture wrapped in SVG;
- has **no live `<text>`**: lettering is outlines, so there are no font fetches and no font-substitution surprises;
- stays under **90 KB** and **160 path elements**, which bounds parsing work and rules out an auto-trace dump.

**How the apps load the artwork:**
- Through `<img src>`, which runs SVG in secure static mode: no scripts and no external loads, even if a file were tampered with.
- The artwork is bundled with the app build (Vite asset URLs). Nothing is fetched from a third-party host.

## Wording and identity claims

- The assets, labels, manifest and new UI text contain no «وزارة», «جمهورية العراق», «Ministry», «Republic of Iraq», «Government of Iraq» or «official» (unit test).
- There is no national eagle or state seal. There is no badge implying government approval.
- Every SVG `<title>` and the accessible label say **TEST ONLY** or **نموذج تجريبي**.
- The new About cards state that the system is not linked to any government body and carries no official approval.
- The logo is **not** placed on any identity-card mock-up. The existing demo card keeps its **DEMO** marking.

## Provenance and licences

- The geometry is original vector work in `tools/branding/generate_brand.py`, a redraw of the owner-approved concept.
- Fonts converted to outlines:
  - **Cinzel**, SIL OFL 1.1 (npm `@fontsource/cinzel@5.3.0`);
  - **Noto Sans Arabic**, SIL OFL 1.1, already a dependency.
- The OFL allows embedding outlines in artwork; no font file is redistributed.
- The lion is a stylised drawing inspired by Babylonian glazed-brick art. It is **not** a reproduction of a specific museum object, and no archaeological accuracy is claimed.
- `@fontsource/cinzel` is **not** added to the app's dependencies. It is only needed to regenerate the artwork.

## Secret scanning

The new PNG derivatives and SVGs went through the repository's own scanner:
- `secrets-diff`;
- `secrets-all-index`, whose PNG chunk walker validates every chunk and scans the text chunks.
