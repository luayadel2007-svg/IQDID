# TASK11_DEMO_SCENARIOS

Repeatable demonstration scenarios. Each one starts from a demo reset, so it can be run alone or in any order.

- **Automated:** `scripts/demo-scenarios.mjs` (`npm run test:scenarios`), a required verify step (`browser-scenarios`).
- **Evidence:** `evidence/task11/scenarios/scenarios.json`. Each scenario records its id, synthetic data, start point, steps, expected and actual results, outcome, screenshots, commit and duration.
- **Screenshots and traces:** git-ignored PNG files and Playwright traces, delivered in the ZIP package. AI-generated images are not used as evidence.

**Environment for the automated run:**
- the production builds and one demo API;
- `DEMO_SESSION_TTL_MS=12000` and `DEMO_LATENCY_MS=60`;
- Chromium, with the wallet at 390 px and the verifier at 1366 px.

**Result of the TASK-11 run:**
- 8/8 scenarios PASS, plus «no console errors» PASS (9/9);
- the run used the working tree on top of `a103642`, with TASK-11 changes not yet committed (`workingTreeDirty: true` is recorded);
- the run on the pushed TASK-11 commit is the CI run, linked in `TASK11_TEST_EVIDENCE.md`.

---

## Scenario A — Approved demo request (PASS, 5.7 s, Playwright traces recorded)

- **Synthetic data:** org-test-a «مصرف تجريبي (أ)»; AGE_OVER_18; holder TEST-001; national ID cred-test-001 (ACTIVE).
- **Start:** demo reset. Verifier on organisation A; wallet on home.

**Steps**
1. The verifier creates the request through details → review → confirm.
2. The wallet shows «لديك 1 طلب مشاركة بيانات بانتظار قرارك».
3. The citizen opens the disclosure preview.
4. The citizen approves and confirms.
5. The open verifier page updates on its own.
6. Both activity pages are checked.

**Expected**
- The session becomes DEMO_ACCEPTED.
- The verifier shows «موافقة تجريبية — DEMO_ACCEPTED» and crypto layer «غير متحقق منه تشفيرياً».
- `disclosed` holds only `age_over_18`.
- No page makes a protocol claim.

**Actual**
- The session was created through the UI.
- The wallet was notified.
- The preview showed 1 shared and 3 withheld.
- The verifier updated live.
- The API returned DEMO_ACCEPTED with disclosed keys = `age_over_18`.
- Both histories recorded the approval.

**Screenshots:** `A-verifier-created`, `A-wallet-disclosure`, `A-verifier-accepted`, `A-wallet-activity`.
**Traces:** `traces/A-verifier.zip`, `traces/A-wallet.zip`.

## Scenario B — Rejected request (PASS)

- **Data:** org-test-a; IDENTITY_BASIC (3 fields).
- **Steps:** the verifier creates the request and keeps the session page open; the citizen rejects and confirms.
- **Expected:** DEMO_REJECTED; `disclosed: null`; no values on the verifier; results «رفض» = 1; both histories record the rejection.
- **Actual:** as expected. The verifier updated live; `/results?outcome=DEMO_REJECTED` showed «عرض 1 من 1 نتيجة».
- **Screenshot:** `B-verifier-rejected`.

## Scenario C — Expired session (PASS)

- **Data:** org-test-a; AGE_OVER_18; TTL 12 s.
- **Steps:** both apps keep the request open; the TTL passes with no decision; a late decision is sent to the API.
- **Expected:** both apps show «انتهت مهلة الطلب»; the wallet offers no approval; the late decision gets 409 `SESSION_EXPIRED`.
- **Actual:** as expected. The late decision got **409 SESSION_EXPIRED**.
- **Screenshots:** `C-wallet-expired`, `C-verifier-expired`.

## Scenario D — Duplicate decision (PASS)

- **Data:** org-test-a; AGE_OVER_18; two wallet tabs.
- **Steps:**
  1. Tab 2 opens the request, then its refresh is cut, so it shows a stale view.
  2. Tab 1 approves.
  3. Tab 2 tries to reject.
  4. A direct API second decision is sent.
- **Expected:** tab 2 shows «لم يُسجَّل القرار»; the API returns 409 `SESSION_ALREADY_DECIDED`; the session stays DEMO_ACCEPTED with one consent event.
- **Actual:** as expected. The API returned **409 SESSION_ALREADY_DECIDED**; there was 1 consent event.
- **Screenshot:** `D-wallet-duplicate-refused`.

## Scenario E — Multiple organisations (PASS)

- **Data:** org-test-a and org-test-b, one request each (A: age, B: identity).
- **Steps:**
  1. Each organisation creates its request in the UI.
  2. The citizen approves A and rejects B.
  3. Each organisation views its sessions, results, activity, and the other organisation's session URL.
- **Expected:** the wallet lists both with their names; each organisation sees only its own data; the other organisation's session shows «العنصر المطلوب غير موجود.».
- **Actual:** as expected, in both directions.
- **Screenshots:** `E-wallet-two-orgs`, `E-verifier-b-isolated`.

## Scenario F — Network failure and recovery (PASS)

- **Data:** org-test-a; demo-API calls blocked in both browsers (route abort); later the wallet goes offline.
- **Steps:**
  1. The API becomes unreachable.
  2. The citizen tries to approve.
  3. The service returns.
  4. The citizen approves.
  5. The browser goes offline, then back online.
- **Expected:**
  - The verifier shows a stale notice and keeps its data.
  - The wallet reports «لم يُسجَّل القرار» and the state stays PENDING.
  - After recovery the decision succeeds and the verifier shows DEMO_ACCEPTED.
  - While offline, decisions are disabled.
- **Actual:** as expected. The verifier recovered without user action.
- **Screenshots:** `F-verifier-stale`, `F-wallet-decision-failed`, `F-wallet-offline`.

## Scenario G — Credential restrictions (PASS)

- **Data:** demo API restarted with `DEMO_CREDENTIAL_STATUS=SUSPENDED` (national ID cred-test-001 SUSPENDED); org-test-a; AGE_OVER_18.
- **Steps:**
  1. The verifier creates a request.
  2. The citizen opens it.
  3. An approval is attempted through the API.
  4. The citizen rejects.
- **Expected:**
  - The wallet explains «اعتماد الهوية التجريبي موقوف» and disables approval.
  - The API approval gets 409 `CREDENTIAL_NOT_ACTIVE` and the state stays PENDING.
  - Rejection works and reaches the verifier.
- **Actual:** as expected. This scenario found the gap the wallet notice now fills: before TASK-11, approval was disabled with no explanation.
- **Screenshot:** `G-wallet-suspended`.

## Scenario H — Privacy preservation (PASS)

- **Data:** org-test-a; AGE_OVER_18 (1 of 4 claims). Withheld synthetic values: «1990-01-01», «TEST-DOC-0001», «مواطن تجريبي».
- **Steps:** age only is requested; the citizen previews the disclosure and approves; the verifier page and API responses are inspected.
- **Expected:**
  - The preview names the withheld fields without their values.
  - Only «العمر فوق 18 سنة: نعم» reaches the verifier.
  - No withheld value appears in the verifier page, the session JSON or the activity JSON.
- **Actual:** as expected.
- **Screenshots:** `H-wallet-disclosure`, `H-verifier-only-age`.

## Manual presentation

For a live presentation, use the same steps as in `IQDI_DEMO_GUIDE.md` §10. Reset between runs with «إعادة ضبط البيانات التجريبية» or `npm run demo:reset`.
