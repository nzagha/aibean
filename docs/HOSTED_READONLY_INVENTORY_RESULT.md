# aiBean Authorization 1 — fresh hosted read-only inventory

**Result: PASS. Corrected expanded recovery v2 is ready for separate owner authorization. No backup, recovery or installation was executed.**

Inspected 12 October 2026 local time; capture began **2026-10-13 03:14:42 UTC**. Repository `nzagha/aibean`, branch `codex/supabase-foundation`, exact authorized source `110251c296ff0fcb447b29dc5e5202be504bcfc2`. [Sanitized evidence](evidence/hosted-readonly-inventory.json) records fifteen passing checks, catalog metadata and continuity outcomes. No credential, certificate identifier/private path, personal record or TestUsers digest is published.

## Prerequisite outcomes

| Prerequisite | Result | Fresh evidence |
| --- | --- | --- |
| Exact source revision/branch | PASS | Authorized commit and branch matched before inspection; no application code changed. |
| Approved target/database/operator | PASS | Existing protected Windows DPAPI operator credential selects `db.yfknxidgphhepdtwazhn.supabase.co:5432`, database `postgres`; session/current operator both `postgres`. No alternate connection or service was used. |
| Strict trusted TLS and hostname | PASS | Existing valid project CA, `rejectUnauthorized=true`, SNI and Node hostname verification; server TLS true. PostgreSQL **17.6**, owner `postgres`, UTF8. |
| Read-only enforcement | PASS | Connection defaults to read-only; inspection and fresh postflight use `REPEATABLE READ READ ONLY`. Only session-local timeouts/timezone were set. No DML/DDL, exported snapshot, sequence allocation, backup, restore or account operation ran. |
| Existing application scope/metadata | PASS | **18 scoped tables and two sequences**; fourteen baseline public application tables, TestUsers, two private tables and Drizzle ledger. Exact recovery relation/owner/RLS inventory matches historical post-C evidence. Eighteen FKs, 25 indexes, 47 constraints and 18 policies were inspected. |
| RLS/effective grants/runtime role | PASS | All fourteen application tables have RLS; installed policies match Approval A. No browser/service direct app/ledger table or column grants. Restricted `aibean_runtime` is NOLOGIN; `aibean_app_login` is LOGIN with no superuser/BYPASSRLS/CREATEDB/CREATEROLE/replication flags. Exact restricted membership and capability/mapping/audit/DDL restrictions pass. |
| Original Drizzle/security histories | PASS | Both original migration hashes/timestamps and one foundation security ledger match the reviewed baseline and hosted Approval A evidence. No history was reinstalled or rewritten. |
| Aggregate identity/data prerequisites | PASS | Auth users **0**, Auth identities **0**, application Users **0**, private identity mappings **0**, TestUsers **2**. Scoped counts stay within the reviewed recovery limits. |
| Historical TestUsers content continuity | PASS | Full-row continuity computed inside PostgreSQL privately matches the original encrypted recovery metadata. Both records remain intact; no row body or digest was displayed/exported. |
| TestUsers structure/sequence/security continuity | PASS | Definitions, columns, constraints, indexes, RLS/policies and sequence state match original recovery metadata. Browser table/column access remains removed under Approval C; its historical sequence/service permissions were not changed. |
| Original encrypted recovery point | PASS | Existing archive/metadata ciphertext hashes and trusted plaintext archive hash match. Approved certificate decrypts the existing archive in memory; plaintext archive buffer was cleared and nothing was restored/written. |
| Existing private Windows prerequisites | PASS | Existing CMS private key/validity/RSA strength and restricted ACLs verified by the existing bridge. Protected non-synchronized root, NTFS/free-space minimum, PostgreSQL **17.11** binaries and OpenSSL available. No certificate/key/password/profile was created or modified. |
| Original failed-target retention | PASS | One existing v1 failure target remains stopped, without a postmaster PID, completion witness or bootstrap plaintext password. Its reviewed target metadata is consistent. No lifecycle command, deletion, repair or restart was issued. |
| Corrected recovery v2 integrity | PASS | Manifest SHA-256 **`5249c408d2610ab30e8e691f2f8396b3b83fd2ffc05053aaafebc6cb952acfec`** and **14/14** exact dependency hashes match; original eighteen-table/two-sequence scope is unchanged. |
| Fresh postflight/preservation | PASS | New read-only snapshot confirms the same scoped catalog/count/history and private TestUsers continuity. `.env.local` bytes and existing original backup/receipt/metadata hashes remain unchanged. |

The initial invoker lacked temporary backup-path bindings, and its first PowerShell path was unavailable. Those invocations stopped locally before any hosted connection or archive/certificate check; they did **not** establish archive damage or a missing key. The existing aiBean-specific preparation profile was located through bounded local inspection; paths were supplied only to the inspection process using the verified installed runtime. No `.env.local`, Windows persistent environment, private profile or historical artifact was edited. Actual private checks then passed; no prerequisite drift was bypassed.

## Observed schemas and application state

Non-system schemas: `aibean_private`, `auth`, `drizzle`, `extensions`, `graphql`, `graphql_public`, `public`, `realtime`, `storage`, `vault`.

Installed baseline public application tables: `audit_logs`, `billing_webhook_receipts`, `claim_requests`, `featured_placements`, `orders`, `rate_limits`, `saved_tools`, `stack_tools`, `stacks`, `taxonomy`, `tool_reviews`, `tools`, `users`, `vendor_access`. All fourteen are RLS-enabled. Existing TestUsers is separately preserved. Scoped private tables are `installations` and `user_identities`; `drizzle.__drizzle_migrations` is the original history. Sequences are `public.TestUsers_id_seq` and `drizzle.__drizzle_migrations_id_seq`.

Managed schema table counts from catalogs only: Auth 27, Realtime 3, Storage 8, Vault 1. No managed credential/session/Vault/Storage/Realtime record bodies were selected. Managed services were not activated, their settings were not changed, and their complete schema histories were not re-audited.

All **42 additional public tables and seven private ledgers** for `admin-review-v1`, `admin-operations-v2`, `creator-content-v1`, `creator-files-v1`, `discovery-v1`, `pricing-v1`, `affiliate-creator-v1` remain absent. They are reviewed local proposals, not hosted installations. The additional `auth-release-v1` function/ledger are absent. Catalog checks confirm the current operator can read the managed session table and its `id`, `user_id`, `not_after` types meet the proposed function's three-column prerequisite; this is not approval to install it or grant runtime access.

Original Drizzle history:

| SHA-256 | Original timestamp |
| --- | --- |
| `b58134b31944656eda45a6ba929fcdb66a5ec4e66e01a8cfd3d8d9b16d4f4468` | `1791247215670` |
| `168fd0b654a75e1174052fc444893a66362f89bb3d1cdaec3bbfe9fcbf4f4df1` | `1791249181547` |

Security installation: `aibean-foundation-v1`, supplement SHA-256 **`eea0e7309e13440224ca80030a367afc76bc99c08b2027fc722b8fa2b388277a`**. Original Approval A package SHA-256 remains **`72818e1233ab51ebbac861a822d89ee0d52d4c12ee32a193746c631bdf639b0c`**. A/B/C are already completed historical approvals and must not be repeated.

## Drift, verified boundaries and remaining limits

**No blocking discrepancy was observed in the reviewed recovery prerequisites.** Current relation/ownership/RLS inventory, installed FK/policy/history and role/grant expectations match the prior verified scope. Original TestUsers content, definitions, policies, indexes and sequence match its encrypted historical metadata. Current scoped columns/constraints/indexes/grants are catalog-inventoried; a comprehensive historical fingerprint for every managed-object attribute/provider setting was not asserted. Read-only work issued no hosted modification; postflight verifies the scoped continuity rather than claiming no third-party activity anywhere in Supabase.

The actual expanded hosted recovery gate remains **unpassed**, pending its separate execution. Zero new expanded archive/metadata/receipt files exist; the retained original failed target remains untouched. This inspection does not retry that failure, repeat a successful backup, validate a newly created target, or prove an expanded archive can restore. New local target identity/TLS/pristine checks and actual archive size/integrity/restore verification belong to the separately approved exact executor. Hosted 17.6 versus local 17.11 and database ICU locale/collation remain known recovery limitations; no platform-wide equivalence is claimed.

Real Auth/SMTP/confirmation/session-provider tests, private Storage bytes/scanner, Stripe/affiliate providers, deployment settings and independent-device certificate recovery remain outside this inventory. SQL grants/policies were inspected; a real authenticated-JWT browser/Data API end-user test was not run. Private keys/credentials remain protected locally; no off-device backup upload or key export was authorized. Supabase's [security model](https://supabase.com/docs/guides/database/secure-data) separates direct server connections from visitor JWT access; the runtime does not automatically inherit a visitor's identity.

## Exact next approval — corrected recovery v2 only

Recommend **Authorization 2**, using the existing guarded executor, before any feature-package installation. The executor must freshly repeat its prerequisites immediately before capture; this report is not a reusable preflight bypass.

> I authorize one corrected expanded recovery v2 execution bound to manifest SHA-256 `5249c408d2610ab30e8e691f2f8396b3b83fd2ffc05053aaafebc6cb952acfec`, project `yfknxidgphhepdtwazhn`, database `postgres`, branch `codex/supabase-foundation`. Use only its unchanged eighteen-table/two-sequence scope and the exact reviewed executor `scripts/execute-expanded-recovery.ts`. Reverify all fourteen checksums, target/TLS/operator, history, role/grant/RLS restrictions, identity/account emptiness, both TestUsers records, original encrypted archive, existing private CMS certificate/storage and a new isolated PostgreSQL 17 target before any record-body capture. Execute read-only scoped export, encrypt archive/metadata, restore only locally and verify metadata/data/ledgers/permissions/integrity/source continuity. Retain the original and successful new encrypted archives. Remove only the new transient target after successful validation/shutdown; retain any failed new target. Do not touch the previously failed retained target. Stop on drift. This does not authorize hosted restoration, migrations, A/B/C repetition, Auth accounts or emails, managed secrets export, provider/settings/DNS/deployment changes or Auth activation. Publish sanitized results and stop.

After separate owner authorization only:

```powershell
npx --no-install tsx scripts/execute-expanded-recovery.ts --execute-approved=5249c408d2610ab30e8e691f2f8396b3b83fd2ffc05053aaafebc6cb952acfec
```

No execution consent is inferred from this PASS, publication or displayed command. After actual recovery passes, the seven SQL packages still require individual approval; expanded feature recovery coverage and Auth release/provider decisions remain separate. See [integration checklist](HOSTED_INTEGRATION_EXECUTION_CHECKLIST.md).
