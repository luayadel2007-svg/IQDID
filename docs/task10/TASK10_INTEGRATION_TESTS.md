# TASK10_INTEGRATION_TESTS

All tests run against the latest code: a real demo HTTP server and the real React apps, with no in-app mocks. Browser tests run on the production builds (`vite preview`) in Chromium. TEST ONLY, synthetic data.

## 1. New tests

### `test/verifier-task10.test.tsx` (Vitest + jsdom, 15 tests)

| Area | Test |
|---|---|
| Create request | details → review → confirm. Previews exactly the template fields. Shows the default TTL. Nothing is created before confirmation. «تعديل الطلب» keeps the input. Ends on the session code |
| Create request | The request is created for the organisation chosen in the form (B), not the default (A) |
| Create request | A creation failure (network) shows an error and keeps the form. Retry succeeds |
| Required data and live update | Every required detail is shown (id, organisation, purpose, fields, created, expiry, decision). PENDING → DEMO_ACCEPTED updates without a reload. Five trust layers; the crypto layer reads «غير متحقق منه تشفيرياً» |
| Rejection and cancellation | No values after rejection. Cancel needs confirmation. A second cancel → `SESSION_ALREADY_DECIDED` |
| Expiry | The verifier shows EXPIRED, the timeline and «لا قرار — انتهت المهلة». A late decision → `SESSION_EXPIRED` |
| Many requests | Search, status filter, template filter, sort (newest, oldest, expiry). Live «عرض N من M» count. «لا توجد جلسات مطابقة» |
| Dashboard | Empty state with no KPIs when there is no data. Counts come from the API. Tiles link to `/sessions?status=…`. Organisation B data is excluded |
| Organisation isolation | Organisation B sees none of A's code, purpose or synthetic values on dashboard, sessions, results, activity or detail. The detail page shows «العنصر المطلوب غير موجود.». The API read → `NOT_FOUND` |
| Results | Outcome counts, filter, pending excluded |
| Network failure and recovery | The API goes down after data has loaded: the data stays and a notice is shown; recovery is automatic. A first-load failure shows an error; retry then succeeds |
| Demo/protocol boundary | Layer ids and values are distinct. `demoOutcome` gives `mode: 'demo'`. A stale connection gives a warning tone. A `@ts-expect-error` forged protocol view must fail typecheck |
| Demo/protocol boundary | No verifier screen, in any state, contains VERIFIED, VERIFIED_BY_PROTOCOL or «تم التحقق من الهوية» |
| Model | `filterSessions` is pure for empty input |

### `scripts/verifier-e2e.mjs` (Chromium, 14 steps, `npm run test:verifier`, required verify step `browser-verifier`)

1. Empty dashboard: no invented statistics.
2. Create flow on the UI. The API confirms nothing is created before confirmation.
3. Live DEMO_ACCEPTED on the open page. Five trust layers. No protocol claim.
4. Many sessions: a KPI tile opens the filtered list. Search, filter and sort agree with the API.
5. Results summary and filter.
6. Cancel with confirmation. A late decision on a cancelled session → 409.
7. Expiry while the page is open. A late decision → 409 `SESSION_EXPIRED`.
8. Organisation isolation on 4 routes.
9. API outage: stale notice, data kept, automatic recovery. Browser-offline bar.
10. Keyboard-only create flow, with focus moving to the review step.
11. axe WCAG 2.2 AA: 12 routes or states × light and dark = 24 audits, 0 violations.
12. Responsive RTL at 1366, 1024, 768, 390 and 320 px, plus 200 % text, on 5 routes: no horizontal scroll.
13. Reduced motion: 0 moving elements.
14. No browser console errors.

## 2. Existing tests updated (not weakened)

The create flow has one more step («مراجعة الطلب»). Every assertion was kept; one was added.

| File | Change |
|---|---|
| `test/cross-app.test.tsx` | `createRequestInVerifier` and the expiry test click «مراجعة الطلب» before «إرسال الطلب إلى المحفظة». The short-purpose test now also asserts that the confirm button never appears |
| `scripts/e2e.mjs` (3 places), `scripts/wallet-e2e.mjs` (1 place) | Same extra click |

## 3. CI coverage guard

`scripts/ci-coverage-floors.json` was raised, never lowered:

- `minVitestTests`: 132 → **147**
- `minBrowserSteps.verifier`: **14** (new)
- required files: `+ scripts/verifier-e2e.mjs`, `+ test/verifier-task10.test.tsx`
- required npm script: `test:verifier`
- required verify step: `browser-verifier`
- required Vitest file: `test/verifier-task10.test.tsx`

The guard reads the new results file (`IQDID_VERIFIER_EVIDENCE_DIR`, default `task10/verifier-e2e`). It fails if that file is missing, stale, below the floor, or contains a non-PASS step. The CI artifact now also uploads `evidence/task10/verifier-e2e`.

## 4. Results

See `TASK10_IMPLEMENTATION_REPORT.md` §4 for the run on the TASK-10 commit. Evidence is in `evidence/task10/` (JSON committed; PNG files are git-ignored and delivered in the ZIP package).

## 5. Flakiness found and fixed during this work

| Symptom | Root cause | Fix |
|---|---|---|
| Wallet E2E «reject via request code» timed out | The new status-filter `<option>` used the same text as the status badge. `getByText(...).first()` matched the hidden option | Filter options use their own short labels (`STATUS_FILTER_LABEL`). The test is unchanged |
| Verifier E2E expiry-sort check | It assumed a session would still be PENDING after more than 15 s with a 15 s TTL | The test computes the expected first row from the API at that moment, and adds an oldest-first check |
| `getByRole('timer')` failed once in 5 full runs | The countdown starts one effect tick after the data render | Changed to `findByRole`. 5 of 5 full runs then passed |
