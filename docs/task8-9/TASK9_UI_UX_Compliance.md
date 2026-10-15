# TASK9_UI_UX_Compliance

Source of criteria: «معايير تجميل التطبيقات الحكومية.pdf» is **MISSING**. Proxy: `UI_UX_PDF_COMPLIANCE_MATRIX.md` (from the uploaded reports ZIP) + WCAG 2.2 AA. Items the proxy marked PARTIAL are re-assessed below.

| Criterion | Status | Evidence |
|---|---|---|
| Arabic-first, RTL everywhere | MET | `dir=rtl` asserted on 11 routes × 3 widths (W j12); logical CSS properties |
| Mobile-first wallet, small and medium devices | MET | 320/390/768 without overflow (W j12, X reflow); screenshots 320/768 |
| Premium navy/blue identity, balanced glass | MET | design system v2; glass only on chrome; content on opaque surfaces |
| No transparency weakening text | MET | reduced-transparency switch + OS media query; axe contrast PASS light/dark |
| Light / Dark / System | MET | segmented control; System follows OS live (X); persisted (W j11) |
| Text scaling | MET | normal/large/larger + 200 % reflow (X) |
| Reduced motion | MET | switch + OS setting; transitions 0 s asserted (X) |
| WCAG 2.2 AA automated | MET (automated only) | axe 0 violations on 13 wallet routes × 2 themes |
| Keyboard, skip link, focus visibility | MET | X keyboard; yellow 3 px focus ring; modal Escape |
| Screen-reader semantics | PARTIAL | roles/labels tested (switch, timer, regions, nav labels, live countdown); **no real AT session** |
| Notifications | MET (DEMO, in-app) — was PARTIAL | `/notifications`, bell badge, unread state |
| Weak network | MET — was PARTIAL | stale notice, error+retry, offline bar, decisions disabled offline |
| Safe form persistence | PARTIAL | short-code field is transient by design; only allow-listed ids stored locally |
| 200 % zoom | MET — was PARTIAL | X 200 % text; W 320 px + larger text |
| Clear consent (what is shared / kept private) | MET | disclosure screen; confirmation dialogs name the organisation |
| Status always visible (pending/expired/decided) | MET | badges + countdown ring + outcome alerts |
| Error messages actionable | MET | refusal reason kept visible; retry buttons; code-entry guidance |
| Demo honesty | MET | DEMO banner, DEMO stamps on QR/hero, "تجريبي" labels, no protocol claim |
| Privacy by default | MET | document/sensitive numbers masked until revealed |
| Icons not emoji, decorative icons hidden | MET | SVG set, `aria-hidden` |
