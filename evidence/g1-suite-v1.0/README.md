# G1 Test Evidence Package v1.0 — TEST ONLY (Iraqi Digital ID prototype)
Synthetic data and TEST keys only. Not an official system. In-process tests: no HTTP/TLS, no device.

## Reproduce (Node.js 22)
    cd tests_suite
    npm ci                            # exact versions from package-lock.json (integrity-checked)
    node run.mjs                      # expected: TOTAL 62/62 passed
    MUTATE=skip-chain node run.mjs    # negative control: must report 6 failures
    MUTATE=skip-role  node run.mjs    # negative control: must report 2 failures
(On Windows PowerShell: $env:MUTATE="skip-chain"; node run.mjs)

## Contents
- tests_suite/lib/pki.mjs       test PKI generator + chain validation (pkijs + supplementary checks)
- tests_suite/tests/*.mjs       SIG, CRD, VER, X509, REV, VP suites
- tests_suite/run.mjs           runner with expected-reason enforcement
- tests_suite/evidence/         results.json / results.md / logs (main + mutation runs)
- openapi/                      4 OpenAPI 3.1 specs + VALIDATION_RESULT.txt
