<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/branding/png/iqdi-logo-dark-512.png">
    <img src="assets/branding/png/iqdi-logo-original-512.png" width="240" alt="IQDI — الهوية الرقمية العراقية (نموذج تجريبي)">
  </picture>
</p>

# IQDI — Iraqi Digital Identity (Prototype)

IQDI — الهوية الرقمية العراقية. Apps: **IQDI Wallet** (محفظة المواطن الرقمية) and **IQDI Verifier** (بوابة التحقق المؤسسي), part of the IQDI Digital Identity Ecosystem.

> Naming: the product was renamed from IQDID to **IQDI**. Internal identifiers keep the legacy prefix for compatibility (npm scope `@iqdid/*`, local/session-storage keys and DOM event names `iqdid-*` (e.g. `iqdid-demo-theme`, `iqdid-appearance-v1`, `iqdid-demo-template`, `iqdid-theme-change`), evidence env vars `IQDID_*`, the GitHub repository name). See `docs/task8-9/iqdi-v3/IQDI_REBRANDING_REPORT.md`.

**Brand:** one IQDI visual identity for the whole prototype ecosystem — vector masters, app icon and usage rules in `assets/branding/` and `docs/branding/iqdi-final/`. It is the project's own visual identity, not a government emblem.

**TEST ONLY — Iraqi digital identity prototype.** Synthetic data and test keys only. Not affiliated with, endorsed by, or representing any government body. Nothing in this repository performs real identity verification.

## TASK-8: demo workspace

Two web apps that work together through one local demo API:

| App | For | URL (dev) |
|---|---|---|
| `apps/wallet-web` | Citizen (mobile-first) — digital card, credential detail, data-sharing requests, approve/reject, activity, settings | http://127.0.0.1:5173 |
| `apps/verifier-web` | Organisation staff (desktop) — dashboard, create request, sessions, results, activity, settings | http://127.0.0.1:5174 |
| `packages/mock-services` | Local demo REST API (in-memory, loopback only) shared by both apps | http://127.0.0.1:4010/demo-api/v1/health |

Shared packages: `packages/ui` (Arabic RTL design system, light/dark), `packages/shared-types` (demo DTOs + runtime guards), `packages/api-client` (typed gateways; demo transport with timeout/retry/cancel/correlation id; real transport is a disabled placeholder).

### Quick start

Requires Node.js ≥ 22.18 (Node 22 LTS) and npm.

```bash
npm ci
npm run dev        # demo API + both apps
```

Open the verifier, create a request, then open the wallet (another tab, browser or device on the same machine) and approve or reject it. The verifier updates automatically.

| Command | What it does |
|---|---|
| `npm run verify` | typecheck + lint + unit/integration tests + production build |
| `npm run e2e` | browser end-to-end test on the production builds (needs Chromium; see DEVELOPMENT.md) |
| `npm run evidence -- --ci` | full clean run with logs and exit codes in `evidence/task8/` |
| `npm run preview` | demo API + production builds |

### What "approval" means here

`DEMO_ACCEPTED` only means the synthetic citizen pressed **approve** in the demo wallet. No signature, credential presentation, OpenID4VP/OpenID4VCI exchange or cryptographic check happens. The UI says so wherever a result is shown.

Earlier design and evidence (TASK-1…7) live on their own branches and pull requests; this branch starts from `main` and does not modify them. See `docs/task8/` for the TASK-8 report, evidence and known limitations, and `DEVELOPMENT.md` for the architecture.
