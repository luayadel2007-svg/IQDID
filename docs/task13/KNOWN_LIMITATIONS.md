# KNOWN_LIMITATIONS (TASK-13)

1. **No physical devices.** Phones, tablets and foldables were emulated, including touch, DPR, landscape and zoom. Every physical-device row is **NOT RUN — PHYSICAL DEVICE REQUIRED**.
2. **No Safari, no macOS, no iOS.** WebKit runs only as Playwright's Linux build in CI, which is not Safari.
3. **Firefox and WebKit run only in CI**, because the container cannot download those engines. Their performance was not measured.
4. **Matrix checks are geometric.** They detect overflow, overlap, clipping and reachability. They do not judge aesthetics. Screenshots were reviewed by eye for the key layouts only.
5. **No manual assistive-technology testing** (NVDA, JAWS, VoiceOver, TalkBack).
6. **PWA:** the app is installable in Chromium. There is no service worker by design, so no offline use. Installing on a device was not run. iOS uses `apple-touch-icon` and was not tested.
7. **Safe areas** are coded (`viewport-fit=cover`, `env()` insets) but untested on notched hardware. Emulators report insets of 0.
8. **At 400 % zoom** (320×256 CSS px), the fixed bottom nav uses about 70 px of 256. Content can still be reached by scrolling. Hiding the nav would remove navigation, so it was kept.
9. **Very narrow screens with larger text:** if the nav labels still do not fit, the bottom nav scrolls sideways instead of overlapping. This was not triggered at the tested points.
10. **Desktop wallet rail and tablet two-column home are new layouts.** They are tested geometrically and in screenshots, but not with users.
11. **Watch, car and native platforms** are studies only (RESEARCH ONLY / PLANNED / BLOCKED). Nothing was built for them, and no platform policy was bypassed.
12. **Localisation** strings are still inline; they must be extracted before any native work.
13. **Wallet home CLS** is 0.048: within budget, but above the verifier's 0.004.
14. TASK-12's open owner decisions (R1 organisation authentication, R2 stack-1 merge) still apply.
