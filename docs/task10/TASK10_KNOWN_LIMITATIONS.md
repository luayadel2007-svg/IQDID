# TASK10_KNOWN_LIMITATIONS

1. **No authentication.** Choosing an organisation is a demo switch, not a login. Isolation is enforced by the demo API's `organizationId` filter, which any caller can set. See `TASK10_SECURITY_BOUNDARIES.md` §5.
2. **Session validity before creation is the default.** The create page shows the default 120 s from `DEMO_SESSION_TTL_MS`. The demo API can be started with a different `DEMO_SESSION_TTL_MS`, and the API has no endpoint that exposes it to the verifier gateway. The session page always shows the real TTL computed from `createdAt` and `expiresAt`.
3. **Demo credential status is not visible to the organisation.** The trust panel says «غير مكشوفة للمؤسسة». After `DEMO_ACCEPTED` it states the server-side rule: acceptance is refused unless the credential is ACTIVE. It does not query the wallet.
4. **"Last updated" is client time** of the last successful load. It is not a server timestamp.
5. **Polling, not push.** The default is 1.5 s. A stale-data notice appears when a refresh fails, and the last good data stays on screen.
6. **Filters run in the browser** over the organisation's session list. The demo API caps that list at 500 sessions, which is fine for a demo but would not scale.
7. **Grouped sidebar labels are visual only** (`aria-hidden`). Screen readers get the six links in order, without group names.
8. **Dark-mode and contrast checks are automated** (axe WCAG 2.2 AA). No manual screen-reader session (NVDA, VoiceOver) was performed.
9. **Windows** is covered only by hosted GitHub Actions, not by a local run.
10. **No wallet file was modified by TASK-10.** Wallet regressions are guarded by the existing wallet tests. The shared stylesheet only gained `vf-*` classes, which the wallet does not use.
