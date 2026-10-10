# Expanded recovery v2 correction review

Prepared under the owner's correction-only authorization on 10 October 2026. **Local correction and synthetic native validation: PASS. Hosted recovery gate remains FAIL from the original attempt; no hosted retry occurred.** Branch: `codex/supabase-foundation`.

## Exact package

Corrected manifest: [expanded-recovery-package-v2.json](../db/recovery/expanded-recovery-package-v2.json).

**SHA-256: `5249c408d2610ab30e8e691f2f8396b3b83fd2ffc05053aaafebc6cb952acfec`.**

The original [v1 manifest](../db/recovery/expanded-recovery-package.json) remains byte-for-byte unchanged, SHA-256 `a759d686d2a108f7d3c91e35d0db3ff014beae2d7992e2aa587a1dd32bfb1b30`. It describes the historical failed version and cannot authorize corrected execution. The v2 manifest lists all fourteen reviewed dependencies, seven changed/added files, previous/new checksums, descriptions, validation references and limitations. Existing test-file provenance is traced to commit `f9e473913220f56e7e4721f6daa5a6aa5ad71a4d`; newly created files have no previous checksum. The scope and bounds are unchanged: eighteen tables, two sequences, two TestUsers records, zero mappings/Auth users, 10,000 scoped records, 4 MiB archive/metadata and bounded query/lock timeouts.

## Confirmed correction and ordering

The original executor compared the masked text form of `inet_server_addr()` to a plain address. Native PostgreSQL 17.11 now independently demonstrates `inet_server_addr()::text = '127.0.0.1/32'` and `host(inet_server_addr()) = '127.0.0.1'`. The exact corrected query passes. This fixes a confirmed code defect; the redacted original exception still does not establish which assertion stopped the historical attempt.

`assertLocalRecoveryIdentity` retains exact loopback, database `postgres`, operator `recovery_operator`, PostgreSQL `17.11`, TLS and successful hostname verification. Verification is read after the connection's TLS handshake. Target path/CA containment, pristine namespaces, package binding and protected Windows lifecycle checks remain mandatory.

Before the first hosted application body query, the production path now completes:

1. Exact v2 manifest and every dependency checksum, branch, A/B/C evidence and restricted runtime connection configuration.
2. Protected non-synchronized storage/profile, original archive integrity/decryption, existing certificate/key permissions and native tool prerequisites.
3. Approved direct project host/port/database/operator, trusted CA/hostname, read-only source transaction, empty managed Auth counts and runtime/browser restrictions.
4. Exact relation/dependency inventory, counts/mapping absence, sequence metadata/state, both Drizzle hashes/timestamps, installation ledger, eighteen FKs and fourteen application RLS tables.
5. Creation of a **new** disposable local target; strict TLS/hostname/operator/database/version checks, root/data/CA containment and pristine inventory.
6. A repeated metadata/history preflight, followed by selected body capture. Every later snapshot also repeats its guards before its body loop.

Ledger contents are necessarily read to validate history, and COUNT/catalog queries run before capture. They are not application record-body exports. Original archive decryption concerns the already approved private recovery point. No managed Auth/Vault/Storage/Realtime bodies or credential fields are selected.

## Native regression evidence

[Sanitized evidence](evidence/supabase-expanded-recovery-correction-native.json) records the exact manifest hash. The new harness imports **`executePreparedRecovery` from the actual executor file** and runs the same complete prepared workflow used by the production CLI, including local creation/start, normalized identity check, body capture, native snapshot-bound `pg_dump`, TOC validation, Windows CMS encryption/decryption, `pg_restore`, ACL replay, comparisons, continuity, retention witness and success-only disposal.

The production credential/project/private-profile envelope is intentionally not invoked by synthetic tests. The harness supplies generated loopback connections, synthetic backup/continuity evidence and a separate temporary one-day, non-exportable RSA-3072 CMS certificate. It uses the actual unchanged encryption bridge and the reviewed lifecycle bridge. No CLI test flag, hosted URL override, TLS bypass or website hook was introduced. Both native source and destination use verified TLS/SCRAM. A real synthetic `postgres` backend is used for source checks: SET ROLE from a different backend owner hides its pg_stat_ssl row and is not an adequate transport test.

Passing checks include:

- Actual masked inet representation, correct normalization and the exact executor identity query.
- Non-loopback identity rejection, real wrong-database and wrong-operator connections, and mandatory TLS/hostname checks.
- Changed migration history, changed installation history, unexpected source object, and failed local preparation: the intended error is required and the application body-query counter stays zero.
- All eighteen tables/two sequences, constraints/indexes, owners, schema/default/column/table ACLs, RLS/policies, ledger contents, synthetic data integrity and sequence state match after native restore.
- The original synthetic encrypted backup remains intact through negative cases and successful recovery. The failed synthetic target is stopped, lacks a completion witness, rejects disposal, and remains untouched by a subsequent successful operation.
- The passing target is stopped and disposed through the existing witness/path checks. The test owner subsequently removes its entire disposable synthetic fixture environment and temporary certificate. This does not remove the real retained failure or original encrypted backup.

After successful validation, five earlier stopped synthetic harness environments and their uniquely marked temporary certificates were removed under exact temporary-root/marker/no-PID/no-reparse checks. The real retained target and original backup were outside that operation.

The first sandbox invocation stopped at temporary ACL setup. Subsequent harness preparation corrections supplied a complete empty Auth metadata scaffold with correct operator ownership and a real operator backend. These were synthetic fixture issues; negative tests were tightened to require the intended failure rather than accepting any exception. Full workflow PASS was obtained and repeated against the final v2 manifest.

Reproduce privately on Windows with native PostgreSQL 17.11, OpenSSL and PowerShell available:

```powershell
$env:PG_TEST_BIN = (Resolve-Path 'test-results/postgres-validation/portable/pgsql/bin').Path
$env:PG_TEST_OPENSSL = 'C:\Program Files\Git\usr\bin\openssl.exe'
$env:PG_TEST_POWERSHELL = (Get-Command pwsh).Source
npx --no-install tsx scripts/test-expanded-recovery-executor.ts
```

This accepts binary paths only and creates generated loopback endpoints; it never loads `.env.local`, reads the existing operator/CMS profile or accepts a remote URI. Temporary ACL/key-store setup requires normal Windows operator permissions. Existing private backups and the original stopped target are outside its root and never inspected, restarted, modified or deleted.

## Quality and publication

Lint, TypeScript, all **70 automated tests**, production build and runtime dependency audit pass; the audit reports zero vulnerabilities. Native PostgreSQL/CMS tests are local evidence and are not run by the Linux CI workflow. CI verifies lint/typecheck/tests/build/audit and the exact package checksums through automated tests. Windows sandbox canonicalization and audit network restrictions required the authorized local checks to run with normal operator permissions; they then passed. [GitHub Validate 38087029618](https://github.com/nzagha/aibean/actions/runs/38087029618) passed for implementation commit `129980a74d03ce6eb809d051996edd694516b08a`; the correction evidence records the verified result. A later documentation-only commit records CI without changing the frozen v2 package.

Only executable changes, tests, versioned manifest and sanitized documentation/evidence are published. No temporary certificate, private key, plaintext/archive/CMS contents, private paths, credentials or personal records are part of the commit. Original SQL, Drizzle migrations, v1 manifest, application UI and active login configuration remain unchanged.

## Remaining limits and next authorization

This is synthetic readiness, not proof that current hosted inventory/TLS/credentials or a new real archive have passed. Those checks must be repeated by the guarded production executor after a new exact-hash approval. The original successful encrypted TestUsers backup and the real failed target remain under their prior retention rules. The expanded manual archive excludes managed provider passwords/sessions/Storage/Vault and SMTP/Auth settings. A local empty Auth FK scaffold cannot recreate Supabase services. Hosted/local patch/collation differences, independent-device key recovery and off-device retention still need separate review where applicable.

The exact next authorization is:

> I authorize one execution of the corrected expanded recovery v2 package, manifest SHA-256 `5249c408d2610ab30e8e691f2f8396b3b83fd2ffc05053aaafebc6cb952acfec`, using `scripts/execute-expanded-recovery.ts` on branch `codex/supabase-foundation` against project `yfknxidgphhepdtwazhn`, database `postgres`. Limit export to the unchanged eighteen-table/two-sequence scope in `docs/SUPABASE_EXPANDED_APPLICATION_RECOVERY_PROPOSAL.md`, preserving both TestUsers records. Reverify all dependency checksums, source/history/permissions/identity limits, original encrypted backup, private storage/encryption and new isolated PostgreSQL 17 target readiness before application body capture. Perform the guarded read-only scoped export, existing Windows CMS encryption and isolated local restoration; verify integrity, data, metadata, ledgers, RLS, grants and source continuity. Preserve the original and successful new encrypted backups. Remove only this newly created transient target after successful validation and shutdown; retain a failed new target. Do not restart, modify or delete the original retained failed target. Stop on any prerequisite drift. This does not authorize hosted restore, migrations, A/B/C repetition, managed-secret export, hosted Auth accounts, emails, SMTP/Auth/DNS/deployment changes or Auth activation. Publish only sanitized results and stop after reporting the recovery outcome.

After separate authorization only:

```powershell
npx --no-install tsx scripts/execute-expanded-recovery.ts --execute-approved=5249c408d2610ab30e8e691f2f8396b3b83fd2ffc05053aaafebc6cb952acfec
```

No execution consent is inferred from the checksum, synthetic PASS or publication. The owner explicitly authorized correction/testing only and prohibited a hosted rerun in this assignment.
