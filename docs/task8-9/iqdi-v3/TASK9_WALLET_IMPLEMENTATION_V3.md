# TASK9_WALLET_IMPLEMENTATION_V3

Commit `e593a3e`. The existing pages were developed further; nothing was rebuilt.

| Area | Implementation |
|---|---|
| Home | Summary card: avatar icon (no photo, **no verification tick**), name, age from the synthetic birth date, «محفظة تجريبية نشطة», DEMO, «عرض بطاقتي», privacy toggle. Pending alert. Quick services (بطاقاتي / QR تجريبي / مشاركة البيانات). Recent requests (organisation, purpose, fields, countdown, «مراجعة الطلب», «رفض الطلب»). Mini cards (title + status only). Favorites. Recent activity. **No ID number on home.** |
| بطاقاتي `/cards` | Card stack + list view (see `CARD_STACK_INTERACTION_SPEC.md`). |
| Card details `/credentials/:id` | Card hero (masked), synthetic notice, status and validity with meter, embedded data with a reveal switch, five-state panel, trust panel; the share link appears only for the credential that answers requests; Back returns to the selected card. |
| States | `ACTIVE_DEMO` · `DISPLAY_ONLY` · `EXPIRED` · `SUSPENDED` · `REVOKED`, all listed on the details page. «تحقق بروتوكولي فعلي — غير متوفر حالياً» is always shown. ACTIVE never means VERIFIED_BY_PROTOCOL. |
| Bottom nav | الرئيسية · بطاقاتي · الطلبات · النشاط · الإعدادات; sub-pages keep their section active; badge for pending requests. |
| Requests and consent | Unchanged flow: review → disclosure preview (shared vs private) → confirm approve/reject; expiry, duplicates and offline are handled by the server and UI. «رفض الطلب» from home only pre-opens the reject confirmation. |
| QR | Kept; IQDI-DEMO marker, no claims, 60 s renew, DEMO stamp. |
| Settings | Theme, text size, transparency, motion, **privacy mode**, notifications, favorites, reset, tour. |
| Privacy mode | Hides the name, avatar and age on home; the holder on cards; the name and reference on the ID card; and the name, birth date and identifiers on details, where the reveal switch is removed (fixed after the review). Stored as an `on`/`off` flag only (`iqdi-wallet-privacy`). |
| Mock | Display-only education credential `cred-test-005`. Only the national ID answers requests (unchanged rule, shared by wallet and server). |

The «النشاط» page keeps its heading «سجل الاستخدام», so existing references stay valid.
