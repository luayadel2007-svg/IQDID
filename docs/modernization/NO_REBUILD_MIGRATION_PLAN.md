# No-rebuild migration plan — proposed, not executed

Current runtime is an in-memory synthetic Demo; no live database or stored citizen data was migrated. TASK-6 schema is proposed PostgreSQL, not deployment authority. No SQL baseline is changed by this task.

| Proposed TASK-6 location | Preserve | Additive migration design requiring review |
|---|---|---|
| issuer.credential | credential_ref, lifecycle/status link, relational IDs | encrypted payload reference, payload schema version, encryption key version reference; inspect existing metadata columns before DDL |
| verifier.verification_session | org scope, session lifecycle, expiration | real protocol evidence reference, result-schema version, distinct outcome; bounded retention of disclosed values |
| trust.trust_key | public key identity, certificate fingerprint and purpose | private management reference in protected operational store only; version/activation/retirement metadata as needed |
| trust.trust_entry / trust_list_version | issuer/verifier identity and monotonic versions | owner-approved keys/publication projection; no unilateral TrustEntry change |
| status.status_entry / status_list | immutable position, revoked terminality, versions | preserve CAS and publication separation; do not encrypt away essential state constraints |
| audit.audit_event | correlation/resource references | schema/policy version and minimal outcome; exclude plaintext claims and signed tokens |

1. Freeze and hash Demo API v1. Introduce a separate real API and transport adapter. Keep Demo available explicitly; never use it as an outage fallback. Backward tests on both page trees remain required.
2. Approve unresolved key identities, policies, status publication and retention. Inventory actual data/backup formats and select migration tooling. Map current schema to actual deployment rather than running proposed SQL blindly.
3. Add nullable metadata/reference fields under a new schema version, without dropping IDs/constraints. Deploy code able to read reviewed old/new formats. Mark old plaintext explicitly; do not infer encryption from a non-null kid.
4. Enable encrypted writes only after provider/authorization readiness. Backfill approved legacy records in resumable batches with row version/CAS and authenticated record context. Measure counts and decrypt/validate controlled samples. Maintain migration audit references without payloads.
5. Separate query/index design from ciphertext. Blind/search indexes leak information and need a separate decision; do not copy sensitive values into new indexes automatically. Plan explicit deletion/retention for plaintext and backups.
6. Canary real services in an isolated environment; keep synthetic Demo endpoints separated. Rollback routes to the prior real adapter/schema reader only while compatible. Never rollback to Mock or restore a revoked credential to active.
7. Rotate storage keys by rewrapping/re-encrypting reviewed envelopes; signing-key rotation has separate credential/trust consequences. Backups require authorized historical key access and tested restoration. Destructive plaintext cleanup needs an approved runbook.

Irreducible future modifications: service adapters and deployment; real result view mapping; device storage/native capabilities if required; SQL migrations and key/backups operations; PKI/trust enrollment; governance/security review and protocol interoperability. Current work reduces hotspots; it does not guarantee zero cost or zero page changes.
