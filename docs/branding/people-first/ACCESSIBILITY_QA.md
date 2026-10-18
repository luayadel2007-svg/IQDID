# ACCESSIBILITY_QA

## Accessible names, with no double announcement

| Placement | Markup | Result | Checked by |
|---|---|---|---|
| Header symbol (both apps) | `alt=""` + `aria-hidden="true"` next to the visible app name | «IQDI Wallet» or «IQDI Verifier» announced once | Unit test; browser check at 320, 768 and 1440 px in light and dark: the name occurs once across the header's text plus every exposed `alt` and `aria-label` |
| Verifier sidebar lockup | Decorative (`alt=""`, `aria-hidden`) | Not announced; the header already names the app | Browser check |
| Wallet welcome logo, both About cards | `alt="IQDI — الهوية الرقمية العراقية (نموذج تجريبي)"` | One named image that states it is a prototype | Unit test + browser check |
| Theme switch | `src` changes, `alt` does not | Nothing re-announced | Browser check |
| SVG masters | `role="img"` + `<title>` with TEST ONLY | Named when opened alone | Unit test |

The label contains no «وزارة», «جمهورية» or «رسمي» (unit test).

## Contrast

Measured, WCAG relative luminance:

| Pair | Ratio |
|---|---|
| «IQDI» navy `#0B2A4A` on off-white | 13.57 : 1 |
| English line / tagline `#22324A` on off-white | 12.08 : 1 |
| White «IQDI» on night `#0B1F38` | 16.57 : 1 |
| Arabic name `#F3F1EC` on night | 14.68 : 1 |
| English line `#D9DEE6` on night | 12.26 : 1 |
| Gold `#E0B867` on night | 8.85 : 1 |
| Gold `#D4A853` on off-white | **2.06 : 1: never used for text** (only the decorative rule and artwork) |

**Graphic contrast:** the symbol's silhouette is ≥ 3 : 1 on its intended background:
- in Light, the body is 16 : 1, the band 3.6 : 1 and the head 3.6 : 1;
- in Dark, the head is 5.4 : 1, the band 5.9 : 1 and the gold 8.9 : 1.

The Dark navy body alone is 1.46 : 1 and is disclosed in `LIGHT_DARK_AND_MONOCHROME.md`.

## Layout, zoom, RTL, keyboard

- The full TASK-13 responsive matrix (**286** checks) runs with the new brand in place:
  - 320–2560 px;
  - landscape, foldable, split screen, short windows;
  - 200 % and 400 % zoom/reflow;
  - large text, device pixel ratio;
  - dark mode with reduced motion.
- The brand check confirms:
  - the logos and lockups are inside the viewport with no horizontal overflow at 320, 390, 820 and 1440 px;
  - the header symbol sits inside the header and clear of the app name;
  - the sidebar lockup is fully visible or hidden, never clipped.
- The page direction is unchanged (RTL). The logo artwork is not mirrored, as is standard for logos.
- The brand images are not focusable (`<img>`, no tabindex), so keyboard order is unchanged. Keyboard journeys in the matrix and UX suites still pass.
- axe-core (the UX suite) still reports 0 violations.
- **Motion:** the brand adds none.

## Not done

- **No manual screen-reader session** (NVDA, JAWS, VoiceOver, TalkBack).
- No low-vision user test.
