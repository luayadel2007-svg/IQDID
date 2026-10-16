# BROWSER_COMPATIBILITY_TESTS

Only engines that actually ran are listed with a result. Engine **versions** come from `browser.version()`, recorded in each run's `matrix.json`.

| Platform | Browser | Version | Screens | Test type | Result | Limitations |
|---|---|---|---|---|---|---|
| Linux (container, kernel 6.18) | Chromium (Playwright build) | 141.0.7390.37 | 15 widths, 320–2560 + 11 modes | Full verify: 12 e2e, 20 UX/axe, 16 wallet, 14 verifier, 27 PDF audit, 9 scenarios, **285 matrix checks** | **PASS (all)** | Emulated devices; not a physical phone or tablet |
| Linux (GitHub ubuntu-24.04) | Google Chrome (runner) | Runner image version, in the CI log | Same as above | Same full verify, in CI | See the PR #13 checks for the TASK-13 commit | Hosted runner |
| Windows Server 2022 (GitHub windows-2022) | Google Chrome (runner) | Runner image version, in the CI log | Same as above | Same full verify, in CI | See the PR #13 checks | Hosted runner; no local Windows run |
| Linux (GitHub ubuntu-24.04) | **Firefox** (Playwright Gecko build) | In `task13-cross-browser` artifact | 15 widths + modes + journeys + PWA manifest | Matrix (`IQDI_BROWSERS=firefox`) | See the PR #13 check `cross-browser` | No touch or DPR emulation in Firefox (mouse journeys). Desktop Firefox does not install PWAs |
| Linux (GitHub ubuntu-24.04) | **WebKit** (Playwright build) | In the same artifact | Same | Matrix (`IQDI_BROWSERS=webkit`) | See the PR #13 check `cross-browser` | **Not Safari** and not on macOS/iOS. The WebKit engine shares the layout code but differs from Safari in features, fonts and OS integration |
| macOS | Safari / Chrome / Firefox | — | — | — | **NOT RUN** | No macOS environment |
| iOS / iPadOS | Safari | — | — | — | **NOT RUN — PHYSICAL DEVICE REQUIRED** | — |
| Android | Chrome | — | — | — | **NOT RUN — PHYSICAL DEVICE REQUIRED** | — |
| Android | Samsung Internet, others | — | — | — | **NOT RUN** | — |

## Why Firefox and WebKit run in CI only

The development container cannot download Playwright's Firefox or WebKit builds (download refused). GitHub's hosted Ubuntu runner can. The new `cross-browser` job installs both with system dependencies and runs the same matrix. A failure there fails the job; there is no `continue-on-error` anywhere in the workflow.

The final results for the TASK-13 commit are recorded in the PR #13 thread once CI completes.
