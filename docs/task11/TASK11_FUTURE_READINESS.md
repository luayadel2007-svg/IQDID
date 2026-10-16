# TASK11_FUTURE_READINESS

These are engineering recommendations only. **TASK-12 is not started.** They are ordered by dependencies and risk, with no time estimates. None of them is implemented, and nothing here implies official adoption or partnership.

## 1. Dependency order

```
Legal & privacy governance ──► Production IAM ──► Official system integration
        │                           │
        ▼                           ▼
 Key management (HSM/KMS) ──► Authorized issuer service ──► Credential issuance protocol
        │                           │                               │
        └──────────► Trust registry ◄┘                               ▼
                          │                        Credential status validation
                          ▼                                          │
                 Verifier protocol verification ◄────────────────────┘
                          │
                          ▼
                  Audit & monitoring (spans all of the above)
```

## 2. Items

| Priority | Item | Depends on | Main risks if done badly | Existing seam in this prototype |
|---|---|---|---|---|
| P0 | **Legal and privacy governance** (lawful basis, consent records, retention, data-protection impact assessment, OD-01…OD-09 decisions) | Owner and government decisions | Everything below has no mandate; real identity data must not be processed before this | Synthetic-only rule; `KNOWN_LIMITATIONS` documents |
| P0 | **Key management** (HSM/KMS, key ceremony, rotation, revocation) | Governance | Key compromise invalidates every credential | `KeyPurpose` in `crypto-ports.ts` (credential_signing, status_list_signing, trust_list_signing, verifier_request_signing, storage_encryption) |
| P1 | **Production IAM** for verifier staff and organisations (authentication, RBAC, organisation derived from the token) | Governance | Today's demo boundary (query parameter) would leak data across organisations | `OrgProvider` / `useOrg`; the server's `requireOrg` |
| P1 | **Authorized issuer service** | Keys, governance, trust registry | An unauthorised issuer could mint identities | None by design (no issuer in the prototype) |
| P1 | **Credential issuance protocol** (e.g. OpenID4VCI with SD-JWT VC or mdoc, chosen by decision) | Issuer, keys | Interoperability and holder binding | TASK-3C compatibility adapter is the only allowed SDK entry point (lint-enforced) |
| P1 | **Trust registry** (issuers, verifiers, schemas) | Governance, keys | Verifiers accept rogue issuers, or wallets trust rogue verifiers | `VerifiedByProtocol.evidence.trustVersion` |
| P2 | **Credential status validation** (status lists, freshness, privacy) | Issuer, registry | Revoked credentials accepted; tracking through status checks | `statusVersion` in `VerifiedByProtocol`; demo `CREDENTIAL_NOT_ACTIVE` rule |
| P2 | **Verifier protocol verification** (OpenID4VP request signing, nonce and audience, policy) | All of the above | False «verified» states, which are the main risk this prototype guards against | `VerifierTrustAdapter.describeCrypto`, `WalletTrustAdapter`, `UnconfiguredCredentialVerificationProvider` (fails closed) |
| P2 | **Audit and monitoring** (tamper-evident logs, alerting, privacy-preserving metrics) | IAM, governance | Undetected misuse, or over-collection | Activity event shape, correlation id (`X-Request-Id`) |
| P3 | **Official system integration** (civil registry, government gateways) | IAM, governance, issuer | Production coupling before the controls exist | `RealTransportPlaceholder` (fails closed) |

## 3. What the prototype already de-risks

- The UX for request review, selective disclosure, consent, expiry, duplicates, organisation separation and failure recovery: Scenarios A–H.
- Typed seams that make a demo approval impossible to display as a protocol result.
- A CI coverage guard that stops tests from silently disappearing.
- Linux and Windows CI.

## 4. Before any real identity data

All of the following are needed:
- a P0 governance decision;
- production IAM;
- key management;
- an issuer under the trust registry;
- an independent security assessment.

The prototype is **not** ready to store real identities, and nothing in this repository should be described as government-approved.
