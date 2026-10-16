# TASK11_ECOSYSTEM_INTEGRATION

How IQDI Wallet and IQDI Verifier work together as one demonstration. TEST ONLY, synthetic data.

## 1. Components

```
 IQDI Verifier (React, desktop-first)            IQDI Wallet (React, mobile-first)
   VerifierGateway ─┐                               ┌─ WalletGateway
                    │   DemoHttpTransport (fetch)   │
                    └──────────► Demo API ◄─────────┘
                       /demo-api/v1  (Node, loopback only, in-memory DemoStore)
```

| Layer | Package / file | Role in the demo |
|---|---|---|
| Shared contracts | `packages/shared-types` | DTOs, runtime guards, status enums, `previewDemoDisclosure`, `DemoOutcome` / `VerifiedByProtocol` types |
| Client | `packages/api-client` | `DemoHttpTransport`: timeout, correlation id, GET-only retry, typed `ApiError`. Wallet and verifier gateways. `crypto-ports.ts` (fail-closed) |
| Demo API | `packages/mock-services` | One in-memory store shared by both apps. It enforces state transitions, organisation scope and credential status |
| UI | `packages/ui` | Design System V3 shared by both apps |
| Trust seams | `apps/wallet-web/src/trust.ts`, `apps/verifier-web/src/trust.tsx` | Pages render a trust view. A protocol view needs a branded server value |

## 2. The demonstration journey

| # | Step | Actor | Contract used | Visible result |
|---|---|---|---|---|
| 1 | Create a demo verification request | Verifier (organisation A or B) | `POST /verifier/sessions {organizationId, templateId, purpose}` → 201 `PENDING` | Session page with the code and the default validity |
| 2 | The wallet receives the request | Wallet (polling) | `GET /wallet/requests` | Bell and nav badges, home alert, request list |
| 3 | The citizen reviews the requested data | Wallet | `GET /wallet/requests/{id}` | Organisation, purpose, fields, countdown |
| 4 | Selective-disclosure preview | Wallet | `previewDemoDisclosure` over `GET /wallet/credentials` (local projection, same function as the server) | «سيُشارك (n)» / «يبقى خاصاً (m)», withheld fields named without values |
| 5 | Approve or reject (with confirmation) | Wallet | `POST /wallet/requests/{id}/decision {decision}` | «سُجلت موافقتك التجريبية» / «رفضت هذا الطلب» |
| 6 | The demo API updates the session | Demo API | `DEMO_ACCEPTED` + `disclosed` (requested claims only) / `DEMO_REJECTED` + `disclosed: null` | — |
| 7 | The verifier receives the new state | Verifier (polling 1.5 s) | `GET /verifier/sessions/{id}?organizationId=` | Updates live without reload; five trust layers |
| 8 | Both histories update | Both | `GET /wallet/activity`, `GET /verifier/activity?organizationId=` | The same event types with the same session id on both sides |

Approval is a state change in the demo API. It is never shown as protocol verification; see `TASK11_SECURITY_AND_PRIVACY_BOUNDARIES.md`.

## 3. Changes made for integration in TASK-11

The aim was to keep changes minimal: the existing contracts were enough for every scenario.

| Change | Why | Impact |
|---|---|---|
| `DEMO_CREDENTIAL_STATUS` env in `packages/mock-services/src/server-main.ts` (ACTIVE / SUSPENDED / REVOKED, validated; exit 2 otherwise) | Scenario G must be repeatable in a real browser. `DemoStore` already had the `credentialStatus` option; only the launcher lacked a switch | Demo launcher only. No API, type or default change |
| Wallet `DecisionPanel` explains an inactive national ID («اعتماد الهوية التجريبي موقوف/ملغى») | Scenario G found that approval was disabled with no reason given | One optional prop (`credentialStatus`). ACTIVE shows nothing new (tested) |
| `scripts/stack.mjs` `stopped()` | Restarting the demo stack on the same ports for Scenario G | Test harness only |
| `scripts/demo-reset.mjs` (`npm run demo:reset`) | Safe reset from a terminal | Loopback only. Checks `environment: DEMO` first |
| Verifier dashboard renders its footer cards after data settles | Measured layout shift 0.099 → 0.011 | Visual only |

There is no new endpoint, no new dependency, and no change to `shared-types`, `api-client` or `crypto-ports.ts`.

## 4. Live updates and recovery

- Both apps poll: wallet requests and activity every 1.5 s; verifier sessions, activity or one session every 1.5 s. The measured rate is in `TASK11_TEST_EVIDENCE.md` §5.
- `useAsync` keeps the last good data when a refresh fails (`stale`). Both apps show a notice and recover on the next successful poll.
- Decisions and creation are POSTs and are never retried automatically, so a decision cannot be sent twice. GETs retry up to 2 times on transient errors. Both behaviours are tested in `test/ecosystem-contract.test.ts`.
- Browser offline: the wallet disables decisions, and the verifier shows a bar.

## 5. Organisation boundary

Every verifier read is scoped by `organizationId`:
- a session belonging to another organisation returns `NOT_FOUND`, which does not reveal that it exists;
- a list request without `organizationId` returns `400`;
- an unknown organisation id gets an empty list.

The wallet (one synthetic holder) sees requests from both organisations, each labelled with its organisation. This is a demo boundary, not authorization (`TASK10_SECURITY_BOUNDARIES.md` §1).
