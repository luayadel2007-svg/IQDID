# TASK12_INDEPENDENT_AUDIT

**Code audited:** `564f062` (TASK-11 head), on branch `audit/iqdi-task12`.

**How the audit was done:**
1. A separate read-only audit agent reviewed the code with no edits, builds or test runs, and without seeing my TASK-10/11 reasoning.
2. I re-read the named code path of every finding before accepting it.
3. Each fixed finding has a regression test. The H1, M1 and M3 tests were **mutation-checked**: they fail when the fix is reverted.

Synthetic data only.

## 1. Findings and decisions

| ID | Severity | Finding (verified) | Decision | Evidence |
|---|---|---|---|---|
| H1 | **High** | `Modal` effect depended on `onClose`. Callers pass inline handlers, and the verifier session page re-renders every second (countdown and poll), so the dialog **re-focused its first button every second**. A keyboard user could not stay on «تأكيد الإلغاء», and screen readers re-announced the dialog | **Fixed**: `onClose` is kept in a ref and the effect depends on `[open]` only. Focus that escapes is pulled back into the dialog | `ui.test.tsx` «Modal focus stability» (fails on old code) |
| M1 | Medium | `useAsync` polling could start a new request while a slow one was in flight. An older PENDING response could overwrite a newer DEMO_ACCEPTED, bringing back the decision or cancel UI | **Fixed**: one request in flight per hook | `ui.test.tsx` «polling never overlaps» (fails on old code) |
| M2 | Medium | The verifier UI said «عزل بين المؤسسات» and «لا تظهر جلسات المؤسسات الأخرى», but the organisation is a client-chosen query parameter | **Fixed (wording)**: the UI now says it is a demo filter, not a login. Server-side binding is an owner decision (production IAM) | `ActivityPage.tsx`, `SessionsPage.tsx` |
| M3 | Medium | `x as VerifiedByProtocol` compiled and no rule forbade it. The existing `@ts-expect-error` tests would still pass if the brand were removed | **Fixed**: ESLint rule bans `as` / `<>` / `satisfies` to `VerifiedByProtocol`. A new type test with a complete but unbranded object fails typecheck if the brand disappears | `crypto-contract.test.ts` (mutation: removing the brand → TS2578) |
| M4 | Medium | `.modal` had no max-height or overflow. In phone landscape or with large text, the dialog actions could be clipped | **Fixed** in CSS | TASK-13 matrix: dialog-in-viewport check at 667×375, 844×390, larger text |
| M5 | Medium | `aria-live` on per-second countdown text in the wallet request page and the verifier session page announced every second | **Fixed**: live region removed. The `role="timer"` ring keeps its label | Code review |
| M6 | Medium | `AbortSignal.any` (Safari ≥ 17.4) made every request fail on older iOS | **Fixed**: `anySignal()` fallback | Transport tests (all pass) |
| M7 | Medium | The full-index secret scan was BLOCKED (PNG) and optional, so it never gated CI | **Fixed**: PNG chunk scanning; step now **required** | `TASK12_SECRET_SCANNER_STATUS.md`, 12 tests |
| P1 | Medium (measured) | Wallet home CLS ≈ 0.14–0.17. While loading it also briefly showed «لا توجد طلبات», which was wrong | **Fixed**: loading state instead of the wrong empty text; reserved heights | CLS 0.171 → **0.034** (`perf.json`) |
| L1 | Low | Privacy mode did not mask claim values in the request preview or disclosure page | **Fixed**: `PrivateValue` | Code review; privacy E2E unchanged |
| L3 | Low | The demo API accepted cross-site POSTs, so any page could reset the demo | **Fixed**: POSTs with a foreign `Origin` are refused; loopback and origin-less clients are unaffected | `server.test.ts` (new) |
| L6 | Low | The desktop sidebar could not scroll on short viewports or with large text | **Fixed** (`overflow-y: auto`) | TASK-13 short-viewport mode |
| L8 | Low | A refusal message stayed visible after navigating to another request | **Fixed**: reset when `id` changes | Code review |
| T1 | Low (test) | The verifier «no protocol claim» test asserted after a fixed 200 ms sleep and checked text only | **Fixed**: waits for the rendered state and checks `aria-label`s too | `verifier-task10.test.tsx` |
| T2 | Low (CI) | Package test files were not required by the coverage guard. The OS check was a substring match | **Fixed**: 6 package test files are required; the OS check matches a real matrix entry | `ci-coverage-floors.json`, `ci-coverage-guard.mjs` |
| L2 | Low | «Mark all as read» keeps the oldest 200 ids | **Deferred**: needs more than 200 notifications; documented | `TASK12_KNOWN_RISKS.md` |
| L4 | Low | No focus or title change on SPA route change | **Deferred**: the screen-reader pattern needs a design decision; documented | Known risks |
| L5 | Low | Focus can drop to `body` when a confirm button becomes disabled while loading | **Partly fixed**: escaped focus is pulled back into the dialog on the next key press | Known risks |
| L7 | Low | The decision UI hides on client-clock expiry even when the server is still PENDING | **Deferred**: clock-skew handling is a protocol question | Known risks |
| L9 | Low | A slow QR lookup can navigate after the user has left the page | **Deferred** | Known risks |
| L10 | Low | An abort or timeout during body read is reported as a decode error | **Deferred** | Known risks |
| I1 | Info | `viewport-fit=cover` is missing, so the `env(safe-area-inset-*)` values are 0 | **TASK-13** (safe areas) | — |
| I2 | Info | The CI step name says "tests, build, E2E" but only runs `npm ci` | Left as is: a cosmetic rename of a protected workflow step | — |

**Totals:** 0 Critical, 1 High (fixed), 8 Medium (all fixed), 12 Low (7 fixed or partly fixed, 5 deferred), 2 Informational.

## 2. Cross-app integration retest (§3.2)

These were re-run on the TASK-12 code (`evidence/task12/final/`):

- the full journey;
- expiry;
- duplicate decisions;
- multiple organisations;
- suspended and revoked credentials;
- withheld data;
- network interruption;
- retries;
- reload;
- browser-context isolation.

Results:
- Scenarios A–H: 9/9.
- `ecosystem-contract` tests: 18/18. These cover the terminal-state matrix, concurrent decisions, GET-only retry and organisation scoping.
- Wallet E2E 16/16, which includes a reload during review and a stale second tab.
- Verifier E2E: 14/14.
- Cross-app E2E: 12/12.

Each app runs in its own browser context in every suite.

## 3. Trust boundary (§3.3)

The five layers are still separate:
1. application state;
2. demo credential status;
3. consent;
4. demo session outcome;
5. cryptographic verification.

`DEMO_ACCEPTED` and `VERIFIED_BY_PROTOCOL` cannot be confused, because:
- **types:** the brand, now protected from casts by lint;
- **guards:** `isDemoVerificationSession` rejects extra keys;
- **UI text checks:** now also over accessible names.

`crypto-ports.ts` is unchanged (`git diff 564f062 -- packages/api-client/src/crypto-ports.ts` is empty).
