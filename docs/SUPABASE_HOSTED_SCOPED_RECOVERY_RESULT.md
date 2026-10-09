# Authorized hosted scoped backup and recovery result

**Recovery gate: PASS.** Source `yfknxidgphhepdtwazhn / postgres`, branch `codex/supabase-foundation`. Captured 9 October 2026 at 22:26:55 UTC; recovery and source continuity completed at 22:29:51 UTC. The owner expressly authorized this scoped read-only backup, isolated restore, successful transient cleanup and sanitized publication. **A/B/C, schema installation, runtime-login provisioning, TestUsers permission changes and Auth activation remain unapproved and unexecuted.**

## Verified evidence

| Check | Verified result |
|---|---|
| Source identity/transport | Exact approved direct project, database postgres, PostgreSQL 17.6, verified CA/hostname TLS; source transactions read-only |
| Export scope | Only public.TestUsers, its two records and related identity sequence, definitions, constraints, indexes, RLS/policies and relevant public grants/default ACLs; 20 archive entries |
| Encryption/storage | One CMS AES-256-CBC archive and one separately encrypted metadata file retained in the approved private local directory; existing RSA-3072 Windows certificate used |
| Integrity/decryption | Archive format marker/TOC/schema inspected; plaintext and ciphertext SHA-256 match trusted receipt; actual archive and metadata decrypt; retained artifacts rechecked after cleanup |
| Local target | Previously prepared disposable native PostgreSQL 17.11, loopback-only, verified TLS/SCRAM and independent private credential; initially empty |
| Record fidelity | Source two, restored two; unpublished content digest matches all five fields in both records; fresh post-recovery source digest also matches |
| Definitions | Ordered columns/types/defaults/nullability/identity, constraints, indexes, owners, RLS/FORCE RLS/policies, sequence definition/value/called state match |
| Permissions | Schema/table/column/sequence/default ACLs including grantors/grant options match; effective permissions match; local anon/authenticated/service_role SELECT counts two; dashboard SELECT denied |
| Source continuity | Held snapshot and fresh read-only source transaction retain identical scoped data, sequence, definitions and permissions; no hosted writes attempted |
| Cleanup | Owned instance stopped; only its verified transient data directory and server log removed after successful validation; encrypted archive/metadata/private receipt and certificate retained |
| Fresh installation preflight | Read-only Drizzle confirms eight schemas, only TestUsers/sequence in public, all fourteen aiBean tables individually absent, zero Auth users and absent Drizzle/Supabase/security/mapping relations |
| Package integrity | Seven reviewed SQL files and both baseline timestamps unchanged; no SQL regeneration/application |

Machine-readable evidence: [actual recovery](evidence/supabase-hosted-scoped-recovery-2026-10-09.json) and [post-recovery read-only inventory](evidence/supabase-post-recovery-inventory-2026-10-09.json). Archive hashes are artifact integrity evidence, not hashes of the two identifiable records. The private content digest, record values, archive contents, exact private paths, certificate identifier, credentials and keys are excluded from publication.

## Restore adjustments and boundaries

The schema-only inspection required explicit `pg_restore --schema-only --file=-` for captured stdout. That correction was first validated against an existing synthetic archive. Two earlier inspection attempts aborted before an encrypted archive was created. The successful encrypted archive was captured once; subsequent verification retries reused it without another hosted export or overwriting it.

Recreating the local public schema omitted its implicit PUBLIC USAGE baseline. The runner detected exactly that missing grant and explicitly replayed the observed grant **only locally**. Full scoped ACLs/effective privileges then matched. Linux and Windows collations ordered equivalent ACL rows differently; comparisons use deterministic multisets with grantors/grant options, preserving duplicate counts. The expected dashboard denial is asserted on the enclosing postgres-js transaction, which rejects after the denied query.

Required platform role names are local NOLOGIN surrogates. Managed superuser/administrator/replication flags, global memberships, passwords, global database ACLs and service configuration were not replayed. service_role BYPASSRLS was deliberately simulated locally to preserve the tested scoped behavior. The schema/table owners and scoped grantors are preserved. These differences do not prevent recovery of this approved scope; they exclude any claim of complete Supabase platform reproduction or real hosted Data API/Auth tests. Locale-sensitive future behavior needs target-specific testing; the captured contents and indexes match for these two records.

No Auth, Vault, Storage, Realtime, extension/platform record bodies, credentials or unrelated managed contents were exported. Existing broad TestUsers browser access is intentionally preserved on the hosted source until independently approved C. No private backup or key was uploaded to GitHub, OneDrive or any external service. Repository publication contains operator source code and sanitized documents only.

The archive was captured through bounded in-memory pipes under an exported read-only transaction snapshot. Sequence state is not MVCC-isolated; explicit before/after/fresh checks detected no drift. No hosted writer pause/settings change was performed. Temporary local PostgreSQL files were plaintext under restricted ACLs until authorized cleanup; ordinary deletion and buffer clearing do not establish forensic SSD/paging erasure.

## Recovery limitations

The owner confirms Supabase Free; billing/managed daily snapshots/PITR were not independently verified. This result proves local recovery of this captured application scope, not managed project-wide recovery. Post-snapshot writes, Auth identity service, Storage file bodies, Vault and other platform state need separate plans/approvals. No hosted restoration was performed or authorized.

The retained archive and current Windows certificate support recovery in this tested operator context. Password-protected PFX recovery on an independent device and encrypted off-device retention remain **NOT VERIFIED / NOT CONFIGURED**. No private-key export or upload was performed. The successfully disposed local target must not be reused/reinitialized implicitly; another rehearsal needs an explicitly prepared disposable target. Preserve the last verified encrypted archive and trusted receipt.

## Approval A — exact next owner decision

Recovery and current read-only preflight have passed. The only immediate blocker to A is its separate exact owner authorization. Recheck the live inventory/private record continuity and all reviewed hashes immediately before any authorized installation; stop on drift. B requires A and its own private provisioning/connection approval. C requires independent acceptance of browser-client impact. Neither is covered by A.

> After the actual scoped backup and isolated restoration pass, and fresh source inventory and checksum checks pass, I authorize executing db/install/reviewed-installation.sql with SHA-256 72818e1233ab51ebbac861a822d89ee0d52d4c12ee32a193746c631bdf639b0c on yfknxidgphhepdtwazhn/postgres. Install the fourteen aiBean tables, identity mapping, migration/security ledgers, restricted runtime group, RLS and grants in the reviewed atomic transaction. Preserve both TestUsers records, managed objects and existing history. Run the reviewed read-only postflight. This approval excludes B, C, seeds, Auth activation and live payments.

After separately approved A, require the unchanged read-only postflight: fourteen application RLS tables, eighteen FKs including mapping, two exact baseline ledger entries and one matching security supplement, no browser/service direct application grants, no business/Auth/capability seeds and unchanged TestUsers/managed state. Precommit errors roll back; after commit prefer independently reviewed forward remediation/recovery, never reset.

Then separately approve B and verify an actual restricted hosted login/session, TLS, role/membership/ownership and denied elevated operations before replacing the private application connection. C may be approved independently when its external client impact is accepted; no timing authorization is inferred. Refresh recovery scope after installation before another approved export. Begin Supabase Auth integration only after database/runtime validation, and retain the existing release boundary until real two-account sessions, mapping and capability/ownership tests pass. See [complete A/B/C wording and sequence](SUPABASE_RECOVERY_GATE_AND_AUTHORIZATIONS.md).

## Implementation verification

Operator runner: `scripts/execute-scoped-backup.ts`; private Windows bridge: `scripts/private-backup-crypto.ps1`; shared read-only inventory: `scripts/inspect-public-backup-scope.ts`. The runner is not called by application startup or CI. It requires an explicit approved-export flag and private existing operator configuration; it refuses unexpected scope, existing-archive overwrite, disposed targets and unverified source TLS. A receipt-based retry reuses the encrypted archive and compares it with the unchanged source before continuing.

Lint, route type generation/TypeScript, all 28 ordinary tests, production build and runtime dependency audit pass (zero runtime findings). Real scoped native restore and role tests described above passed. The unchanged installation SQL's sixteen historical native scenarios were not unnecessarily repeated. Website branding/layout/authentication remain unchanged. Historical audits, version archives, migration history and installation SQL remain untouched.
