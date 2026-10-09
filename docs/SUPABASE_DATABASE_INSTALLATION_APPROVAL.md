# aiBean initial secure installation — review package

Final validation updated 9 October 2026 on `codex/supabase-foundation`. **A/B/C are proposals only; none has been executed against hosted Supabase.** The explicitly approved real scoped backup and isolated recovery now PASS, alongside the sixteen prior synthetic installation scenarios. The owner confirms Free; no managed snapshots/PITR are assumed. A is ready for an exact owner decision; B/C remain separate. [Actual hosted recovery evidence](SUPABASE_HOSTED_SCOPED_RECOVERY_RESULT.md) and [the Free plan](SUPABASE_FREE_BACKUP_AND_RECOVERY_PLAN.md) record verified private recovery and its limits.

Actual recovery confirms one retained encrypted archive, two matching restored records and matching scoped definitions/RLS/grants. A local-only public-schema baseline USAGE grant was explicitly restored; ACL comparison accounts for Windows/Linux ordering. The transient target is disposed. Fresh hosted read-only inventory confirms all fourteen tables and ledgers/mapping absent, two unchanged records and seven unchanged SQL hashes. [Exact independent authorization wording](SUPABASE_RECOVERY_GATE_AND_AUTHORIZATIONS.md) now presents A for decision. This review approves no installation.

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
| `scripts/test-postgres-installation.ts` | Native PostgreSQL multi-session installation/security/recovery runner |
| `db/install/runtime-login-proposal.sql` | Separate Approval B role preparation; no credential or active runtime switch |
| `db/install/validation-read-only.sql` | SELECT-only post-install metadata/count checks |
| `docs/SUPABASE_POSTGRESQL_TEST_AND_RECOVERY_EVIDENCE.md` | Commands, outcomes, environment limits and proposed hosted recovery process |

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

Native synthetic backup/restore has passed on a separate disposable instance, including database-level ACLs, roles without passwords, schema/column grants, defaults, counts, FKs and both ledgers. Actual hosted scoped capture and native isolated restoration are now **PASS** under explicit owner authorization. The encrypted archive/metadata are retained under verified private ACLs; both records and scoped permissions match, the hosted source is unchanged and only successful transient recovery data/log were removed. The owner confirms Free; managed retention/PITR is not assumed. Separate exact A/B/C approvals are still required. Independent-device private-key recovery remains unverified. Use [the Free recovery procedure](SUPABASE_FREE_BACKUP_AND_RECOVERY_PLAN.md); a synthetic full-cluster dump must never be replayed into managed Supabase.

DDL takes relation locks; bounded lock/statement timeouts abort instead of waiting indefinitely. Choose a maintenance window, pause application writers and take the advisory lock. After an error, issue ROLLBACK before further checks, confirm original tables/counts/ledgers, and investigate. After successful commit, prefer a reviewed forward fix; do not drop schemas/users or reset the project. If restore is required, use the preapproved restore/PITR procedure and reconcile post-backup writes. A file named backup is not proof of recoverability.

## Validation evidence and limits

Four new isolated tests passed using PGlite's PostgreSQL engine:

1. Clean install and repeat install; baseline/package checksums; browser/service-role denial; independent RLS denial after an accidental grant; runtime privilege escalation, DDL/TRUNCATE, audit deletion and ledger access rejection; optional TestUsers fix preserves two synthetic rows.
2. Historical upgrade retains synthetic User IDs, saves, Stacks/membership, reviews and Tool ownership; mapping uniqueness and missing-Auth FKs reject bad links; restrictive deletion preserves ownership; duplicate Tool owner rejected.
3. Forced failure immediately before commit rolls back new application tables, role and ledgers, preserves TestUsers, and permits retry; a tampered migration ledger is rejected.
4. Additive User/Admin/Creator predicates and wrong-owner denial, including no implicit Admin override for Tool ownership.

Fixtures are synthetic and never copied from the hosted database. Docker's engine probe timed out; native PostgreSQL 17.11 Windows supplied the isolated alternative. Sixteen native scenarios pass, including two installers plus an observer, advisory wait/timeout, hidden uncommitted objects, rollback, historical ownership continuity, authenticated client/runtime restrictions, exact Approval B SQL and backup/restore. See [complete test and recovery evidence](SUPABASE_POSTGRESQL_TEST_AND_RECOVERY_EVIDENCE.md) and its sanitized machine-readable run. Native 17.11 is not a full reproduction of managed 17.6/Linux, its services/extensions or provider behavior. Hosted new-login authentication remains unverified. Actual scoped hosted-data recovery has since passed on the prepared local native target; this does not establish platform-service recovery.

## Exact approvals and next stage

All original installation/security/migration checksums remain unchanged from commit 6de140a. No regeneration was necessary. The new independent B and validation files do not change A's manifest or the original Drizzle history.

### Approval A — Application schema installation

- Target: project `yfknxidgphhepdtwazhn`, direct host `db.yfknxidgphhepdtwazhn.supabase.co:5432`, database `postgres`.
- Verified operator: `postgres`, nonsuperuser, with BYPASSRLS/CREATEDB/CREATEROLE/REPLICATION. Read-only preflight also verifies schema CREATE, public CREATE, auth USAGE and auth.users REFERENCES. Recheck endpoint/role/metadata immediately before execution.
- Exact file: `db/install/reviewed-installation.sql`.
- SHA-256: `72818e1233ab51ebbac861a822d89ee0d52d4c12ee32a193746c631bdf639b0c` (UTF-8 LF).
- Creates 14 application tables, 16 baseline FKs plus two mapping FKs, private user_identities/installations tables, drizzle ledger/schema and NOLOGIN aibean_runtime. Only two baseline ledger records and one security ledger record are inserted. No business/Auth/TestUsers rows or capabilities change.
- Enables application/mapping RLS, removes direct client/service-role grants, grants the restricted group only the object/column capabilities documented above. Creation and hardening share one transaction, advisory lock 621487190, five-second lock timeout and sixty-second statement timeout. Application login B is separate.
- Evidence: clean/repeat/historical installation, concurrency and rollback pass natively; synthetic restore with equivalent permissions/counts/history passes. Actual scoped backup, secure destination and recoverability are now verified. Exact A authorization remains required; refresh the source/private digest and package hashes again at execution.
- Postflight: run `db/install/validation-read-only.sql` as operator. Expected clean results: 14 application RLS tables, 18 FKs, the exact two manifest baseline entries, one supplement matching security hash, no browser/service-role application privileges, two TestUsers and zero Auth/User/mapping records. Existing unrelated managed objects remain intact. Re-authenticate browser/runtime roles independently after B; metadata alone is insufficient.
- Read-only validation file SHA-256: `61466aa36b8a3cf252396580fed0b086fa3d1a51a7c83b850365abeca7120771`. Hosted PUBLIC schema/database CREATE defaults were checked false; stop and reconcile any change before A/B instead of assuming no direct grant means no inherited DDL access.
- Recovery: abort/ROLLBACK on precommit errors; confirm original metadata/counts. After commit, pause affected writes and use reviewed forward SQL or the approved backup/restore procedure. No reset/drop or rewrite of historic migration ledger.

Owner decision A authorizes only the exact atomic installation after the recovery and fresh-target preflight gates pass. It does not authorize B, C, seed data, Auth activation or live payments.

### Approval B — Restricted runtime login and private connection replacement

- Exact preparation file: `db/install/runtime-login-proposal.sql`.
- SHA-256: `3c76ee6f5f203cbc3a140308a1360edb326ed5319fc3de9c3400c35b94e8b940` (UTF-8 LF).
- After A, execute as verified postgres. Create aibean_app_login initially NOLOGIN, INHERIT, NOSUPERUSER/NOBYPASSRLS/NOCREATEDB/NOCREATEROLE/NOREPLICATION. Grant only aibean_runtime with ADMIN=false, INHERIT=true, SET=false. Check effective database CONNECT; if absent, stop for a separately reviewed database-owner grant. Do not grant managed/browser/Admin-role membership.
- Privately generate/store a long random password in the owner's password manager. In verified-TLS interactive psql use `\password aibean_app_login`; do not put the value in chat, command arguments, committed SQL or query history. Then execute the separately approved `ALTER ROLE aibean_app_login LOGIN;`. Exact preparation/provisioning was exercised with synthetic passwords as the nonsuperuser fixture operator.
- Authenticate a **new direct session** as aibean_app_login. Verify current_user/session_user, TLS, all five false elevated flags, membership options and no object ownership. Verify SELECT on approved tables, INSERT(id)-only User provisioning/defaults, denial of User privilege updates, audit deletion, Auth/TestUsers/ledger reads, DDL/TRUNCATE/role administration. Platform restrictions must be tested on the approved hosted login; isolated results do not establish that account exists or works there.
- Keep the migration credential in a separate private operator service profile. Replace only the application's ignored DATABASE_URL with the verified direct custom-login connection from this project's official settings; keep DATABASE_CA_CERT_PATH private and strict CA/hostname TLS active. Runtime/Drizzle share existing validation and prepare=false. Drizzle connecting commands then use restricted runtime credentials and cannot perform DDL; db:migrate stays gated. Do not automatically repoint active authentication or use postgres for ordinary deployed requests.
- Restart application connection pools after the private runtime switch, run read-only readiness and approved application smoke checks. Restrict external access until server authorization/provider tests pass. On connection failure, stop the deployment and fix the custom account privately rather than serving requests through the privileged operator credential. Pooler use requires its official endpoint/username and a separate check.

Shared runtime RLS trusts server code across users; it cannot independently enforce visitor row ownership. Database CONNECT/TEMP/catalog and built-in-function privileges inherited from PostgreSQL defaults are distinct from application table access. No administrative DDL grant is proposed; temporary-object privileges are not globally revoked because that would affect unrelated clients.

### Approval C — Independent existing TestUsers permission correction

- Exact file: `db/install/testusers-security-proposal.sql`.
- SHA-256: `0c53e6cb250512624d4a73135e8ea122eb8573b8be494b9dbe55ac9bb29985db` (UTF-8 LF).
- As verified operator on the same target, independently revoke TestUsers table privileges from PUBLIC, anon and authenticated in its bounded transaction. Preserve the table, columns, policies, operator access and both rows. No import into Auth occurs.
- Any existing browser client depending on TestUsers reads/inserts loses that access; owner must confirm this client impact. Existing permissive policies remain inert without privileges and must be reviewed before any later grant. Service/managed operator access is outside this browser-read correction.
- Native test confirms count two and independent anon/authenticated SELECT denial. Hosted postflight must repeat only counts and access checks without returning personal fields. Capture original grant metadata for a reviewed compensating grant if client impact requires a rollback; never reset or delete records.

Each decision needs separate explicit owner authorization. **Recovery gate PASS; A is READY FOR OWNER DECISION and has not been executed.** B depends on approved/validated A and its own private provisioning approval. C requires independent owner acceptance of external client impact. The completed backup authorization authorizes no installation. Repository search finds no production TestUsers client usage beyond read-only readiness diagnostics; unrelated external clients are not verified. No approval is inferred from this document, prior GitHub publication, certificate selection or connection access.

After approved installation and runtime verification, implement Supabase email/confirmation/recovery and atomic profile mapping, execute the two-account/capability tests listed in the evidence document, then coordinate the single-provider cutover. Supabase Auth activation remains blocked until those application/provider tests pass.
