# Supabase identity and database migration plan

**Latest state — Approval B PASS (9 October 2026):** The explicitly authorized exact runtime-login package was executed once. A new password-authenticated aibean_app_login session passed trusted TLS, Drizzle reads and reviewed restrictions. The ignored application DATABASE_URL now uses that login; the operator connection and runtime credential are separately protected with private Windows DPAPI. Both TestUsers records/permissions, A objects/history and zero Auth/User/mapping counts are preserved. Local lint/typecheck, 31 tests, production build, runtime audit and public/guest HTTP checks pass. C and Supabase website Auth remain separately unexecuted. See [Approval B runtime result](SUPABASE_APPROVAL_B_RUNTIME_LOGIN_RESULT.md). Earlier observations below are chronological evidence, not current runtime configuration.

**Latest state — Approval B PASS (9 October 2026):** The explicitly authorized exact runtime-login package was executed once. A new password-authenticated aibean_app_login session passed trusted TLS, Drizzle reads and reviewed restrictions. The ignored application DATABASE_URL now uses that login; the operator connection and runtime credential are separately protected with private Windows DPAPI. Both TestUsers records/permissions, A objects/history and zero Auth/User/mapping counts are preserved. Local lint/typecheck, 31 tests, production build, runtime audit and public/guest HTTP checks pass. C and Supabase website Auth remain separately unexecuted. See [Approval B runtime result](SUPABASE_APPROVAL_B_RUNTIME_LOGIN_RESULT.md). Earlier observations below are chronological evidence, not current runtime configuration.

Status: owner-authorized hosted Approval A installation and read-only postflight PASS on 9 October 2026. Fourteen RLS application tables, private identity mapping, baseline/security ledgers and NOLOGIN group are installed. No identity records or Auth settings changed; B runtime-login/connection now PASS; C remains independently pending. Original Drizzle migrations and October 7 audit remain untouched. See [Approval A installation result](SUPABASE_APPROVAL_A_INSTALLATION_RESULT.md).

## Verified local structure

`src/lib/db/schema.ts` and migrations `0000_numerous_skullbuster.sql` / `0001_hesitant_hardball.sql` define 14 tables and 16 foreign keys. Application identity is `public.users.id` (text), not a Supabase Auth UUID. Current IDs originate from Clerk or the temporary email-derived password identity. Do not print those historical identifiers or emails in public evidence.

| Table | Existing foreign-key targets |
|---|---|
| taxonomy | None; parent_id is currently unconstrained |
| users | None; default is_admin/is_creator false |
| tools | category_id -> taxonomy |
| saved_tools | user_id -> users; tool_id -> tools; composite PK |
| stacks | user_id -> users |
| stack_tools | stack_id -> stacks (delete cascade); tool_id -> tools; composite PK |
| tool_reviews | user_id -> users; tool_id -> tools; one review per pair; rating 1–5 |
| vendor_access | user_id -> users; tool_id -> tools; tool_id PK enforces one owner |
| claim_requests | user_id -> users; tool_id -> tools |
| orders | user_id -> users; unique claim_id -> claim_requests |
| featured_placements | user_id -> users; tool_id -> tools; paid-window checks |
| billing_webhook_receipts | None; unique event primary key |
| audit_logs | None; actor_id/entity_id are text |
| rate_limits | None |

No local migration links users to auth.users or defines RLS policies. No Skill, Playbook, Event, Creator approval/profile or normalized Tool use-case/industry join tables exist in this schema. Those are later forward migrations, not implicitly completed by authentication work.

## Gate: observe the actual target

Use a read-only project-scoped MCP connection to confirm project ref/name/environment and PostgreSQL version. Inventory schemas, relations, columns, PK/FK/check/unique constraints, indexes, triggers, grants, roles, RLS/policies and exposed API schemas. Inspect both Supabase migration history and Drizzle's migration ledger (normally drizzle.__drizzle_migrations; discover rather than assume). A missing Supabase ledger alone does not prove Drizzle migrations never ran.

Inspect only aggregate historical User/ownership counts and mapping collisions initially. Retrieve the minimum specific identity metadata necessary for an approved migration, in a restricted operator process. Do not dump auth.users or personal rows. Record source migration hashes and compare live metadata; do not blindly re-run CREATE TABLE SQL over an existing schema.

Earlier MCP inspection verified project `yfknxidgphhepdtwazhn`, database `postgres`, PostgreSQL 17.6 with all application tables/ledgers absent. The subsequent authorized A installed all fourteen tables, mapping and Drizzle/security history; managed Supabase migration history remains unchanged. The current MCP OAuth refresh is unavailable; direct CA/hostname-verified PostgreSQL pre/postflight passed. The separate TestUsers table has two rows and permissive public-read access. Auth users/identities both have zero rows. Preserve TestUsers; do not import it as application identity. This is a new application-schema installation on an existing project, not permission to reset it. See [connection readiness](SUPABASE_CONNECTION_AND_ENVIRONMENT_READINESS.md).

DATABASE_URL and the private project CA are configured; verified-TLS read-only Drizzle succeeds as elevated postgres. Sixteen native PostgreSQL scenarios pass, including independent role sessions, concurrency, historical upgrade, failure rollback and separate-instance backup/restore. These do not establish hosted new-login or Auth-provider behavior. Actual scoped recovery and separately authorized A are complete. B and a real hosted runtime session now PASS; C and end-user Auth/provider verification remain pending. Broad default public grants mean 0000/0001 must not be installed alone: use the complete atomic installation/security package with preserved hashes/history.

## Installed identity mapping; provisioning pending

Preserve `public.users.id` and all referencing business records. The approved installed supplement defines aibean_private.user_identities with auth_user_id UUID primary key, unique user_id text, restrictive FKs to auth.users/public.users and created_at. Both original migrations remain unchanged; the supplement has a separate security ledger and explicit private-schema lifecycle. Deleting an Auth identity cannot cascade into business records. Browser identities cannot write the mapping; the trusted server role may provision only verified identities through the eventual server transaction.

Resolution: verified Supabase sub -> canonical mapping -> existing internal User -> server capabilities. New verified identities provision an ordinary User and mapping atomically/idempotently. Never elevate through signup metadata. Conflicting/concurrent mappings fail closed. Provider linking stays under the same canonical Supabase Auth user; it must not create another application User.

Legacy migration requires proof tying the historical internal ID to the claimant's new Auth identity, such as authenticated legacy ownership in a controlled migration process or an audited operator review. Equal email addresses alone are insufficient. Do not import the shared temporary password or auto-assign its privileges. For unresolved cases, preserve existing records and restrict access pending verification rather than orphaning or merging them.

## Additive rollout and validation

1. Verify isolated target/history, backups and restore path. Capture metadata and aggregate continuity checks.
2. Review the prepared additive mapping/security supplement without editing 0000/0001. It is explicitly tracked outside the original Drizzle snapshot; reconcile any future generator/private-schema migration rather than silently regenerating history.
3. Test empty and upgrade paths against disposable real PostgreSQL, including Supabase auth schema where required. Check all existing FKs, ownership counts and failure/rollback paths.
4. Present the exact non-disposable target, SQL, locks, data/backfill impact, backup/forward-recovery plan and tests for owner approval before applying.
5. Backfill only verified mappings. Keep a restricted migration log; no secrets/PII in repository reports.
6. Validate email registration/login/verification/recovery/logout, mapped access, two-user isolation and privileged step-up on staging.
7. Switch the active application identity path to Supabase in a coordinated release; do not run parallel active Clerk/custom auth. Invalidate legacy cookies/sessions at cutover.
8. Retire obsolete dependencies/configuration/scripts after validation. Replace Clerk-prefix admin bootstrap with verified Supabase-to-internal mapping and explicit audited capability grants.
9. Reconcile records/permissions after deployment. On failure, disable affected writes and forward-fix or use the approved recovery plan; never drop historical users to make migrations pass.

## Later schema batches

Separate identity mapping/RLS, taxonomy normalization, moderation/evidence, generic billing and content-module migrations. Preserve taxonomy IDs, deterministic import/version/hash provenance and one-owner Tool policy. Reconcile v1.1 against the supplied workbook before changing imported data; do not invent sub-vertical records. Keep payment attempts/reconciliation separate from editorial approval. Retain $99/five-day placements and Stripe sandbox-only behavior.
