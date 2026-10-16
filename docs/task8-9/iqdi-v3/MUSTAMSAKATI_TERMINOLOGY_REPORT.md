# MUSTAMSAKATI_TERMINOLOGY_REPORT

The section «بطاقاتي» is renamed to «مستمسكاتي» across the IQDI citizen wallet. This is a wording change only. The stacked-card design, interactions, routes, types, API and storage are unchanged. TEST ONLY, synthetic data.

Branch `fix/iqdi-mustamsakati-terminology`, based on `design/iqdi-premium-wallet-v3` @ `4433c55`.

## 1. Terms

| Use | Term |
|---|---|
| Section name (nav, page title, home, shortcuts) | «مستمسكاتي» |
| General description | «المستمسكات الرقمية» |
| Details page | «تفاصيل المستمسك» |
| Opening an item | «عرض المستمسك» |
| Sharing after reviewing a request | «مشاركة البيانات» (unchanged) |

## 2. Text changes

| Where | Before | After |
|---|---|---|
| Bottom nav (`App.tsx`) | بطاقاتي | مستمسكاتي |
| Home: quick service, section heading | بطاقاتي | مستمسكاتي |
| Home: section link | كل البطاقات | كل المستمسكات |
| Home: mini-cards list `aria-label` | البطاقات | المستمسكات |
| Home: summary button (to `/card`) | عرض بطاقتي | عرض الهوية الرقمية |
| `/cards`: title | بطاقاتي | مستمسكاتي |
| `/cards`: description | وثائقك الرقمية التجريبية. اختر بطاقة لعرضها في المقدمة، ثم افتح تفاصيلها. | مستمسكاتك الرقمية التجريبية. اختر مستمسكاً لعرضه في المقدمة، ثم افتح تفاصيله. |
| `/cards`: count | N بطاقات | N مستمسكات |
| `/cards`: empty state | لا توجد بطاقات | لا توجد مستمسكات |
| `/cards`: stack `aria-label` | مجموعة البطاقات | مجموعة المستمسكات |
| `/cards`: card accessible name | …، البطاقة n من N | …، المستمسك n من N |
| `/cards`: selected-card action | عرض التفاصيل | عرض المستمسك |
| `/credentials`: title | اعتماداتي | مستمسكاتي |
| `/credentials`: description | كل الاعتمادات الاصطناعية في محفظتك التجريبية. | كل المستمسكات الرقمية الاصطناعية في محفظتك التجريبية. |
| `/credentials`: search label, list `aria-label` | بحث في الاعتمادات / قائمة الاعتمادات | بحث في المستمسكات / قائمة المستمسكات |
| Details: eyebrow, title | اعتماد / تفاصيل الاعتماد | مستمسك / تفاصيل المستمسك |
| Details: back links | العودة إلى بطاقاتي / العودة إلى الاعتمادات | العودة إلى مستمسكاتي / … قائمة المستمسكات |
| Services catalogue (favorites) | الاعتمادات | قائمة المستمسكات |
| `/card` links | تفاصيل الاعتماد / كل البطاقات | تفاصيل المستمسك / كل المستمسكات |
| Settings: reset help text | …وتعيد الاعتمادات الاصطناعية | …وتعيد المستمسكات الاصطناعية |

## 3. Intentional exceptions

- **«بطاقتي الرقمية»** (page `/card`) and the «بطاقتي» service name are kept. They refer to one specific card, the synthetic national ID, not the section.
- **«عرض البطاقات»** (view switch) is kept. It names the visual layout (stacked cards) as opposed to «عرض القائمة».
- **Trust and status wording keeps «اعتماد»**, as technical accuracy for Verifiable Credentials:
  - credential states («اعتماد تجريبي فعال / للعرض فقط / منتهي الصلاحية / موقوف / ملغى»);
  - «حالة الاعتماد»;
  - the «اعتماد اصطناعي» warning;
  - the «الثقة والتحقق» card.
- **Unchanged identifiers:**
  - routes `/cards`, `/card`, `/credentials`, `/credentials/:id`;
  - storage keys (`iqdi-wallet-cards-view`, …);
  - TypeScript types, API data and package names.

  None needed a change, so no migration is required.
- **`packages/ui/src/preferences.test.tsx`** uses a generic «بطاقتي» fixture for the favorites component. It is not section UI.
- **Historical evidence and reports** (for example `CI_TEST_EVIDENCE.md`, earlier evidence folders) are frozen and not rewritten.

## 4. Tests

Expectations were updated to the new names. None were deleted or loosened.

New tests in `test/wallet-cards-v3.test.tsx` (8 tests) check 7 routes: `/`, `/cards`, list view, `/credentials`, details, `/card` and `/settings`. On each route they verify:

- the expected `h1`;
- that the bottom-nav link «مستمسكاتي» points to `/cards`;
- that «بطاقاتي» appears in neither the visible text nor any `aria-label`.

They also check the «عرض المستمسك» action. The Vitest floor is raised from 124 to 132.

`npm run modernization:verify`, run locally:

| Step | Result |
|---|---|
| typecheck | PASS |
| lint | PASS |
| tests (Vitest) | PASS, 132/132 |
| compatibility | PASS |
| build | PASS |
| browser-regression (cross-app E2E) | PASS, 12/12 |
| browser-ux (UI/UX, RTL, axe) | PASS, 20/20 |
| browser-wallet (wallet E2E) | PASS, 16/16 |
| browser-pdf-ux | PASS, 27/27 |
| coverage-guard | PASS |
| secrets-diff | PASS |
| secrets-all-index | BLOCKED (optional; pre-existing PNGs, unchanged) |

Evidence: `evidence/task8-9/iqdi-v3-terminology/` (JSON results).

## 5. Screenshots

Real Chromium captures at 390 px with synthetic data, from `scripts/iqdi-mustamsakati-shots.json`:

- home;
- «مستمسكاتي» stack, light and dark;
- a selected item with «عرض المستمسك»;
- list view;
- «تفاصيل المستمسك», light and dark.

PNGs are gitignored per repo policy and delivered in the ZIP package.

## 6. Out of scope

- No TASK-10 or TASK-11.
- No redesign of TASK-8 or TASK-9.
- No merge.
- G1a/G1b are not claimed.
- OD-01…OD-09 stay PENDING.
