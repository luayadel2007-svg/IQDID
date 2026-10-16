# TASK11_DEMO_RUNBOOK

How to run the IQDI demonstration on one machine. TEST ONLY, synthetic data. Everything runs locally on loopback; no cloud service and no account is needed.

## 1. Requirements

| Item | Version | Check |
|---|---|---|
| Node.js | ≥ 22.18 (CI uses Node 22 LTS; TypeScript files run with Node's built-in type stripping) | `node --version` |
| npm | Comes with Node | `npm --version` |
| Browser | Recent Chrome, Edge or Chromium | — |
| OS | Linux and Windows are verified in CI; macOS is untested | — |
| Free ports | 4010 (demo API), 4173/4174 (preview) or 5173/5174 (dev) | — |

## 2. First run

```bash
git clone https://github.com/luayadel2007-svg/IQDID.git
cd IQDID
git checkout feature/iqdi-task10-11
npm ci               # clean install from the lockfile
npm run build        # production builds of both apps
npm run preview      # demo API + both production builds
```

The terminal prints:

```
IQDI demo (TEST ONLY — synthetic data) is running:
  Wallet   (citizen)  http://127.0.0.1:4173
  Verifier (staff)    http://127.0.0.1:4174
  Demo API            http://127.0.0.1:4010/demo-api/v1/health
```

**Browser setup for presenting:**
- Open the **verifier** in a desktop-width window.
- Open the **wallet** in a second window. Use the browser's device toolbar at about 390 px wide, or a phone-sized window.
- Keep both visible side by side.

`npm run dev` starts the same thing with Vite dev servers (ports 5173/5174), for development.

## 3. Demo data

| Item | Value |
|---|---|
| Citizen | `TEST-001`, «مواطن تجريبي» (synthetic) |
| Credentials | National ID (answers requests), driving licence (expires in 5 days), residence card, education (display only), health card (SUSPENDED) |
| Organisations | org-test-a «مصرف تجريبي (أ)», org-test-b «شركة اتصالات تجريبية (ب)» |
| Templates | AGE_OVER_18 (1 field), IDENTITY_BASIC (3 fields) |
| Session validity | 120 s (default) |

The data is in memory. Restarting the demo API restores the seed.

## 4. Options (environment variables for the demo API)

| Variable | Default | Use |
|---|---|---|
| `DEMO_SESSION_TTL_MS` | 120000 | A short TTL shows expiry quickly (e.g. `20000`) |
| `DEMO_LATENCY_MS` | 250 | Artificial latency to make loading states visible |
| `DEMO_CREDENTIAL_STATUS` | ACTIVE | `SUSPENDED` or `REVOKED` for Scenario G |
| `DEMO_PORT` / `DEMO_HOST` | 4010 / 127.0.0.1 | Non-loopback hosts are refused |

Example (Linux/macOS): `DEMO_SESSION_TTL_MS=20000 npm run preview`. On Windows PowerShell: `$env:DEMO_SESSION_TTL_MS=20000; npm run preview`.

## 5. Reset between demonstrations

Use any of these:
- **Verifier** → «الإعدادات» → «إعادة ضبط البيانات التجريبية» → confirm.
- **Wallet** → «الإعدادات» → the same.
- **Terminal**, while the demo runs: `npm run demo:reset`. It is loopback only and checks that the target is the demo API.

A reset clears sessions and activity for both apps. Preferences (theme, text size) are per browser and are kept.

## 6. Running the scenarios automatically

```bash
npm run build
npm run test:scenarios     # Scenarios A–H in Chromium, evidence in evidence/task11/scenarios/
npm run modernization:verify   # everything: typecheck, lint, tests, builds, all browser suites
```

Set `CHROMIUM_PATH` if Chromium or Chrome is not where Playwright expects it.

## 7. Logs and common errors

| Symptom | Cause | Fix |
|---|---|---|
| «تعذر الاتصال بخادم العرض التجريبي. تأكد من تشغيله.» | The demo API is not running | Start `npm run preview` (or `npm run dev`) |
| `EADDRINUSE :4010` (or 4173/4174) | A previous run is still running | Stop it (Ctrl+C), or end the old `node` process |
| Request shows «انتهت مهلة الطلب» too soon | The TTL was shortened | Restart without `DEMO_SESSION_TTL_MS` |
| «موافقة تجريبية» is disabled with «اعتماد الهوية التجريبي موقوف» | Started with `DEMO_CREDENTIAL_STATUS=SUSPENDED` | Expected for Scenario G; restart without it |
| A blank page after `npm run preview` | No build | Run `npm run build` first |
| `npm run demo:reset` → «Refusing to reset a non-loopback demo API» | `DEMO_API_URL` points elsewhere | Use `http://127.0.0.1:4010` |
| Browser tests cannot find Chromium | No browser at the default path | `CHROMIUM_PATH=/path/to/chrome npm run …` |

The demo API logs every request as `[demo-api] METHOD path status requestId`. Error responses carry the same `requestId`, so a UI error can be matched to its log line.
