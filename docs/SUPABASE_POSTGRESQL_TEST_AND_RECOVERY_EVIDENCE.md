# PostgreSQL installation and recovery evidence

Validated 9 October 2026 on `codex/supabase-foundation`. Earlier installation scenarios used synthetic fixtures on disposable native instances. The later explicitly authorized real TestUsers recovery also wrote only to the prepared disposable local target. Hosted Supabase was accessed read-only throughout. Supabase login remains inactive.

## Outcome and boundary

| Gate | Result | Scope |
|---|---|---|
| Docker engine | BLOCKED | Desktop processes run; engine and Desktop status probes time out |
| Alternative isolated PostgreSQL | PASS | Native PostgreSQL 17.11, three unique data directories, loopback only |
| Installation and historical upgrade | PASS | Exact existing package, 14 application tables, 18 FKs including mapping |
| Multiple connections/concurrency | PASS | Installer serialization, invisible uncommitted schema, bounded lock failure, competing Tool owners |
| Runtime role security | PASS | Independent SCRAM login sessions, verified TLS, no elevated flags |
| Logical backup/restore | PASS | Synthetic source restored to a separate freshly initialized instance |
| Package integrity | PASS | Original migrations and existing installation/security manifest unchanged |
| Hosted backup/recovery | PASS | Owner-authorized TestUsers export, private CMS/hash/decryption checks and actual isolated restoration; encrypted archive retained |
| Hosted migration readiness | READY FOR A DECISION | Recovery passed; exact independent A/B/C approvals remain required |

The sanitized machine-readable run is [postgres validation evidence](evidence/supabase-postgres-validation-2026-10-09.json). It contains aggregate outcomes and hashes, not credentials, CA contents or private paths.

## Environment and reproducible commands

Read-only engine probes used the installed Docker 29.2.1 client, context `desktop-linux`: `docker version --format '{{json .}}'` and `docker desktop status`. The sandbox first denied the named pipe; checks outside the sandbox then reached their 15-second and 10-second time limits respectively (`ETIMEDOUT`). Desktop/backend processes were present. No Docker container, existing volume, engine restart or existing aiBean database was changed.

Fallback: the [PostgreSQL Windows download page](https://www.postgresql.org/download/windows/) identifies EDB as its Windows distributor. The [vendor binary page](https://www.enterprisedb.com/download-postgresql-binaries) supplied `https://sbp.enterprisedb.com/getfile.jsp?fileid=1260616`, downloaded over HTTPS and extracted beneath ignored `test-results/postgres-validation/portable`. Archive SHA-256: `80379b2c04d51c30225532e0ae04509899141e9957ed096fe749d7fd9df8f82f`. This is a recorded downloaded-artifact hash, not a separately authenticated vendor checksum/signature. The executable reports PostgreSQL 17.11, x86_64 Windows, MSVC.

Executed from the repository root:

```powershell
$env:PG_TEST_BIN = (Resolve-Path 'test-results/postgres-validation/portable/pgsql/bin').Path
$env:PG_TEST_OPENSSL = 'C:\Program Files\Git\usr\bin\openssl.exe'
npm run db:test-postgres
```

`PG_TEST_BIN` may instead point to installed PostgreSQL 17 binaries on another machine; `PG_TEST_OPENSSL` may point to its OpenSSL executable. These paths identify public executables, not the owner's private hosted CA location. The runner deliberately never loads dotenv, imports the application database, reads DATABASE_URL, or accepts a connection URI/host. It constructs only `127.0.0.1` connections to its own allocated ports and new directories.

OpenSSL generates a two-day test CA/server certificate with localhost/IP subject alternatives. Host certificates and names are verified explicitly. `pg_hba.conf` accepts SCRAM only over hostssl and rejects hostnossl. Random fixture credentials, certificates, logs, synthetic dumps and bootstrap password files stay in ignored test-results. No live data is used. Successful/failing runs close all SQL clients and stop only their own clusters; they retain synthetic artifacts for local review. `test-results` is excluded from lint and TypeScript scanning as well as Git.

## Sixteen native validation scenarios

1. TLS, database identity and actual nonsuperuser operator authentication. Fixture postgres has the observed CREATEROLE/CREATEDB/REPLICATION/BYPASSRLS flags, public-schema creation and Auth SELECT/REFERENCES. Auth objects belong to a separate managed-role surrogate.
2. An untrusted test CA and wrong certificate hostname both fail closed (`DEPTH_ZERO_SELF_SIGNED_CERT`, `ERR_TLS_CERT_ALTNAME_INVALID`). No TLS bypass is used.
3. Division by zero immediately before commit (`22012`) rolls back tables, private schema, runtime role and ledgers. Both original synthetic TestUsers rows remain.
4. Two separate postgres connections install concurrently. One test-only pause before commit permits a third observer to see no application/private relation or runtime role. The second installer waits on the advisory lock, then succeeds with only two baseline ledger rows and one supplement row.
5. Repeating the exact unmodified package produces equal effective metadata, grants, policies, counts, memberships and ledger contents. All 14 application tables have RLS; the 16 baseline FKs plus two mapping FKs exist.
6. Tampered hash, missing first/last migration, missing ledger relation and changed security ledger all fail and roll back, leaving the snapshot unchanged. Unknown/incomplete history is not repaired silently.
7. A separate connection holds advisory lock 621487190. The installer hits the five-second lock timeout (`55P03`); rollback leaves the snapshot unchanged.
8. Exact Approval B SQL runs as the nonsuperuser postgres operator; the new login initially cannot log in. Synthetic password assignment and subsequent LOGIN work; the new post-install SELECT-only validation file executes.
9. Independent anon, authenticated, service_role and aibean_app_login sessions authenticate with their own random passwords. Browser/service roles cannot read any application table, mapping, ledger or Auth table. Runtime may read its approved application objects, but cannot administer roles/schemas/tables, truncate, access TestUsers/Auth/ledgers, mutate audit history, delete mappings or set Admin/Creator flags. All five elevated runtime flags are false. The shared Drizzle readiness inventory also runs in an actual runtime read-only transaction: Auth/TestUsers counts return null/unverified and ledger presence uses catalog metadata without granting ledger access. The same behavior passes after restoration.
10. Runtime inserts ordinary users using defaults; mapping duplicate UUID/internal ID, missing Auth/User references and destructive parent update/delete reject with `23505`/`23503`.
11. An accidental SELECT grant to authenticated still reveals zero User rows through RLS. Disabling row_security does not bypass it. The runtime can see both synthetic users' Stacks: shared runtime policies deliberately do not enforce visitor ownership.
12. Two independent runtime transactions compete for one Tool's vendor_access key. The loser waits for the first transaction, then fails `23505`. Exactly one owner remains.
13. The independent TestUsers permission proposal removes browser access and preserves two synthetic records.
14. A third fresh instance starts with the original migrations/ledger and historical synthetic Users, saves, Stack membership, review and Tool owner. The supplement and repeated installation preserve IDs/ownership/counts; no implicit Auth links are created.
15. Native `pg_dump --create --format=custom` and `pg_dumpall --roles-only --no-role-passwords` create inspectable synthetic archives with recorded SHA-256 values. Roles contain no password hashes.
16. Restore roles and the database to a second instance, compare columns/defaults, FKs/checks/unique constraints/indexes, owners, database/schema/table/column ACLs, default grants, RLS/policies, role flags/memberships, baseline/security ledgers and all fixture counts. Independently authenticated restriction tests, FK/owner failures and exact installation repeatability also pass after restore.

These are 16 integration scenarios in addition to the 28 ordinary automated tests, including the four PGlite package tests. The native suite is explicitly invoked rather than automatically connecting to an existing development DB.

## Recovery commands and corrections validated

The runner passes loopback host/port, synthetic PGPASSWORD, `PGSSLMODE=verify-full` and its test CA using child-process environment variables. No password is passed in command arguments or printed.

```text
pg_dump --create --format=custom --file <synthetic.dump>
pg_dumpall --roles-only --no-role-passwords --file <synthetic-roles.sql>
pg_restore --list <synthetic.dump>
psql --no-psqlrc --set ON_ERROR_STOP=1 --single-transaction --file <synthetic-roles.sql>
pg_restore --exit-on-error --create --dbname template1 <synthetic.dump>
```

Only the duplicate CREATE ROLE for the target's already existing synthetic bootstrap administrator is removed. Custom role definitions and memberships are preserved. The target's initially empty postgres database is removed by this runner before `--create` restores it. This is confined to the runner-created restore instance; the procedure must never be applied to the existing Supabase project. CREATE DATABASE cannot be wrapped in a single transaction; a failed isolated restore is discarded/retried on a fresh target.

Two test findings changed the test/recovery tooling, not installation SQL:

- Owner-only explicit ACL arrays become equivalent NULL/default ACLs during pg_dump restore. Snapshot comparison now expands defaults with `acldefault`; effective privileges and independent negative checks remain strict.
- A dump without `--create` omitted database-level CREATE grants. The restored operator failed with permission denied for database postgres when repeating installation. The corrected archive/restore includes the database and its ACL, which are now compared explicitly.

An initial Windows pg_ctl invocation retained process pipes; its wrapper now uses ignored stdio for the detached server and bounded start/stop calls. The interrupted disposable source was checked separately and was no longer running. A synthetic Auth SELECT privilege was added to match the operator's verified hosted inventory; ordinary runtime/browser roles received none.

## Hosted compatibility and remaining assumptions

Read-only `npm run supabase:check` reconfirmed project yfknxidgphhepdtwazhn, direct verified-TLS Drizzle, postgres/public, server 17.6, elevated postgres flags, TestUsers count two, zero Auth users and absent application tables/ledgers. Schema-create, public CREATE, auth USAGE and auth.users REFERENCES all returned true. PUBLIC has neither database CREATE nor public-schema CREATE, matching the native restriction fixture; recheck these defaults before provisioning. The command intentionally exits 1 because the operator is elevated. No hosted role was created to test a new login.

The proposed direct custom-login design follows [Supabase role management](https://supabase.com/docs/guides/database/postgres/roles) and [connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres). The exact new hosted login, role membership, network access and private runtime credential remain untested until Approval B. If pooling is later needed, retrieve its official custom-role connection settings rather than inventing a pooled username or hostname; transaction pooling keeps prepare=false and needs separate validation.

Native 17.11 Windows differs from managed 17.6 aarch64 Linux, which has Supabase platform schemas/extensions, Auth/Storage services, security restrictions, API role switching, triggers and settings. Fixtures simulate only the required Auth relation, ownership/role privileges, broad public defaults and TestUsers exposure. They do not simulate GoTrue/PostgREST, service keys/JWTs, managed event triggers/extensions, provider delivery, platform backups or project encryption. Direct browser-role fixture LOGINs are isolated surrogates; managed API roles normally use authenticator role switching. No live service key/JWT was minted.

All owned disposable instances stopped after the successful run. No containers, development volumes, hosted objects or Auth settings changed. Existing installation source and manifest hashes remain identical to commit 6de140a. New Approval B and validation files have independent review hashes in the approval document.

## Earlier proposed hosted backup process — superseded

The subsection below records the earlier proposal before the owner confirmed Free. Its unverified storage/target/plan statements are superseded by [the Free backup and recovery plan](SUPABASE_FREE_BACKUP_AND_RECOVERY_PLAN.md) and [actual scoped recovery result](SUPABASE_HOSTED_SCOPED_RECOVERY_RESULT.md). The owner-authorized real export/isolated restore now PASS. The encrypted archive/metadata remain private; the stopped transient local database/log were removed after validation. No managed daily backup/PITR is assumed. The executed procedure encrypted binary output in memory rather than retaining a plaintext .dump, and used the prepared local target rather than another hosted project.

Managed hosted snapshots and restoration into Supabase remain unverified; actual scoped hosted-data recovery into the isolated native target is verified. [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups) describes plan-dependent managed retention/PITR. The owner confirms Free; billing, retained snapshots and a managed recovery window were not independently inspected. Database backups exclude Storage file bodies and omit custom-role passwords; credentials require secure reprovisioning after recovery.

Before any hosted mutation, the owner/operator must record privately:

1. Approved snapshot/PITR identifier, date, retention and available restore option for this exact project; or an approved logical capture/restoration process if platform backup is unavailable.
2. An exact encrypted, access-restricted, non-synced backup directory (configured privately as AIBEAN_BACKUP_DIR, outside Git/OneDrive) and retention/deletion policy. No actual directory has been supplied or created for hosted records.
3. A separate disposable recovery target with its own verified project reference/endpoint. No such hosted target has been designated or provisioned; the source is never the rehearsal restore destination.
4. Access limited to the owner/designated recovery operator; no chat, repository, CI artifact or public report contains backup rows, connection URIs, CA paths, password hashes or platform secrets.

The earlier file-output proposal was superseded by the approved bounded-memory runner: verified-TLS native `pg_dump --no-password --format=custom --schema=public --strict-names --no-large-objects --lock-wait-timeout=5s --snapshot=<held-read-only-snapshot>`. Credentials stay in a private child environment, binary output stays in memory and only Windows CMS ciphertext is written. The actual two-record archive passed local restoration, metadata/RLS/ACL comparisons and fresh-source continuity. No plaintext dump was written. See [Actual hosted recovery evidence](SUPABASE_HOSTED_SCOPED_RECOVERY_RESULT.md). Current public data consists of TestUsers and must be preserved. Once installed, include public, drizzle and aibean_private in future app backups so both ledgers and mapping are recoverable. Do not capture auth/storage/vault rows or all platform globals merely to satisfy this app backup.

A scoped public dump is **not** complete platform recovery. Preserve managed objects in place; full-project recovery requires verified Supabase snapshot/PITR or the separately reviewed [Supabase backup/restore procedure](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), including managed-schema customizations and project encryption requirements. Never replay native fixture/bootstrap/managed-role SQL into Supabase. Curate only approved application roles, grants and history for a compatible separate target; reconcile managed ownership rather than skipping errors blindly. For future roles-only exports, use --no-role-passwords and never replay managed role memberships automatically.

After approved capture, inspect archive integrity and restore into the designated separate target, compare metadata/counts/FKs/ledgers/permissions and authenticate the restricted runtime independently. Report only aggregate evidence. This hosted-data rehearsal and actual recoverability remain release gates; synthetic restoration does not close them.

On interrupted installation, ROLLBACK/disconnect the failed transaction, refresh original object/count/history metadata and review the error. SQL installation DDL is transactional; no reset or deletion is required. On a failure after commit, pause affected writers, prefer an approved forward fix, or use the approved restoration plan with downtime and post-backup-write reconciliation. Rotate/reprovision custom runtime credentials privately after restoration when needed.

## Before external multi-user testing

The shared runtime is a trusted server principal; permissive runtime RLS does not independently restrict each visitor's rows. Required application/provider tests include verified UUID-to-internal-ID provisioning and concurrency, session refresh/logout/expiry/recovery, wrong-user Save/Stack/review/claim/billing access, wrong-Tool Vendor edits, ordinary versus approved Creator/Admin operations, privilege escalation through metadata/signup/payment, ownership race/revocation, CSRF/replayed mutations, and audited operator capability changes. Execute these with two real staging identities before provider cutover or external tests. Provider delivery and active Supabase login are not verified by this database suite.
