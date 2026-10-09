# Supabase foundation: stage evidence and next milestone

Initial assessment: 8 October 2026. Updated 9 October 2026. Branch: `codex/supabase-foundation`. This is a repository foundation, verified connection and SSR-preparation increment. Supabase website authentication and the complete aiBean MVP are not implemented by this stage.

## Stage 1 completed work

- Verified local baseline and GitHub main both pointed to `31234704677df5e7f0252b30d996232a6602e726`; created a feature branch without rewriting history.
- Verified baseline [GitHub Validate run](https://github.com/nzagha/aibean/actions/runs/37814625875) succeeded for that exact commit.
- Patched Next.js 16.3.6 -> exact 16.3.8, added pinned JS/TypeScript/React Hooks lint tooling, and committed the dependency lockfile. Implementation commit: `9b8a96c`.
- Added CI lint, route type generation/typecheck, a runtime high/critical vulnerability gate and a job timeout, retaining tests/build. CI still uses Node 24 and read-only repository permissions.
- Removed unused imports and resolved lint findings around effect dependencies and parser-ref updates. Kept narrowly explained exceptions for intentional modal cleanup and control-character rejection. No brand, grid, typography or page composition changes.
- Created the Supabase architecture diagram, routes, provider/configuration matrix, identity/database migration plan, account-security/MFA specification, authorization/RLS matrix and dependency-aware remediation plan.
- Updated active README/scope/security/capability instructions and root AGENTS.md; preserved the generated Next.js guidance. Original October 7 audit, migration SQL/snapshots and version archives are unchanged.

## Validation evidence

| Check | Observed result | Limits |
|---|---|---|
| Existing tests after patch | 20 passed, 0 failed | Unit/DOM/PGlite tests; no Supabase provider tests |
| `npm run lint` | Passed, zero warnings | JS/TS/Hooks rules, not complete accessibility/Next-specific rules |
| `npm run typecheck` | `next typegen` + non-incremental tsc passed | Static validation only |
| `npm run build` | Next 16.3.8 production build passed | First sandbox attempt failed Windows path permissions; rerun with required access succeeded |
| Existing HTTP smoke script | 15 public content checks, 8 guest redirects, billing-unconfigured 503 and unknown-Tool handling passed | Local development fixtures on temporary port 3100; no authenticated/payment/browser journey |
| `npm audit --omit=dev --audit-level=high` | Zero runtime vulnerabilities reported | Registry scan at this time, not security certification |
| Full npm audit | Four moderate, zero high/critical package entries | Pre-existing Drizzle Kit/esbuild development chain remains |
| Audit/migration/archive diff | No changes | Does not prove cloud history or backup health |
| Baseline foundation branch CI | [Run 37852480152](https://github.com/nzagha/aibean/actions/runs/37852480152) succeeded for c231624 | The subsequent connection/SSR increment has separate validation below |

The temporary HTTP preview was stopped after the smoke checks. No credentials, hashes, tokens or personal records were included in this report. Pre-existing untracked installed skills (`.agents/` and `skills-lock.json`) were preserved outside the foundation commits.

## Configuration and live-state evidence

Local password settings remain and AIBEAN_AUTH_MODE selects password. The verified Supabase project URL and securely retrieved publishable key are now saved to ignored `.env.local`; Auth settings API connectivity passes. DATABASE_URL, Clerk keys, Stripe and Upstash credentials remain absent. Supabase JS 2.117.3 and SSR 0.12.7 are installed with exact pins. No sensitive values are included in the report.

The existing `supabase` registration was successfully queried through the local Codex app-server: correct project URL, database postgres, PostgreSQL 17.6. Eight non-system schemas were inventoried. All 14 aiBean tables and both application migration ledgers are absent. TestUsers has two rows and public-read permission; Auth users/identities have zero rows. Metadata, grants, policies and aggregate counts were inspected without record bodies. See [connection readiness](SUPABASE_CONNECTION_AND_ENVIRONMENT_READINESS.md) for the exact evidence and unresolved enforced-read-only MCP authorization.

Docker initially reported an unavailable Linux engine. A hidden Desktop startup was attempted; its subsequent engine probe did not complete and was cancelled. No container or volume was created/deleted. Existing PGlite tests apply both migrations only in an ephemeral in-memory database; isolated real PostgreSQL/Supabase migration and role tests remain unverified.

## Stage status

| Stage | Status |
|---|---|
| 1 Repository/audit refresh | Completed; baseline foundation CI verified |
| 2 Live database/identity | Read-only live metadata verified; application SQL configuration, isolated migration validation and reviewed installation pending |
| 3 Core Supabase Auth | Client/SSR utilities prepared; login, mapping and cutover not implemented |
| 4 Other approved methods | Requirements/platform research completed; none operational in aiBean |
| 5 Authorization/retirement | Target contract prepared; legacy code retained pending validated replacement |
| 6–9 Data/Admin/workflows/dashboards | Planned with dependencies; not delivered by this stage |

No cloud data, identity, settings, tables, grants or migration history were changed. No new migration was generated or applied. No provider or live billing was enabled.

## Connection and SSR preparation increment — 9 October

Work completed: pinned Supabase clients; added project/key validation, browser/server/route clients, verified-claims refresh helper and per-request cookie/cache-header preservation. Added `npm run supabase:check`, which uses read-only SQL transactions and redacted output. Prepared utilities are deliberately not called by active login/proxy until migration validation. The site, shared header/footer, typography, grids, existing interactions and preview login are unchanged.

Changed files: package.json/lock; `.env.example`; Docker Compose; `src/lib/supabase/{config,client,server,cookies,route,proxy}.ts`; `src/lib/db/connection-config.ts`; `scripts/check-supabase-readiness.ts`; `tests/supabase-foundation.test.ts`; README and active foundation/architecture/provider/migration/connection documents. Ignored environment changes contain only the operator's local configuration and are not published. No historical audit/version/archive or migration changes.

Validation: lint passed; all **23 tests passed**, including three new tests for project/key rejection, PostgreSQL target/TLS validation and cookie chunk/cache-header propagation across redirects and repeated writes. Type generation/typecheck and production build passed after granting the required Windows path access. Runtime npm audit reports **zero vulnerabilities**; four pre-existing moderate development findings remain. The live readiness command confirms Auth connectivity and correctly exits nonzero for missing DATABASE_URL. No end-to-end login, two-account isolation, new migration or Stripe test is claimed.

Security implications: TestUsers public-read exposure and broad default table grants require review before launch/schema installation. Client-visible configuration accepts only a publishable key; privileged secrets stay server-only. The prepared SQL checker validates TLS and refuses other project URLs; the production Drizzle role has not yet been configured or validated. No active capability behavior has changed.

Regression checks: 15 public content checks, eight guest redirects, unconfigured billing rejection and unknown-Tool/noindex behavior passed on a temporary port-3100 development preview; the preview was stopped afterward. Compose profile validation lists only `web` for the hosted app profile. A scan of changed/new files against configured sensitive environment values found zero matches. Historical audit, migration and archive diffs remain empty. Remote CI for this increment is recorded after publication, separately from the earlier baseline run.

## Next task and acceptance

Configure the official DATABASE_URL privately and verify TLS/role/pooling, establish an isolated PostgreSQL test target, and prepare the exact additive identity mapping plus atomic installation/RLS/grant migrations. Preserve TestUsers and all historical internal IDs. Prove continuity/cross-user denial and recovery in isolation, then present the non-disposable target, SQL, impact, evidence and recovery plan for owner approval. Enforced-read-only MCP URL authorization remains separate from the successful SELECT-only inspection.

The first operational milestone after those gates is verified email registration/login/recovery plus stable User mapping and two-account isolation, preserving existing account data and UI. It is not the entire MVP. See `MVP_REMEDIATION_PLAN.md` for acceptance of subsequent methods, capability cutover, Admin CRUD and the paid-claim workflow.
