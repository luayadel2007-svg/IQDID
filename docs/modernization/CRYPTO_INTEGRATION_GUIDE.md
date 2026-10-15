# Integration guide

Read [CRYPTO_READY_INTERFACE_MAP.md](CRYPTO_READY_INTERFACE_MAP.md) for signatures, [GOVERNMENT_CRYPTO_HANDOFF.md](GOVERNMENT_CRYPTO_HANDOFF.md) for implementation/acceptance, and [NO_REBUILD_MIGRATION_PLAN.md](NO_REBUILD_MIGRATION_PLAN.md) for database/key rotation.

Design decision M-01 (implemented engineering boundary, not government policy): reuse the existing typed HTTP Transport and gateway seams; put new key/signature/issuance/verification/trust/status/authorization/storage/audit contracts in a server-only module; keep protocol outcome separate from Demo DTOs. Do not introduce a permissive all-in-one crypto provider or pretend that a no-op service verifies identity.

Minimal developer loop: `npm ci`, `npm run modernization:verify` with Chromium installed (or CHROMIUM_PATH pointing to an installed browser). Original scanner requires `.security/secret-scanner-rules.json` and new files in the Git index. The full script writes new evidence under `evidence/modernization` without changing historical results. Browser SDK imports are forbidden, and runtime failures must stay visible through API errors.
