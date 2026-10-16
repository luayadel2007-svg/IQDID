# TASK13_IMPLEMENTATION_REPORT

**IQDI — Universal multi-device experience.** TEST ONLY, synthetic data.

- **Base:** TASK-12 (`8cb99f5`, Draft PR #12). Its CI is green on Ubuntu and Windows (run 38965846026).
- **Branch:** `feature/iqdi-task13-universal-experience`, Draft PR #13.

## 1. What changed

| Area | Change | Evidence |
|---|---|---|
| Test harness | `scripts/responsive-matrix.mjs` (new). Covers 15 widths × both apps × key routes, 11 extra modes, a probe self-test, state captures, PWA checks and 3 cross-device journeys. New **required** verify step `browser-responsive` (floor 286) | `evidence/task13/responsive/matrix.json` |
| Cross-browser CI | New `cross-browser` job (ubuntu-24.04): installs Playwright Firefox and WebKit, runs the matrix | PR #13 checks |
| Wallet tablet layout (≥ 760 px) | Home in a two-column grid with explicit rows. Phone DOM order unchanged. Reading pages keep 720 px. **«مستمسكاتي» stack capped at 460 px** | Screenshots at 820 and 1024 |
| Wallet desktop layout (≥ 1100 px) | Navigation rail instead of the floating phone bar | `wallet-home-1440` |
| **Bug fixed: nav labels overlapped** (≤ 375 px, larger text, 400 % zoom) | Items size to their labels; the bar scrolls sideways as a last resort | Matrix check «nav label overflows»; before/after captures |
| **Bug fixed: Arabic subtitle clipped vertically** in the header | `line-height: 1.9` on `.shell__sub` | Matrix `clipped-y` (was 108 hits) |
| **Bug fixed: header jitter** (found by Ubuntu CI). On a page that scrolls only 10–16 px, the header flipped between full and compact every frame: compacting shortened the page, so the scroll dropped back under the 8 px threshold. Seen at 1920×1200 on the request page, where the «رفض» button never stopped moving | Hysteresis in `AppShell`: compact above 32 px, expand at 8 px or less. The 24 px gap is wider than the 12 px height change | Matrix `header-stability` at scroll ranges 6–40 px (10–11 flips/s before the fix, 0 after); unit test. Both fail on the old code |
| Safe areas | `viewport-fit=cover` + `env(safe-area-inset-*)` on header, main, banner and nav | Code; untested on hardware |
| Short viewports | Header not sticky at height ≤ 520 px (landscape, 400 % zoom) | Matrix landscape and zoom modes |
| Verifier small screens | Visible hint for horizontally scrollable tables (all columns kept) | Matrix |
| PWA (wallet) | Manifest, icons (any + maskable + apple-touch), **no service worker** | `PWA_FEASIBILITY.md`; Chromium installability errors = `[]` |
| Studies | Native blueprint, smartwatch, CarPlay/Android Auto, cross-platform capabilities | `docs/task13/*` |

**Not changed:**
- API contracts;
- `crypto-ports.ts`;
- trust adapters;
- the card-stack interaction and «مستمسكاتي» naming;
- verifier pages (apart from the table hint).

## 2. Results (local, TASK-13 working tree on top of `8cb99f5`)

`npm run modernization:verify`: **every step PASS**.

| Suite | Result |
|---|---|
| Vitest | 184/184 |
| e2e | 12/12 |
| UX/axe | 20/20 |
| Wallet E2E | 16/16 |
| Verifier E2E | 14/14 |
| PDF audit | 27/27 |
| Scenarios | 9/9 |
| **Responsive matrix** | **286/286** |
| perf | PASS |
| coverage-guard | PASS |
| secrets-diff | PASS |
| secrets-all-index | PASS |

The GitHub Actions results for the TASK-13 commit (Ubuntu, Windows, Firefox/WebKit) are recorded in the PR #13 thread.

## 3. Independent assessment (evidence-based, not promotional)

| Dimension | Score /10 | Basis |
|---|---|---|
| Architecture | 8 | Clean package boundaries, typed seams, no structural churn. One large shared stylesheet |
| Code quality | 8 | Strict TypeScript and lint; the audit found 1 High (fixed). A few Lows deferred |
| UI/UX | 8 | Consistent V3 system and real tablet/desktop wallet layouts. No user testing |
| Responsive experience | 8 | 286 geometric checks, probe self-tested. Emulation only |
| Accessibility | 7 | axe 0 violations, keyboard/zoom/reflow automated. **No manual AT testing** |
| Browser compatibility | 6 | Chromium fully. Firefox/WebKit only in CI. No Safari, no devices |
| Performance | 8 | Every budget met at 4× CPU. TBT 270–450 ms at 4× |
| Integration | 9 | Scenarios A–H and contract tests on every change |
| Test coverage | 8 | 184 unit/integration + 7 browser suites + guard. Mutation-checked key tests |
| Security boundaries | 7 (demo) | Demo/protocol separation enforced. No authentication (owner decision) |
| Future platform extensibility | 7 | Blueprint and capability design. Localisation not extracted yet |

## 4. Readiness, kept separate

| Readiness | Status |
|---|---|
| **Prototype web readiness** | Reached for the tested web targets (Chromium; Chrome on Ubuntu and Windows; Firefox/WebKit per CI) |
| **Native mobile readiness** | Not started: blueprint only |
| **Smartwatch readiness** | Research only |
| **Automotive platform eligibility** | Not eligible: blocked by platform policy (no matching category) |
| **Government production readiness** | **Not reached, not claimed** (no IAM, issuer, keys, protocol verification, audit, governance) |
