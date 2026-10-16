# TASK13_FINAL_CI_RECOVERY

TEST ONLY. This report records how the last TASK-13 CI failure was diagnosed and fixed, with the evidence.

## 1. Failure

- **Run:** [38970334466](https://github.com/luayadel2007-svg/IQDID/actions/runs/38970334466), commit `23cd345`, job `verify (ubuntu-24.04, /usr/bin/google-chrome)`.
- **Windows** and **cross-browser** (Firefox, WebKit) passed in the same run.

Original log (Ubuntu job, `Modernization checks` step):

```
browser-responsive: FAIL (exit 1)
FAIL chromium wallet portrait 1920x1200 /requests/:pending: error locator.click: Timeout 30000ms exceeded.
PWA chromium: manifest OK; installability errors: [{"errorId":"in-incognito","errorArguments":[]}]
RESPONSIVE MATRIX: 284 PASS / 1 FAIL {"chromium":{"pass":284,"fail":1}}
perf-measure: PASS (exit 0)
coverage-guard: FAIL (exit 1)
COVERAGE GUARD: FAIL
- responsive: not every step passed
```

The `in-incognito` line is informational. Playwright contexts are incognito, so Chrome reports it; it is not a check failure and was not counted.

## 2. Diagnosis, step by step

| Step | What was done | Result |
|---|---|---|
| 1 | Re-ran the full matrix locally, three times | 285/285 each time. Not reproducible on the container's Chromium build |
| 2 | Read the failing check's code | A hit test on «رفض» had passed just before the click, so nothing covered the button at that moment. Only the first line of Playwright's error had been kept |
| 3 | Commit `8cdded8`: on any check error, keep Playwright's full call log and a `fail-*.png` capture | Diagnostics only. Checks and thresholds unchanged |
| 4 | CI [38972130236](https://github.com/luayadel2007-svg/IQDID/actions/runs/38972130236) on `8cdded8` | Failed again, now with the call log: `element is not stable`, retried 60× for 30 s. The button was **moving continuously**; nothing was covering it |
| 5 | Looked for continuous motion | No infinite animation on that page. The candidate was the header: `AppShell` set `data-scrolled` at `scrollY > 8` and cleared it below that. The compact header is 8–12 px shorter |
| 6 | Reproduced locally: request page at 1920 wide, viewport heights chosen so the page can scroll 4–60 px | At scroll ranges of 10–16 px the header flipped **8–24 times in 2 s** and `scrollY` bounced. That is a feedback loop: compacting shortens the page, the scroll drops under 8, the header expands, and scroll anchoring pushes the scroll back up |

**Classification:** an **application defect** (header jitter visible to users), not a locator, harness or timing problem. The test was right to fail. The matrix check scrolls to the bottom of the page and to the consent buttons, which put the 1920×1200 request page in the oscillating range. With Ubuntu's font metrics the page lands at exactly that height.

**coverage-guard** was checked separately. Its only finding was `responsive: not every step passed`, so it failed only because the responsive step failed. No floor, file or OS check was involved.

## 3. Fix (commit `de88397`)

| File | Change |
|---|---|
| `packages/ui/src/shell.tsx` | Hysteresis: compact above 32 px, expand only at 8 px or less. The 24 px gap is wider than the 12 px height change, so the loop cannot start |
| `packages/ui/src/ui.test.tsx` | New unit test covering the two thresholds |
| `scripts/responsive-matrix.mjs` | New check `header-stability`: wallet request page at 1920 wide, scroll ranges 6/10/12/14/16/20/24/30/34/40 px, **0 flips allowed** in 1 s. It also keeps the call-log diagnostics from `8cdded8` |
| `scripts/ci-coverage-floors.json` | Floors raised: responsive 285 → **286**, Vitest 183 → **184**. Nothing lowered |
| `test/ecosystem-ui.test.tsx` | Server-backed `findBy*` lookups that used the 1 s default now wait 4 s, like the rest of the file; one timed out under load during a full local run. Assertions unchanged |
| `docs/task13/*` | Counts and the fix recorded |

**Not done:**
- no timeout raised on the failing click;
- no scenario removed or skipped;
- no `continue-on-error`;
- the matrix is not reduced; it went from 285 to 286.

**Mutation checks:**
- With the old single threshold restored, the new unit test fails.
- With the old threshold restored, `header-stability` fails at scroll ranges 12, 14 and 16 px (10–11 flips/s).

## 4. Repeated outcomes after the fix

The full matrix was run three times on `de88397`, Chromium 141, locally:

| Run | Result | `header-stability` flips at ranges 6→40 px |
|---|---|---|
| 1 | 286/286 PASS | 0 0 0 0 0 0 0 0 0 0 |
| 2 | 286/286 PASS | 0 0 0 0 0 0 0 0 0 0 |
| 3 | 286/286 PASS | 0 0 0 0 0 0 0 0 0 0 |

A full local `npm run modernization:verify` passed every step (Vitest 184, matrix 286/286, coverage guard PASS).

## 5. CI on the fixed commit

Run [38975399781](https://github.com/luayadel2007-svg/IQDID/actions/runs/38975399781), commit `de88397de1a80a51104b96a6419247616efb0a65`:

| Job | Result |
|---|---|
| verify ubuntu-24.04 (Google Chrome) | **SUCCESS**: every modernization step, including the responsive matrix and coverage guard |
| verify windows-2022 (Google Chrome) | **SUCCESS** |
| cross-browser (Playwright Firefox + WebKit) | **SUCCESS**: `RESPONSIVE MATRIX: 562 PASS / 0 FAIL`; Firefox 281/281, WebKit 281/281 |

**Engine versions:**
- Recorded per row (`browserVersion`) in the run artifact `task13-cross-browser-38975399781` (`matrix.json`).
- The artifact could not be downloaded from the development container (egress refused), so they are not quoted here.

## 6. Final HEAD and status

- **Code verified by CI:** `de88397`.
- **This report's commit:** documentation only. Its own CI result is recorded in PR #13.
- **TASK-13 status:** **CLOSED FOR TESTED WEB TARGETS**, on the condition that the CI for this report's commit is also green.
- **Branch:** the fix was committed on the TASK-13 branch `feature/iqdi-task13-universal-experience` (Draft PR #13). It was made there, before the branding request arrived, so no separate fix branch was created. The branding work starts from that green point on its own branch.

## 7. Open limitations (unchanged)

- WebKit is Playwright's Linux build, **not Safari**.
- No physical phones or tablets.
- No macOS or iOS.
- No manual screen-reader testing.
- Firefox and WebKit performance not measured.

All of these are recorded as NOT RUN in `KNOWN_LIMITATIONS.md` and `DEVICE_AND_OS_SUPPORT_MATRIX.md`.
