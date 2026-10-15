# PDF compliance matrix

Reference: owner's four-page «معايير تجميل التطبيقات الحكومية.pdf». PDF technology predictions are treated as design examples, not verified facts. WCAG 2.2 AA is the implementation target; automated checks do not certify conformance.

| PDF | Requirement | Wallet | Verifier | Implementation / evidence |
|---|---|---|---|---|
| 1–2 | Restrained glass, gradients, readable critical data | PASS | PASS | Glass on nav only, opaque cards/consent/results; reduced-transparency option; browser visual inspection |
| 2 | Clear navigation, primary service within ~3 interactions | PASS | PASS | Card / New Request reached with one nav click; browser journey and ux results |
| 2 | Accurate action/load/success/error/expiry feedback | PASS | PASS | Skeleton + alerts + confirmation + polling; approve/reject/expiry E2E; org-error fix |
| 2 | Consistency, icons, spacing/shadows | PASS | PASS | packages/ui retained, shared tokens and SVG navigation family |
| 2 | Responsive mobile/tablet/desktop | PASS (tested scope) | PASS (tested scope) | Settings reflow tested 320/390/768/1366; primary journey mobile wallet/desktop verifier |
| 2 | Safe form-progress persistence | PARTIAL | PASS (limited) | No sensitive form persistence; verifier persists template enum only, not free-text purpose |
| 3 | 200–400ms motion and cancellation | PASS | PASS | Button 220ms, nav shadow 240ms; reduced-motion media query tested; color transition removed after contrast failure |
| 3 | Skeleton loading | PASS | PASS | Existing LoadingState public API now uses aria-hidden skeleton with readable live status |
| 3 | Normal body type >=16px, scalable text | PASS (tested scope) | PASS (tested scope) | Body 1rem, settings +125%, 200% text test; small metadata/tab labels remain smaller |
| 3 | AA contrast, labels, keyboard and screen reader | PARTIAL | PARTIAL | Token ratios + axe settings and 24 main-route/theme audits; skip link, keyboard and modal tests; manual NVDA/VoiceOver and full WCAG audit NOT RUN |
| 3 | Native Arabic RTL | PASS | PASS | Arabic/rtl browser checks; logical CSS; Arabic labels. No claim of Kurdish/English implementation |
| 3–4 | Light/dark/system + text + transparency | PASS | PASS | Both apps persist preferences; live OS theme switch and header synchronization tested |
| 3–4 | Favorite service shortcut | PASS | PASS | Functional allow-listed route selector on home/dashboard; preference remount unit test |
| 4 | Customized notifications | PARTIAL | NOT RUN / deferred | Existing wallet new-request local switch retained; no fabricated news/push categories. Verifier polling updates status, no notification center |
| 3–4 | Weak-network handling / modest hardware | PARTIAL | PARTIAL | Offline API retry tested. Real low-end devices, bandwidth throttling and performance budgets NOT RUN |
| 3 | 200% zoom | PARTIAL | PARTIAL | 200% text/reflow tested at 640 CSS px; full desktop browser zoom and every route at every size NOT RUN |

Further limitations: no production QR/protocol semantics were introduced; existing demo labels and controls retained. Tests cover primary journeys, not a human usability study or an official accessibility certification.
