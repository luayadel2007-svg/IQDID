# TASK10_SECURITY_BOUNDARIES

TEST ONLY. This document covers what the verifier does, and what it does not do and must not be presented as doing.

## 1. Trust model actually implemented

| Concern | What exists | What it is NOT |
|---|---|---|
| Who the verifier is | A header select of two fictional organisations. It is stored in `sessionStorage` (`iqdid-demo-org`) | Authentication. Anyone with the page can pick either organisation |
| Organisation isolation | The demo API filters by `organizationId` on list, read, cancel and activity. Another organisation's session returns `NOT_FOUND`, which does not reveal that it exists | Authorization. The id is a query parameter, not a credential |
| Result of a request | `DEMO_ACCEPTED` means the synthetic holder pressed «موافقة» | Identity proof, signature check, issuer trust or status check |
| Disclosed values | Synthetic claims, returned only for the requested fields and only after `DEMO_ACCEPTED` | Selective-disclosure cryptography (no SD-JWT or mdoc processing) |
| Audit | An in-memory activity list, per organisation, capped at 500 entries | A regulatory or tamper-evident audit log |

## 2. Demo / protocol separation (TASK-11 §11)

- The session page shows five separate layers: app connectivity, demo credential status, citizen consent, demo session outcome, and cryptographic verification.
- The crypto layer can only show a protocol result from a `VerifiedByProtocol` value. That type carries a `unique symbol` brand, which browser code cannot construct.
  - `test/verifier-task10.test.tsx` contains a `@ts-expect-error` forgery. Typecheck fails if it ever compiles.
  - This is the same seam as the wallet's `WalletTrustAdapter`.
- `demoOutcome()` returns the shared `DemoOutcome` type (`mode: 'demo'`), or `null` for open or closed-without-decision sessions.
- No screen contains `VERIFIED`, `VERIFIED_BY_PROTOCOL` or «تم التحقق من الهوية». This is checked by V, VE, E and the wallet E2E.
- Green is used only with precise text: «موافقة تجريبية (DEMO_ACCEPTED)» and «وافق المواطن التجريبي (ACCEPT)». The crypto layer is neutral grey.

## 3. Input and data handling

- Request creation sends only `organizationId`, `templateId` and `purpose`. The server still validates strictly (`validateVerificationRequest`: unknown fields rejected, 3–200 characters, JSON only, 16 KiB cap).
- Client-side purpose validation happens before any network call. It is a UX guard, not a security control.
- `sessionStorage` holds the organisation id and the last template id. `localStorage` holds UI preferences and the favorite route. No citizen data is stored in browser storage.
- URL parameters (`status`, `template`, `sort`, `q`, `outcome`) are parsed against allow-lists. Unknown values fall back to defaults.
- The demo server binds to loopback only (`server-main.ts`, unchanged).

## 4. Unchanged by TASK-10

- The API contracts and gateways are unchanged:
  - `packages/shared-types`;
  - `packages/api-client/src/gateways.ts`;
  - `transport.ts`;
  - `crypto-ports.ts`.
- `packages/mock-services` is unchanged.
- No new endpoint, no new dependency, no network call outside the existing demo API.

## 5. Not implemented — deferred contracts (not represented as done)

| Future need | Why it is not here | Where it would plug in |
|---|---|---|
| Real verifier authentication and RBAC | No identity provider exists. A fake login would imply security that is not there | Replace `OrgProvider` with an authenticated session. The server derives `organizationId` from the token, not the query |
| Government authentication | Out of scope; needs an owner decision (OD) | Same seam |
| Signed verifier requests (`verifier_request_signing`) | No KMS/HSM; forbidden in this phase | `KeyPurpose` in `crypto-ports.ts` already names it |
| Protocol verification (OpenID4VP / SD-JWT / mdoc) | No issuer, trust list or status list | `VerifierTrustAdapter.describeCrypto` → `VerifiedByProtocol` from the server |
| Regulatory reporting and tamper-evident audit | Needs legal and governance input | `/activity` shows the shape only |

G1a and G1b are not claimed. OD-01…OD-09 remain PENDING.
