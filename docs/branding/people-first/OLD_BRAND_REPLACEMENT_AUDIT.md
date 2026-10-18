# OLD_BRAND_REPLACEMENT_AUDIT

**Goal:** the palm/Ishtar-arch/lion identity must be gone from every **live** screen and asset path, while its history is kept.

## Where the old identity is now

| Old item | Now | Live? |
|---|---|---|
| `assets/branding/iqdi-{logo,mark}-*.svg`, `iqdi-icon-small.svg`, `iqdi-app-icon.svg`, `png/*` | `git mv` → `assets/branding/archive/palm-arch-v1/` (history kept) | **No** |
| `tools/branding/generate_brand.py` | `tools/branding/archive/generate_palm_arch_v1.py` (writes only into the archive) | **No** |
| `docs/branding/iqdi-final/*` | Unchanged; `SUPERSEDED.md` added | Documentation only |
| `evidence/branding/{verify,check}` (PR #14 runs) | Unchanged | Evidence only |
| Old asset tests (`test/brand-assets.test.ts`) | Re-pointed at the archive. The archived files must still be safe, real vectors (no raster, no script, no endorsement wording) | Guards the archive |
| Wallet PWA icons, both favicons | **Replaced** with People First renders | Live: new |
| `IQDIBrand` imports | **Replaced** with `assets/branding/people-first/*` | Live: new |

## Automated checks that the old brand is gone from live code

1. **`test/brand-people-first.test.ts` › no live app file references the archived identity.** It scans every `.ts/.tsx/.css/.html/.webmanifest` under `apps/` and `packages/ui/src` for:
   - `assets/branding/` paths other than `people-first`;
   - `iqdi-(mark|logo)-(original|dark)`;
   - `iqdi-app-icon.svg`.

   Result: **none found**.
2. **Archived motifs absent from every new master.** The same test file checks for the lion path, the river bands, the tile pattern and the palm trunk. Result: **none present**.
3. **Favicons.** Both apps' `favicon.svg` must equal the People First favicon. Mutation-checked: putting the archived icon back fails the test.
4. **Browser check (`browser-brand`, 73 checks).** The served favicons, the manifest icons and the header, welcome, About and sidebar artwork come from the built People First assets. There are no broken images on any main route.
5. **Manual grep.** `palm|ishtar|lion|نخلة|عشتار|أسد` in `apps/*/src` and `packages/ui/src`: **0 matches**.

## Where old references remain (intended)

- `test/brand-assets.test.ts`: it names the archived files on purpose, to guard the archive.
- `docs/branding/iqdi-final/` and PR #14: historical records.
- `evidence/branding/{verify,check,visual}`: earlier run evidence. The «before» screenshots in this task's evidence intentionally show the old brand.

## Prohibited motifs: confirmed absent from the new brand

None of these appear in any People First master:
- palm;
- Ishtar gate;
- cylinder seal;
- Babylon lion;
- map of Iraq;
- the national eagle or any state seal;
- a shield, fingerprint or stock tech icon.

The symbol was not redesigned in another style.
