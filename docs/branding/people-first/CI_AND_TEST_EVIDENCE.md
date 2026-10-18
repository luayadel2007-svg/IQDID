# CI_AND_TEST_EVIDENCE

## Local full verification (this branch, final assets)

`npm run modernization:verify`, Chromium 141, Linux container. Evidence is in `evidence/branding/people-first/verify/*`; the historical evidence directories were not touched.

| Step | Result |
|---|---|
| typecheck, lint, compatibility, build | PASS |
| Vitest | **244/244** (floor raised 205 → 244) |
| browser-regression (cross-app e2e) | **12/12** |
| browser-ux (axe, 0 violations) | **20/20** |
| browser-wallet | **16/16** |
| browser-verifier | **14/14** |
| browser-pdf-ux (design audit) | **27/27** |
| browser-scenarios (TASK-11) | **9/9** |
| browser-responsive (TASK-13 matrix) | **286/286** |
| **browser-brand** (required) | **73/73** (floor raised 68 → 73) |
| perf-measure | PASS |
| coverage-guard | PASS |
| secrets-diff, secrets-all-index | PASS (the new SVGs and PNGs are scanned) |

## New and changed tests

| Test | What it proves |
|---|---|
| `test/brand-people-first.test.ts` (39) | The asset set exists:<br>• each master is a real vector (no raster, no script, no live text, bounded size);<br>• no endorsement wording and no archived motif;<br>• one symbol everywhere;<br>• Light and Dark share their geometry;<br>• Dark has its own palette;<br>• monochrome is one colour with knock-outs;<br>• the tagline appears only in the primary logo;<br>• the compact mark is simplified.<br>It also covers PNG sizes and ratios, manifest icons, both favicons, the theme colour, no service worker, no live reference to the old identity, and token contrast |
| `packages/ui/src/ui.test.tsx` (6 brand tests) | Logo naming and ratio; Light/Dark switch; fixed tone; decorative header symbol; horizontal and compact variants; monochrome tone; `mark` alias |
| `scripts/brand-check.mjs` (73 browser checks) | Against the production builds:<br>• favicons and manifest icons;<br>• the header symbol at 320, 768 and 1440 px in light and dark (inside the header, clear of the name, decorative, name announced once);<br>• the welcome logo and About lockups at 4 widths, with a live theme toggle;<br>• the verifier sidebar lockup at 5 window sizes;<br>• no broken images or failed requests on 14 routes |
| `test/brand-assets.test.ts` | Re-pointed at the archive, so the archived identity stays safe |

**Mutation checks:**
- Putting the archived icon back as the verifier favicon fails the favicon test.
- Ignoring the theme in `IQDIBrand` fails 2 unit tests.

Nothing was weakened:
- no test deleted;
- no skip;
- no `continue-on-error`;
- no floor lowered.

## GitHub Actions

CI for this PR's head (Ubuntu and Windows `verify`, plus Firefox/WebKit `cross-browser`) is recorded in the PR thread once it completes. No CI success is claimed before that.
