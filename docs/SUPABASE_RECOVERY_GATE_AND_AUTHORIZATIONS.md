# Recovery gate review and independent authorization wording

**Latest state — A/B/C PASS (9 October 2026):** Explicitly authorized Approval C executed its exact TestUsers table REVOKE once. Both original records and definitions/indexes/constraints/sequence state/RLS/policies are preserved. Anonymous Data API HEAD now returns 401; anon/authenticated table SELECT and authenticated INSERT permissions are denied in hosted SQL role contexts. The fourteen application RLS tables, ledgers, restricted runtime/Drizzle/TLS, Auth public settings/accounts and private configuration remain unchanged. Sequence grants and service_role access remain explicitly outside C. Real authenticated-JWT Data API testing remains unverified; no Auth accounts were created. See [C result](SUPABASE_APPROVAL_C_TESTUSERS_SECURITY_RESULT.md) and [proposed Auth stage](SUPABASE_AUTH_IMPLEMENTATION_STAGE.md). Existing login flows remain active unchanged; the Auth stage is a plan only. Earlier sections below record historical observations.

**Latest state — Approval B PASS (9 October 2026):** The explicitly authorized exact runtime-login package was executed once. A new password-authenticated aibean_app_login session passed trusted TLS, Drizzle reads and reviewed restrictions. The ignored application DATABASE_URL now uses that login; the operator connection and runtime credential are separately protected with private Windows DPAPI. Both TestUsers records/permissions, A objects/history and zero Auth/User/mapping counts are preserved. Local lint/typecheck, 31 tests, production build, runtime audit and public/guest HTTP checks pass. C and Supabase website Auth remain separately unexecuted. See [Approval B runtime result](SUPABASE_APPROVAL_B_RUNTIME_LOGIN_RESULT.md). Earlier observations below are chronological evidence, not current runtime configuration.

**Latest state — Approval B PASS (9 October 2026):** The explicitly authorized exact runtime-login package was executed once. A new password-authenticated aibean_app_login session passed trusted TLS, Drizzle reads and reviewed restrictions. The ignored application DATABASE_URL now uses that login; the operator connection and runtime credential are separately protected with private Windows DPAPI. Both TestUsers records/permissions, A objects/history and zero Auth/User/mapping counts are preserved. Local lint/typecheck, 31 tests, production build, runtime audit and public/guest HTTP checks pass. C and Supabase website Auth remain separately unexecuted. See [Approval B runtime result](SUPABASE_APPROVAL_B_RUNTIME_LOGIN_RESULT.md). Earlier observations below are chronological evidence, not current runtime configuration.

Reviewed 9 October 2026 on codex/supabase-foundation. Source: yfknxidgphhepdtwazhn, direct verified-TLS host db.yfknxidgphhepdtwazhn.supabase.co:5432, database postgres.

## Verified current state

**Recovery gate PASS following explicit scoped export/restore authorization.** One encrypted archive and one encrypted metadata file are retained privately; both decrypt and pass integrity checks. Both records, definitions, sequence, RLS and scoped permissions match the restored target. Hosted source continuity passed in a fresh read-only transaction. The transient local database/log were removed. The owner then separately authorized A; its exact installation and read-only postflight now PASS. B now PASS under separate explicit authorization; C and Auth activation remain unexecuted. [Approval A installation result](SUPABASE_APPROVAL_A_INSTALLATION_RESULT.md) records current installed state. [Actual hosted recovery evidence](SUPABASE_HOSTED_SCOPED_RECOVERY_RESULT.md) provides the sanitized result; earlier preparation paragraphs below describe the pre-authorization state.

Pre-install recovery-stage read-only Drizzle source refresh (superseded for application objects by successful A): transaction_read_only=on, TLS=true, PostgreSQL 17.6, only public.TestUsers and public.TestUsers_id_seq, TestUsers count two, Auth users zero, application/managed migration ledgers absent. All fourteen expected aiBean tables are individually absent: taxonomy, users, tools, saved_tools, stacks, stack_tools, tool_reviews, vendor_access, claim_requests, orders, featured_placements, billing_webhook_receipts, audit_logs and rate_limits.

The scope inspector now also checks custom types, operators, collations, conversions, operator classes/families, text-search objects, noninternal triggers, rules and public extension objects/members. All returned zero; public functions also zero. Both unique constraints/indexes and both RLS policies remain. No unrelated public objects were found in these catalog checks. This closes a gap in inspecting a whole public-schema dump using table names alone. Check again immediately before export and stop if the approved scope changes.

Before the authorized capture, the certificate was confirmed valid and decrypted a new synthetic in-memory probe in the actual Windows operator context. RSA 3072 and allowed private-key ACL principals remain verified. A sandbox-only certificate lookup did not see the operator store; the real-context check succeeded using the existing certificate, without regeneration or private-key export. Protected storage ACLs are unchanged, approximately 685 GiB free, local CA valid and bootstrap plaintext credential absent. The prepared instance was started only for a verified-TLS/SCRAM read-only catalog check: PostgreSQL 17.11, public table count zero, TestUsers relation absent. It was then stopped. At that earlier review, no encrypted hosted archive existed. The archive now exists and passes actual decryption/hash verification; independent-device key recovery remains unverified.

The only unpublished items at the start of review were the pre-existing local .agents directory and skills-lock.json. No unpublished backup executor, archive or success evidence was present. Remote branch matched 682df26cea1a4a0e087628e9f6c4f5748d54bcf9; [its GitHub validation](https://github.com/nzagha/aibean/actions/runs/37995278340) passed. Updated inspection/authorization findings are separate from that earlier validation.

**Count and private content equality are now verified for the actual captured snapshot and fresh post-recovery source transaction.** Earlier preparation checked counts only. The approved capture compared the source, restored records and fresh source using an unpublished private digest. Publish no row digest, identifiers or values. Recheck privately before an approved A/B/C change; historical pre-capture values were never recorded and cannot be retrospectively proven.

## Authorized scoped operation completed

Use the existing privately configured root, Windows CMS recipient and previously prepared disposable loopback-only PostgreSQL 17.11 instance. Exact local paths/port are confirmed privately with the owner and intentionally excluded from public documentation.

1. Validate the exact source, CA/hostname, directory/key ACLs, local target/CA/port and allowed public object list. The approved data scope is TestUsers' two records only; related scope includes its identity sequence/state, definitions/defaults, indexes/constraints, policies/RLS and schema/table/column/sequence/default grants.
2. Hold a read-only repeatable-read transaction, export its snapshot and inspect catalog/count metadata in that snapshot. Run native pg_dump with credentials only in its private child environment, strict libpq TLS and default_transaction_read_only=on:

```text
pg_dump --no-password --format=custom --schema=public --strict-names --no-large-objects --lock-wait-timeout=5s --snapshot=<snapshot-from-held-read-only-transaction>
```

The snapshot identifier is generated only when authorized execution begins. It is not a password. This is an orchestration specification, not a raw terminal command that should expose binary stdout. Capture bounded binary output in process memory and write only CMS-encrypted archive/metadata to the private backup directory. The size/error/scope guards must fail closed. Do not write a plaintext dump, use pg_dumpall on hosted globals, restore into the source, or automatically upload anything.

Sequence values are not MVCC snapshot-isolated; see [PostgreSQL transaction-isolation rules](https://www.postgresql.org/docs/17/transaction-iso.html). Confirm no concurrent TestUsers writers/sequence allocations during the short capture/rehearsal or detect before/after sequence drift and stop for reconciliation; do not claim the exported transaction snapshot alone guarantees sequence-state equality. No writer shutdown or hosted setting change is authorized by this preparation review.

3. Capture only necessary role/grant/ownership metadata, without passwords/hashes or managed schemas/data. Inspect the archive privately, record trusted plaintext/ciphertext hashes, verify decrypt/hash equality, then restore into the owned disposable target using verified local TLS and separate credentials. Minimal NOLOGIN managed-role surrogates and effective-permission comparisons must explicitly label any differences from platform roles.
4. Validate both records by count/private digest, columns/identity/sequence state, constraints/indexes, policies/RLS, effective schema/table/column/sequence/default grants and metadata. Stop the owned instance and dispose of its transient restored data under the previously reviewed path checks. Temporary PostgreSQL data files are plaintext inside restricted local ACLs; no encrypted volume or forensic erasure is claimed. Publish only sanitized evidence.

Personal data exported: ID, creation timestamp, email, age and name for both records. Exclusions: credentials/password hashes, Auth/Vault/Storage/Realtime/other managed data, encryption keys and unrelated public objects. Source data/settings/roles/grants remain unchanged.

Historical scoped-export wording (the owner subsequently supplied explicit authorization; execution is complete):

> I authorize the scoped read-only backup of yfknxidgphhepdtwazhn/postgres, limited to the existing application-owned public.TestUsers table, its two records and related sequence, definitions, policies and grants. Use the already prepared private Windows CMS encryption configuration and disposable local PostgreSQL recovery target to verify the backup and restore, then remove transient restored data. Do not export credentials, managed secrets or unrelated data, upload private backups, or execute A, B or C.

## Blockers and preserved review hashes

| Gate | State | Remaining work |
|---|---|---|
| Local backup infrastructure | VERIFIED | Private archive/key ACLs rechecked; successful transient target disposed |
| Actual archive/integrity | PASS | Encrypted archive/metadata retained and decryptable; trusted hashes match |
| Actual isolated restoration | PASS | Both real records and scoped metadata/permissions matched |
| Recovery gate | PASS | Local snapshot recovery verified; platform/off-device limits remain |
| Installation integrity | PASS | Preserve A/B/C and baseline hashes; fresh preflight after recovery |
| A | EXECUTED / PASS | Exact authorization, mandatory preflight and hosted postflight passed |
| B | READY FOR OWNER DECISION | A passed; independent provisioning/switch approval and new hosted runtime tests |
| C | PENDING INDEPENDENT DECISION | Owner confirmation of browser-client impact and exact authorization |

| Decision | Exact file | Verified SHA-256 |
|---|---|---|
| A | db/install/reviewed-installation.sql | 72818e1233ab51ebbac861a822d89ee0d52d4c12ee32a193746c631bdf639b0c |
| B | db/install/runtime-login-proposal.sql | 3c76ee6f5f203cbc3a140308a1360edb326ed5319fc3de9c3400c35b94e8b940 |
| C | db/install/testusers-security-proposal.sql | 0c53e6cb250512624d4a73135e8ea122eb8573b8be494b9dbe55ac9bb29985db |

Original baseline migration hashes remain b58134b31944656eda45a6ba929fcdb66a5ec4e66e01a8cfd3d8d9b16d4f4468 and 168fd0b654a75e1174052fc444893a66362f89bb3d1cdaec3bbfe9fcbf4f4df1. No SQL was regenerated or applied. Preserve the installation's validated locking/rollback guards, identity uniqueness/restrictive FKs and historical internal IDs.

## Independent authorization wording for later decisions

A wording below is now historical: the owner explicitly authorized A and execution/postflight passed. **B/C are not approved.** Present the exact B text now and stop for the owner decision. C still requires independent impact acceptance/authorization. Target for all three is yfknxidgphhepdtwazhn/postgres on its verified direct endpoint.

**A — Initial installation (authorized and completed; do not repeat)**

> After the actual scoped backup and isolated restoration pass, and fresh source inventory and checksum checks pass, I authorize executing db/install/reviewed-installation.sql with SHA-256 72818e1233ab51ebbac861a822d89ee0d52d4c12ee32a193746c631bdf639b0c on yfknxidgphhepdtwazhn/postgres. Install the fourteen aiBean tables, identity mapping, migration/security ledgers, restricted runtime group, RLS and grants in the reviewed atomic transaction. Preserve both TestUsers records, managed objects and existing history. Run the reviewed read-only postflight. This approval excludes B, C, seeds, Auth activation and live payments.

**B — Runtime login and private connection replacement (next independent decision)**

> After A passes its postflight, I authorize db/install/runtime-login-proposal.sql with SHA-256 3c76ee6f5f203cbc3a140308a1360edb326ed5319fc3de9c3400c35b94e8b940 on yfknxidgphhepdtwazhn/postgres. Create only aibean_app_login with the reviewed aibean_runtime membership. Provision its password privately, enable its LOGIN, authenticate a new verified-TLS session and verify all reviewed privilege/ownership restrictions. Only after those checks pass, replace the private application DATABASE_URL and restart its pools, keeping the operator credential separate. Do not grant additional managed/Admin memberships, change database-wide privileges without further review, switch active Auth, seed records or enable live payments.

The preparation SQL itself creates NOLOGIN. B's explicit wording also authorizes the separately documented private password provisioning, ALTER ROLE aibean_app_login LOGIN and validated connection replacement. A hash alone does not authorize those extra steps. If inherited CONNECT is unavailable, stop for an exact separately reviewed owner grant; do not improvise permissions.

**C — TestUsers browser-table access removal**

> After actual recovery is verified, I confirm the TestUsers browser-client impact is acceptable and authorize db/install/testusers-security-proposal.sql with SHA-256 0c53e6cb250512624d4a73135e8ea122eb8573b8be494b9dbe55ac9bb29985db on yfknxidgphhepdtwazhn/postgres. Revoke TestUsers table privileges from PUBLIC, anon and authenticated, preserving its two records, definitions, policies and operator access. Verify aggregate/private-content continuity and browser SELECT/INSERT denial without displaying personal values. This does not authorize A, B, managed-role changes or importing TestUsers into Auth.

Repository search found no production TestUsers use beyond read-only diagnostics. External clients are not known; owner acceptance/confirmation is required. C does not revoke service-role access, sequence privileges or schema-wide defaults; those are outside the unchanged reviewed SQL. Capture original grants for any separately reviewed compensating rollback.

## Conditional sequence and post-install acceptance

Recovery and A have passed. A's completed step below is historical; remaining B/C operations still require independent approval and are not execution instructions today:

1. Refresh source inventories/history/operator privileges, all exact checksums, TestUsers count/private digest and approved recovery evidence. If new objects/history or record changes appear, stop and review scope; do not blindly repeat an installation or backup.
2. If C is independently approved and dependencies accepted, apply C first to close current browser table exposure; verify preserved records and denial. Otherwise keep C a separate pending decision. It is independent of A/B.
3. A was separately approved and this step completed successfully; do not repeat its installation. The postflight used db/install/validation-read-only.sql (SHA-256 61466aa36b8a3cf252396580fed0b086fa3d1a51a7c83b850365abeca7120771). Require fourteen application RLS tables, eighteen FKs including mapping, exactly two original baseline ledger entries and one matching security supplement, no browser/service direct app grants, no user/capability backfill and preserved TestUsers/managed state. Any precommit error rolls back; after commit use a reviewed forward fix/recovery decision, never reset.
4. If B is separately approved, provision and test a fresh independent restricted hosted session: all elevated flags false, exact membership options, no ownership/DDL/TRUNCATE/role administration, no Auth/TestUsers/ledger reads, INSERT(id)-only ordinary User defaults, immutable audit/mapping restrictions and scoped business access. Any necessary test writes require an approved rollback-only fixture procedure; insert no persistent seed data. Replace the private app connection only after success; run read-only Drizzle readiness and application smoke checks with restarted pools.
5. Recheck counts/private continuity, grant/RLS denial through real hosted role contexts/Data API without returning TestUsers personal fields, exact ledgers and metadata. Prepare a newly scoped encrypted post-install backup covering public/drizzle/aibean_private only after its independent scope approval; mapping's Auth FK requires separate identity-service recovery planning.
6. Begin Supabase Auth integration only after this database foundation passes. Implement verified-UUID-to-internal-User mapping and email/confirmation/recovery behind the existing release boundary; test two actual accounts, sessions, ownership/capabilities and privilege denial before any active-provider switch. Shared Drizzle runtime RLS does not itself enforce visitor isolation. No provider/settings activation is inferred from database approvals.

## Free-plan recovery limits

No managed daily snapshot or PITR is verified. The manual archive restores only its successfully captured public objects/data; post-snapshot transactions are not covered. Auth/Storage/Vault need separate planning, and Storage file bodies are not recovered by a database dump. Independent-device key recovery and encrypted off-device storage remain unverified; no upload is authorized. Refresh approved backups before migrations and after material changes, and rehearse recovery. See [the full Free recovery plan](SUPABASE_FREE_BACKUP_AND_RECOVERY_PLAN.md) and [official Supabase backup guidance](https://supabase.com/docs/guides/platform/backups).
