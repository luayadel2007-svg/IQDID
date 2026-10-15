# TASK9_Feature_Matrix

Status: **WORKS** = functional end-to-end against the demo API · **DEMO** = works, explicitly labelled as simulation · Test ids: `U` = `test/wallet-premium.test.tsx`, `W` = `scripts/wallet-e2e.mjs`, `X` = `scripts/ux-e2e.mjs`, `R` = `scripts/e2e.mjs`, `C` = `test/cross-app.test.tsx`.

| Feature | Status | Where | Proven by |
|---|---|---|---|
| Onboarding (3 steps, skip, persisted) | WORKS | `/welcome` | U onboarding |
| Modern ID card, masked document number | WORKS (synthetic) | `/card` | screenshots 03; X axe |
| Credential status (active/expiring/expired/suspended/revoked) | WORKS | list, details, card | U credentials |
| Search + filter credentials | WORKS | `/credentials` | U credentials |
| Credential details, validity meter, sensitive masking | WORKS | `/credentials/:id` | U masks |
| Sharing requests list, multi-org filter | WORKS | `/requests` | U multi-org; W multi-org |
| Approve / reject with confirmation | DEMO (DEMO_ACCEPTED/REJECTED) | request + disclosure | C, R, U, W journeys |
| Session countdown (ring + text) | WORKS (server TTL authoritative) | list, review | W expired; C expiry |
| Selective disclosure preview (shared vs private) | DEMO (no SD-JWT) | `/requests/:id/disclosure` | U disclosure; W j2 |
| QR code | DEMO (no claims, 60 s, stamped) | `/qr` | U QR; W j5 |
| Open request by short code | WORKS | `/qr` | U QR; W reject-via-code |
| Activity log, day groups, filter, search | WORKS | `/activity` | U network; W j4 |
| Notifications center, unread, mark read | DEMO (in-app only) | `/notifications`, header bell | U notifications; W j1 |
| Pending badge on nav | WORKS | nav | W j1 |
| Favorite services (max 6, allow-listed) | WORKS | Home + Settings | U favorites |
| Theme Light/Dark/System, persisted | WORKS | Settings | X persistence; W theme |
| Text size, reduced transparency, reduced motion | WORKS | Settings | X; `preferences.test.tsx` |
| Small (320) and medium (768) devices | WORKS | all | W responsive (11 routes × 3 widths); X reflow |
| Weak connection (stale data notice) | WORKS | data pages | U network; W duplicate |
| Network error + retry | WORKS | all data pages | U network; W j9; X offline |
| Offline bar, decisions disabled offline | WORKS | global | U offline; W j10 |
| Duplicate decision refused | WORKS (server) | review | U duplicate; W j7 |
| Page reload during review | WORKS | review/disclosure | W j3 |
| Expired session closes, late decision refused | WORKS (server) | review | W j8; C |
| Verifier updates live; both histories update | WORKS | both apps | W j4; R; C |
| Never shows VERIFIED_BY_PROTOCOL | ENFORCED | all | U every-screen; W noProtocolClaim; type test |
| Help & About | WORKS | `/help` | U every-screen; X axe |
| Demo reset (both apps) | WORKS | Settings | R; C |
