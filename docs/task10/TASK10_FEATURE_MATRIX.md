# TASK10_FEATURE_MATRIX

IQDI Verifier — Institutional Verifier Premium 2026. TEST ONLY, synthetic data.

**Status values**
- **Done**: implemented and covered by an automated test.
- **Not in scope**: deliberately not built (see `TASK10_SECURITY_BOUNDARIES.md`).

**Test file keys**
- **V** = `test/verifier-task10.test.tsx`
- **VE** = `scripts/verifier-e2e.mjs` (browser)
- **X** = `test/cross-app.test.tsx`
- **E** = `scripts/e2e.mjs`
- **U** = `scripts/ux-e2e.mjs`
- **P** = `scripts/pdf-ux-audit.mjs`

## 6.2 Dashboard

| Requirement | Status | Implementation | Tests |
|---|---|---|---|
| Pending requests | Done | KPI «بانتظار القرار». A list sorted by expiry, with a countdown | V dashboard, VE many sessions |
| Demo-completed requests | Done | KPI «موافقات تجريبية», hint «ليست تحققاً تشفيرياً» | V dashboard |
| Rejected requests | Done | KPI «مرفوضة» | V dashboard |
| Expired sessions | Done | KPI «منتهية المهلة». «ملغاة» is a separate KPI | V dashboard |
| Recent activity | Done | `verifier.activity(orgId)`, last 4 events | V dashboard |
| New-request shortcut | Done | Header button, plus a favorites shortcut | X navigation |
| No invented numbers | Done | Every number is counted from `GET /verifier/sessions`. With no data, the KPI area is replaced by an empty state | V + VE «empty state, no invented statistics» |
| No decorative charts | Done | No charts. KPIs link to the filtered list instead | — |
| KPIs open filtered lists | Done | `/sessions?status=…` | V, VE |

## 6.3 Create request

| Step | Status | Implementation | Tests |
|---|---|---|---|
| 1 Organisation | Done | «المؤسسة الطالبة (تجريبية)» select, kept in sync with the header switcher | V «organisation chosen in the form» |
| 2 Purpose | Done | 3–200 characters, validated before any network call | X «too-short purpose» |
| 3 Template | Done | The two templates from `GET /request-templates` | V, VE |
| 4 Preview of fields | Done | «ما سيراه المواطن», exactly the template fields | V, VE |
| 5 Session validity | Done | Default 120 s (`DEMO_SESSION_TTL_MS`). The actual TTL is shown on the session page | V, VE |
| 6 Confirmation | Done | A «المراجعة والتأكيد» step. Nothing is created before «إرسال الطلب إلى المحفظة» | V, VE «session created before confirmation» check |
| 7 Session code and access method | Done | Large code card, plus «يظهر تلقائياً… أو بإدخال الرمز في شاشة QR تجريبي» | V, VE |
| Only API-supported fields | Done | `organizationId`, `templateId`, `purpose`. No invented options | `validateVerificationRequest` (unchanged) |
| Failure keeps the form | Done | Error alert. Retry succeeds without re-entering data | V «creation fails» |

## 6.4 Sessions

| Requirement | Status | Implementation | Tests |
|---|---|---|---|
| All statuses | Done | PENDING, DEMO_ACCEPTED, DEMO_REJECTED, EXPIRED, CANCELLED | V, VE |
| Search | Done | Code, session id or purpose | V, VE |
| Filter | Done | Status and template, stored in the URL | V, VE |
| Sort | Done | Newest, oldest, nearest expiry (pending first) | V, VE |
| Details link | Done | Code link per row | V |
| Organisation, purpose, created and expiry times | Done | Table columns and the details page | V |
| Clear live updates | Done | Polling. A live «عرض N من M جلسة» count. A stale-data notice | V, VE |
| DEMO_ACCEPTED never becomes VERIFIED | Done | Label «موافقة تجريبية (DEMO_ACCEPTED)» | V, VE, E |

## 6.5 Session details

| Field | Status |
|---|---|
| Session number (id), short code | Done |
| Requesting organisation, purpose, requested data | Done |
| Status, expiry time (plus actual TTL), countdown | Done |
| Recorded decision (ACCEPT, REJECT, none, expired, cancelled) | Done |
| Simulation result, disclosed synthetic values only on DEMO_ACCEPTED | Done |
| Back link | Done |
| Demo approval separated from protocol verification | Done: five-layer «طبقات الحالة والثقة» panel. The crypto layer is always «غير متحقق منه تشفيرياً» |
| Cancel with confirmation dialog | Done |
| Timeline (created, decided, expired, cancelled) | Done |

## 6.6 Results and history

| Requirement | Status | Implementation |
|---|---|---|
| Simulation results | Done | `/results`, closed sessions only |
| Decisions, rejections, expiries, cancellations | Done | Outcome summary plus a filter (`?outcome=`) |
| Errors | Done | Error and stale states on every page. API error codes are mapped by `describeError` |
| Activity of the current organisation | Done | `/activity`, filter by event type |
| No organisation A data in organisation B's context | Done | V, VE, X, E |

## 6.7 Institutional UI

| Check | Status | Evidence |
|---|---|---|
| Desktop 1366 / tablet 1024 and 768 / phone 390 and 320 | Done | VE responsive step, P14, U reflow |
| Wide tables | Done | Keyboard-focusable scroll region, compact dashboard variant |
| RTL | Done | VE, P1 |
| 200 % text | Done | VE, P14, U |
| Loading, connection failure, retry | Done | V, VE, U |
| Keyboard | Done | VE keyboard step, U skip link |
| Light, dark, system | Done | VE axe in both themes, P11, U |
| Reduced motion and reduced transparency | Done | VE, P10, P12, U |
