# TASK-3 validation

These are static contract checks and proposal oracles, not implementations of C3/C4/C5/C2-B. Run from repository root:

```sh
npm ci --prefix tests/contracts/task3 --ignore-scripts
npm ci --prefix tests/contracts/task3/spectral-tool --ignore-scripts
python tests/contracts/task3/run-validation.py
```

Node 24.19.0/npm 11.9.0, Python 3 and OpenSSL were used for this TASK-3 execution. This does not change the project's Node 22 baseline. Tool versions and commands are recorded under evidence/task3. Dependencies are isolated to these contract tests; production/frozen package manifests and lockfiles are unchanged.

For external scratch installations, set TASK3_TOOL_ROOT and TASK3_SPECTRAL_ROOT. Spectral is deliberately run from the separate installation: the first combined install encountered an AJV code-generation dependency conflict. That failed run is preserved under evidence/task3/attempt1. No failed result has been relabeled success.

The primary package lock records the combined tools originally installed, including Spectral; execution uses only the separately installed Spectral CLI. Both dependency graphs are pinned. The extra install is a tooling workaround, not a project dependency upgrade.

`validate.cjs` parses and validates all 4 OpenAPI 3.1 documents and dereferences schemas; AJV validates embedded examples and negative cases. Authorization checks inspect contract declarations only. `policy-model.cjs` creates temporary test keys/certificates solely to compare identities and exercises proposed in-memory transition oracles. It deletes temporary key material. No service requests or persistence tests occur.

Lint threshold: errors cause nonzero exit; warnings remain reported without suppression. Contact/license are deliberately not invented. Signed TrustListPayload is documented alongside a compact JWS response and appears unreferenced to linters. Missing operation tags are editorial warnings. No runtime authentication, RBAC, BOLA, approval, timer, deletion, concurrency, TLS, PKI-chain or P-04 claims follow from these tests.
