# Expanded recovery v2 diagnosis and v3 correction

**Local diagnosis/correction: PASS, 13 October 2026. Actual hosted expanded recovery: still FAIL / no retry.** Work began at `ee31dc569179d104081b4ff56649c08dad6def1b` on `codex/supabase-foundation`. This task made zero hosted Supabase connections. Both historical failed targets and the original encrypted backup were outside all test paths and were not restarted, read for diagnosis, modified or deleted.

## Confirmed defect and evidence boundary

The v2 archive allowlist parser truncated policy names at the first space. It split the `pg_restore --list` description into words and compared `row.words[1]` with the full catalog policy name. The already-published read-only inventory records two multiword TestUsers policy names, including `Enable read access for all users`. PostgreSQL emits the full policy tag in the archive TOC. Comparing its first word `Enable` with that full name fails even when the dump contains exactly the approved policy.

**The first locally reproduced failing operation was archive object allowlist validation**, with assertion `Unexpected policy archive entry`, summarized as `TOC_POLICY_NAME_MISMATCH`. Native pg_dump completed, followed by successful `pg_restore --list` and schema-only inspection. The same full frozen v2 prepared executor was exercised with fresh native PostgreSQL 17.11 instances, strict loopback TLS, synthetic rows and the recorded nonpersonal policy-name shape. No hosted record bodies or private backups were used.

This is a confirmed deterministic code defect and a blocker for the recorded source metadata. The historical hosted executor discarded its exception. We cannot retroactively prove that its exact exception was this assertion or exclude an earlier hosted-only failure. We have not relabeled a local reproduction as a successful hosted recovery or claimed pg_dump itself was broken.

[Frozen-v2 local reproduction evidence](evidence/supabase-expanded-recovery-v2-local-reproduction.json). The two `pg_dump` entries there are, in order, the version prerequisite and the actual native export. The harness was copied from the frozen native test with only synthetic policy-name substitutions, strict native-stderr validation and sanitized failure evidence added. The original v2 files still matched the manifest during reproduction. That ignored harness contains no production credentials; the original executable and harness remain recoverable from the starting Git commit.

## What v2 grouped inside approved-scoped-export

V2 exported a transaction snapshot immediately before assigning this broad stage. The stage then encompassed:

1. Native pg_dump with the reviewed twenty table/sequence selectors and exported snapshot.
2. Nonempty/four-MiB archive bound and `PGDMP` binary header checks.
3. Native archive TOC listing and schema-only inspection.
4. Namespace, object-kind, relation, index, constraint, policy, default, ACL and DDL/FK allowlist validation.
5. Same-snapshot private data, catalog, sequence and ledger comparison.
6. Archive hash and Windows CMS archive encryption.
7. Metadata serialization/size bound and CMS encryption.
8. Ciphertext hashes, metadata decryption/hash comparison, archive decryption/hash comparison.

Only after all of these did v2 enter isolated restoration. Consequently, its historical stage alone did not distinguish native-process failure from archive validation or encryption failure.

## Narrow correction and diagnostics

- Policy TOC descriptions must equal the **complete catalog table/name/owner tuple**. Spaces, repeated spaces and literal quotes are preserved. Changed names, suffixes, owners and tables fail. The complete policy inventory must also match, rejecting missing or duplicate policies. No wildcard, prefix match, ignored policy or broader export scope was introduced.
- Fifteen export operation identifiers now distinguish snapshot export, native dump, bounds/header, TOC/schema, allowlist, snapshot comparison, archive/metadata encryption, ciphertext hashing and decryption/integrity checks. Failures expose only a closed operation identifier, assertion identifier, whitelisted PostgreSQL SQLSTATE or bounded process category. Raw exception messages, stdout/stderr, assertion values, causes, stacks, paths, environment values and record contents are excluded.
- The production native runner retains timeout/buffer bounds, strict rejection of nonzero exits and any stderr, and private captured pipes. Native synthetic tests now invoke that **same runner and PG environment constructor**, closing the prior harness gap where warnings and environment construction differed.
- Transient archive/metadata buffers are zeroed on exit, including export failures. This is best-effort buffer hygiene; JavaScript strings and process memory are not forensically erased.
- The current executor accepts only a new v3 manifest/hash. Old v1/v2 hashes fail before private setup. No old authorization is reused.

The eighteen-table/two-sequence scope, four-MiB/10,000-record limits, zero Auth/User/mapping prerequisites, strict TLS/hostname/operator identities, original histories, private Windows CMS implementation, hosted read-only transactions and success-only target disposal remain intact. No SQL installation package, migration, auth implementation, website feature or provider configuration changed.

## New reviewed package

Manifest: [`db/recovery/expanded-recovery-package-v3.json`](../db/recovery/expanded-recovery-package-v3.json)

**SHA-256: `00943149054982c8b52f2ce6d38bae32c557960c37365ab447284010de8e7469`**

V3 binds seventeen dependency hashes, including the immutable v2 manifest, and records previous/new checksums and descriptions for seven changed/added dependencies. Its own hash is recorded here and in native evidence, avoiding self-referential hashing.

Historical v2 manifest remains byte-identical: **`5249c408d2610ab30e8e691f2f8396b3b83fd2ffc05053aaafebc6cb952acfec`**. Its prior dependency bytes are preserved in Git at the starting commit; the executable paths now contain the explicitly reviewed v3 correction. The frozen v2 manifest was neither regenerated nor presented as authorizing changed code. Historical v1 hash remains `a759d686d2a108f7d3c91e35d0db3ff014beae2d7992e2aa587a1dd32bfb1b30`.

| Changed/new implementation file | Purpose |
| --- | --- |
| `.gitattributes` | Exact LF bytes for the new diagnostic module/tests |
| `scripts/expanded-recovery-scope.ts` | Complete policy metadata matching and exact policy inventory |
| `scripts/execute-expanded-recovery.ts` | V3 binding, fifteen operation boundaries, bounded diagnostics and buffer cleanup |
| `scripts/recovery-diagnostics.ts` | Closed diagnostic fields and strict native process result classification |
| `scripts/test-expanded-recovery-executor.ts` | Production-native adapters, realistic metadata, snapshot/permission tests, all boundary injections and retained failure fixtures |
| `tests/expanded-recovery.test.ts` | Full-name/owner/inventory regressions and obsolete hash rejection |
| `tests/recovery-diagnostics.test.ts` | Protected-data redaction, operation boundaries, process outcomes and native environment isolation |
| `db/recovery/expanded-recovery-package-v3.json` | New exact-hash review package; no v2 manifest edit |

The manifest contains the exact previous/new SHA-256 values for each changed dependency. Publication additionally contains only sanitized reports/evidence and active status updates.

## Native validation

[Exact production-path native evidence](evidence/supabase-expanded-recovery-v3-native.json), bound to the v3 manifest above:

| Check | Outcome |
| --- | --- |
| Fresh synthetic PostgreSQL 17.11 source and destinations; verified TLS/loopback/operator/database | PASS |
| Exported snapshot stays visible while its originating transaction is open | PASS; concurrent synthetic update excluded from its dump |
| Snapshot cannot be used after its originating transaction closes | PASS; native nonzero exit rejected |
| Actual production pg_dump arguments/environment/runner | PASS; native child uses verify-full and read-only source options |
| Insufficient dump-role permissions | PASS; native export denied and diagnostic redacted |
| Archive bounds/header, list, schema and complete allowlist | PASS |
| Exact original eighteen tables, two sequences, ledgers, FKs, indexes, constraints, owners, RLS, grants and private integrity | PASS after isolated restoration |
| CMS encryption/decryption and archive/metadata hash checks | PASS using an independent temporary synthetic certificate |
| History, installation history, unexpected scope or local readiness failure before body capture | PASS |
| Failure injection at every one of fifteen export boundaries | PASS; each identifies its operation, preserves source snapshot and retains its stopped target |
| Original synthetic backup and prior failed synthetic target | Preserved across every failure and successful execution |
| Successful new target disposal | PASS after full validation/shutdown only |

The snapshot visibility test deliberately updates and restores a **synthetic** record outside the recovery operation; source content matches before/after. The executor's recovery reads remain read-only. Sixteen injected-failure/preparation targets are intentionally retained in their new private synthetic root for inspection, along with the independent one-day test certificate and synthetic encrypted artifacts. Source/identity fixture servers were stopped. No historical recovery target was located or touched by the harness. Expected rejected disposal emits a sanitized lifecycle-failure marker; it is an exercised negative guard, not a failure of the passing suite.

## Quality and GitHub

- Complete automated suite: **121 passed, zero failed**; thirteen focused recovery/diagnostic tests included.
- Lint and TypeScript: **PASS**.
- Runtime dependency audit: **zero vulnerabilities**.
- Local production build: **PASS on an unchanged source copy using supported webpack mode**, with no private `.env` copied. The existing OneDrive `.next` cache has Windows reparse/access errors; default local build and partial cache preservation failed with EPERM. No application source/configuration was changed to bypass that. [Isolated-build evidence](evidence/supabase-recovery-v3-isolated-build.json). Default Turbopack validation will be independently reported by GitHub CI.
- Previous result commit `ee31dc5`: [GitHub Validate 38343497860 PASS](https://github.com/nzagha/aibean/actions/runs/38343497860). This is historical CI, not validation of the new correction. New correction CI/publication is recorded after push.

The frozen baseline SQL, original migrations, private crypto/lifecycle/credential bridges, v1/v2 manifests and application source remain unchanged. The three pre-existing untracked skill/source-import items remain unpublished.

## Readiness, limitations and next exact authorization

**V3 is locally ready for a new independent hosted-execution review. It is not executed or authorized on hosted Supabase. The actual expanded hosted recovery gate remains FAIL.** Local tests used PostgreSQL 17.11; hosted 17.6 and ICU versus Windows locale differences remain untested in this correction task. Synthetic empty Auth fixtures and NOLOGIN role surrogates do not establish full Supabase identity/platform recovery. Managed Auth/Vault/Storage/Realtime bodies, credentials and settings remain excluded. Independent-device key recovery and off-device retention remain unverified.

Before any future authorized execution, refresh exact target/operator/TLS, eighteen-table/two-sequence inventory, histories, RLS/effective grants/role restrictions, private TestUsers continuity, empty identity counts, original encrypted backup/decryptability, certificate/storage and a newly created isolated target. Stop on drift; preserve both historical failed targets. The v2 single-execution authorization is exhausted.

Exact proposed authorization, **not exercised by this task**:

> I authorize one corrected expanded recovery v3 execution on aiBean Supabase development project `yfknxidgphhepdtwazhn`, database `postgres`, branch `codex/supabase-foundation`, bound to manifest `db/recovery/expanded-recovery-package-v3.json`, SHA-256 `00943149054982c8b52f2ce6d38bae32c557960c37365ab447284010de8e7469`, using only its reviewed `scripts/execute-expanded-recovery.ts`. Verify all seventeen dependency hashes and independently recheck target/operator/strict TLS, original migration/security history, exact eighteen-table/two-sequence inventory, RLS/effective grants/restricted roles, both TestUsers records and private integrity evidence, zero Auth users/application Users/identity mappings, original encrypted backup/decryptability, protected CMS certificate/storage and a new isolated PostgreSQL 17 target before exporting records. Then perform only the scoped read-only export, private CMS archive/metadata encryption and isolated local restoration/validation. Preserve the original backup and both historical failed targets; retain any new failed target and encrypted artifacts. Dispose only the newly created passing target after successful validation and shutdown. Publish sanitized diagnostics/results and stop. Do not retry automatically, restore into hosted Supabase, install any database package, change data/settings, create accounts, send emails or activate Auth/providers/DNS/deployment.

Only after that new authorization, the exact command would be:

```powershell
npx --no-install tsx scripts/execute-expanded-recovery.ts --execute-approved=00943149054982c8b52f2ce6d38bae32c557960c37365ab447284010de8e7469
```

The independent pre-export TestUsers integrity comparison remains an operator preflight requirement. The exact executor also validates continuity after guarded capture and again after recovery. Fresh prerequisites, a successful actual v3 restore and separate owner approvals remain necessary before any schema installation or provider integration.

References: PostgreSQL documents [snapshot/export and warning behavior](https://www.postgresql.org/docs/17/app-pgdump.html) and [archive listing/schema inspection](https://www.postgresql.org/docs/17/app-pgrestore.html). These references inform the checks; the local native evidence establishes this correction's measured outcomes.
