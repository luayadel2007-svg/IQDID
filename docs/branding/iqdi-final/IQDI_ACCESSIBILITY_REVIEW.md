# IQDI_ACCESSIBILITY_REVIEW

## Accessible naming

| Placement | Markup | Screen-reader result | Checked by |
|---|---|---|---|
| Header symbol (both apps) | `<img alt="" aria-hidden="true">` next to the visible app name | The name «IQDI Wallet» or «IQDI Verifier» is read once; the image is skipped | Unit test `the header symbol is decorative…`; browser check at 320, 768 and 1440 px in light and dark, counting the name in the header's text plus every exposed `alt` and `aria-label` |
| Welcome logo (wallet `/welcome`, first step) | `<img alt="IQDI — الهوية الرقمية العراقية (نموذج تجريبي)">` | One image with a name that states it is a prototype | Unit test + browser check |
| About cards (settings in both apps) | Same label | Same | Browser check |
| Theme switch | The `src` changes; the `alt` stays the same | Nothing new is announced, so there is no duplicate reading | Browser check: same `alt` before and after the toggle |
| SVG masters | `role="img"` + `<title>` with the English name and TEST ONLY | Named when opened on their own | Unit test |

The label never says «رسمي», «وزارة» or «جمهورية» (unit test).

## Contrast

See `IQDI_DESIGN_TOKENS.md`:
- All brand **text** colours meet AA on their intended background; most meet AAA.
- Gold is never used as small text.
- **Graphic** contrast: the arch, rivers and palm reach ≥ 3 : 1 against their background, or are outlined in gold (9.6 : 1 on night navy). The one sub-3 : 1 fill, the Dark tile body, is always gold-framed.

## Layout, zoom and RTL

- The header symbol stays inside the header and does not overlap the app name at 320, 768 and 1440 px (browser check).
- The welcome logo and about marks have **no horizontal overflow** at 320, 390, 820 and 1440 px (browser check).
- The full TASK-13 responsive matrix (286 checks: 15 widths, landscape, foldable, split, short windows, 200 % and 400 % zoom, large text, DPR, dark + reduced motion) still passes with the brand in place. It catches clipping, overlap and overflow anywhere on the main routes.
- The page direction is unchanged (RTL). The artwork is not mirrored: a logo keeps its orientation in RTL and LTR.
- axe-core (the existing UX suite of 20 checks) still passes, with 0 violations.

## Motion

The brand adds **no animation**. The header's compact state uses the existing transition, which is turned off by reduced motion; the TASK-13 hysteresis fix is unchanged.

## Not done

- **No manual screen-reader session** (NVDA, JAWS, VoiceOver, TalkBack). The behaviour above is verified from the DOM and the accessibility attributes, not by listening.
- No test with low-vision users.
