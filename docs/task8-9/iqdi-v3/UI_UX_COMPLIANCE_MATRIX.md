# UI_UX_COMPLIANCE_MATRIX

Criteria: the government beautification criteria text pasted earlier (§1–§7.1; **§7.2 onward BLOCKED**, the paste was truncated and the PDF itself was never provided), plus the V3 brief. PASS = automated evidence; PARTIAL = manual review only or incomplete; NOT RUN.

| Criterion | Wallet | Verifier | Evidence |
|---|---|---|---|
| IQDI brand everywhere visible | PASS | PASS | branding tests + browser step |
| Arabic RTL | PASS | PASS | PDF P1; wallet E2E 11 routes × 3 widths |
| Light / Dark / System | PASS | PASS | UX suite; PDF P11 |
| Glass only on chrome; opaque data | PASS | PASS | CSS policy; P10 (transparency off removes filters) |
| Contrast AA (incl. card palette) | PASS | PASS | axe on all routes × 2 themes; card palette unit test |
| Text scaling / 200 % | PASS | PASS | UX reflow; PDF P14 |
| Reduced motion | PASS | PASS | PDF P12 (every element); card-stack browser step |
| Motion 200–400 ms | PASS | PASS | PDF P3 (countdown ring 1 s → 320 ms in this PR) |
| Core services ≤ 3 clicks | PASS | PASS | PDF P8 measured |
| 5-tab bottom nav, no hidden content | PASS | n/a | V3 test; padding-bottom for the nav |
| Card stack + list alternative | PASS | n/a | 5 unit tests + 2 browser steps |
| Keyboard | PASS | PASS | UX skip link; card Arrow/Enter/Escape |
| Screen reader | PARTIAL | PARTIAL | roles and names asserted; **no real AT session (NOT RUN)** |
| Privacy mode | PASS | n/a | unit test (home, cards, settings) |
| Home without sensitive detail | PASS | n/a | unit test (no ID number, no "verified") |
| Skeleton / error / empty states | PASS | PASS | existing suites |
| Success animation (§5.1) | PASS | NOT RUN | PDF P13 (wallet) |
| Adaptive top bar (§5.4) | PASS | PASS | PDF P9 |
| Save progress (§3) | PARTIAL | PARTIAL | preferences persist; forms do not |
| Low-end devices | PARTIAL | PARTIAL | transform-only motion; no device run |
| §7.2+ | BLOCKED | BLOCKED | truncated text |
