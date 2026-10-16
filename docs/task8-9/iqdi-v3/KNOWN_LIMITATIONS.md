# KNOWN_LIMITATIONS

1. **Truncated criteria.** The original criteria PDF was not provided and the pasted text stops at §7.2, so §7.2+ is BLOCKED.
2. **Partial rename.** Internal identifiers stay `iqdid` (npm scope, storage keys, evidence vars, repository name); the plan is in the rebranding report. The repository rename needs the owner's approval.
3. **No real verification.** No real screen-reader, device or cross-browser runs. Approvals are DEMO only; there is no SD-JWT, signature or trust chain. QR is DEMO and has no claims.
4. **Display-only credentials.** Licence, residence, education and health are display-only. No seeded credential is expired: EXPIRED is implemented and covered by the state model, but not shown in demo data.
5. **Bundle size.** Wallet bundle 105.7 kB gz; no route code-splitting yet.
6. **Detail heading.** Card details keep the page heading «تفاصيل الاعتماد»; the card hero is an image-role summary.
7. **Polling.** Cross-app updates use 2 s polling (unchanged).
8. **Independent review.** The independent review is by an AI agent, not a human auditor.
9. **Unchanged baselines.** G1a/G1b are NOT PASSED; OD-01…OD-09 are PENDING; no HSM/KMS; TASK-10 not started.
