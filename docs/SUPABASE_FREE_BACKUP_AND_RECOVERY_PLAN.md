# Supabase Free manual backup and recovery

Prepared 9 October 2026 for `yfknxidgphhepdtwazhn / postgres` on `codex/supabase-foundation`. **No hosted records have been exported. No hosted mutation has been authorized or executed.**

Latest follow-up review confirms the private backup directory is empty and no actual restore evidence exists. The existing encryption certificate and storage remain valid; additional read-only catalog checks found no unrelated public custom objects. [Current recovery gate and exact authorization wording](SUPABASE_RECOVERY_GATE_AND_AUTHORIZATIONS.md) records the refreshed inventory, next scoped-export decision and conditional A/B/C decisions. Count two remains verified; historical personal-value equality has not been established without reading records.

## Current decisions and evidence

The owner confirms the Free plan and no existing backup. This is an owner confirmation, not an independently inspected billing subscription. Do not assume managed daily snapshots or PITR. No paid upgrade or second paid project is needed for this local procedure. [Supabase's backup guidance](https://supabase.com/docs/guides/platform/backups) recommends regular exports and off-site backups for Free projects; database backups exclude Storage file bodies.

Fresh verified-TLS, read-only Drizzle inspection confirms PostgreSQL 17.6, database postgres, operator postgres, eight non-system schemas, TestUsers count two, Auth users count zero and no aiBean application tables or Drizzle/Supabase migration ledgers. TestUsers has five columns, two unique indexes/constraints, RLS, two policies and an identity sequence. No public functions were found. Broad browser-role table/sequence/default privileges remain unchanged.

The earlier sixteen native PostgreSQL 17.11 scenarios and synthetic restore remain applicable to the unchanged installation package. They are historical synthetic test evidence, not proof that the hosted records are recoverable. Current preparation evidence is [sanitized local preparation](evidence/supabase-free-backup-preparation-2026-10-09.json).

| Required status | Result | Meaning |
|---|---|---|
| Supabase Free backup process | READY | Local preparation is ready for scoped-export approval; execution remains gated |
| Hosted scoped backup | NOT EXECUTED | Owner approval required before exporting record bodies |
| Backup encryption | PASS | Configured certificate and AES-256-CBC CMS passed a synthetic archive roundtrip; no hosted encrypted archive exists yet |
| Isolated restore | NOT EXECUTED | New empty native target is prepared; only earlier synthetic restoration passed |
| Recovery readiness | NO-GO | Actual scoped backup integrity and hosted-data restoration are not yet verified |
| Installation SQL integrity | PASS | A/B/C and original migration hashes remain unchanged |
| Approval A | BLOCKED | Hosted-data recovery gate remains open |
| Approval B | BLOCKED | Depends on approved A, then separate runtime provisioning approval |
| Approval C | BLOCKED | Requires recovery gate and owner confirmation of external client dependencies |

## Confirmed local storage and encryption

An inspected local NTFS root outside the repository and configured OneDrive roots was created, with separate Backups and uniquely named Recovery directories. Exact paths, certificate identifier and local connection details are recorded only in that private root. Public documentation intentionally omits them. The root and its ancestors are not reparse points. Approximately 682 GiB remained free at validation.

Inheritance is disabled at the root. Only the Windows owner, SYSTEM and Administrators receive access; children inherit those restrictions. The certificate private-key file was separately checked for the same allowed principals. The owner can write and read the encrypted synthetic test; other ordinary users have no ACL grant. These checks cover the configured sync roots inspected; an arbitrary future third-party sync configuration cannot be ruled out. Do not add this root to any sync or backup-upload service without owner approval. Local administrators and processes running as the owner remain trusted principals. No BitLocker/EFS or physical-device-loss protection is claimed.

The owner explicitly chose creation of a Windows document-encryption certificate. RSA 3072/SHA-256, two-year validity, private key in CurrentUser/My, separated from the backup files. Windows Protect-CmsMessage uses AES-256-CBC here, verified by OID `2.16.840.1.101.3.4.1.42`. A previous synthetic PostgreSQL custom archive was base64 encoded in memory, encrypted, decrypted in memory and compared by SHA-256. The temporary synthetic encrypted file was removed. No private key or encryption password was exported, invented or written to chat.

CMS supplies confidentiality. A SHA-256 comparison checks archive integrity against a trusted recorded digest; neither is claimed as an authenticated signature. Treat the locally protected manifest as part of the trusted recovery material. Keep credentials and key material separate from backup archives. The current Windows key store supports this user's local decryption; recovery on another computer is **NOT VERIFIED**. Before relying on this as off-device or laptop-loss recovery, the owner must privately export a password-protected PFX, retain its password in their password manager separately, and test import/decryption under a separate recovery context. Use Certificates Current User (`certmgr.msc`) → Personal → aiBean local backup encryption → Export → private key → password-protected PFX. Choose the password privately; no PFX/passphrase should enter Git, chat or CI. No certificate export/upload has been automated.

## Exact proposed export and privacy scope

Source: verified direct `db.yfknxidgphhepdtwazhn.supabase.co:5432`, database postgres. Existing ignored DATABASE_URL/DATABASE_CA_CERT_PATH remain unchanged. Credentials are supplied only to child-process environment variables; never through arguments, logged URIs or shell history. Set libpq `PGSSLMODE=verify-full`, the owner CA, the exact host and `PGOPTIONS=-c default_transaction_read_only=on`; clear inherited PG service settings. Refuse any different source.

Proposed native command, with binary stdout captured privately by the orchestration process:

```text
pg_dump --no-password --format=custom --schema=public --strict-names --no-large-objects --lock-wait-timeout=5s
```

Scope: all objects in public, currently **only TestUsers and TestUsers_id_seq**. Preserve both records, identity sequence definition/value, column defaults/types/nullability, primary/unique constraints, indexes, RLS and both policies, schema/table/column/sequence ACLs and public-schema default privileges. Keep ownership and ACL output; do not use --no-owner or --no-acl. No database creation/restoration is requested on the source. PostgreSQL's [pg_dump documentation](https://www.postgresql.org/docs/17/app-pgdump.html) explains that schema-scoped dumps do not automatically include outside dependencies, which must be reviewed separately.

The exported personal data would comprise **email, name, age, ID and creation timestamp for two records**. No record values were read during preparation. Capture required role/grant/catalog metadata separately without pg_authid, rolpassword, hashes, connection settings or global managed-role SQL. Referenced roles include postgres, anon, authenticated, dashboard_user, service_role, supabase_admin and built-in pg_database_owner; record relevant memberships/grantors and effective privileges for review. Do not indiscriminately use pg_dumpall against hosted Supabase. Capture database ownership/ACL as metadata, without restoring global database configuration or service secrets.

Exclude auth, storage, vault, realtime, extensions/graphql managed contents, large objects, platform keys, provider settings, service credentials and unrelated managed objects. This is an **application public-schema backup**, not a complete Supabase project backup.

Before export, refresh the inventory and freeze the reviewed scope. Hold a read-only repeatable-read source transaction and export its snapshot to pg_dump so aggregate counts/catalog metadata and the archive describe the same source snapshot. Stop on unexpected new public objects, missing dependencies or changed source identity; seek scope approval rather than silently exporting more data.

For this small two-row scope, capture the binary archive in bounded memory, encode it as base64 for Windows CMS and write only the encrypted envelope into the private backup directory. Never redirect the dump into OneDrive, a temporary .dump file, chat, tool output or CI. Abort on size/process/encryption errors and remove incomplete encrypted files. Before larger future backups, separately validate a streaming encryption workflow rather than silently exceeding the bounded-memory design. In-memory buffers and Windows paging/crash behavior are not claimed to provide forensic erasure.

## Approval checkpoint before execution

The agent must present the exact source/scope, private directory, configured encryption, empty isolated target and personal-data fields to the owner, then obtain explicit approval for this scoped export. Preparation/certificate authorization is **not** export authorization. No backup execution command is automatically run by application startup or CI. Backup approval also permits the requested disposable local recovery rehearsal, but never a restore into Supabase or a hosted A/B/C change.

## Integrity and isolated restoration after approval

1. Record UTC completion time, source/project/client version, exact scope, ciphertext SHA-256 and plaintext archive SHA-256 in access-restricted metadata. Encrypt the captured role/grant metadata separately. Inspect archive contents with native pg_restore --list from private in-memory input; never print data entries. Confirm expected table/sequence/policy/ACL/default-ACL entries and absence of managed-schema data.
2. Check the encrypted file and private-key ACLs again. Decrypt only into bounded memory and verify the trusted archive hash before restore. No persistent unencrypted export copy is required. Reject altered or incomplete archives.
3. Start only the uniquely prepared empty PostgreSQL 17.11 instance. It has no public tables, loopback-only address, hostssl/SCRAM rules, hostnossl rejection, its own verified temporary TLS CA and an independent random local password protected with Windows current-user DPAPI. It passed verified-TLS authentication and was stopped. The bootstrap plaintext password file was removed. Check port availability and CA validity before restart; regenerate local TLS only for this owned disposable instance if needed.
4. Inspect schema SQL before execution. Create only required NOLOGIN surrogate roles; built-in pg_database_owner already exists. Do not replay Supabase-managed globals or high-privilege role memberships. Map database/schema ownership and necessary grantor names explicitly. Preserve the table's tested ACL/RLS semantics. Where service_role BYPASSRLS or inherited memberships affect effective permissions, simulate deliberately in this isolated cluster and label differences; never claim exact hosted-global reproduction from simplified roles.
5. Restore into an empty database on this instance with native pg_restore --exit-on-error --single-transaction. Handle the target's existing empty public schema explicitly on the owned target only; no --clean or DROP is permitted against the source. Apply separately reviewed public default ACL metadata if archive selection misses it. Inspect errors; never skip grants/errors to obtain a green report.
6. Compare column types/defaults/identity/nullability, constraints, indexes, sequence state, owners/effective schema/table/column/sequence/default grants, RLS/policies and relevant metadata against the source snapshot. Confirm **two TestUsers rows** using aggregate counts; also compare a private content digest without displaying personal values to establish fidelity beyond count equality. Test relevant role switching/permission and RLS behavior, including PUBLIC-read behavior that is intentionally preserved until C. Keep all results aggregate/sanitized.
7. Stop the owned instance and remove its transient restored data after validation, retaining only encrypted backup/recovery metadata. Restored PostgreSQL data files are temporarily plaintext under restricted ACLs; encrypted volume protection has not been verified. Validate the resolved exact owned target remains under the private Recovery root before any recursive deletion; never delete the backup root, existing development DB or hosted data. Normal file deletion is not forensic SSD erasure. If transient local plaintext database files are unacceptable, stop and obtain an encrypted-volume alternative before restoring.
8. Publish only sanitized outcomes, hashes and counts. No private paths, usernames/SIDs, keys, certificates, password hashes, record values or dumps in public evidence. A successful rehearsal proves recovery of this snapshot into the tested local target, not Supabase service-wide disaster recovery.

## Limitations and development schedule

There is no verified managed daily snapshot or PITR. Recovery is limited to successfully exported objects and data; transactions committed after the snapshot are lost unless separately captured/reconciled. Auth, Storage and Vault need separate owner-approved recovery planning; database dumps alone do not recover Storage files or platform encryption/settings. Neither a certificate on the same laptop nor a local backup alone protects against laptop loss. Plan an owner-controlled encrypted off-device copy and verified independent key recovery later; do not upload now.

For MVP development: request a fresh approved scoped backup immediately before each schema migration or permission change; refresh and verify after significant schema/data changes. Once application data is active, perform an owner-operated daily backup on days with writes and a weekly isolated restore check, adjusted to acceptable data loss and workload. Suggested initial retention: seven daily and four weekly verified encrypted copies; deletion/rotation requires an owner-agreed policy and must retain the last good recovery point. No automatic schedule, deletion or upload is configured.

After A, review expanded backup coverage for public, drizzle and aibean_private, including both ledgers and identity mapping. Mapping references Auth identities, so a public/private dump alone cannot recreate functional identity service recovery. Reconcile protected Auth recovery separately before claiming a complete auth foundation.

## Installation integrity and independent decisions

No installation SQL was regenerated. Exact preserved hashes:

| Decision | File | SHA-256 |
|---|---|---|
| A | db/install/reviewed-installation.sql | 72818e1233ab51ebbac861a822d89ee0d52d4c12ee32a193746c631bdf639b0c |
| B | db/install/runtime-login-proposal.sql | 3c76ee6f5f203cbc3a140308a1360edb326ed5319fc3de9c3400c35b94e8b940 |
| C | db/install/testusers-security-proposal.sql | 0c53e6cb250512624d4a73135e8ea122eb8573b8be494b9dbe55ac9bb29985db |

Original baseline hashes remain `b58134b31944656eda45a6ba929fcdb66a5ec4e66e01a8cfd3d8d9b16d4f4468` and `168fd0b654a75e1174052fc444893a66362f89bb3d1cdaec3bbfe9fcbf4f4df1`. Mapping uniqueness/restrictive FKs, restricted runtime design, atomic RLS/grants, advisory lock, rollback and preservation of synthetic TestUsers passed the prior sixteen scenarios. Fresh target metadata/hash checks are still required immediately before execution.

Remaining approvals are independent: **first scoped backup and local rehearsal**; only after successful actual recovery, **A exact atomic installation**, **B hosted restricted login/private provisioning and validated connection replacement**, and **C browser-grant revocation preserving TestUsers after owner confirms external dependencies**. See [the installation approval package](SUPABASE_DATABASE_INSTALLATION_APPROVAL.md) for impact, postflight and recovery. None authorizes seed data, reset, Auth setting/cutover, live payments or managed-role replay. The website and active legacy login remain unchanged.
