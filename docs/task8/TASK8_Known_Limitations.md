# TASK-8 — Known limitations

TEST ONLY. These are deliberate scope limits or open items, not hidden defects.

| # | Limitation | Impact | Planned in |
|---|---|---|---|
| L-01 | **No real verification.** `DEMO_ACCEPTED` = the synthetic citizen pressed approve. No SD-JWT VC, KB-JWT, signature, trust list or status-list check exists. The UI states this on every result. | Results prove the UX flow only, not identity. | TASK-11/12/14 |
| L-02 | Demo API is **separate from the OpenAPI v1.1 drafts** (`/demo-api/v1`). The real transport is a disabled placeholder (`VITE_IQDID_TRANSPORT=real` → "not implemented"). | Gateways/pages are reusable; the transport and DTO mapping must be written for real services. | TASK-11+ |
| L-03 | **No authentication or authorisation.** Anyone who can reach `127.0.0.1:4010` can act as the citizen or any demo organisation. Organisation scoping is by query parameter, not identity (OD-01/OD-02 still PENDING). | Acceptable only on a single developer machine; the server refuses non-loopback binding. | After OD-02 |
| L-04 | **In-memory state.** Restarting the demo API resets everything. One synthetic citizen (TEST-001) and one credential. | Demo only. | TASK-12/13 (DB per TASK-6 design) |
| L-05 | Cross-app updates use **polling** (wallet 2 s, verifier 1.5 s), not push. | Up to ~2 s delay; small extra local traffic. | TASK-14 (SSE/WebSocket if needed) |
| L-06 | Wallet is a **web app**, not the G1b wallet: no key storage, no device binding, no hardware keys. | Nothing here counts toward G1b. | TASK-9 |
| L-07 | **WCAG 2.2 AA is a design target, not a certified result.** Tested: token contrast ≥ 4.5:1 (16 pairs), labelled controls, dialog focus trap and Escape, skip link, keyboard Tab in a real browser. Not done: screen-reader testing, a full axe audit, 200% zoom review. | Possible remaining a11y issues. | TASK-15 |
| L-08 | Browser E2E runs in Chromium only (local Playwright Chromium; CI uses the runner's system Chrome). No Firefox/Safari. | Cross-browser issues undetected. | TASK-16 |
| L-09 | **ESLint 9.x is out of upstream support** (no advisories; `npm audit` = 0). ESLint 10 is a major upgrade and was not done blind. | Dev tooling only. | Maintenance |
| L-10 | Installing from scratch without the lockfile hit an npm 10.9 arborist bug (`edgesOut`); the lockfile was produced with npm 11.6.4. `npm ci` with npm 10 works. | Use `npm ci`; to change deps use npm ≥ 11.6. | — |
| L-11 | Gates: **G1a and G1b are NOT passed.** TASK-8 does not change any owner decision (OD-01…OD-09 remain PENDING). Building apps before G1a is per the owner's new roadmap; the G1a exception is not yet recorded as an owner decision. | Governance. | Owner |
| L-12 | Dates use the `ar-IQ` locale with Latin digits; Hijri calendar and Kurdish are not supported. | UX. | TASK-15 |
| L-13 | Notification setting is local to the browser (no real push). | Demo only. | TASK-9 |
