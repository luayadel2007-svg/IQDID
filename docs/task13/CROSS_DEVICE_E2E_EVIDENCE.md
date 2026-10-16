# CROSS_DEVICE_E2E_EVIDENCE

- **Source:** `scripts/responsive-matrix.mjs` (`npm run test:responsive`, required verify step `browser-responsive`).
- **Evidence:** `evidence/task13/responsive/matrix.json` (Chromium, local) and the CI artifacts `task8-evidence-*` (Chromium/Chrome) and `task13-cross-browser-*` (Firefox, WebKit).
- Production builds, one demo API, synthetic data.

## 1. Cross-device journeys (Chromium 141, local, all PASS)

| Journey | Verifier device | Wallet device | Input | Decision | Steps observed |
|---|---|---|---|---|---|
| phone-touch → tablet verifier | 768×1024 | 360×780, `hasTouch`, `isMobile` | **touch** (`tap`) | ACCEPT | Created on the tablet; opened on the phone by tap; approved and confirmed by tap; verifier updated live; no protocol claim |
| tablet-touch → desktop verifier | 1440×900 | 820×1180, touch | **touch** | REJECT | As above with rejection |
| desktop keyboard-only → small-screen verifier | 390×844 | 1440×900 | **keyboard only** (focus + Enter) | ACCEPT | Verifier create flow on a phone-width screen; wallet decided without a mouse |

The same journeys run on Firefox (mouse instead of touch; touch emulation is unsupported there) and WebKit (touch) in CI.

## 2. Layout matrix (Chromium, local): 285/285 PASS

| Group | Checks |
|---|---|
| Probe self-test (4) | Injected horizontal overflow, overlapping controls, clipped text, and content under the fixed nav. **All detected**, so the probe is not vacuous |
| Portrait width matrix (195) | 15 widths × (wallet 8 routes + verifier 5 routes) |
| Extra modes (74) | Landscape ×3, foldable, split screen, short viewport, zoom 200 % / 400 %, larger text ×2, DPR 3, dark with reduced motion |
| States (1) | Keyboard focus, selected card, privacy mode |
| PWA (1) | Manifest, icons, no service worker, Chromium installability |
| Journeys (3) | Section 1 |

**Each layout check covers:**
- horizontal overflow;
- overlapping controls (clipped to what is visible; page content under the floating nav overlay excluded by design);
- clipped text (x and y);
- off-screen elements;
- navigation visible and labels fitting;
- the last control not stuck under a fixed bar;
- request pages only: consent buttons hit-testable, and the dialog inside the viewport with a reachable confirm button.

## 3. Slow devices, slow and lost networks

| Condition | Where tested |
|---|---|
| CPU throttling 4× | `perf-measure` (loads and interactions) |
| API unreachable, then recovery | Scenarios F; verifier E2E; UX suite («offline API error is visible, retry offered») |
| Browser offline | Wallet E2E (decisions disabled), Scenario F, verifier E2E (offline bar) |
| Failed requests and retry | `ecosystem-contract` (GET retried, POST never), verifier tests (create fails, retry succeeds) |
| Slow polling responses | TASK-12 M1 fix: one request in flight per hook (unit test) |

## 4. Real screenshots (Chromium, production build, synthetic data)

Captures are in `evidence/task13/responsive/screenshots/`. They are git-ignored and delivered in the ZIP package.

**Wallet**
- small phone: `wallet-home-320`, `wallet-cards-320`;
- modern phone: `wallet-home-390`, `wallet-cards-390`, `wallet-requests-review-390`;
- tablet: `wallet-home-820`, `wallet-cards-820`, `wallet-home-1024`, `wallet-cards-1024`;
- desktop: `wallet-home-1440`, `wallet-cards-1440`.

**Verifier**
- small screen: `verifier-home-320/390`, `verifier-sessions-320/390`;
- tablet: `verifier-*-820/1024`;
- desktop: `verifier-*-1440`.

**Specific views**
- «مستمسكاتي» card stack: `wallet-cards-*`;
- card details: `wallet-card-details-light-390`, `wallet-card-details-dark-390`;
- request review: `wallet-requests-review-*`;
- light mode: default captures;
- dark mode: `*-dark-*`;
- large text: `wallet-text-larger-phone`, `wallet-cards-text-larger`, `verifier-text-larger-phone`.

**Accessibility states and other modes**
- accessibility states: `state-cards-keyboard-focus-390`, `state-card-selected-390`, `state-privacy-mode-390`;
- landscape, foldable and 400 % zoom: `*-landscape-phone`, `*-foldable-unfolded`, `*-zoom-400-reflow`;
- journeys: `journey-*`.

**Before/after for the fixes:**
- **Nav labels:** `evidence/task13/before/screenshots/wallet-home-320.png` (labels run together) vs `responsive/screenshots/wallet-home-320.png`.
- **Wallet layout on tablet and desktop:** `before/…/wallet-home-1440.png`, `wallet-cards-1024.png` (phone layout stretched) vs `responsive/…`.
