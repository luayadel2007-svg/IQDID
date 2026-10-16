# TASK12_PERFORMANCE_BASELINE

- **Measured by:** `scripts/perf-measure.mjs`. In TASK-12 it gained LCP, long-task total (TBT), JS heap and interaction latency.
- **Evidence:** `evidence/task12/baseline/perf/perf.json` (code `564f062`) and `evidence/task12/final/perf/perf.json` (TASK-12 code).
- Nothing below is copied from earlier reports.

## Environment

| Item | Value |
|---|---|
| Machine | Linux container, 4 vCPU (cloud), loopback network |
| Runtime | Node 22.22.0, Chromium 141.0.7390.37 (Playwright 1.56.1 build), production builds via `vite preview` |
| Demo API | `DEMO_LATENCY_MS=0` |
| Device emulation | ×1 = unthrottled. ×4 = Chrome DevTools CPU throttling 4×, used as a **proxy** for a mid-range phone. **No physical device was measured** |
| Method | 3 cold loads per route, medians; CLS is the maximum of the 3 runs |
| Not measured | Real-device timings; network throttling for page loads (the slow-network behaviour is covered functionally in TASK-13); Firefox and WebKit performance |

## Budgets (set before the TASK-12 fixes)

| Metric | Budget | Basis |
|---|---|---|
| LCP | ≤ 2,500 ms at ×4 | Web Vitals "good" threshold |
| CLS | ≤ 0.10 | Web Vitals "good" |
| Interaction latency (Event Timing max duration) | ≤ 200 ms at ×4 | INP "good" threshold. This is a proxy over scripted interactions, not field INP |
| JS per app | ≤ 150 KB gzip | Prototype budget |
| Polling | ≤ 2 requests/s per open screen | Loopback demo |

## Results (TASK-12 code)

| App | Route | FCP ×1 | LCP ×1 | LCP ×4 | Data ready ×4 | TBT ×4 | Max CLS | JS heap |
|---|---|---|---|---|---|---|---|---|
| Wallet | `/` | 244 | 244 | 780 | 1,201 | 553 | **0.034** (baseline 0.171) | 3.6 MB |
| Wallet | `/cards` | 228 | 228 | 620 | 1,039 | 411 | 0.003 | 3.4 MB |
| Wallet | `/requests` | 192 | 192 | 648 | 971 | 368 | 0.014 | 3.3 MB |
| Wallet | `/requests/:id` | 188 | 188 | 960 | 1,077 | 378 | 0.036 | 3.5 MB |
| Verifier | `/` | 300 | 408 | 1,120 | 1,137 | 392 | 0.004 | 3.5 MB |
| Verifier | `/new` | 260 | 260 | 876 | 1,016 | 324 | 0.004 | 3.3 MB |
| Verifier | `/sessions` | 260 | 268 | 868 | 966 | 295 | 0.004 | 3.4 MB |
| Verifier | `/sessions/:id` | 288 | 288 | 816 | 1,064 | 355 | 0.011 | 3.4 MB |

All times are in milliseconds. TBT is the sum of (long task − 50 ms) during load.

**Interaction latency** (largest Event Timing duration ≥ 16 ms):

| Interaction | ×1 | ×4 |
|---|---|---|
| Wallet: select a card in the stack, then Escape | 48 ms | 64 ms |
| Wallet: privacy-mode toggle twice | 32 ms | 88 ms |
| Verifier: choose a template, type a purpose | 24 ms | 56 ms |
| Verifier: status filter, search | 88 ms | 64 ms |

**Bundles:**

| App | JS | JS gzip |
|---|---|---|
| Wallet | 330,161 B | 106,415 B |
| Verifier | 286,150 B | 90,908 B |

CSS (shared): 58,803 B, 12,241 B gzip.

**Other measurements:**
- Startup: demo API and both preview servers ready in 584 ms.
- Polling: wallet home 20 requests per 10 s; verifier dashboard 14; verifier session 7.
- Console errors: 0. Overflow: none.

**Verdict:** every budget is met at ×4. The one regression found (wallet home CLS) was fixed in TASK-12. TBT at ×4 (295–553 ms) is the largest remaining cost: React start-up on a throttled CPU. It does not block a budget; code-splitting is a possible later optimisation, not done here.
