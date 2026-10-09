# Active MVP remediation plan

**Latest state — Approval B PASS (9 October 2026):** The explicitly authorized exact runtime-login package was executed once. A new password-authenticated aibean_app_login session passed trusted TLS, Drizzle reads and reviewed restrictions. The ignored application DATABASE_URL now uses that login; the operator connection and runtime credential are separately protected with private Windows DPAPI. Both TestUsers records/permissions, A objects/history and zero Auth/User/mapping counts are preserved. Local lint/typecheck, 31 tests, production build, runtime audit and public/guest HTTP checks pass. C and Supabase website Auth remain separately unexecuted. See [Approval B runtime result](SUPABASE_APPROVAL_B_RUNTIME_LOGIN_RESULT.md). Earlier observations below are chronological evidence, not current runtime configuration.

**Latest state — Approval B PASS (9 October 2026):** The explicitly authorized exact runtime-login package was executed once. A new password-authenticated aibean_app_login session passed trusted TLS, Drizzle reads and reviewed restrictions. The ignored application DATABASE_URL now uses that login; the operator connection and runtime credential are separately protected with private Windows DPAPI. Both TestUsers records/permissions, A objects/history and zero Auth/User/mapping counts are preserved. Local lint/typecheck, 31 tests, production build, runtime audit and public/guest HTTP checks pass. C and Supabase website Auth remain separately unexecuted. See [Approval B runtime result](SUPABASE_APPROVAL_B_RUNTIME_LOGIN_RESULT.md). Earlier observations below are chronological evidence, not current runtime configuration.

Updated 9 October 2026. The owner's Supabase directive supersedes October 7 tasks A03/A17 where they proposed temporary-auth hardening or future Clerk configuration. Preserve the audit itself. Keep all nine stages explicit; Stage 1 is not an authentication or full-MVP completion claim.

| Stage | Dependency | Work / acceptance |
|---|---|---|
| 1. Repository baseline | Existing app/audit | Feature branch, patched Next, lint/typecheck/test/build/runtime-audit CI; active scope/architecture/provider/migration/security documents; preserved historical audit |
| 2. Database and identity architecture | Live read-only connection and isolated PostgreSQL | Confirm target/history; inspect existing Users/ownership without dumping PII; mapping/RLS design; reviewed additive migrations; empty/upgrade/continuity tests |
| 3. Core Supabase Auth | Stage 2 plus URL/key/mail/redirect configuration | Email registration/login/verification/recovery/change, Magic Link/OTP, SSR refresh/logout, stable profile mapping; real two-user tests |
| 4. Additional approved methods | Core identity; provider credentials/config | Phone/OTP, eligible social registry, approved custom OAuth/OIDC, experimental passkeys, MFA and identity linking; validate each configured method; hide blocked ones |
| 5. Authorization / legacy retirement | Stages 2–4 core validation | Central capabilities/ownership, recent step-up, Supabase-aware Admin bootstrap, verified data continuity; coordinated cutover then retire Clerk/custom auth |
| 6. Taxonomy/data foundation | Target/history and identity contracts | Stable-ID v1.1 reconciliation; categories/use cases/vertical joins; evidence/ranking and future content relations; tested forward migrations |
| 7. Essential Admin operations | Identity/permissions and canonical schema | Complete Tool/taxonomy create/edit/classify/validate/publish/archive/search/pagination; audit only real transitions; preserve visual layout |
| 8. First complete workflow | Stages 3/5/6/7 and sandbox Stripe | Admin Tool -> publication -> isolated User save/compare/review -> eligible paid claim -> independent Admin proof approval -> exactly one Tool owner |
| 9. Remaining MVP | Tested foundation and domain contracts | Complete User/Vendor panels, approved Creator workflows, Skills, Playbooks, resources, Events, remaining commerce/operations and launch QA |

Stage 3–5 implementation may be developed together behind a controlled release boundary; do not ship two competing active authentication systems. Do not switch production identity before mappings and recovery have been validated. Keep owner approval as the final step before any shared-database migration.

## First database milestone

Acceptance: the target is proven to be the intended development environment; actual schema/ledger/grants/RLS are recorded; historical identity/ownership existence is known; proposed mapping preserves all internal IDs; a disposable real PostgreSQL upgrade test proves continuity and rejects wrong-user access. No migration is applied to a shared target without a reviewed impact/recovery plan and owner approval.

Hosted Approval A now PASS: fourteen aiBean RLS tables, private mapping, two exact baseline ledger entries, matching security ledger and NOLOGIN runtime group are installed and independently verified. TestUsers has two preserved rows; all application/User/mapping/Auth counts are zero. Application URL/key/settings and strict-TLS server DATABASE_URL/Drizzle are verified. Sixteen isolated native PostgreSQL installation/security/recovery scenarios passed with synthetic data. The owner confirms Free; under explicit scoped export/restore authorization, actual hosted-data recovery now PASS. One privately encrypted archive/metadata pair is retained; both records and scoped metadata/permissions match, the source is unchanged and the transient target is disposed. B has now passed, including real hosted login/Drizzle/TLS and the private application connection switch. Remaining gates: C TestUsers browser-client impact approval and actual end-user provider/capability tests. Supabase website Auth/provider/cross-user behavior remains unverified. See [connection readiness](SUPABASE_CONNECTION_AND_ENVIRONMENT_READINESS.md) and [the Free recovery plan](SUPABASE_FREE_BACKUP_AND_RECOVERY_PLAN.md).

SSR client/refresh/cookie utilities and a read-only environment check are prepared. Active login/capability paths remain unchanged until the coordinated cutover. Do not apply 0000/0001 alone: observed default grants require atomic RLS/grant hardening. Do not treat TestUsers as legacy aiBean users or merge its records by email.

Current database result: [Approval A installation result](SUPABASE_APPROVAL_A_INSTALLATION_RESULT.md). A does not activate Supabase website login; B/C remain independent.

## First authentication milestone

Acceptance: confirmed email registration, valid/invalid login, recovery, Magic Link and OTP work; unsafe callback destinations/replayed or expired tokens fail; refresh/logout have tested semantics; two users retain their own saved Tools/Stacks/reviews; non-admins cannot invoke Admin actions; existing historical IDs stay connected; new users receive no privileges. Pass configured flows with real providers, not mocks alone.

## Admin readiness update

Current Admin source has draft creation, publication/archive, review moderation, paid-claim decisions, featured-placement review and audit display. It is foundation-blocked: operator PostgreSQL/Drizzle connectivity and actual scoped recovery are verified, the schema and NOLOGIN group are installed, but an authenticated restricted runtime login/connection is pending B, no Supabase Admin is validated, and the bootstrap still expects a Clerk user_ ID. Full Tool/taxonomy edit/classification, pagination/search, validated state transitions, Creator approval and trust/ranking evidence remain missing. The next Admin increment follows identity/database gates; a dashboard shell would not satisfy them.

## Deliverable index

- Architecture diagram and route specification: `SUPABASE_AUTH_ARCHITECTURE.md`.
- Verified connection, live inventory and runtime dependencies: `SUPABASE_CONNECTION_AND_ENVIRONMENT_READINESS.md`.
- Provider matrix/configuration checklist: `SUPABASE_AUTH_PROVIDERS.md`.
- Identity continuity/database migration plan: `SUPABASE_AUTH_MIGRATION_PLAN.md`.
- Authorization/RLS matrix: `AUTH_AND_CAPABILITIES.md`.
- Account-security/MFA specification: `ACCOUNT_SECURITY_SPEC.md`.
- Security/dependency boundaries: `SECURITY_BASELINE.md`.
- Test evidence, stage status and remaining blockers: `FOUNDATION_PROGRESS.md`.

Historical product exclusions remain: Discussions, Replies, News, Courses, Social Videos, direct messaging, native mobile/video hosting and Creator payouts. Preserve approved branding and $99/five-day sponsored placements. No live billing activation is part of the foundation.
