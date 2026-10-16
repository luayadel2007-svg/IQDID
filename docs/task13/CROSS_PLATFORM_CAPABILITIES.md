# CROSS_PLATFORM_CAPABILITIES

These are proposed abstraction layers for future platforms. **No new adapter was added to the code**, because none has a use in the current web version. Adding unused interfaces would be speculative code. The existing crypto ports and trust adapters are **unchanged**.

## Proposed interfaces (design names, not contracts)

```ts
/** What the current device can do. Decides which UI and flows are offered; never trusted for security. */
interface DeviceCapabilities {
  readonly formFactor: 'phone' | 'tablet' | 'desktop' | 'watch' | 'vehicle';
  readonly input: ReadonlyArray<'touch' | 'mouse' | 'keyboard' | 'voice' | 'rotary'>;
  readonly hardwareKeystore: boolean;   // attested, not self-reported
  readonly biometrics: boolean;
  readonly nfc: boolean;
  readonly camera: boolean;
  readonly notifications: 'none' | 'local' | 'push';
  readonly mayShowPersonalData: boolean; // false for watch and vehicle by policy
}

interface PlatformStorage {           // Keychain/Keystore natively; preferences only on web
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  readonly protection: 'hardware' | 'os-encrypted' | 'browser'; // 'browser' must never hold identity data
}

interface PlatformAuthentication {    // biometrics or device passcode; gates key use, not UI
  authenticate(reason: string): Promise<'ok' | 'cancelled' | 'unavailable'>;
}

interface NotificationAdapter {       // payload schema cannot carry personal data
  notify(n: { kind: 'REQUEST_NEW' | 'REQUEST_EXPIRING' | 'DECISION_RECORDED'; ref: string }): Promise<void>;
}

interface CameraAdapter { scanQr(signal: AbortSignal): Promise<string> }

interface CredentialPresentationCapabilities {
  readonly formats: ReadonlyArray<'sd-jwt-vc' | 'mdoc'>;      // after the format decision
  readonly transports: ReadonlyArray<'same-device' | 'cross-device-qr' | 'nfc' | 'ble'>;
  readonly consentSurface: 'phone' | 'tablet' | 'desktop';    // never 'watch' or 'vehicle'
}
```

## Capability by platform

| Capability | Web (today) | Native iOS / Android (planned) | Watch (research) | Vehicle (blocked) |
|---|---|---|---|---|
| Show credentials | Yes (synthetic) | Planned | **No** (policy) | **No** (policy) |
| Consent and disclosure | Yes (demo) | Planned | **No** | **No** |
| Hardware keystore | No | Planned | NOT VERIFIED | n/a |
| Biometrics | No (WebAuthn not used) | Planned | n/a | n/a |
| Push notifications | No (polling) | Planned | Bridged from phone | No eligible category |
| QR | Code entry (no camera) | Planned (camera) | No | No |
| Installable | Yes: PWA manifest; Chromium reports installable (`PWA_FEASIBILITY.md`) | Store apps | — | — |

## Rule that holds everywhere

`DeviceCapabilities` decides **presentation** only. Security decisions (key use, consent, protocol verification) belong to the server and to attested platform keys. This mirrors today's rule that only a server-issued `VerifiedByProtocol` can show a protocol result.
