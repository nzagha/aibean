# Supabase identity and database migration plan

Status: design pending live inspection. No identity records changed and no migration generated or applied in the baseline stage. Existing SQL files and October 7 audit remain untouched.

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

The only currently verified project ref is from local MCP configuration: `yfknxidgphhepdtwazhn`. The cloud project and its history remain unverified. No DATABASE_URL is configured. Docker engine availability is also a blocker to current full local PostgreSQL testing; existing PGlite checks cannot verify actual role/RLS behavior.

## Proposed identity mapping

Preserve `public.users.id` and all referencing business records. Add a private mapping relation with a unique Supabase Auth UUID and a unique internal user_id, linked to auth.users and public.users. Exact schema/constraints depend on live inspection. Use restrictive deletion semantics; deleting an Auth identity must not cascade into ownership, reviews, orders or audits. Keep mapping writes unavailable to ordinary users.

Resolution: verified Supabase sub -> canonical mapping -> existing internal User -> server capabilities. New verified identities provision an ordinary User and mapping atomically/idempotently. Never elevate through signup metadata. Conflicting/concurrent mappings fail closed. Provider linking stays under the same canonical Supabase Auth user; it must not create another application User.

Legacy migration requires proof tying the historical internal ID to the claimant's new Auth identity, such as authenticated legacy ownership in a controlled migration process or an audited operator review. Equal email addresses alone are insufficient. Do not import the shared temporary password or auto-assign its privileges. For unresolved cases, preserve existing records and restrict access pending verification rather than orphaning or merging them.

## Additive rollout and validation

1. Verify isolated target/history, backups and restore path. Capture metadata and aggregate continuity checks.
2. Prepare additive mapping/permission migrations without editing 0000/0001. Use installed Drizzle tooling to generate reviewable forward SQL and snapshots.
3. Test empty and upgrade paths against disposable real PostgreSQL, including Supabase auth schema where required. Check all existing FKs, ownership counts and failure/rollback paths.
4. Present the exact non-disposable target, SQL, locks, data/backfill impact, backup/forward-recovery plan and tests for owner approval before applying.
5. Backfill only verified mappings. Keep a restricted migration log; no secrets/PII in repository reports.
6. Validate email registration/login/verification/recovery/logout, mapped access, two-user isolation and privileged step-up on staging.
7. Switch the active application identity path to Supabase in a coordinated release; do not run parallel active Clerk/custom auth. Invalidate legacy cookies/sessions at cutover.
8. Retire obsolete dependencies/configuration/scripts after validation. Replace Clerk-prefix admin bootstrap with verified Supabase-to-internal mapping and explicit audited capability grants.
9. Reconcile records/permissions after deployment. On failure, disable affected writes and forward-fix or use the approved recovery plan; never drop historical users to make migrations pass.

## Later schema batches

Separate identity mapping/RLS, taxonomy normalization, moderation/evidence, generic billing and content-module migrations. Preserve taxonomy IDs, deterministic import/version/hash provenance and one-owner Tool policy. Reconcile v1.1 against the supplied workbook before changing imported data; do not invent sub-vertical records. Keep payment attempts/reconciliation separate from editorial approval. Retain $99/five-day placements and Stripe sandbox-only behavior.
