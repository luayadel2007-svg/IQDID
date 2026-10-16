# PWA_FEASIBILITY

**Decision:** implement the **installable shell only**: a web app manifest plus icons. **No service worker, no offline cache.** This is a progressive enhancement; the normal website behaves exactly as before.

## What was implemented

| Item | File | Notes |
|---|---|---|
| Manifest | `apps/wallet-web/public/manifest.webmanifest` | `name`, `short_name`, `description` (states DEMO / TEST ONLY), `lang: ar`, `dir: rtl`, `start_url` and `scope` `/`, `display: standalone`, theme and background colours |
| Icons | `apps/wallet-web/public/icons/` | 192 and 512 px (`any`), 512 px `maskable` (safe zone), 180 px `apple-touch-icon`. Drawn from the IQDI brand mark |
| HTML | `apps/wallet-web/index.html` | `<link rel="manifest">`, `apple-touch-icon`, `apple-mobile-web-app-title`, `viewport-fit=cover` |

## Verification (automated, real browser)

`scripts/responsive-matrix.mjs` → mode `pwa-manifest`. It checks that:
- the manifest is served (HTTP 200) and its required fields are correct;
- every icon loads and its **actual** pixel size equals its declared `sizes`;
- a 192 px and a 512 px maskable icon exist;
- **no service worker is registered**;
- the apple-touch-icon link is present.

Chromium only: the DevTools Protocol `Page.getInstallabilityErrors` returns **`[]`**, meaning Chromium reports the page as installable. This is Chromium's own installability check in this environment. **Installing on a real Android or iOS device was NOT RUN (physical device required).**

## Why no service worker (threat model)

| Risk | With an offline cache | Decision |
|---|---|---|
| Stale identity or verification state shown as current | A cached request or decision could look live | Not acceptable: the demo/protocol separation depends on live server state |
| Identity data at rest in the browser cache | Credential data would sit in Cache Storage | Not acceptable without encryption, a threat model and governance |
| "Approve while offline" | Implies queued consent | **Not offered.** The protocol does not support queued consent; the wallet already disables decisions while offline |
| Update problems (old app version cached) | Needs a versioning strategy | Avoided |

A future service worker could cache **only the static app shell** (JS/CSS/fonts, never API responses) with a network-only rule for `/demo-api/`. That needs an explicit decision and tests. It is not done here.

## Browser support (as relevant to this implementation)

| Browser | Install from manifest | Tested here |
|---|---|---|
| Chromium (Chrome, Edge) desktop and Android | Supported | Chromium: manifest and installability API ✔ (container). **Android device: NOT RUN** |
| Safari iOS / iPadOS | "Add to Home Screen" uses `apple-touch-icon`; manifest support varies by version | **NOT RUN (physical device required)** |
| Firefox desktop | Does not install PWAs on desktop; manifest is fetched | Firefox matrix (CI) validates the manifest and icons only |
