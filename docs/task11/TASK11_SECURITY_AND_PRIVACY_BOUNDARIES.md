# TASK11_SECURITY_AND_PRIVACY_BOUNDARIES

TEST ONLY. The demo shows a flow; it does not secure one.

## 1. Trust-state protocol (§11): five concepts, never one «Verified»

| # | Concept | Where it is shown | Allowed wording | Never |
|---|---|---|---|---|
| 1 | Application operational state | Wallet stale and offline notices; verifier stale notice, offline bar, trust layer 1 | «متصل بخادم المحاكاة» / «تعذر التحديث — آخر بيانات معروفة» | Green success |
| 2 | Demo credential status | Wallet card states («اعتماد تجريبي فعال/موقوف/…»); verifier trust layer 2 | «كان فعالاً تجريبياً عند الموافقة» / «غير مكشوفة للمؤسسة» | «موثّق», «رسمي» |
| 3 | Citizen consent decision | Wallet outcome; verifier «القرار المسجل», trust layer 3 | «وافق المواطن التجريبي (ACCEPT)» | «تم التحقق» |
| 4 | Demo session outcome | Status badges and results | «موافقة تجريبية (DEMO_ACCEPTED)», «الجلسة التجريبية مكتملة» | VERIFIED |
| 5 | Cryptographic verification | Wallet «تحقق بروتوكولي فعلي: غير متوفر حالياً»; verifier trust layer 5; results «تحقق تشفيري: غير منفذ» | «غير متحقق منه تشفيرياً» | Any success state without a server `VerifiedByProtocol` |

**Enforcement:**
- **Types.** `DemoOutcome` cannot be assigned to `VerifiedByProtocol`, and the trust views need the branded proof.
- **Runtime guards.** `isDemoVerificationSession` rejects extra keys.
- **Text checks.** No screen in any state shows `VERIFIED`, `VERIFIED_BY_PROTOCOL` or «تم التحقق من الهوية». This is checked by V, VE, E, the wallet E2E, Scenario A and the contract test over all journey responses.
- **Colour.** Green is used only with the exact demo wording. The crypto layer is neutral.

## 2. Privacy (Scenario H)

- Before a decision, no claim value is in any session response (wallet or verifier).
- The wallet's disclosure preview names withheld fields but never renders their values (checked in the DOM).
- After approval, only the requested claims are in `disclosed`. Withheld values are absent from:
  - the verifier page;
  - the session JSON;
  - the activity JSON.
- After rejection, `disclosed` is `null` everywhere.
- Display-only credentials (licence, residence, education, health) never answer a request.
- Browser storage: UI preferences, the favorite route, the selected organisation and the template. No identity data.

## 3. Organisation isolation (Scenario E)

Checked on dashboard, sessions, results, activity and detail, in both directions, through the UI and the API. The boundary is a query parameter, so it isolates data in the demo but is not authorization.

## 4. Demo environment safety

- The demo API binds only to loopback (it refuses other hosts with exit 2).
- `npm run demo:reset` refuses non-loopback targets and checks `environment: DEMO` before resetting.
- `DEMO_CREDENTIAL_STATUS` only accepts ACTIVE, SUSPENDED or REVOKED (exit 2 otherwise; tested).
- All data is synthetic (holder `TEST-001`, fictional organisations, `TEST-*` document numbers). There is no real citizen data, and no secrets in the repository (`secrets-diff` PASS).

## 5. Out of scope (not implemented, not claimed)

These are not implemented and not claimed:
- authentication and RBAC;
- government identity integration;
- issuer service;
- trust registry;
- status lists;
- key management (HSM/KMS);
- signed requests;
- OpenID4VP / SD-JWT / mdoc;
- tamper-evident audit;
- legal and privacy governance.

See `TASK11_FUTURE_READINESS.md`. G1a and G1b are not claimed. OD-01…OD-09 remain PENDING. **The prototype must not store real identities.**
