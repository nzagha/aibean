# Expanded application recovery proposal before hosted Auth writes

**Prepared only; export and restoration have not been executed or authorized by the Phase 2 implementation request.** Target: `yfknxidgphhepdtwazhn / postgres`. Preserve the original verified CMS-encrypted TestUsers archive, its metadata and receipt. The earlier archive predates A/C, so it neither covers the installed application foundation nor reproduces current TestUsers browser grants. No private backup material is stored in this repository.

## Exact proposed scope and current inventory

Fresh [restricted read-only inventory](evidence/supabase-auth-candidate-readiness-2026-10-09.json) found fourteen RLS application tables, `public."TestUsers"`, the Drizzle ledger, two private application tables and two owned sequences. Application records and private mappings are currently zero; the runtime intentionally cannot read TestUsers/Auth rows or ledger contents. Separate operator preflight must verify both original TestUsers records and complete histories against the retained private evidence before an export.

| Namespace | Approved proposal selectors |
|---|---|
| `public` application | `audit_logs`, `billing_webhook_receipts`, `claim_requests`, `featured_placements`, `orders`, `rate_limits`, `saved_tools`, `stack_tools`, `stacks`, `taxonomy`, `tool_reviews`, `tools`, `users`, `vendor_access` |
| `public` existing data | `"TestUsers"`, `"TestUsers_id_seq"` |
| `drizzle` | `__drizzle_migrations`, `__drizzle_migrations_id_seq` |
| `aibean_private` | `installations`, `user_identities` |

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

## Separate authorization wording

> I authorize the expanded scoped read-only backup of project yfknxidgphhepdtwazhn, database postgres, limited to the eighteen tables and two sequences enumerated in docs/SUPABASE_EXPANDED_APPLICATION_RECOVERY_PROPOSAL.md and their related application definitions, constraints, indexes, RLS/policies, owners, relevant grants, migration histories and private canonical identity mapping. I authorize the bounded encrypted application metadata capture, use of the existing private Windows CMS configuration and secure non-synced backup directory, and restoration only into a new disposable local PostgreSQL 17 recovery cluster with the documented local schema/NOLOGIN-role/Auth-FK structural prerequisites. Preserve the original verified archive. Verify private integrity, counts, policies, privileges, histories and unchanged hosted state; retain ciphertext and remove only approved transient recovery data after success. Do not export managed Auth/Vault/Storage records or credentials, upload private backup material, restore to hosted Supabase, create hosted accounts, send mail, change settings, apply migrations or activate Auth. Stop for amended approval if identity mappings are nonempty, source scope drifts or prerequisites fail. Publish sanitized evidence only.

Before executing after that authorization, produce and hash the concrete guarded operator script and exact local prerequisite SQL from the fresh catalog for final review. The current implementation has prepared this proposal only; it has not exported or restored the expanded scope.
