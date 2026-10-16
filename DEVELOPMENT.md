# Development guide (TASK-8)

## Layout

```
apps/
  wallet-web/        React + Vite, citizen app (mobile-first, bottom tab bar)
  verifier-web/      React + Vite, staff app (desktop side nav, organisation switcher)
packages/
  shared-types/      Demo DTOs, status enums, runtime guards and request validators
  api-client/        Transport (demo HTTP | real placeholder) + WalletGateway / VerifierGateway
  mock-services/     DemoStore (in-memory domain rules) + node:http server (loopback only)
  ui/                Design tokens, styles.css, components, hooks (useAsync, useTheme, useCountdown)
scripts/             dev/preview launcher, browser E2E, evidence runner (all cross-platform Node)
test/                Cross-app integration tests (both apps + real demo server)
evidence/task8/      Logs, exit codes, test results, screenshots
docs/task8/          TASK-8 report, evidence summary, known limitations
```

npm workspaces; packages are consumed as TypeScript source (no build step). The mock server runs directly with Node's built-in TypeScript type stripping (`node packages/mock-services/src/server-main.ts`), so it needs Node ≥ 22.18.

## How the two apps stay in sync

Both apps call the same local demo API through the Vite proxy (`/demo-api` → `127.0.0.1:4010`). Wallet and verifier poll it (2 s / 1.5 s). Nothing is shared through browser memory, so two tabs, two browsers or two windows all see the same state. Restarting the API or pressing **Demo reset** in either app restores the synthetic seed data.

## Demo API (not the OpenAPI v1.1 contracts)

All endpoints are under `/demo-api/v1` and are deliberately separate from the drafted service contracts:

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | status and session TTL |
| GET | `/organizations`, `/request-templates` | demo organisations A/B; age and identity templates |
| POST | `/verifier/sessions` | create a request `{organizationId, templateId, purpose}` |
| GET | `/verifier/sessions?organizationId=` | sessions of one organisation |
| GET | `/verifier/sessions/{id}?organizationId=` | one session (404 for other organisations) |
| POST | `/verifier/sessions/{id}/cancel?organizationId=` | cancel while pending |
| GET | `/verifier/activity?organizationId=` | organisation activity |
| GET | `/wallet/credentials`, `/wallet/credentials/{id}` | synthetic credential of TEST-001 |
| GET | `/wallet/requests`, `/wallet/requests/{id}` | incoming requests |
| POST | `/wallet/requests/{id}/decision` | `{decision: "ACCEPT" \| "REJECT"}` |
| GET | `/wallet/activity` | citizen activity |
| POST | `/demo/reset` | restore seed data |

Rules enforced on the server (not only hidden in the UI): one decision per request; no decision after expiry (default 120 s, `DEMO_SESSION_TTL_MS`); approve refused when the credential is not active; organisation-scoped reads; strict body validation (unknown fields rejected, 16 KB limit, JSON only); `X-Request-Id` echoed; `X-Environment: DEMO`; `Cache-Control: no-store`; binds to loopback only.

## Switching to real services later

Apps obtain their gateway from `createTransport(mode)`. `VITE_IQDI_TRANSPORT=real` (legacy `VITE_IQDID_TRANSPORT` is still honoured) selects `RealTransportPlaceholder`, which rejects every call with `not_implemented` and shows an explicit message. Replacing it means implementing `Transport` for the real services; pages and gateway interfaces stay the same.

## Environment variables

| Variable | Default | Used by |
|---|---|---|
| `DEMO_PORT` | 4010 | demo API |
| `DEMO_HOST` | 127.0.0.1 | demo API (non-loopback values are refused) |
| `DEMO_SESSION_TTL_MS` | 120000 | demo API |
| `DEMO_LATENCY_MS` | 250 | demo API (makes loading states visible) |
| `DEMO_API_TARGET` | http://127.0.0.1:4010 | Vite proxy |
| `VITE_IQDI_TRANSPORT` (legacy: `VITE_IQDID_TRANSPORT`) | demo | apps (`real` = disabled placeholder) |
| `CHROMIUM_PATH` | — | E2E (optional explicit Chromium binary) |

## Tests

* `npm test` — Vitest: node project (types, store, HTTP server, transport) and jsdom project (UI components, WCAG contrast of tokens, cross-app journeys against a real server on a random port).
* `npm run e2e` — Playwright (`playwright-core`) drives both production builds in two separate browser contexts. It uses the Chromium that Playwright finds (or `CHROMIUM_PATH`). On a new machine, install a browser once with `npx playwright-core install chromium`.

## Windows

All scripts spawn Node directly (no shell), so `npm run dev`, `npm run verify` and `npm run e2e` run the same way in PowerShell. Use Node 22 LTS ≥ 22.18. The repository normalises line endings to LF (`.gitattributes`).
