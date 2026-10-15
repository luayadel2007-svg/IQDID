# PDF_UI_UX_COMPLIANCE_REVIEW

**Source.** The file «معايير تجميل التطبيقات الحكومية.pdf» itself was **not provided**. Its text was pasted into the request and is reviewed directly here. The paste **ends mid-word at §7.2** ("2. **ح…"), so §7.2 onward is **BLOCKED**. This is not a review of the full original PDF.

**Legend.** PASS = proven by an automated browser or unit check on this branch · PARTIAL = partly met, or checked only by manual screenshot review · FAIL · NOT RUN · BLOCKED. Passing axe is **not** treated as full accessibility compliance.

Evidence ids: `P#` = `scripts/pdf-ux-audit.mjs` (both apps; `pdf-audit/audit.json`), `UX` = `scripts/ux-e2e.mjs`, `W` = `scripts/wallet-e2e.mjs`, `U` = Vitest.

| § | Criterion | Wallet | Verifier | Evidence / note |
|---|---|---|---|---|
| 2 | Text clarity before transparency | PASS | PASS | axe contrast 0 violations in light and dark (UX); glass only on chrome |
| 2 | User can reduce or turn off transparency | PASS | PASS | P10 `backdrop-filter: none`. **FAILED in round 1** (`saturate(1.4)` remained), fixed in `049ae93` |
| 2 | Layered content, not stacked decoration | PARTIAL | PARTIAL | manual screenshot review only |
| 3 | Core services within 3 clicks | PASS | PASS | P8 measured: every primary service opened with 1 click from home and its page heading confirmed (wallet 5, verifier 6) |
| 3 | Clear information, no bureaucratic jargon | PARTIAL | PARTIAL | manual review; some technical terms remain visible by design (`DEMO_ACCEPTED`, credential type codes) |
| 3 | Immediate feedback (sent / processing / done) | PASS | PASS | e2e "أُرسل الطلب…", pending → outcome badges, loading button state (W, e2e) |
| 3 | Visual consistency | PARTIAL | PARTIAL | one shared `packages/ui`; P4 icon size uniform; otherwise manual |
| 3 | Responsive phone / tablet / desktop | PASS | PASS | P14: 320 / 390 / 768 / 1366 + 200 % text, no horizontal scroll; W j12 |
| 3 | Save progress | PARTIAL | PARTIAL | settings and favorites persist; the verifier request form and wallet code field are not kept across navigation |
| 4.1 | Limited glassmorphism, solid surfaces for data | PASS | PASS | glass only on nav/top bar; content cards opaque (CSS + P10) |
| 4.2 | Calm gradients (government blue → sky) | PARTIAL | PARTIAL | manual review of screenshots |
| 4.3 | Light shadows instead of heavy borders | PARTIAL | PARTIAL | manual review |
| 4.4 | Consistent icons | PASS | PASS | P4: single icon size 22×22, one SVG set |
| 4.5 | Comfortable whitespace | PARTIAL | PARTIAL | manual review |
| 5.1 | Animated confirmation of an important action | PASS | NOT RUN | P13 `confirm-pop` on the wallet decision outcome (added in `049ae93`). Verifier success alerts get the same CSS but were not measured. Haptics: not implemented |
| 5.2 | Skeleton loading | PASS | PASS | P7 stylesheet rule + U "loading skeleton announces a readable status" |
| 5.3 | Status not by colour alone | PARTIAL | PARTIAL | P5 every badge has text. Badges use a dot, not distinct icons per status; alerts do have icons |
| 5.4 | Top bar adapts to scrolling, nothing hidden | PASS | PASS | P9 + U adaptive header test (added in `049ae93`) |
| 5.5 | Button press feedback | PASS | PASS | P6: `:active` transform rule present (stylesheet check, not a measured press) |
| 5 | Motion 200–400 ms, reducible | PASS | PASS | P3 measured `[220]` ms; P12: no element transitions or animates under reduced motion (all elements checked). Exceptions by design: spinner loop, 1 s countdown-ring tick |
| 6.1 | Base text ≥ 16 px | PASS | PASS | P2 body 16 px. Secondary text 13–14 px on 28/50 (wallet) and 22/33 (verifier) text elements |
| 6.1 | Text scaling, device font settings | PASS | PASS | UX 200 % reflow, in-app text size; rem-based CSS. Device-level setting: NOT RUN on a device |
| 6.2 | Contrast 4.5:1 / 3:1 | PASS | PASS | axe on 13 wallet routes and the verifier routes × light/dark; token pairs ≥ 5.6:1 (U) |
| 6.3 | Meaningful Arabic labels for screen readers | PARTIAL | PARTIAL | roles and names asserted in tests (switches, timers, regions, nav, dialogs). **No real screen-reader session (NOT RUN)** |
| 6.4 | Light and dark as complete themes | PASS | PASS | P11 + axe dark |
| 6.5 | Native Arabic RTL | PASS | PASS | P1 + W j12 (11 routes × 3 widths) |
| 6.6 | Low and mid-range devices, slow networks | PARTIAL | PARTIAL | weak network, offline and retry tested (W, U). No low-end device or throttled-CPU run (NOT RUN). Wallet bundle 101.6 kB gzip |
| 7.1 | Light / Dark / follow system | PASS | PASS | UX live OS-change test; settings persist |
| 7.2+ | (text truncated) | BLOCKED | BLOCKED | needs the original PDF or the rest of the text |

Also requested:

| Area | Result | Evidence |
|---|---|---|
| Keyboard accessibility | PASS (automated) | UX skip link → `main`, Escape closes dialogs |
| Loading and error states | PASS | U network / offline / error; UX offline + retry |
| Navigation simplicity | PASS | P8 |

**Summary:** every measured criterion passes on both apps, except §5.1 on the verifier, which was NOT RUN; PARTIAL items need manual design sign-off or features not in scope (form draft saving, per-status icons, haptics); §7.2+ BLOCKED. No FAIL remains among measured items.
