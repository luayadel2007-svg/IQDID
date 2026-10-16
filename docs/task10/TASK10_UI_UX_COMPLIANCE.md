# TASK10_UI_UX_COMPLIANCE

Style: Government Premium + EUDI-inspired simplicity + subtle glass, desktop first. It uses the shared IQDI Design System V3 tokens (`packages/ui/src/styles.css`). TASK-10 adds only `vf-*` classes, appended at the end of that file. The citizen card-stack UI is not used in the verifier.

Every row below is checked by a script on the production build (Chromium), unless it is marked *design* or *visual*. The results are in `evidence/task10/`.

| Area | Requirement | How it is met | Measured by |
|---|---|---|---|
| Layout | Desktop first, professional sidebar | 248 px glass sidebar with three visual groups (العمليات · المتابعة والتدقيق · الإدارة). The active item has a bar and a filled background. Below 860 px it becomes a horizontal tab bar | VE responsive step; screenshots `t10-15-*` |
| Colour | Navy and blue, consistent | Existing tokens (`--c-primary`, `--c-navy`). KPI accent bars use the status tones | axe colour-contrast, light and dark (VE, U) |
| Information cards | Ordered and readable | KPI tiles (label, value, hint), split layout (main plus aside), cards with icon headers | *visual*; screenshots |
| Tables | Clear on wide and narrow screens | Header row, `scope="col"`, hidden caption. The scroll region is keyboard-focusable with a visible focus ring. The dashboard uses a compact 4-column variant | axe `scrollable-region-focusable`; VE no-overflow at 320 px |
| Status | Readable, not colour alone | Every badge has text that includes the protocol code (e.g. «رُفض (DEMO_REJECTED)») | P5, VE |
| Spacing | Comfortable | Shared spacing scale (8/12/16/24/32 px) | *design* |
| Motion | Simple, functional, 200–400 ms | KPI hover lift and border change use `--dur` (220 ms). There is no decorative animation | P3; VE reduced-motion = 0 moving elements |
| Theme | Light, dark, system | Shared `useTheme`. The axe audit covers 12 verifier states × 2 themes | VE axe; U; P11 |
| Reduced transparency | Glass can be turned off | `html[data-glass="off"]` and the `prefers-reduced-transparency` media query | P10 |
| RTL | Arabic RTL | `dir="rtl"`, logical properties (`inset-inline-*`, `padding-inline-*`). Codes are LTR-isolated (`.mono`) | P1; VE |
| Keyboard | Full flow without a mouse | Skip link. The create flow is reachable by Tab and Enter. Focus moves to «المراجعة والتأكيد» and back to «تفاصيل الطلب». Cancel uses a modal with a focus trap (shared `Modal`) | VE keyboard step; U skip link |
| Screen reader | Meaningful names | Stepper `aria-current="step"` with «(مكتملة)». Live «عرض N من M» counts. `role="timer"` countdown. Code read out character by character. Five-layer trust list is labelled | V (role and name queries) |
| Text zoom | 200 % without horizontal scroll | — | VE (683 px @ 200 %), P14 |
| Loading | Skeleton, not a bare spinner | Shared `LoadingState` | P7 |
| Connection failure | Visible, recoverable | First-load failure shows an error with «إعادة المحاولة». A failure after data has loaded shows a stale notice, keeps the data, and recovers automatically. Browser offline shows the top bar | V, VE, U |
| Empty data | Empty state instead of invented statistics | Dashboard: «لا توجد جلسات بعد» and no KPI tiles. Lists: «لا توجد جلسات» or «لا توجد جلسات مطابقة» | V, VE |
| Services in 1–3 clicks | — | Every sidebar link reaches its page in one click | P8, X |

## Screens (real captures, production build, synthetic data)

All captures are in `evidence/task10/verifier-e2e/screenshots/`. PNG files are git-ignored by repository policy and delivered in the ZIP package.

| File | Screen |
|---|---|
| `t10-01-dashboard-empty` | Dashboard with no data (empty state) |
| `t10-02-create-details` | Create step 1 with the live preview |
| `t10-03-create-review` | Create step 2: review and confirm |
| `t10-04-session-created` | Session code card after creation |
| `t10-05-session-accepted` | DEMO_ACCEPTED with the five trust layers |
| `t10-06-dashboard` | Dashboard with KPIs, recent sessions, pending list and activity |
| `t10-07-sessions-filtered` | Sessions list with search, filter and sort |
| `t10-08-results` | Results summary with the outcome filter |
| `t10-09-session-expired` | Expired session and its timeline |
| `t10-10-org-b-isolated` | Organisation B opening organisation A's session (not found) |
| `t10-11-stale-network` | API down: last data kept, with a notice |
| `t10-12…14-*-dark` | Dark theme: review step, dashboard, accepted session |
| `t10-15-{dashboard,sessions}-{1024,768,390}` | Tablet and phone reflow |
