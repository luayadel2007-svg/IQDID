# G1 test evidence — raw results

```json
{
  "run_at_utc": "2026-10-11T22:50:12.380Z",
  "node": "v22.22.2",
  "platform": "linux-x64",
  "packages": {
    "@openid4vc/oauth2": "0.7.0",
    "@openid4vc/openid4vp": "0.7.0",
    "@owf/token-status-list": "0.4.2",
    "@peculiar/x509": "2.1.0",
    "@sd-jwt/core": "0.22.0",
    "@sd-jwt/crypto-nodejs": "0.19.0",
    "@sd-jwt/sd-jwt-vc": "0.22.0",
    "asn1js": "3.0.10",
    "jose": "6.2.12",
    "pkijs": "3.4.1",
    "reflect-metadata": "0.2.2"
  },
  "package_lock_sha256": "d3af25764d221d4bdca94dc49335deca8514a21e20d0611515aa297828fbe524",
  "conditions": "in-process; no HTTP/TLS; synthetic data; TEST keys generated per run; not a device or system test"
}
```

**62/62 passed**

| ID | Group | Expected | Observed | Reason check | Pass | Detail |
|---|---|---|---|---|---|---|
| SIG-01 | SIG | accept | accept | n/a | PASS | len=64 |
| SIG-02 | SIG | reject | reject | match | PASS | DER len=71 rejected |
| SIG-03 | SIG | reject | reject | match | PASS | [INVALID_JWT_SIGNATURE] Verify Error: alg "none" is not allowed |
| SIG-04 | SIG | reject | reject | match | PASS | [INVALID_JWT_SIGNATURE] Verify Error: Disallowed alg HS256 |
| SIG-05 | SIG | reject | reject | match | PASS | signature invalid |
| SIG-06 | SIG | reject | reject | match | PASS | signature invalid |
| CRD-01 | CRD | accept | accept | n/a | PASS | typ=dc+sd-jwt x5c=2 |
| CRD-02 | CRD | accept | accept | n/a | PASS | _sd=5 |
| CRD-03 | CRD | accept | accept | n/a | PASS | salt bytes=16 |
| CRD-04 | CRD | accept | accept | n/a | PASS | crv,kty,x,y |
| CRD-05 | CRD | reject | reject | match | PASS | Cannot disclose protected field |
| CRD-06 | CRD | accept | accept | n/a | PASS | _sd=10 real=5; verifies |
| CRD-07 | CRD | accept | accept | n/a | PASS | days=30 |
| VER-01 | VER | accept | accept | n/a | PASS | claims: name,age_over_18 |
| VER-02 | VER | accept | accept | n/a | PASS | only name, age_over_18 |
| VER-03 | VER | reject | reject | match | PASS | Verify Error: Invalid Nonce |
| VER-04 | VER | reject | reject | match | PASS | Verify Error: Invalid Key Binding audience |
| VER-05 | VER | reject | reject | match | PASS | Key Binding JWT not exist |
| VER-06 | VER | reject | reject | match | PASS | Unreferenced disclosure(s) detected in SD-JWT |
| VER-07 | VER | reject | reject | match | PASS | [JWT_EXPIRED] Verify Error: JWT is expired |
| VER-08 | VER | reject | reject | match | PASS | [INVALID_JWT_SIGNATURE] Verify Error: Invalid JWT Signature |
| VER-09 | VER | reject | reject | match | PASS | [KEY_BINDING_JWT_TOO_OLD] Verify Error: Key Binding JWT is too old |
| VER-10 | VER | reject | reject | match | PASS | [INVALID_VCT] Verify Error: Invalid VCT |
| VER-11 | VER | reject | reject | match | PASS | [INVALID_JWT_SIGNATURE] Verify Error: Disallowed alg ES384 |
| VER-12 | VER | reject | reject | match | PASS | x5c rejected (issuer): SAN does not match (evil.digital-id.test) |
| VER-13 | VER | reject | reject | match | PASS | Verify Error: Invalid Nonce |
| X-01 | X509 | accept | accept | n/a | PASS | chain ok |
| X-03 | X509 | reject | reject | match | PASS | SAN does not match (other.digital-id.test) |
| X-04 | X509 | reject | reject | match | PASS | pkijs: No valid certificate paths found |
| X-05 | X509 | reject | reject | match | PASS | pkijs: No valid certificate paths found |
| X-06 | X509 | reject | reject | match | PASS | pkijs: The certificate is either not yet valid or expired |
| X-09 | X509 | reject | reject | match | PASS | leaf is a CA certificate |
| X-11 | X509 | reject | reject | match | PASS | pathLenConstraint exceeded at depth 2 |
| X-12 | X509 | reject | reject | match | PASS | leaf keyUsage lacks digitalSignature |
| X-13 | X509 | reject | reject | match | PASS | pkijs: One of intermediate certificates is not a CA certificate |
| X-14 | X509 | reject | reject | match | PASS | pkijs: The certificate is either not yet valid or expired |
| X-15 | X509 | reject | reject | match | PASS | trust anchor included in x5c |
| X-16 | X509 | reject | reject | match | PASS | leaf is self-signed |
| X-18 | X509 | reject | reject | match | PASS | pkijs: No valid certificate paths found |
| X-17 | X509 | reject | reject | match | PASS | x5c rejected (issuer): pkijs: No valid certificate paths found |
| REV-01 | REV | accept | accept | n/a | PASS | status=0 |
| REV-02 | REV | reject | reject | match | PASS | [STATUS_INVALID] Status is not valid |
| REV-03 | REV | reject | reject | match | PASS | [STATUS_INVALID] Status is not valid |
| REV-04 | REV | accept | accept | n/a | PASS | rejected while 2, accepted after 0 |
| REV-05 | REV | reject | reject | match | PASS | Status List JWT verification failed: x5c rejected (status): SAN does not match (status.digital-id.test) |
| REV-06 | REV | reject | reject | match | PASS | The subject claim 'https://status.digital-id.test/lists/2' must be equal to the uri 'https://status.digital-id.test/lists/1' |
| REV-07 | REV | reject | reject | match | PASS | Status List JWT verification failed: Verify Error: JWT is expired |
| REV-08 | REV | reject | reject | match | PASS | Status List JWT verification failed: signature invalid |
| REV-09 | REV | reject | reject | match | PASS | The typ header 'JWT' must be equal to 'statuslist+jwt' |
| REV-10 | REV | reject | reject | match | PASS | Index out of bounds |
| REV-11 | REV | reject | reject | match | PASS | timeout |
| REV-12 | REV | accept | accept | n/a | PASS | unique=8192 sequentialSteps=1 exhaustedThrows=true |
| REV-13 | REV | accept | accept | n/a | PASS | typ=statuslist+jwt x5c=2 |
| W14-a | VP | accept | accept | n/a | PASS | prefix=x509_hash qrParams=client_id,request_uri |
| W14-b | VP | reject | reject | match | PASS | Invalid client identifier. Expected the base64url encoded sha-256 hash of the leaf x5c certificate ('FtLOXktUBI4vTSD0J44LIBSXoASX9m2cmUGHgW7Kz1A') to match the client identifier 'bqY5oEIsH1Z4mHkjkD_PeA5uf3zrK3N0QUR7WSXql |
| W14-c | VP | reject | reject | match | PASS | Error during verification of jwt. x5c rejected: pkijs: No valid certificate paths found |
| W16-a | VP | accept | accept | n/a | PASS | prefix=x509_hash qrParams=client_id,request_uri |
| W16-b | VP | reject | reject | match | PASS | response_uri host evil.example not allowed for this verifier |
| W16-c | VP | accept | accept | n/a | PASS | prefix=x509_hash qrParams=client_id,request_uri |
| W08-r | VP | reject | reject | match | PASS | Invalid client identifier. One of the leaf certificates san dns names [verifier.digital-id.test] must match the client identifier 'other.digital-id.test'.  {   "error": "invalid_request",   "error_description": "Invalid  |
| W02-r | VP | accept | accept | n/a | PASS | prefix=x509_san_dns qrParams=client_id,request_uri |
| W-RU | VP | reject | reject | match | PASS | Unable to extract signer method from jwt. Found 1 signer method(s) that are not allowed: SUCCEEDED: method x5c |