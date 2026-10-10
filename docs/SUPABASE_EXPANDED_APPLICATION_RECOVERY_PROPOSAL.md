# Expanded application recovery proposal before hosted Auth writes

**Correction preparation — 10 October 2026: PASS locally; hosted recovery remains FAIL / awaiting new execution approval.** The owner-authorized v2 correction normalizes the PostgreSQL address and completes source metadata/history and new local-target readiness before application body capture. All 70 automated tests and the exact shared executor's native PostgreSQL/CMS rehearsal pass. New manifest SHA-256: `5249c408d2610ab30e8e691f2f8396b3b83fd2ffc05053aaafebc6cb952acfec`. [Correction review and exact execution authorization](SUPABASE_EXPANDED_RECOVERY_CORRECTION_REVIEW.md). The original v1 manifest/failure evidence remain historical; no hosted retry, Auth activation or original retained-target modification occurred.


**Expanded recovery attempt — 10 October 2026: FAIL / STOPPED.** The owner-authorized unchanged package passed checksum/source prerequisites but stopped during local-target preparation before native export or restoration. No new encrypted archive exists. Both TestUsers records, installed history/RLS/grants and the original encrypted backup pass independent postflight. The failed local target is stopped and retained. A reproducible inet-address comparison defect and missing prerequisite coverage are documented in the [execution result](SUPABASE_EXPANDED_APPLICATION_RECOVERY_RESULT.md). Reviewed executable files remain unchanged; correction preparation and any retry require new owner approval. SMTP/Auth/fixture/cutover gates remain blocked. Earlier preparation and synthetic PASS entries below are dated evidence, not hosted recovery success.

**READY for owner review, 10 October 2026. Hosted expanded export and restoration: NOT EXECUTED.** Target: `yfknxidgphhepdtwazhn / postgres`. The current preparation directive requires separate approval before exporting hosted record bodies. Preserve the original verified CMS-encrypted TestUsers archive, metadata and receipt; it predates A/C and does not cover the installed foundation/current browser grants. No private backup material is stored in this repository.

## Exact proposed scope and current inventory

Fresh [read-only operator evidence](evidence/supabase-next-stage-readiness.json), captured 10 October 2026, verifies all eighteen tables/two sequences, fourteen application RLS tables, eighteen FKs, both exact Drizzle entries and the security ledger. Application/mapping/Auth counts are zero. Both TestUsers records match private retained integrity evidence, their definitions/policies/sequence state are preserved, and the original encrypted archive is accessible, hash-verified and decryptable. The restricted Drizzle runtime remains verified; it cannot read TestUsers/Auth bodies or ledger contents. Execution independently repeats its guarded source preflight. No new hosted record bodies were exported.

| Namespace              | Approved proposal selectors                                                                                                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public` application   | `audit_logs`, `billing_webhook_receipts`, `claim_requests`, `featured_placements`, `orders`, `rate_limits`, `saved_tools`, `stack_tools`, `stacks`, `taxonomy`, `tool_reviews`, `tools`, `users`, `vendor_access` |
| `public` existing data | `"TestUsers"`, `"TestUsers_id_seq"`                                                                                                                                                                               |
| `drizzle`              | `__drizzle_migrations`, `__drizzle_migrations_id_seq`                                                                                                                                                             |
| `aibean_private`       | `installations`, `user_identities`                                                                                                                                                                                |

The operation selects **eighteen tables and two sequences**, together with definitions, indexes, constraints, RLS/policies, owners and relevant ACLs. It is not an unrestricted `--schema=public` or whole-project dump. Any unexpected table, dependency, sequence, routine, trigger or extension requires review; do not silently expand these selectors.

## Exact proposed scoped export operation

Use the existing separate DPAPI-protected operator connection, trusted CA/hostname checks and Windows CMS configuration. Supply credentials only to a captured child-process environment; neither connection URLs nor passwords appear in arguments, shell history or logs. Source `PGOPTIONS` must set `default_transaction_read_only=on`, `PGSSLMODE=verify-full` and the existing private CA. Verify the direct project host, database and privileged operator role before capture.

Within a held **REPEATABLE READ, READ ONLY** operator transaction, capture the minimum application metadata/counts and `pg_export_snapshot()` value. Run the native PostgreSQL 17 `pg_dump` child with this exact argument vector; substitute only the privately obtained snapshot identifier. Capture stdout into the approved private encryption pipeline, not a plaintext repository or synced file.

```text
pg_dump.exe
  --no-password
  --format=custom
  --strict-names
  --no-large-objects
  --lock-wait-timeout=5s
  --snapshot=<privately captured snapshot identifier>
  --table=public.audit_logs
  --table=public.billing_webhook_receipts
  --table=public.claim_requests
  --table=public.featured_placements
  --table=public.orders
  --table=public.rate_limits
  --table=public.saved_tools
  --table=public.stack_tools
  --table=public.stacks
  --table=public.taxonomy
  --table=public.tool_reviews
  --table=public.tools
  --table=public.users
  --table=public.vendor_access
  --table=public."TestUsers"
  --table=public."TestUsers_id_seq"
  --table=drizzle.__drizzle_migrations
  --table=drizzle.__drizzle_migrations_id_seq
  --table=aibean_private.installations
  --table=aibean_private.user_identities
```

This is a process argument specification, not a runnable credential-bearing shell command. Do not use `--no-acl`, `--no-owner`, `--clean`, `--create`, `--disable-triggers`, role-password export, an unrestricted managed-schema selection or hosted restore. `pg_dump` uses a consistent database snapshot and relation read locks; it does not suspend normal application writes. Sequence state needs independent before/after verification because sequence changes are not ordinary MVCC row snapshots. A lock timeout, warning, unexpected archive entry or sequence drift stops capture for review. [PostgreSQL 17 pg_dump reference](https://www.postgresql.org/docs/17/app-pgdump.html).

Table selectors do not independently supply every schema/global dependency. Capture a **second CMS-encrypted application metadata artifact** covering only `public`, `drizzle`, `aibean_private` schema ownership/USAGE/default ACLs, selected relation/column/sequence privileges, selected RLS and policies, required role names/flags/non-secret group membership and baseline/security-ledger hashes. Capture no role password hash, login secret, managed routine body, Auth/Vault token or unrelated managed record. Local restoration may recreate these prerequisite schemas and named roles from the reviewed metadata. No schema/grant change is applied to hosted Supabase.

Hash the archive, encrypted artifact and private ordered content integrity checks; store personal-record digests only in encrypted metadata. Validate the archive table of contents and all metadata/role scope privately before restoration. Encrypt with the previously verified RSA CMS recipient and AES-256 envelope; use unique versioned filenames and create-new semantics so no successful archive is overwritten. Immediately decrypt privately and compare integrity. Keep ciphertext and the private receipt in the already approved secure non-synced directory; publish counts/booleans only.

## Isolated restoration and acceptance

The successful original rehearsal disposed its transient data directory. Reuse the verified native PostgreSQL 17 binaries and private encryption configuration, but prepare a **new disposable loopback-only recovery cluster** under a verified absolute private root, separate from hosted Supabase and the website runtime. Verify target identity, TLS, empty application inventory and path containment before any local create/drop/cleanup action. Never reuse a disposed directory or connect a restore client to the hosted endpoint.

Create local prerequisite schemas and non-login fixture roles from reviewed metadata, including an isolated `auth.users(id uuid PRIMARY KEY)` **structural fixture** needed by the installed mapping's external FK. This fixture is not a Supabase Auth service or real Auth account. If mappings have become nonempty before capture, stop for an amended recovery review: either obtain approval for local UUID-only FK placeholders derived from the encrypted mapping, or a separate provider-identity continuity procedure. Do not export managed Auth password/token/session rows to resolve this dependency.

Inspect `pg_restore --list` privately; require only the exact twenty selected relations and their expected dependent entries. Restore to the disposable target using `pg_restore --exit-on-error --single-transaction`, with no cleanup/drop options and no owner/ACL stripping. Replay only reviewed schema prerequisites/ACL differences that table selection does not include; document each such local difference. Do not re-run A/B/C against the hosted database or stamp history with new migration entries.

Require these acceptance checks before marking expanded recovery PASS:

- Both original TestUsers records match the retained private source integrity checks; no personal rows or their digests are published.
- All eighteen tables and two sequence definitions/states restore, with fourteen application RLS tables, the private mapping/security RLS, expected constraints/indexes and eighteen application/mapping FKs intact.
- Original two Drizzle entries and the installed security ledger match their exact hashes; mapping/internal User IDs and every ownership reference match the source snapshot. No orphan or privileged synthetic application record is introduced.
- Current C table denial for PUBLIC/anon/authenticated is reproduced, and intentionally retained TestUsers sequence/service privileges match rather than being silently hardened. App/runtime privileges, owners, policies and group restrictions match the reviewed contract.
- Application table counts and private canonical integrity match source/restored data in captured processes. Source definitions/grants, TestUsers records and sequence states match fresh source checks after the rehearsal.
- Encrypt/archive checks and decryption pass. Preserve all approved ciphertext; stop the disposable server and remove only transient local plaintext/data/logs after successful verification and confirmed path containment.

## Sensitive data and recovery limits

This expanded export includes existing TestUsers personal records; future `users`, reviews, claims, orders, audit metadata and identity mappings may also contain personal or commercially sensitive data. Canonical Supabase UUID/internal User linkage is private even without email/password fields. Encryption, restricted local ACLs and publication scans are mandatory. No credentials, personal rows, tokens, backup content or private key material goes to GitHub, OneDrive or external services.

This archive preserves the **application database**, not Supabase identity-service passwords/sessions, Auth provider/SMTP settings, Vault secrets, Storage objects or runtime login credentials. A local Auth FK scaffold proves application restore structure, not real provider recovery. A later hosted recovery needs reviewed surviving-provider UUID continuity or a separate identity recovery strategy; arbitrary recreated users may have different UUIDs. Independent-device key recovery and off-device retention remain unverified. Supabase Free has no assumed managed daily recovery/PITR entitlement; manual retention and rehearsals are operator responsibilities. [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups).

## Historical failed v1 package and checksums — superseded for execution by v2

The [executor](../scripts/execute-expanded-recovery.ts) defaults to offline inspection: no environment loading, private storage access, connection, row-body read or local target creation. The historical failed [v1 manifest](../db/recovery/expanded-recovery-package.json) was **`a759d686d2a108f7d3c91e35d0db3ff014beae2d7992e2aa587a1dd32bfb1b30` (SHA-256)**. Its hashed LF files are:

| Reviewed file                                           | SHA-256                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------ |
| `.gitattributes`                                        | `2cbc4b46ac73769b924cc99fc6f522fdab67e51e39048569720efd236a6e8865` |
| `db/recovery/expanded-recovery-local-prerequisites.sql` | `7914f549bd40f19cebca2ee027287c6011e721dc24e08a23fba24892a056b4d8` |
| `scripts/execute-expanded-recovery.ts`                  | `af670d7790357ab2f1d66dcb4c98ad1f3a75ad5b477331bbdf1d3f446fce0616` |
| `scripts/expanded-recovery-scope.ts`                    | `0b6f2e8f587f5538d2fdcdcef23e9369e671b75e4f24a072d6cafb22e3c461d3` |
| `scripts/private-backup-crypto.ps1`                     | `63bc4a5744c10f89d7f134aed7d4f70dc4e0557bebf335cc06ef9778d6e5745d` |
| `scripts/private-expanded-recovery.ps1`                 | `e3de0be046b2aeb59c73d52164599ac05498422977e5583790af0a8d00ed2138` |
| `scripts/private-runtime-credential.ps1`                | `fd76e2c0772402a3d1489e28c791b874b3da9adde8a1b695f582412ec76a0d99` |
| `src/lib/db/connection-config.ts`                       | `50558ff8ef221d893b4d63591dca749831c94ddfe60dc023fb2a1ada53d7946b` |
| `src/lib/db/runtime-config.ts`                          | `44acfd2b2e7c23dcec0c23a80362539244f9651465910e1d38b55026859c196e` |
| `src/lib/db/tls-config.ts`                              | `3c494248921f00c36f5b950cfda7208e4a3c6d077da6e8bede15d41d4c1c627f` |
| `src/lib/supabase/config.ts`                            | `efdf07a509152bafdebf4062eb5c1958164204b0bfdab349923b29a08bfb731b` |

Offline review command:

```powershell
npx --no-install tsx scripts/execute-expanded-recovery.ts --inspect
```

Historical v1 attempt binding below is retained for provenance and must not be executed. The current command/approval is in the v2 correction review:

```powershell
npx --no-install tsx scripts/execute-expanded-recovery.ts --execute-approved=a759d686d2a108f7d3c91e35d0db3ff014beae2d7992e2aa587a1dd32bfb1b30
```

The hash is a review binding, not consent by itself. Nothing runs on import, startup, CI, or ordinary website requests. The script checks exact branch, project/direct host/database/operator identity, trusted CA/hostname, original archive integrity/decryption, A/B/C evidence, role restrictions, table/column denial, counts, ledger hashes/timestamps and precise relation/dependency scope. Nonempty mappings or hosted Auth users/identities stop before body capture. Limits are 10,000 total selected records, a 4 MiB archive/metadata bound, 60-second queries/native operations and five-second lock waits. Unexpected routines, user triggers, external dependencies, archive entries, role/grant changes or sequence/source drift stop for review.

The private lifecycle/helper files validate root/profile/file/key ownership and ACLs, ancestor reparse points, synchronization exclusions, NTFS capacity, create-new artifacts and captured pipes. Startup validates an existing log destination; the temporary bootstrap password is removed in a cleanup block, including partial-write failure. Failure attempts shutdown of the known owned target, retains evidence and ciphertext, and does not reset/delete/retry automatically. Successful cleanup requires exact generated path containment, a matching private completion witness, stopped process and recursive ACL/reparse checks. The operator/runtime credentials and existing certificate configuration are not replaced.

## Local validation and documented differences

[Native PostgreSQL 17.11 synthetic recovery evidence](evidence/supabase-expanded-recovery-native-synthetic.json) is PASS: an actual scoped custom dump and isolated restore verified all 18 tables/2 sequences, full synthetic data/sequence integrity, constraints/indexes/RLS, relation/column/schema/default grants and owners, migration/security history, browser denials and runtime restrictions. It rejected elevated memberships, a nonempty target and nonempty mapping before any body query. Four automated scope/TOC/injection/prerequisite guards pass. This evidence uses entirely synthetic local data and does not establish actual hosted recovery.

The tightened private guard check and original archive decryption/integrity verification pass on the existing configuration. The new complete CMS/private-target lifecycle and hosted expanded restore acceptance remain unexecuted until approval.

Local role surrogates are NOLOGIN and do not recreate passwords or Supabase managed-role elevation; only the isolated service-role fixture retains BYPASSRLS to reproduce its ACL context. The local database is owned by the NOLOGIN postgres surrogate so pg_database_owner retains its public-schema semantics. Operator administrative memberships are recorded in encrypted metadata but are not reproduced as credential lifecycle in the disposable target. Database-level hosted CONNECT/TEMP grants, managed-service roles, runtime credentials and provider service behavior are not recreated.

The Windows target is PostgreSQL 17.11 / UTF8 / C locale; hosted PostgreSQL currently reports 17.6. The executor captures both database owner/encoding/locale/collation-provider/version descriptions in sanitized evidence. Relation definitions and default-collation identifiers can match while database locale/OS ordering semantics differ. Canonical integrity uses explicit C ordering. A later real hosted recovery must review platform/collation compatibility independently; this local rehearsal is not a byte-for-byte Supabase platform clone.

## Separate exact authorization wording

> I authorize execution of the expanded recovery package with manifest SHA-256 a759d686d2a108f7d3c91e35d0db3ff014beae2d7992e2aa587a1dd32bfb1b30 for Supabase project yfknxidgphhepdtwazhn, database postgres, limited to the eighteen tables and two sequences enumerated in docs/SUPABASE_EXPANDED_APPLICATION_RECOVERY_PROPOSAL.md and their related application definitions, constraints, indexes, RLS/policies, owners, relevant grants and migration histories. I authorize bounded encrypted application metadata capture using the existing private Windows CMS certificate, separate protected operator connection and secure non-synchronized directory, followed by restoration only into a new disposable loopback PostgreSQL 17 cluster with the reviewed local prerequisites. Preserve both TestUsers records and the original encrypted archive. Verify private integrity, counts, histories, owners, permissions, policies and unchanged hosted state. Retain ciphertext and remove only the approved transient target after successful validation and shutdown. Stop on nonempty identity mappings, scope/history drift or failed prerequisites. Do not export managed Auth/Vault/Storage/Realtime records, credentials or platform secrets; upload private backup contents; restore to hosted Supabase; create hosted accounts; send mail; change settings/DNS; apply migrations; activate Auth; repeat A/B/C; or deploy. Publish sanitized evidence only.

This approval is limited to source read-only export and isolated local restoration. All account/email/provider-settings/fixtures/migrations/DNS/deployment/Auth cutover approvals remain independent. The execution package is now concrete and hash-bound; actual expanded recovery remains NOT EXECUTED.
