# Crypto-ready interface map — contract v1

All implementation contracts below are in `packages/api-client/src/crypto-ports.ts`. They are server-side contracts. The package root exports their **types only**. Browser pages still consume `WalletGateway` / `VerifierGateway` from `gateways.ts`.

| Port | Boundary | Current implementation / future owner |
|---|---|---|
| KeyProvider | resolve opaque purpose/versioned handle; rotate; retire | No real implementation; government key team / KMS-HSM adapter |
| SigningPort | opaque handle + alg + signing input → signature | None; separately authorize key purpose and algorithm |
| CredentialIssuerPort | authorized issuance reference → credential reference | None; C3 owner and TASK-3C compatibility entry |
| CredentialVerificationPort | presentation, audience, nonce, policy → branded protocol result | UnconfiguredCredentialVerificationProvider always rejects REAL_CRYPTO_NOT_CONFIGURED |
| TrustResolverPort | issuer/kid/purpose/time → public JWK, trust version and validity | None; C4 owner; strict public-only JWK validation required |
| StatusResolverPort | credential reference + trust version → explicit state + publication/check times | None; C5 owner; never assume active when unavailable |
| AuthorizationPort | principal/action/resource/optional approval → allowed + policy version | None; identity/access team; denial on unresolved policy or dependency failure |
| SensitiveStoragePort | seal/open with record/schema context and versioned authenticated envelope | None; storage team; distinct from credential signature and TLS |
| AuditPort | minimal references/correlation/action/outcome/policy → append | None; audit team; no tokens, claims, plaintext or keys in events |

## Integration and proof boundaries

- `Transport` remains the existing seam (`transport.ts`). DemoHttpTransport talks to `/demo-api/v1`. RealTransportPlaceholder rejects all requests with `not_implemented`; invalid runtime mode also chooses the rejecting boundary. Neither path silently falls back.
- `shared-types/src/verification.ts`: `DemoOutcome` and `VerifiedByProtocol` use different discriminants. A private type brand prevents normal TypeScript construction of the protocol result. There is deliberately no success factory today. A future reviewed server adapter must own creation after all protocol checks. Untrusted JSON must never be cast to this type.
- `isDemoVerificationSession` rejects additional fields including mode/outcome/evidence/verified and rejects protocol statuses. Forged HTTP responses are tested through the real gateway decoder. Demo v1 DTO fields and paths stay compatible; a future schema extension needs explicit API versioning.
- `previewDemoDisclosure` is used both before consent and during server decision. Consent still yields only DEMO_ACCEPTED / DEMO_REJECTED.
- `server/compatibility/task3c-adapter.mjs` is an exact copy of the TASK-3C injected adapter from `120d626e1d6901935d738a51306086cc1bfec983`. It remains a limited guard, not a verifier. SDK imports/re-exports/dynamic imports are forbidden outside this server entry folder; require calls, computed dynamic imports and createRequire imports outside it are forbidden too. Browser imports of server/crypto implementation paths are restricted.

## Contract evidence

`test/provider-replacement.test.tsx` renders both unchanged page trees with a recording Transport around real HTTP, then with the rejecting real transport. `test/crypto-contract.test.ts` checks unconfigured crypto, runtime mode errors, forged Demo responses, type separation and lint mutation attempts. `scripts/compatibility-contract.mjs` checks four boundaries with injected test doubles; it does not re-run the historical 42 SDK tests or implement cryptography.

A production crypto-provider replacement is **not demonstrated** because no real service, trust roots or credentials exist. The tested promise is a bounded integration seam and fail-closed substitution, not zero-change production migration.
