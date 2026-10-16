# IQDI_REBRANDING_REPORT

**Decision:** the product name changes from IQDID to **IQDI — Iraqi Digital Identity / IQDI — الهوية الرقمية العراقية**. Apps: **IQDI Wallet — محفظة المواطن الرقمية** and **IQDI Verifier — بوابة التحقق المؤسسي**, part of the IQDI Digital Identity Ecosystem. Commit `43a6316` (base `01dfc74`).

## 1. What changed (user-visible)

| Surface | Before | After |
|---|---|---|
| Wallet header | «محفظتي الرقمية» + "ID" tile | **IQDI Wallet** / محفظة المواطن الرقمية — تجريبية + IQDI mark |
| Verifier header | «بوابة التحقق للمؤسسات» | **IQDI Verifier** / بوابة التحقق المؤسسي — تجريبية |
| HTML `<title>` / description | "… — IQDID Demo" | "IQDI Wallet — …", "IQDI Verifier — …" (DEMO) |
| HTML meta | — | `application-name=IQDI`, `theme-color` |
| Favicon | "ID" | "IQDI" on the brand gradient |
| Brand mark | text tile | `BrandMark` (abstract eight-point star; no state emblem, no third-party logo) |
| QR demo payload marker | `IQDID-DEMO:` | `IQDI-DEMO:` |
| README / DEVELOPMENT | IQDID | IQDI, with a note on legacy identifiers |

## 2. Kept on purpose (not visible; compatibility)

| Identifier | Why kept | Migration path |
|---|---|---|
| npm scope `@iqdid/*` (6 workspaces, ~60 imports, lockfile) | renaming touches every import and the lockfile, for no user benefit | a separate PR: rename workspaces → `npx npm@11 install` → typecheck/tests; optional re-export alias packages |
| root package `iqdid-prototype` | not visible | same PR |
| storage keys `iqdid-*` (theme, appearance, favorites, notifications, org) | renaming would reset users' saved preferences | read-new-then-legacy shim if renamed later. New V3 keys already use `iqdi-*` (`iqdi-wallet-privacy`, `iqdi-wallet-cards-view`) |
| `VITE_IQDID_TRANSPORT` | existing configs | **done:** `VITE_IQDI_TRANSPORT` is read first, and the legacy name is still honoured |
| evidence env vars `IQDID_*`, evidence paths | CI and the historical evidence depend on them | keep |
| API routes `/demo-api/v1` | no brand in them | — |
| GitHub repository `IQDID` | needs the owner's approval | rename in GitHub settings (redirects keep old URLs), then update the remote and links |
| historical reports and evidence (`docs/task8`, `docs/modernization`, `docs/task8-9/*.md`, `evidence/*` before V3) | frozen records | never edited |

## 3. Proof

- `test/iqdi-branding.test.tsx` (16 tests): 10 wallet routes and 4 verifier routes render IQDI and never IQDID; both HTML files have IQDI titles and meta and no IQDID; the QR payload starts with `IQDI-DEMO:`.
- Wallet browser E2E step "IQDI brand": `document.title` and `innerText` of both production builds contain the IQDI name and no IQDID.
