# ACCESSIBILITY_VALIDATION

This document separates **automated** checks (run on the TASK-13 code) from **manual** checks (not available in this environment).

## Automated (PASS)

| Requirement | Evidence |
|---|---|
| Card stack works with tap, mouse and keyboard | Cross-device journeys: phone **touch** (`tap`), desktop **keyboard-only** (`focus` + Enter), tablet touch. Wallet E2E keyboard and Arrow keys. `wallet-cards-v3` tests |
| Visible keyboard focus on the stack | Matrix state check: `:focus-visible` on a card after Arrow key (`state-cards-keyboard-focus-390.png`) |
| Focus restoration and Back | `wallet-cards-v3.test.tsx`, wallet E2E «return to the same card» |
| Swipe is never required | All stack actions are buttons and keys. No swipe handler exists |
| Large text | Matrix modes `text-larger-phone` and `text-larger-tablet` on all key routes: no overflow, overlap or clipped text; nav labels fit |
| 200 % zoom | Matrix `zoom-200` (640×450 @2×) + PDF audit P14 + UX reflow |
| 400 % reflow (WCAG 1.4.10, 320 CSS px) | Matrix `zoom-400-reflow` (320×256 @4×): no horizontal scrolling, nav labels separate, header not sticky at that height |
| Reduced motion | Matrix `dark+reduced-motion`; P12 (every element static); verifier E2E |
| Reduced transparency | P10, UX suite |
| Contrast, light and dark | axe WCAG 2.2 AA (UX suite: 23 routes × 2 themes; verifier E2E: 12 states × 2): 0 violations |
| Screen-reader names | Role and name queries across all Vitest suites; `aria-*` axe rules |
| Consent actions reachable | Matrix: «موافقة تجريبية» and «رفض» hit-tested on every width and mode. The confirmation dialog fits the viewport and its confirm button is hit-testable (phone landscape included) |
| Privacy mode | Matrix state check: the name is hidden on home (`state-privacy-mode-390.png`). TASK-12 L1: preview values are masked |

## Manual

| Assistive technology | Status |
|---|---|
| NVDA (Windows) | **NOT RUN** (no Windows desktop with NVDA) |
| JAWS | **NOT RUN** |
| VoiceOver (iOS, macOS) | **NOT RUN — PHYSICAL DEVICE REQUIRED** |
| TalkBack (Android) | **NOT RUN — PHYSICAL DEVICE REQUIRED** |
| Switch control, voice control | **NOT RUN** |

Automated checks cannot confirm reading order quality, announcement wording or real-world usability. A manual session is required before claiming more than "automated WCAG 2.2 AA checks pass".
