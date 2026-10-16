# DEVICE_AND_OS_SUPPORT_MATRIX

**Legend:**
- **SUPPORTED AND TESTED**: automated tests ran on that engine/OS and passed.
- **SUPPORTED WITH LIMITATIONS**: expected to work but only partly tested.
- **PLANNED**
- **RESEARCH ONLY**
- **NOT SUPPORTED**
- **BLOCKED BY PLATFORM POLICY**

"Emulated" means a CSS viewport, touch and DPR emulated in a desktop engine. **It is not a physical device.**

## Web apps (IQDI Wallet, IQDI Verifier)

| Platform | Engine / browser | Evidence | Status |
|---|---|---|---|
| Linux desktop | Chromium 141 (Playwright build) | All suites + 285-check matrix (local) + CI ubuntu-24.04 with Google Chrome | **SUPPORTED AND TESTED** |
| Windows desktop | Google Chrome (CI windows-2022) | All verify suites incl. matrix on hosted Windows | **SUPPORTED AND TESTED** (CI only; no local Windows run) |
| Linux desktop | Firefox (Gecko, Playwright build) | Matrix + journeys on CI ubuntu-24.04 (`cross-browser` job) | See `BROWSER_COMPATIBILITY_TESTS.md` for the result on the TASK-13 commit |
| Linux desktop | WebKit (Playwright build) | Matrix + journeys on CI ubuntu-24.04 | WebKit engine only. **Not Safari, not macOS, not iOS.** Result in `BROWSER_COMPATIBILITY_TESTS.md` |
| macOS | Safari / Chrome / Firefox | — | **NOT RUN**: no macOS environment. **SUPPORTED WITH LIMITATIONS** (expected, untested) |
| iPhone (iOS Safari) | WebKit | Emulated phone widths and touch in Chromium/WebKit only | **NOT RUN — PHYSICAL DEVICE REQUIRED** |
| Android phone (Chrome) | Blink | Emulated widths/touch/DPR in Chromium | **NOT RUN — PHYSICAL DEVICE REQUIRED** (Chromium emulation PASS) |
| iPad / Android tablets | WebKit / Blink | Emulated 768/820/1024/1180×820 | **NOT RUN — PHYSICAL DEVICE REQUIRED** (emulation PASS) |
| Foldables / split screen | — | Emulated 673×841 (unfolded) and 340 px (split) | **NOT RUN — PHYSICAL DEVICE REQUIRED** (emulation PASS) |
| Older iOS Safari < 17.4 | WebKit | `AbortSignal.any` fallback (TASK-12 M6) | **SUPPORTED WITH LIMITATIONS** (code path; not run on a device) |
| PWA install (wallet) | Chromium | Manifest + icons validated; `Page.getInstallabilityErrors` = `[]` | Installable in Chromium. **Device install NOT RUN** |

## Future platforms

| Platform | Status | Document |
|---|---|---|
| Native iOS / Android wallet | **PLANNED** (blueprint) | `NATIVE_IOS_ANDROID_BLUEPRINT.md` |
| Apple Watch / Wear OS companion (notifications only) | **RESEARCH ONLY** | `SMARTWATCH_FUTURE_ARCHITECTURE.md` |
| Apple CarPlay | **BLOCKED BY PLATFORM POLICY** (no eligible category) | `CARPLAY_ANDROID_AUTO_FEASIBILITY.md` |
| Android Auto | **BLOCKED BY PLATFORM POLICY** | same |
| Android Automotive OS | **NOT SUPPORTED / RESEARCH ONLY** | same |
| NFC, Secure Enclave, Android Keystore, biometrics from the browser | **NOT SUPPORTED** in the web app | Native blueprint |

## Screen matrix (CSS px, both apps, Chromium, all PASS)

| Width | 320 | 360 | 375 | 390 | 414 | 480 | 600 | 768 | 820 | 1024 | 1280 | 1366 | 1440 | 1920 | 2560 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Wallet (8 routes) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Verifier (5 routes) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |

**Extra modes:**
- landscape 844×390, 667×375 and 1180×820;
- unfolded foldable 673×841;
- split-screen 340 px;
- short viewport 1280×600;
- 200 % zoom (640×450 at DPR 2);
- 400 % zoom reflow (320×256 at DPR 4);
- larger text on phone and tablet;
- DPR 3;
- dark mode with reduced motion.

Passing these points is **not** evidence that every screen in the world works.
