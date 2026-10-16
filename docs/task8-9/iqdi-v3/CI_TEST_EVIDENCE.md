# CI_TEST_EVIDENCE

**Base and head:** base `01dfc74` (PR #7, green on Ubuntu and Windows). Commits: `43a6316` (A), `78966b8` (TASK-8), `e593a3e` (TASK-9), then the docs commit. PR [luayadel2007-svg/IQDID#8](https://github.com/luayadel2007-svg/IQDID/pull/8).

## Local verification (`npm run modernization:verify`, evidence in `evidence/task8-9/iqdi-v3/`)

| Run | Result |
|---|---|
| run 1 | **FAIL**. `browser-wallet` 15/16: the new card-stack step clicked the centre of a covered card, which the next card intercepts, so the click timed out. `coverage-guard` failed as designed. Logs: `final-run1-FAILED/`, `verify-run1.txt`. Fix: the step taps the visible header strip, as a user does. |
| run 2 | **PASS**, every required step exit 0 (`final/commands.json`), at `e593a3e` |
| run 3 | **PASS**, every required step exit 0 (`run3/final/commands.json`), after the review fixes `437c65a`. Vitest 124/124 (+5 regression tests, floor 124); stable over 3 extra full Vitest runs |

| Check | Run 2 |
|---|---|
| typecheck / lint / build | PASS. Wallet JS 105.7 kB gz (was 101.6), verifier 85.0 kB gz |
| Vitest | 119/119 (was 89: +16 branding, +12 cards/privacy/states/nav, +2 palette contrast). Floor raised 89 → 119 |
| cross-app browser E2E | 12/12 |
| UX + axe | 20/20 |
| wallet browser E2E | 16/16 (was 13: +brand, +card stack tap/details/back, +keyboard/reduced motion/list). Floor 13 → 16 |
| PDF audit | 27/27 (dev rounds found and fixed the 1 s ring transition and a 320 px overflow) |
| coverage guard | PASS (11 required files, 11 required steps) |
| secrets-diff | PASS · secrets-all-index BLOCKED (optional; pre-existing PNGs in the base) |

Test changes in existing files are label updates for the renamed tabs («بطاقتي»→«بطاقاتي», «السجل»→«النشاط»), credential count 4 → 5, and new steps. No expectation was weakened; no skip/only/todo was added.

**Hosted CI:** see the PR checks (Ubuntu + Windows); the result is recorded in the final reply.

## Hosted CI round 1 (`1cce084`, Ubuntu): FAIL, root-caused and fixed in the app

`browser-wallet` 15/16. The step "card stack: keyboard + reduced motion + list view" timed out waiting for Escape to deselect, and `coverage-guard` failed as intended.

**Root cause.** The card's key handler used the render-time `selected` value. On a slower CPU, Escape pressed right after the URL changed (before React re-rendered) was ignored. A user with a slow phone hits the same thing.

**Reproduction.** Chrome with 6× CPU throttling:
- old handler: 6/6 Escapes lost;
- reading the DOM attribute: 5/6 lost (the DOM isn't updated yet either);
- final fix, a selection ref set synchronously in `select()` / `deselect()`: **0/6**.

The browser step stays strict: it presses Escape right after the URL change, with no extra wait, so it would catch a regression.
