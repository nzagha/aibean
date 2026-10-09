# aiBean initial secure installation — review package

Prepared 9 October 2026 on `codex/supabase-foundation`. **Proposal only: nothing in this package has been executed against hosted Supabase.** SQL preparation and isolated tests are authorized; hosted execution still requires owner approval and the open validation gates below.

## Target and observed state

- Project: `yfknxidgphhepdtwazhn`; URL `https://yfknxidgphhepdtwazhn.supabase.co`.
- Verified direct host: `db.yfknxidgphhepdtwazhn.supabase.co`, port 5432; database `postgres`, selected schema `public`, PostgreSQL 17.6.
- Authenticated inspection/operator role: `postgres`, BYPASSRLS/CREATEDB/CREATEROLE/REPLICATION=true, superuser=false. Strict CA and hostname validation pass through Postgres.js and Drizzle.
- Schemas: auth, extensions, graphql, graphql_public, public, realtime, storage, vault.
- Only public table: TestUsers, two preserved rows. Auth users/identities: zero. No aiBean application tables or application migration ledgers.
- Public-read TestUsers policy and broad public-schema default grants remain present. Those findings are independent of connection success.

Credentials, CA contents and private file paths are not part of this package. The local CA path is supplied only through ignored `DATABASE_CA_CERT_PATH`.

## Files to review

| File | Purpose |
|---|---|
| `db/migrations/0000_numerous_skullbuster.sql` | Original 13-table schema, unchanged |
| `db/migrations/0001_hesitant_hardball.sql` | Original featured-placement schema, unchanged |
| `db/install/identity-and-security.sql` | Proposed additive private mapping, runtime role and RLS/grants |
| `db/install/reviewed-installation.sql` | Complete generated transaction: preflight, original migrations, ledger, security, postflight |
| `db/install/manifest.json` | Exact target, source/package SHA-256 values, original journal timestamps |
| `db/install/testusers-security-proposal.sql` | Separate optional TestUsers browser-access revocation |
| `scripts/prepare-database-installation.ts` | Offline, deterministic package generator; no DB connection |
| `tests/database-installation.test.ts` | Isolated clean/upgrade/permission/integrity/rollback tests |

Run `npm run db:prepare-install` to regenerate for review. Never run the security fragment independently. `npm run db:migrate` is deliberately gated and opens no connection. There are no startup migrations. This package is not a substitute for later Auth route and provider work.

## Atomic execution and migration integrity

The complete SQL starts one transaction, takes an advisory transaction lock, sets a five-second lock timeout and a sixty-second statement timeout, and fixes the search path. It verifies database name/Auth schema, rejects untracked application tables, checks the existing Drizzle ledger against the known contiguous migration prefix, and rejects unknown or duplicated entries. Connection endpoint verification happens outside SQL; a database named postgres alone does not identify the project.

Original migrations are applied only when absent from the validated ledger. Their original timestamps and canonical Git-source hashes are recorded. Both application schema creation and RLS/grant hardening commit together, so other sessions cannot see newly created private tables in an intermediate unprotected state. Errors before commit roll back the tables, role, private schema and ledger writes. The optional TestUsers transaction is deliberately outside this package.

Git migration source/checksums use UTF-8 LF. `.gitattributes` now keeps SQL checkout line endings consistent across Windows/Linux. Original migration content/journal/snapshots are unchanged. A historical ledger produced from different bytes (including CRLF checksums) is rejected for explicit reconciliation; it is never overwritten to force a match. See the manifest for the exact review hashes.

Supplemental security state is versioned in `aibean_private.installations`, keyed by `aibean-foundation-v1` and the security SQL SHA-256. This preserves the original two-entry Drizzle journal and records the installation supplement separately. The private mapping is managed by this explicit SQL package, not automatically inferred by the current Drizzle public-table snapshot. Future private-schema changes require their own versioned supplement or an explicitly reconciled Drizzle snapshot/forward migration; do not blindly regenerate over externally managed Auth or private objects.

Re-running an unchanged installation validates its ledgers and basic hardening, then skips previously applied steps. Unknown existing role/private schema, changed source hash, missing application RLS or unexpected client grants cause failure. This is repeatability, not automatic repair of arbitrary schema drift. Full metadata comparison remains an operator preflight for any historical upgrade.

## Identity and capability design

`aibean_private.user_identities` contains:

- `auth_user_id uuid PRIMARY KEY`, FK to `auth.users(id)`, restrictive update/delete.
- `user_id text NOT NULL UNIQUE`, FK to existing `public.users(id)`, restrictive update/delete.
- `created_at timestamptz NOT NULL DEFAULT now()`.

Both existing internal User IDs and all business FKs remain intact. No user/identity is created or linked by installation. No email-based merge or TestUsers import occurs. Future provisioning must atomically create an ordinary internal User and one verified Supabase UUID mapping, retry safely on conflicts, and audit any operator-approved legacy mapping.

User/Admin/Creator capabilities continue to resolve from server-read application flags. Creator requires `is_creator=true` assigned by a trusted approval/operator workflow; ordinary signup cannot set it. Vendor remains ownership of a specific Tool, protected by the existing `vendor_access.tool_id` primary key. Added server helpers `requireCreator()` and `requireVendorCapability(toolId)` enforce these contracts; `requireAdmin()` uses the shared predicate. Existing legacy identity resolution remains active until coordinated Supabase cutover. These helpers do not create Creator approvals or activate new routes.

The pure capability/ownership tests do not substitute for future two-user browser/action tests. Supabase identity verification, provisioning, provider linking, MFA and audited Supabase Admin bootstrap remain the next stage.

## RLS, grants and runtime role

Create `aibean_runtime` as a NOLOGIN group with NOSUPERUSER, NOBYPASSRLS, NOCREATEDB, NOCREATEROLE and NOREPLICATION. It owns no schema/table. A dedicated login must later be securely provisioned by the operator with membership in this group and no additional elevated memberships. Its password and final connection URI are not generated or committed here. Do not use the migration postgres credential as the final application credential.

All 14 application public tables receive RLS and lose table privileges for PUBLIC, anon, authenticated and service_role. The private mapping loses schema/table browser access as well. Browser clients use Supabase Auth only; canonical application reads/writes go through the server. No direct Data API publication policy is enabled by this package.

| Principal / object | Proposed access |
|---|---|
| anon/authenticated/service_role on aiBean tables | No direct table privileges; RLS default denial |
| runtime on tools/taxonomy/engagement/claims/orders/placements/vendor access/rate limits | SELECT/INSERT/UPDATE/DELETE; server capability and ownership authorization required |
| runtime on users | SELECT and INSERT(id) only; defaults prohibit privilege assignment |
| runtime on audit logs/webhook receipts | SELECT/INSERT only; no update/delete |
| runtime on private mapping | SELECT/INSERT only; unique/restrictive FK constraints |
| runtime on migration/security ledgers, auth.users, TestUsers | No additional privileges |
| runtime DDL/TRUNCATE/role administration | No grants |

The runtime RLS policies deliberately trust the dedicated server role across rows. **They do not provide per-user isolation within that service role** and do not assume a visitor JWT is inherited by Drizzle. Server ownership/capability queries remain required. Database/browser denial, grant restrictions and immutability are defense in depth; they are not a complete authorization system. If per-user database contexts are added later, they need a separate design and tests.

Global public-schema defaults are preserved to avoid changing unrelated project behavior. Every later migration must revoke inappropriate grants and enable RLS in the same transaction. Public access to new aiBean tables cannot rely on the project's existing defaults.

## TestUsers: independent approval

The main installation never alters TestUsers, its policies or records. The optional SQL revokes table privileges from PUBLIC, anon and authenticated, preserving rows and operator access. This removes its current browser-read access; confirm that no intended client depends on that access before approving. Its existing permissive policies remain inert without grants, so any later grant must undergo security review.

## Data impact, locks and recovery

Expected clean-install impact: 14 new application tables, two private tables, a Drizzle ledger/schema and a NOLOGIN runtime role. No business data, Auth users, provider settings, credentials or capability flags are inserted/changed. The only inserted records are migration/security ledger entries. Upgrade impact: preserve existing application rows and add mapping/security objects; revoke existing client-table access. Active clients using direct Data API calls would lose that access.

Before execution, verify backups in Supabase, retention/PITR availability, and a tested restore destination. Take an approved logical snapshot of existing public data/schema and relevant roles/grants using verified TLS and the official connection settings, storing it outside Git with restricted access. Verify archive integrity and restore it into a separate test target. Record aggregate counts and permission metadata, without copying personal rows into reports. Backup/restore has **not** been performed or verified in this stage.

DDL takes relation locks; bounded lock/statement timeouts abort instead of waiting indefinitely. Choose a maintenance window, pause application writers and take the advisory lock. After an error, issue ROLLBACK before further checks, confirm original tables/counts/ledgers, and investigate. After successful commit, prefer a reviewed forward fix; do not drop schemas/users or reset the project. If restore is required, use the preapproved restore/PITR procedure and reconcile post-backup writes. A file named backup is not proof of recoverability.

## Validation evidence and limits

Four new isolated tests passed using PGlite's PostgreSQL engine:

1. Clean install and repeat install; baseline/package checksums; browser/service-role denial; independent RLS denial after an accidental grant; runtime privilege escalation, DDL/TRUNCATE, audit deletion and ledger access rejection; optional TestUsers fix preserves two synthetic rows.
2. Historical upgrade retains synthetic User IDs, saves, Stacks/membership, reviews and Tool ownership; mapping uniqueness and missing-Auth FKs reject bad links; restrictive deletion preserves ownership; duplicate Tool owner rejected.
3. Forced failure immediately before commit rolls back new application tables, role and ledgers, preserves TestUsers, and permits retry; a tampered migration ledger is rejected.
4. Additive User/Admin/Creator predicates and wrong-owner denial, including no implicit Admin override for Tool ownership.

Fixtures are synthetic and never copied from the hosted database. Docker's engine probe timed out. Full multi-connection PostgreSQL concurrency (including competing installation/ownership transactions), provider/browser integration, hosted-role restrictions and backup restoration remain unverified. PGlite tests establish SQL behavior in isolation, not a deployed production guarantee. Before hosted execution, run this package on a disposable real PostgreSQL/Supabase-compatible target and verify observer sessions never see an intermediate unprotected schema.

## Exact approvals and next stage

Prepared for code/SQL review; **hosted execution is blocked pending the real PostgreSQL and backup/restore gates**. No approval is implied by this document or by MCP access.

After those gates pass, request separate explicit approval for:

1. The exact `reviewed-installation.sql` hash from the manifest, on the verified project/database, as the verified migration operator.
2. The optional TestUsers revocation SQL and its expected client-access change.
3. Secure runtime-login provisioning/membership and replacement of runtime credentials, without sharing credentials in chat.

After installation is approved and verified, implement Supabase email/confirmation/recovery and atomic profile mapping, perform two-account and capability tests, then coordinate the single-provider cutover. Supabase Auth implementation/activation remains blocked by these gates. Preserve the existing visual design, current login and Stripe sandbox throughout.
