# Supabase foundation: stage evidence and next milestone

Assessment and Stage 1: 8 October 2026. Branch: `codex/supabase-foundation`. This is a repository foundation and migration-design increment. Supabase website authentication and the complete aiBean MVP are not implemented by this stage.

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
| Updated branch CI | Local equivalents passed; remote run to be checked after publication | Baseline CI success is not proof of the updated workflow |

The temporary HTTP preview was stopped after the smoke checks. No credentials, hashes, tokens or personal records were included in this report. Pre-existing untracked installed skills (`.agents/` and `skills-lock.json`) were preserved outside the foundation commits.

## Configuration and live-state evidence

Presence checks only: local password account settings exist and AIBEAN_AUTH_MODE selects password. DATABASE_URL, Supabase application URL/publishable key, Clerk keys, Stripe secret/webhook settings and Upstash credentials are absent. No secret values were printed. Supabase SDK/SSR packages are not yet installed in the application.

Codex lists a `supabase` MCP registration pointing to project `yfknxidgphhepdtwazhn`; the requested `supabase-aibean-dev` registration is absent. This chat exposes no callable Supabase tools. Prior successful agent OAuth is not evidence of live schema inspection or website Auth configuration. Actual project identity/environment, schemas/tables, grants, RLS, migration ledger, historical Users, identities and provider settings remain unverified.

Docker Desktop's Linux engine is unavailable. Existing PGlite tests applied both migrations only in an ephemeral in-memory database; they do not establish isolated full PostgreSQL/Supabase compatibility, RLS or ownership isolation.

## Stage status

| Stage | Status |
|---|---|
| 1 Repository/audit refresh | Local implementation and validation completed; branch CI publication verification follows |
| 2 Live database/identity | Design prepared; inspection and real PostgreSQL validation blocked on access/runtime |
| 3 Core Supabase Auth | Not implemented; no active cutover |
| 4 Other approved methods | Requirements/platform research completed; none operational in aiBean |
| 5 Authorization/retirement | Target contract prepared; legacy code retained pending validated replacement |
| 6–9 Data/Admin/workflows/dashboards | Planned with dependencies; not delivered by this stage |

No cloud data, identity, settings, tables, grants or migration history were changed. No new migration was generated or applied. No provider or live billing was enabled.

## Next task and acceptance

Enable a callable read-only Supabase connection for the intended development project. Confirm its ref/environment, inspect actual metadata and both migration ledgers, and determine historical User/ownership counts without dumping records. Establish a disposable real PostgreSQL test target. Then prepare the exact additive identity mapping and RLS migrations, prove continuity/cross-user denial in isolation, and present any non-disposable application for owner approval with SQL/data impact/validation/recovery details.

The first operational milestone after those gates is verified email registration/login/recovery plus stable User mapping and two-account isolation, preserving existing account data and UI. It is not the entire MVP. See `MVP_REMEDIATION_PLAN.md` for acceptance of subsequent methods, capability cutover, Admin CRUD and the paid-claim workflow.
