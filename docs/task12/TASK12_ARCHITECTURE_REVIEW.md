# TASK12_ARCHITECTURE_REVIEW

Scope: the code at `564f062` (TASK-11 head). No structural change was made. The current structure works and is covered by tests; changing it for style alone would add risk.

| Area | What exists | Assessment | Action |
|---|---|---|---|
| Monorepo | npm workspaces: `apps/{wallet-web,verifier-web}`, `packages/{ui,shared-types,api-client,mock-services}`. Strict TypeScript, one ESLint config | Clear boundaries. Only the apps depend on `ui`; `api-client` depends on `shared-types`; `mock-services` depends on `shared-types` | None |
| Application boundaries | Each app has its own gateway context, pages and local state. Shared code lives only in packages | Good. A lint rule stops apps from importing `crypto-ports`, server code or protocol SDKs | None |
| Shared design system | `packages/ui`: components, hooks, `styles.css` (V3 tokens, light/dark, glass, motion) | One stylesheet of about 600 lines with app-specific sections (`cred-*`, `vf-*`). Workable; a split per app would be a refactor with no user benefit now | Documented (R-A1) |
| Shared types | DTOs plus runtime guards plus `previewDemoDisclosure`. `VerifiedByProtocol` is branded with a `unique symbol` | Sound. The brand was not enforced against casts (finding M3) | **Fixed**: lint rule plus a brand mutation test |
| API contracts | `/demo-api/v1`. Typed decoding on every response; strict request validation | Sound. Gaps are documented in `TASK11_API_CONTRACT_REVIEW.md` | Unchanged |
| Wallet / verifier gateways | Thin typed wrappers over `Transport` | Sound. Provider replacement is tested | Unchanged |
| Transport | Timeout, correlation id, GET-only retry, typed `ApiError` | Used `AbortSignal.any`, which needs Safari 17.4+ (finding M6) | **Fixed**: `anySignal()` fallback |
| Mock services | One in-memory store; loopback-only server | No Origin check, so cross-site POSTs could reset the demo (finding L3) | **Fixed**: foreign-Origin POSTs refused (tested) |
| Trust adapters | `WalletTrustAdapter` and `VerifierTrustAdapter` | Sound. They need the branded proof | Unchanged |
| Crypto-ready ports | `crypto-ports.ts`, fail-closed | No change needed | **Not modified** |
| State management | `useAsync` (abortable, deps-keyed, polling), `localStorage` and `sessionStorage` for preferences only | Polling could overlap a slow request, and an older response could overwrite a newer state (finding M1) | **Fixed**: one request in flight per hook (tested, mutation-checked) |
| Error handling | `describeError` gives Arabic messages; error and stale states on pages | Sound | Unchanged |
| Accessibility primitives | `Modal`, `Switch`, `SegmentedControl` | The Modal effect re-ran on every parent render and pulled focus back once a second (finding **H1**); the dialog could not scroll (M4) | **Fixed** (tested, mutation-checked) |
| Test organisation | Vitest (node and jsdom projects), browser suites in `scripts/*.mjs`, coverage guard | Package test files were not protected by the guard (T2); some tests asserted after fixed sleeps (T1) | **Fixed** |
| CI/CD | One workflow, Ubuntu and Windows matrix, required verify | The full-index secret scan was optional (M7) | **Fixed**: now passes and is required |

## Duplication and hard-to-test parts

- `mask()` appears in both `CredentialCard.tsx` and `IdCard.tsx`, as identical one-liners. Low value; left as is.
- The polling logic is duplicated per page through `useAsync`. That is fine: it is one hook.
- `scripts/*.mjs` browser suites each start their own stack, which is slower than sharing one. Keeping them independent is deliberate (isolation). There are now 7 suites; a shared runner is a future option (R-A2).
- **No unnecessary dependencies:** the runtime dependencies are React, React DOM, React Router, the Arabic font package and `qrcode-generator` (wallet QR screen).
