# FINAL_ENGINEERING_REVIEW

**Reviewer:** a separate read-only AI agent (another Claude instance), not a human auditor. It reviewed `e593a3e` against base `01dfc74`: diffs, 119/119 Vitest, lint and typecheck. It did not run the browser scripts.

**Scores given before the fixes:** TASK-8 V3 **8/10**; TASK-9 V3 **7/10**. It was not re-run after the fixes, so those scores stand as given.

## Confirmed by the reviewer
- No visible IQDID anywhere; legacy internal identifiers are justified.
- Historical evidence and reports are untouched.
- No test weakened, no skip/only/todo; floors only raised.
- `crypto-ports.ts`, `verification.ts`, `trust.ts` unchanged; no path to VERIFIED_BY_PROTOCOL or a verification tick.
- Display-only credentials cannot answer requests.
- `?decide=reject` never sends without the confirm click.
- The mock change breaks nothing.

## Findings and dispositions (fixed in `437c65a`, re-verified in run 3)

| # | Severity | Finding | Disposition |
|---|---|---|---|
| 1 | Medium | Privacy mode leaked the name and birth date on details; the reveal switch still worked | **Fixed** + test |
| 2 | Medium (a11y) | The card `aria-label` hid expiry, DEMO and display-only from screen readers | **Fixed**: `aria-describedby` per card + test |
| 3 | Low/Med | Focus lost after «رجوع إلى المجموعة» | **Fixed**: focus returns to that card + test |
| 4 | Low | The reject dialog reopened after a reload; no offline guard on confirm | **Fixed**: param consumed once; confirm disabled offline + test |
| 5 | Low | `?view=stack` lost on select | **Fixed** + test |
| 6 | Low | REVOKED missing from the state list | **Fixed** |
| 7 | Low | `.stack` clashed with the layout helper | **Fixed**: `.card-stack` with an explicit gap; geometry re-checked by E2E and screenshots |
| 8 | Trivial | Stale step title; dead branch; `??` fallback on an empty value; README list | **Fixed** |
| — | Note | Contrast is tested on gradient stops only, not the highlight or badges | Not changed; axe on rendered pages (both themes) covers the rendered result |
| — | Note | The details hero is `role=img` | Kept: the content is repeated in the sections below |

## My assessment (self, not independent)
- **TASK-8 V3: 8.5/10.** One shared system for both apps; contrast-tested palette; glass policy enforced. No human design sign-off.
- **TASK-9 V3: 8.5/10.** Stack, list view, details and Back work and are tested in jsdom and a real browser; review findings fixed with tests. No real screen-reader session; the criteria text is truncated after §7.2.

10/10 is not claimed.
