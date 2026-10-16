# TASK11_KNOWN_LIMITATIONS

1. **Prototype demo, not production.** There is no authentication, RBAC, protocol verification, issuer, trust registry, status list, key management or official audit. See `TASK11_SECURITY_AND_PRIVACY_BOUNDARIES.md` §5.
2. **Organisation isolation is a query parameter.** It separates data correctly in the demo (tested in both directions) but is not authorization.
3. **Polling, not push.** Measured: 7–20 demo-API requests per 10 s per open screen. Fine on loopback; a real deployment would need push or server-sent events with backoff.
4. **Wallet home layout shift (pre-existing, TASK-9): CLS ≈ 0.14** (median of 3 runs, unthrottled and 4× throttle). The verifier dashboard was fixed in TASK-11 (0.099 → 0.011). The wallet home was not changed: TASK-11 avoids wallet redesign. It is recorded for a later wallet pass.
5. **The performance numbers are from one container** (Linux, 4 vCPU, Node 22.22, Chromium, loopback, `DEMO_LATENCY_MS=0`). 4× CPU throttle is a proxy for a mid-range device, not a measurement on one. No real mid-range phone was tested.
6. **The scenario runner restarts the demo stack once** (Scenario G) on fixed ports 4010/4173/4174. Another process using those ports makes the run fail; the runbook lists this.
7. **Scenario evidence from the local run** was recorded on the working tree on top of `a103642`, before the TASK-11 commit (`workingTreeDirty: true`). The authoritative run on the TASK-11 commit is the GitHub Actions run listed in `TASK11_TEST_EVIDENCE.md`.
8. **The verifier cannot read the server's TTL before creation.** It shows the default (labelled). See `TASK11_API_CONTRACT_REVIEW.md`, gap 1.
9. **Reset is unauthenticated**, though loopback only and checked against `environment: DEMO`.
10. **Windows** is verified only in hosted CI. macOS is untested.
11. **Accessibility is checked automatically** (axe WCAG 2.2 AA, keyboard flows, 200 % text, reduced motion and transparency). No manual NVDA, JAWS or VoiceOver session was performed.
12. **Git tags could not be pushed** from this environment: the proxy refused them. The TASK-10 checkpoint is the branch `feature/iqdi-task10` and the local tag `iqdi-task10`.
