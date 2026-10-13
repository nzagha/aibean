# aiBean expanded application recovery — active v3 result

**Recovery gate: PASS. Authorization 3 executed the exact reviewed v3 executor once on 13 October 2026.** Source revision: `ed8f1cd9d4f7e83654a9a5116770f1ba5ffdef6f`, branch `codex/supabase-foundation`, Supabase development project `yfknxidgphhepdtwazhn`, database `postgres`. No migration, hosted restore, account creation or provider activation followed.

Manifest: `db/recovery/expanded-recovery-package-v3.json`. Exact SHA-256: **`00943149054982c8b52f2ce6d38bae32c557960c37365ab447284010de8e7469`**. All **17/17 dependency byte hashes** matched before launch and after completion; the frozen executor/dependencies were not edited. Scope remained the exact **18 tables and two sequences**. Inspection began 2026-10-13T13:09:17.187Z; executor restoration/integrity completed 2026-10-13T13:10:25.275Z; independent postflight/retention checks finished 2026-10-13T13:10:44.831Z.

## Preflight and one-execution accounting

Before any application record bodies were transferred, independent read-only checks verified target hostname/project/database, operator/session identity, trusted TLS/hostname, original Drizzle and security history, exact scoped catalog/counts, RLS/effective grants/runtime role restrictions, both TestUsers records against protected original integrity/metadata/sequence evidence, and zero Auth users/identities/application Users/private mappings. The original encrypted archive/metadata hashes and in-memory decryptability passed. Existing CMS certificate/private-key validity, strength/ACLs, protected non-synchronized storage, NTFS capacity (at least one GiB free), required PostgreSQL 17.11 binaries and OpenSSL passed.

Both historical v1/v2 failed targets were stopped, with no completion witness or bootstrap plaintext password. Their top-level file hashes and recursive file-size/modification witnesses matched before/after; neither target was restarted, repaired or deleted. The executor freshly created its own target, verified pristine schema, PostgreSQL 17.11, loopback-only endpoint, expected database/operator and trusted TLS/hostname before guarded source body capture.

An initial **ignored read-only inspection helper** contained a generated PowerShell syntax error. It stopped locally with **zero executor invocations, zero hosted connections and no artifact mutation**. The helper was corrected and syntax-checked; its original sanitized zero-attempt result is [preserved separately](evidence/supabase-expanded-recovery-v3-local-inspection-failure.json). This was not a frozen executor edit or a hosted recovery retry. There was exactly **one** approved executor invocation, exit code **0**; no second recovery attempt occurred.

## Stage outcomes

| Stage | Result | Evidence |
| --- | --- | --- |
| Exact package, source identity/history/security, private backup and local prerequisites | PASS | Seventeen dependencies; independent preflight plus frozen executor guards |
| New isolated target preparation/TLS/operator/pristine schema | PASS | All guards completed before body capture |
| snapshot-export, native-dump | PASS | Read-only exported snapshot and native custom archive |
| archive-bounds, archive-header, archive-toc, archive-schema, archive-allowlist | PASS | Four-MiB bound; PGDMP header; **138 TOC entries**; complete policy names and exact object allowlist |
| snapshot-integrity | PASS | Same-snapshot private data/catalog/sequence/ledger comparison |
| archive-encrypt, metadata-bounds, metadata-encrypt, ciphertext-hashes | PASS | Existing private Windows CMS encryption and integrity metadata |
| metadata-decrypt, archive-decrypt, archive-integrity | PASS | Exact decrypted metadata/archive checksums match |
| Isolated restoration and private restore validation | PASS | Native pg_restore, error-stop and single transaction; source/restored complete snapshot equality |
| Fresh source continuity | PASS | Executor fresh transaction and separate independent read-only postflight |
| Retention and approved successful-target disposal | PASS | Both encrypted recovery points retained; only new passing target removed after shutdown |

All fifteen named export operations passed. The native restored comparison verifies all selected table definitions/columns, constraints, indexes, foreign keys, sequences (including last value/is_called), owners, relevant table/schema/default ACLs, RLS enablement/policies, migration and installation histories and private data integrity. The restoration uses safe role surrogates, described below; no credential export is involved.

## Records, histories and authorization

- **18 tables and two sequences** restored; **14 application tables with RLS**, **18 foreign keys**, original two Drizzle entries and one foundation security-ledger entry matched.
- **Both TestUsers records restored correctly** with private full-data equality; no record values or personal-data digests are published.
- Every other scoped application table, including users and identity mappings, has zero rows. Ledger rows are the original two migration entries and one installation entry. All eighteen aggregate counts are in the sanitized executor result.
- Browser roles retain denial of TestUsers table/column access. Relevant source RLS/policy/schema/default-grant/owner inventories match restoration. Restored runtime membership, effective inherited grants, protected-column/identity/audit restrictions and lack of elevated flags pass; local role surrogates intentionally use NOLOGIN. No runtime/managed password was exported.
- Independent postflight confirms the same hosted counts/catalogs/histories/restricted roles and TestUsers private integrity/metadata/sequence. All source reads were in read-only connections/transactions; no hosted DML/DDL, restore, sequence allocation or settings API was issued. Scoped records/security/history remained unchanged. This does not claim an exhaustive audit of unrelated managed configuration or exclude concurrent activity elsewhere.

## Encrypted recovery point and preservation

The approved private directory now retains one new encrypted application archive, encrypted metadata and successful receipt alongside the original verified TestUsers recovery point. The existing CMS bridge checks its AES-256 envelope during encryption. Independent verification after executor success checked ciphertext hashes, decrypted PGDMP header/plaintext archive hash, metadata package/archive binding and all aggregate counts. Plaintext was handled through captured pipes/memory; no private archive/key/record content was selected for GitHub. Temporary byte buffers were cleared; forensic memory erasure is not guaranteed.

| Integrity item | SHA-256 |
| --- | --- |
| Plaintext custom archive | `00c32d86974c0d989f4cbc3e19f461c384af2a3c759692c29284caacda187782` |
| Retained encrypted archive | `7387499ffadbcf5033b53d4f8e148bed286954c10d460752485c9837da8f90ef` |
| Retained encrypted metadata | `adee47e2750f56275272955f5221b1b8fb3b43475ed3b220e61e4df5e0df5049` |

Original archive/metadata/receipt byte hashes and `.env.local` bytes remained unchanged. Both historical failed targets remain private, stopped and retained. Only the newly generated, successfully validated target was shut down and disposed by the reviewed contained lifecycle procedure. No existing backup or historical target was cleaned up. Private paths, filenames, certificate identifiers and keys are omitted.

## Recovery limitations and next installation decision

**The existing application-foundation recovery gate is sufficient to review the first separately approved feature installation, conditional on fresh pre-install target/history/inventory/continuity checks.** It grants no installation authority. First package: `admin-review-v1`, SQL `db/proposals/admin-review-v1.sql`, SHA-256 **`5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca`**, independently bound in `aibean.review_install_sha256`. Its current exact SQL hash matches the published integration checklist. Its five public review tables and private installation ledger remain proposals; no feature package was installed during this operation.

Hosted PostgreSQL **17.6** restored successfully with local PostgreSQL **17.11**, for this bounded dataset/schema. Source ICU/en-US collation was not recreated in the local Windows C-locale target; this does not establish identical sorting/index behavior for future text-heavy data. Empty local Auth scaffolding and NOLOGIN role surrogates preserve application relationships/security checks but do not recover Supabase-managed Auth/session credentials, runtime passwords or the full platform. Managed Auth/Vault/Storage/Realtime record bodies and platform secrets were excluded. Storage object bytes, provider configuration/SMTP, DNS/deployment, real identities, off-device backup retention and independent-device key recovery remain outside this gate. Supabase Free manual exports do not provide managed daily-backup/PITR guarantees; see the [official backup limitations](https://supabase.com/docs/guides/platform/backups).

This recovery point covers the foundation before feature installation. It cannot silently expand to later feature tables/functions or nonempty identity/account data. Prepare and separately authorize new coverage/checkpoints before enabling feature writes or real hosted identities. Keep the original recovery point, successful v3 point and both historical failed targets. The one-execution Authorization 3 is consumed; successful recovery should not be repeated unnecessarily.

For a future first-package approval, the exact proposed wording is:

> I authorize only admin-review-v1 SQL `db/proposals/admin-review-v1.sql`, SHA-256 `5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca`, on Supabase development project `yfknxidgphhepdtwazhn`, database `postgres`, branch `codex/supabase-foundation`. Immediately before execution verify target/operator/strict TLS, exact SQL checksum, original migration/security history, absent proposal objects, protected original and successful v3 encrypted recovery evidence, and unchanged existing records/security. Bind the independently computed SQL hash in `aibean.review_install_sha256` on the same verified private operator session and execute only its unchanged bounded atomic transaction once, with stop-on-error. Preserve TestUsers, managed objects, internal User IDs, capabilities and historical migrations. Perform read-only postflight for the five public review tables/private ledger, FKs/indexes/constraints, RLS/effective grants/protected columns, matching installation hash and existing-data/history continuity. On failure verify rollback; on any post-commit discrepancy stop for a separately reviewed forward-fix/recovery decision. Publish sanitized evidence and stop before the next package. This does not authorize resets, seeds, other feature/Auth packages, account creation, mail, provider activation or deployment.

This wording is a proposal only. A target-bound installer/equivalent and package-specific validation/recovery procedure must be reviewed before executing a later approval. No command, generic approval or recovery PASS enables migrations automatically.

## Validation and publication

No production executable, migration, SQL, manifest or application behavior changed during Authorization 3. The exact code already passed **121 automated tests**, native synthetic TLS/CMS recovery/failure-injection tests and [GitHub lint/typecheck/default production build/dependency audit](https://github.com/nzagha/aibean/actions/runs/38400283994). This operation supplies the previously missing **real hosted scoped export and native isolated restoration evidence**. Documentation publication checks verify JSON validity, exact unchanged package hashes, protected-value exclusion and whitespace. Results-publication CI is recorded after push; historical code CI is not relabeled as new execution evidence.

- [Actual frozen executor result](evidence/supabase-expanded-application-recovery-result.json)
- [Independent preflight/postflight, one-execution count and retention verification](evidence/supabase-expanded-recovery-v3-execution-verification.json)
- [Historical v2 failure report](SUPABASE_EXPANDED_RECOVERY_V2_HISTORICAL_RESULT.md) and [historical v2 active evidence](evidence/supabase-expanded-recovery-v2-historical-result.json)
- [Local v2 diagnosis and frozen v3 package review](SUPABASE_EXPANDED_RECOVERY_V2_FAILURE_DIAGNOSIS.md)
