# TASK12_KNOWN_RISKS

| ID | Risk | Severity | Why not fixed in TASK-12 | Owner decision needed? |
|---|---|---|---|---|
| R1 | The organisation is chosen by the client; the demo API filters by a query parameter | Medium (demo) / Critical (production) | Fixing it needs authentication and IAM, which is architecture work. The UI wording is now honest | **Yes**: production IAM |
| R2 | Stack 1 (TASK-1–3, PRs #1–#3) is not in the application line, and its `tools/` differs | Medium | Merge strategy belongs to the owner | **Yes** |
| R3 | No manual screen-reader or physical-device testing | Medium | No devices or assistive technology in the environment | Provide devices or testers |
| R4 | L4: SPA route changes are not announced (focus and title) | Low | Needs an agreed screen-reader pattern | Design decision |
| R5 | L7: the decision UI follows the client clock at expiry | Low | Clock skew is a protocol concern; the server is still authoritative | Protocol phase |
| R6 | L2: «mark all read» keeps the oldest 200 ids | Low | Needs more than 200 notifications; demo-irrelevant | No |
| R7 | L9: a slow QR lookup can navigate late. L10: an abort during body read is reported as a decode error | Low | Rare; cosmetic | No |
| R8 | Text rendered as pixels in committed screenshots is not machine-scanned | Low | No OCR in the scanner by design. New screenshots are git-ignored | Policy |
| R9 | Git tags cannot be pushed from automation | Low | Environment proxy | Tag locally |
| R10 | TBT 295–553 ms at 4× CPU | Low | Within budgets; code-splitting is an optimisation, not a defect | No |
| R11 | Demo data is in memory and reset is unauthenticated (loopback only, cross-site refused) | Low (demo) | By design for a demo | Production design |
| R12 | Windows and macOS are validated only by hosted CI (Windows) or not at all (macOS) | Medium | No local machines | Device lab |
