# TASK11_API_CONTRACT_REVIEW

Review of the existing demo contracts (`/demo-api/v1`) used by both apps. The aim was to reuse, not extend. **No API contract was added or changed in TASK-10 or TASK-11.**

Test keys:
- **C** = `test/ecosystem-contract.test.ts` (18)
- **S** = `packages/mock-services/src/*.test.ts`
- **T** = `packages/api-client/src/transport.test.ts`
- **K** = `test/crypto-contract.test.ts`

| Area | Contract | Finding | Test |
|---|---|---|---|
| Typed contracts | DTOs plus runtime guards in `shared-types`. Gateways decode every response (`one` / `many`). `isDemoVerificationSession` rejects unknown keys | Sound. A response with extra fields (`verified`, `mode`, `outcome`, `evidence`) fails decoding | K, C |
| Wallet ↔ API | credentials, requests, request, decision, activity, reset | Sound. Decision body is exactly `{"decision":"ACCEPT"\|"REJECT"}` | S, C |
| Verifier ↔ API | organizations, templates, create, list, read, cancel, activity, reset | Sound. Create body is exactly `{organizationId, templateId, purpose}`; unknown fields → 400 | S, C |
| Session ids | UUID `id` + 6-character `shortCode`. The same object is returned to both sides | Sound. The wallet and verifier views of a session are deep-equal | C «one session id links both sides» |
| Organisation boundaries | `organizationId` query on every verifier read | Sound for a demo. Another organisation's session → `404 NOT_FOUND`; missing id → 400; unknown id → `[]`. **Not authorization** (anyone can set the query) | C, S, V, VE |
| State transitions | PENDING → DEMO_ACCEPTED, DEMO_REJECTED, EXPIRED (lazy, at TTL) or CANCELLED. All four end states are terminal | Sound. Every decide or cancel on an end state → 409 with the right code; the state is unchanged | C (matrix) |
| Concurrency | Single-threaded store, so each operation is atomic | 3 concurrent decisions → exactly 1 succeeds and 2 get `SESSION_ALREADY_DECIDED`; 1 consent event | C |
| Credential status | ACCEPT needs an ACTIVE national ID, otherwise 409 `CREDENTIAL_NOT_ACTIVE` | Sound. The refused ACCEPT leaves the session PENDING and REJECT still works | C, Scenario G |
| Disclosure | `disclosed` is `null` until DEMO_ACCEPTED, then exactly `previewDemoDisclosure(session, credential)` | Sound. Withheld values never appear in verifier responses or activity | C, K, Scenario H |
| Error responses | `{error:{code,message,requestId}}`; `X-Request-Id` echoed when valid (else generated); `Cache-Control: no-store`; `X-Environment: DEMO` | Sound. Codes: BAD_REQUEST 400, NOT_FOUND 404, SESSION_EXPIRED / ALREADY_DECIDED / CREDENTIAL_NOT_ACTIVE 409, PAYLOAD_TOO_LARGE 413, INTERNAL 500 | C, S |
| Retry behaviour | GET: up to 2 retries on network, timeout or 5xx. POST: never | Sound. A POST is not repeated, so no duplicate decision or session | C, T |
| Polling and refresh | Client-side `useAsync` with `pollMs`; stale data kept on failure | Acceptable for a demo (measured 7–20 requests / 10 s per screen). Push or SSE would be a future contract | `TASK11_TEST_EVIDENCE.md` §5 |
| Trust adapter | `WalletTrustAdapter` and `VerifierTrustAdapter`. A protocol view needs `VerifiedByProtocol` (a `unique symbol` brand) | Sound. Forged values fail typecheck (`@ts-expect-error` in 3 test files) | K, wallet-premium, V |
| Reset | `POST /demo/reset` clears sessions and activity for all; logs DEMO_RESET, visible to every organisation and the wallet; keeps the configured credential status | Sound. Note: any caller can reset (demo only, loopback only) | C |

## Contract gaps noted (not built; recorded for a future phase)

1. **The verifier cannot read the server's session TTL** before creation (`/health` exposes `sessionTtlMs`, but the gateway has no `health()`). The UI shows the default and labels it as such. A future `GET /verifier/policy` could return it.
2. **No push channel.** Polling only.
3. **Organisation identity is a query parameter.** A production contract must derive it from an authenticated token.
4. **Reset is unauthenticated.** It must not exist outside a demo.
5. **No credential status for verifiers.** Correct for privacy in this demo. A protocol design would use issuer status lists instead.
