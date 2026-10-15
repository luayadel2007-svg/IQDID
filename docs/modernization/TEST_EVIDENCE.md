# Test evidence — actual local execution

Base HEAD: `6dcfffb6a6ac44572714dfdb7c125aad8efa8ad7` with staged modernization changes. Tested source-file SHA-256 values are in `evidence/modernization/final/commands.json` (`sourceHashes`); the delivery commit must match them. This is a working-tree test, not a claim that the untouched base commit contained these changes. Platform: linux, Node v24.19.0, Chromium 141 through playwright-core 1.56.1. Test timestamp (UTC): 2026-10-15T11:56:34.632Z.

## Actual commands and exits

`npm ci` from the lockfile succeeded; separately captured exit in `evidence/modernization/clean-install.json`. Then `npm run modernization:verify` executed:

| Step | Outcome | Exit | Raw stdout / stderr |
|---|---|---|---|
| typecheck | PASS | 0 | `evidence/modernization/final/typecheck.stdout.log` / `.stderr.log` |
| lint | PASS | 0 | `evidence/modernization/final/lint.stdout.log` / `.stderr.log` |
| tests | PASS | 0 | `evidence/modernization/final/tests.stdout.log` / `.stderr.log` |
| compatibility | PASS | 0 | `evidence/modernization/final/compatibility.stdout.log` / `.stderr.log` |
| build | PASS | 0 | `evidence/modernization/final/build.stdout.log` / `.stderr.log` |
| browser-regression | PASS | 0 | `evidence/modernization/final/browser-regression.stdout.log` / `.stderr.log` |
| browser-ux | PASS | 0 | `evidence/modernization/final/browser-ux.stdout.log` / `.stderr.log` |
| secrets-diff | PASS | 0 | `evidence/modernization/final/secrets-diff.stdout.log` / `.stderr.log` |
| secrets-all-index | BLOCKED | 2 | `evidence/modernization/final/secrets-all-index.stdout.log` / `.stderr.log` |

The script requires every change-scope check to pass. Full-index scanner status is separately recorded and **not converted into PASS**; it is not the gate for the changed source because historical PNGs are unsupported. Full command argv, start times, duration, log hashes and source hashes are in `final/commands.json`.

## Counts and scope

- Vitest: **68/68 PASS**; original 58 tests preserved, 10 added. Includes both React apps against one live local HTTP server, isolation/expiry/decisions, transport errors, provider substitution, disabled real provider, forged result rejection, SDK import lint mutations, preferences and favorites.
- Browser regression: **12/12 PASS**. Production builds, two independent browser contexts, one loopback demo server. Request → exact synthetic preview → consent/decline → live result, expiry, org isolation, logs, reset and keyboard skip. Test TTL=15s; production default remains 120s.
- UX: **20/20 PASS**. Theme synchronization/persistence/live system changes; responsive settings at 320/390/768/1366; 200% text at 640 CSS px; keyboard; reduced motion; offline errors/retry; one-click primary navigation.
- Axe: zero violations in four settings theme audits and **24 route/theme audits** across the two apps. Routes include home, card/credential or request creation, request/session detail, lists, results and activity. Automated scope is WCAG A/AA tags through 2.2. Incomplete/manual checks remain reported in route JSON; this is not full conformance certification.
- Compatibility: **4/4 new injected boundary contracts PASS** (not the historical SDK suite). Direct SDK import/re-export/dynamic import/require mutations rejected by lint. No real protocol verification was performed.
- Integrity: **42/42 package manifest entries**, all SOURCE_INDEX bytes/hashes, **18/18 frozen G1 reference hashes**. Actual copied adapter/scanner match their source blobs; source/change hashes in separate evidence.
- Workflow: YAML parse + pinned actions/read-only/no-persisted-credentials/PR trigger invariants PASS. Hosted Windows/Linux CI is separate from this local run. `actionlint`: NOT RUN (unavailable).

## Failures retained and corrected

Early logs preserve two incorrect replacement-test selectors and new test type configuration errors. Initial browser run: 11 PASS / 1 FAIL because the new preview introduced a second matching field label; exact-label assertion corrected, no acceptance removed. Initial UX audit found transient dark-mode active-nav contrast; background interpolation removed. Offline verifier sessions exposed a real org-load-error bug; OrgBoundary now reports the error and offers retry. The dashboard's inherited sibling-card margin was scoped out of grid columns after visual review.

`tests-first.log`, `typecheck-third.log`, `e2e.log`, `ux-first.log`, and `round2-final/` / `round3-final/` preserve failed or superseded rounds. Raw log whitespace is retained; code-only `git diff --check` passes. Historical `evidence/task8` is unchanged.

## Limits — accurate status

| Check | Status |
|---|---|
| Baseline-diff secret scan | PASS, no findings/errors; see final JSON |
| Full-index secret scan | BLOCKED (exit 2): inherited evidence/task8 PNG screenshots unsupported; no new exception added |
| Real HSM/KMS/PKI, protocol verification, encrypted migration | NOT RUN — not implemented |
| Existing TASK-3 raw SDK six failures, 42 adapter tests | HISTORICAL; NOT RE-RUN here, not relabeled |
| Windows on user device | NOT RUN — no access to that device |
| Manual NVDA/VoiceOver, full WCAG conformance, real low-end/performance/throttling | NOT RUN |
| G1a/G1b acceptance | BLOCKED / not passed; no gate claim |

Independent review: no external reviewer or sub-agent; limited self-review only. Frozen references were read-only. Pending owner decisions remain pending.

## Hosted CI and final boundary review

[Hosted run 38730317746](https://github.com/luayadel2007-svg/IQDID/actions/runs/38730317746) passed on both Windows Server 2022 and Ubuntu 24.04 / Node 22 for commit `da32c5e2924afb76cd8d84f4c876d81eb771541e`. `hosted-ci-initial.json` records job IDs and success. Local HEAD `6dcfffb` has exactly the same tree as that published commit; different commit metadata does not change tested files.

After that hosted run, final review strengthened ESLint against computed dynamic imports and aliased createRequire bypasses. Six mutation forms are now exercised in both API-client and Wallet file contexts (12 rejected mutations within the existing contract test). The entire local suite was re-run and passed, with full-index scanner still BLOCKED for the same inherited images. Current exact source hashes are in final/commands.json. A fresh hosted run is triggered by the follow-up commit; do not attribute the prior hosted PASS to later source without checking its SHA.
