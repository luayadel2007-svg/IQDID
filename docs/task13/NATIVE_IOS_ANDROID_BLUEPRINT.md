# NATIVE_IOS_ANDROID_BLUEPRINT

**Status: PLANNED (blueprint only).** No native app exists, and the React web app cannot simply be "wrapped" and called a native identity wallet. This document lists what can be reused and what must be rebuilt per platform.

## 1. What can be reused

| Asset | Today | Reuse in native apps |
|---|---|---|
| API contracts | `packages/shared-types` DTOs plus runtime guards (demo API) | **Concepts reusable.** The production contracts (OpenID4VCI/VP, chosen by decision) will replace the demo DTOs. The guard-everything approach carries over |
| Domain models | Credential summary, verification session, consent decision, activity event | **Reusable as a domain vocabulary** (rewritten in Swift/Kotlin, or shared via a cross-platform core) |
| Session state machine | PENDING → DEMO_ACCEPTED / DEMO_REJECTED / EXPIRED / CANCELLED; terminal states are final (tested in `ecosystem-contract.test.ts`) | **Reusable specification.** Port the tests as the acceptance suite |
| Credential model | Synthetic claims, status ACTIVE / SUSPENDED / REVOKED, only the national ID answers requests | **Reusable rules.** Production would use issuer status lists |
| Trust interfaces | `WalletTrustAdapter`, `VerifierTrustAdapter`, `VerifiedByProtocol` brand, five trust layers | **Reusable design**; the strongest part to carry over |
| Crypto ports | `crypto-ports.ts` (fail-closed `KeyPurpose`, verification provider) | **Reusable contract.** Native implementations sit behind it (Secure Enclave, StrongBox) |
| Design tokens | `packages/ui/src/tokens.ts` plus CSS variables (colours, radii, spacing, contrast-tested) | **Reusable values**: export to iOS asset catalogs and Android themes |
| Localization | Arabic strings inline in components | **Needs extraction** into a resource catalogue before native work (`.strings`, `strings.xml`). Not done here |
| Accessibility rules | Tested behaviours (focus, labels, reduced motion, 200 % text) | Reusable as requirements; platform implementations differ |

## 2. What must be implemented per platform (not now)

| Capability | iOS | Android | Why it cannot come from the web app |
|---|---|---|---|
| Secure storage | Keychain / Secure Enclave | Keystore / StrongBox | Browsers have no hardware-backed key storage under the app's control |
| Biometric authentication | LocalAuthentication | BiometricPrompt | WebAuthn is possible on the web, but a native wallet needs OS-level gating of key use |
| Device binding | App Attest / DeviceCheck | Play Integrity, key attestation | Not available to web pages |
| Hardware-backed keys | Secure Enclave keys | StrongBox / TEE keys | As above |
| NFC (e.g. reading an ID chip) | Core NFC (entitlement) | NFC APIs | Web NFC is limited and absent on iOS |
| QR camera scanner | AVFoundation / VisionKit | CameraX + ML Kit | The web is possible but less reliable; the current wallet uses code entry |
| Notifications | APNs | FCM | Needed for any watch or companion feature |
| Platform accessibility | VoiceOver, Dynamic Type | TalkBack, font scale | Must be tested natively |
| Background lifecycle | Background modes, app lifecycle | WorkManager, lifecycle | Session timers and expiry behave differently |

## 3. Path comparison (identity-wallet criteria, not popularity)

| Criterion | React Native | Flutter | Native Swift + Kotlin (optional shared core) |
|---|---|---|---|
| Access to Secure Enclave / StrongBox and attestation | Through native modules (custom or community) | Through platform channels | **Direct** |
| Auditability of crypto paths | Mixed JS/native; more layers to audit | Dart plus native; more layers | **Smallest** attack surface per platform |
| Reuse of current TypeScript | **High** (types, state machine, tests) | Low | Low (a Rust/Kotlin Multiplatform core can share logic) |
| Interoperability with an EU-style wallet stack (OpenID4VP, SD-JWT VC, ISO mdoc) | Libraries vary in maturity | Libraries vary | Reference implementations are most often native |
| Accessibility and RTL quality | Good, needs testing | Good, needs testing | Best platform fidelity |
| Team skills / cost | One codebase | One codebase | Two codebases |

**No final choice is made here.** It depends on decisions that do not exist yet:
- the credential formats (SD-JWT VC and/or mdoc);
- the required assurance level (hardware-backed keys, attestation);
- certification requirements;
- team capacity.

**Recommended next step:** a short spike that implements key generation, attestation and one presentation per path, measured against those criteria.

## 4. Migration order (when approved)

1. Extract strings and tokens into platform-neutral resources.
2. Freeze the domain specification: port the state-machine and contract tests.
3. Choose the stack after the spike.
4. Implement secure storage, keys and authentication **before** any UI that shows credentials.
5. Rebuild the UI using the V3 design tokens; keep «مستمسكاتي» and the card-stack interaction.
6. Accessibility and RTL testing on devices.
7. Security assessment.
