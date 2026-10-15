# TASK9_Known_Limitations

| # | Limitation | Impact | Next step |
|---|---|---|---|
| L1 | All approvals are simulations (`DEMO_ACCEPTED`); no signature, SD-JWT, trust chain or status list | by design for TASK-9 | real provider behind `WalletTrustAdapter` + server `CredentialVerificationPort` |
| L2 | QR carries a DEMO marker + random nonce only; no verifier scans it | DEMO only | protocol-defined request/presentation QR when a standard is pinned |
| L3 | Notifications are in-app, derived from the activity feed; no push; unread state per browser | DEMO only | push needs a server channel and owner decision |
| L4 | Favorites, onboarding flag and read-state live in `localStorage` (allow-listed ids only) | lost on clearing site data | server profile only if required |
| L5 | Extra credentials (licence, residence, health) are display-only; only the national ID answers requests | intentional | multi-credential presentation logic later |
| L6 | Onboarding is offered (Home prompt) rather than forced on first launch, so deep links and existing tests keep working | UX choice | decide forced first-run with owner |
| L7 | Weak-connection detection = failed refresh + `navigator.onLine`; no bandwidth measurement | adequate for demo | — |
| L8 | Wallet bundle grew 84 → 101.5 kB gzip (QR library + 6 screens); no code-splitting yet | acceptable on 3G-class links | lazy-load `/qr` and rarely used routes |
| L9 | No real screen-reader / physical-device / Firefox / WebKit testing | a11y evidence is automated | manual AT pass |
| L10 | PDF criteria file missing; compliance uses the proxy matrix | criteria may differ | re-check when the PDF is supplied |
| L11 | Polling (2 s) for cross-app updates; two polls for badges in addition to page polls | demo load only | server push / ETags |
| L12 | Self-scored; no independent review in this run | scores are claims backed by tests, not an external audit | independent review on request |

Unchanged constraints: G1a/G1b NOT PASSED; OD-01…OD-09 remain PENDING; no HSM; TEST ONLY, synthetic data.
