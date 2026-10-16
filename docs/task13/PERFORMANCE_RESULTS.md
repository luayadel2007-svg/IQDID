# PERFORMANCE_RESULTS

The TASK-13 code was measured by `scripts/perf-measure.mjs`; the data is in `evidence/task13/perf/perf.json`.

**Environment:**
- Linux container, 4 vCPU;
- Chromium 141;
- production builds, loopback demo API with no added latency.

**Method:**
- ×4 means Chrome DevTools CPU throttling. It is a mid-range-device **proxy**, not a real device.
- Values are the median of 3 cold loads.
- Interaction latency is the largest Event Timing duration of scripted interactions. It is an INP proxy, not field INP.
- **No physical device was measured.**

## Budgets (set in TASK-12) and results at ×4

| Route | LCP (≤ 2,500) | TBT | Max CLS (≤ 0.10) |
|---|---|---|---|
| Wallet `/` | 648 ms | 405 ms | 0.048 |
| Wallet `/cards` | 648 ms | 446 ms | 0.003 |
| Wallet `/requests` | 576 ms | 280 ms | 0.015 |
| Wallet `/requests/:id` | 920 ms | 364 ms | 0.036 |
| Verifier `/` | 960 ms | 301 ms | 0.004 |
| Verifier `/new` | 832 ms | 301 ms | 0.004 |
| Verifier `/sessions` | 844 ms | 272 ms | 0.004 |
| Verifier `/sessions/:id` | 780 ms | 302 ms | 0.011 |

**Interaction latency** (budget ≤ 200 ms at ×4):

| Interaction | ×1 | ×4 |
|---|---|---|
| Wallet stack select | 32 ms | 32 ms |
| Wallet privacy toggle | 32 ms | 96 ms |
| Verifier create form | 16 ms | 88 ms |
| Verifier filter and search | 72 ms | 48 ms |

**Bundles:**

| App | JS | JS gzip |
|---|---|---|
| Wallet | 330,626 B | 106,500 B |
| Verifier | 286,335 B | 90,965 B |

CSS (shared): 61,490 B, 12,749 B gzip. That is +2.7 KB raw over TASK-12, for the tablet, desktop, safe-area and nav rules.

**Polling:**

| Screen | Requests per 10 s |
|---|---|
| Wallet home | 20 |
| Verifier dashboard | 14 |
| Verifier session | 7 |

All under 2 per second.

**All budgets met.** The TASK-13 layout changes did not regress load or interaction metrics (compare `TASK12_PERFORMANCE_BASELINE.md`). Wallet home CLS stays below 0.1 (0.048; it was 0.171 before TASK-12).

**Not measured:**
- real devices;
- Firefox and WebKit performance;
- network-throttled page loads (functional slow-network behaviour is covered in `CROSS_DEVICE_E2E_EVIDENCE.md`);
- battery and thermal behaviour.
