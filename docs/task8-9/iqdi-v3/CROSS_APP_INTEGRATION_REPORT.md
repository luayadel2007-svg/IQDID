# CROSS_APP_INTEGRATION_REPORT

**Contracts unchanged:**
- `packages/api-client` (including `crypto-ports.ts`), `packages/shared-types/src/verification.ts`, `apps/wallet-web/src/trust.ts` (WalletTrustAdapter), gateways, the consent state machine, org isolation and the verifier app logic.
- The only shared-type change is a new `CREDENTIAL_TYPES` member `DEMO_EDUCATION` (display-only seed data). The strict decoders accept it. Verifier and server behaviour are unchanged: `primaryIdentityCredential` and `store.decide` still use the national ID only.

**Journey evidence (fresh runs):**

| Journey | Evidence |
|---|---|
| Verifier creates → Wallet notified (bell, nav badge, home) → review → disclosure → approve → Verifier live update → both histories | wallet E2E j1–j4 PASS; cross-app 9/9; e2e 12/12 |
| Reject (also via request code and via home «رفض الطلب» → confirm) | j5; V3 unit test |
| Session expiry; late decision refused | j8; cross-app |
| Duplicate decision | wallet-premium (deterministic stale screen); j7 |
| Offline / network failure / retry | wallet-premium; j9, j10 |
| Multi-org isolation | e2e; j5/j6 |
| No VERIFIED_BY_PROTOCOL from a demo approval | every-screen test, credential-state tests, j4, typed adapter forgery test |
