# Limitations and owner decisions

- **IMPLEMENTED:** incremental TASK-8 UX, typed future ports, fail-closed real boundaries, strict Demo decoder, provider substitution contracts and local regression/browser checks. There is no production verification result factory.
- **HISTORICAL, unchanged:** TASK-3 SDK_RAW six failures and ADAPTER 42/42; old G1/Windows evidence; TASK-4/5/6/7 reports. Local modernization successes do not promote any historic gate. TASK-4B remains unavailable.
- **PENDING:** OD-01…OD-09 and other prior approvals. This task authorizes this Demo modernization, not governmental/security policy decisions or deployment. No merge/force push or protection setting change.

| Decision / owner | Needed before real integration | Current bounded alternative |
|---|---|---|
| OD-02, identity/access owner | JWT/audience/roles/revocation policy | Demo synthetic actors only; real transport unavailable |
| OD-06 / DR-29, owner + governance | Human approval scope, dual control and evidence | AuthorizationPort contract; no approval inferred from citizen consent |
| OD-08 / KEY-TE, trust team | TrustEntry keys, key identity/purpose and publication contract | TrustResolverPort with purpose/version; real resolver absent |
| OD-09 / PUB-FAIL, status team | CAS, committed-state vs publication response | Preserve revoked terminality design; no fake active or successful publication |
| OD-01/03/04/05/07 | Org sharing, idempotency, retention, idx projection, response hosts | Existing Demo org isolation retained; real contracts unresolved |
| Data/key operations owner | Encryption algorithms, KMS/HSM, schema migration, backups | Separate storage/signing/key contracts; no keys or DDL deployed |

Real DTO mapping and protocol result UI remain future engineering. Branding prevents ordinary accidental assignment; TypeScript is not a sandbox against malicious source changes or arbitrary assertions. Runtime Demo decoders reject forged wire values; supported routes never promote them into verified identity.

Security contracts are not a complete crypto implementation or independent certification. Current demo has no authentication or durable storage and must use synthetic data on loopback. Production authorization/trust cannot be obtained by enabling an environment flag.

No separate agent/independent reviewer was used. Limited self-review and recorded negative tests were performed. Windows CI results for this branch are reported only if a fresh remote run completes; local Linux results never stand in for them. Manual assistive technology, real low-end devices and full performance testing remain NOT RUN.

The unmodified TASK-2 full-index scanner is BLOCKED by pre-existing historical PNG screenshots (unsupported binary). No binary exclusions were added to its policy. A separate baseline-diff scan covers every modernization change, including text evidence. This is scoped coverage, not an all-repository PASS.

Fresh hosted Windows Server 2022 + Ubuntu 24.04 CI passed on initial commit da32c5e. The later lint-only boundary strengthening is fully re-tested locally; its hosted rerun is separate and must be checked by commit SHA. This remains no evidence of testing the user's physical Windows device.
