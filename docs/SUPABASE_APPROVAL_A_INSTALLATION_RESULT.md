# Approval A: hosted installation result

**Approval A PASS.** Verified 9 October 2026 at 22:48:01 UTC on `yfknxidgphhepdtwazhn / postgres`, branch `codex/supabase-foundation`. The owner explicitly authorized this exact installation. No failed installation/postflight checks; no rollback or forward fix was needed. B/C, Auth activation, Clerk removal, seeds and live payments were not executed.

Exact executed file: `db/install/reviewed-installation.sql`.

SHA-256: `72818e1233ab51ebbac861a822d89ee0d52d4c12ee32a193746c631bdf639b0c`.

The original bytes were independently hashed, held in memory and executed once, without regeneration, substitutions or transaction splitting. The existing package used its BEGIN/COMMIT, advisory lock `621487190`, five-second lock timeout and sixty-second statement timeout. The unchanged read-only validation file was then executed, followed by independent assertions. Validation SHA-256: `61466aa36b8a3cf252396580fed0b086fa3d1a51a7c83b850365abeca7120771`.

## Mandatory preflight

Verified the exact direct project endpoint, configured project URL, database postgres, session/operator postgres, trusted CA/hostname TLS and hosted version 17.6. The operator is nonsuperuser with existing BYPASSRLS/CREATEDB/CREATEROLE/REPLICATION and the necessary database/public CREATE, auth USAGE and auth.users REFERENCES. Existing role flags and relevant memberships matched the earlier private recovery metadata.

Read-only repeatable-read inventory confirmed only TestUsers/its sequence in public, all fourteen application tables individually absent, no drizzle/aibean_private schemas, no Drizzle/Supabase/security/mapping ledger relations, no runtime/login roles and zero Auth users/identities. Both TestUsers records, definitions, sequence, RLS and original permissions matched the encrypted recovery snapshot privately. No personal values or row digest were displayed.

The retained CMS archive and encrypted metadata remained accessible under the original private ACL/certificate configuration. Ciphertext and decrypted archive hashes matched the trusted published/private receipts; metadata decrypted correctly. These checks passed before execution and again afterward. No backup was repeated, private data uploaded or disposed recovery target restarted.

## Installed objects and postflight

| Object group | Result |
|---|---|
| Application tables | 14 present, all RLS enabled, all empty |
| Private mapping | aibean_private.user_identities: UUID PK, unique internal User ID, created_at, RLS, restrictive FKs to auth.users/public.users; zero mappings |
| Security ledger | aibean_private.installations, RLS, one matching supplement entry |
| Drizzle history | drizzle.__drizzle_migrations and identity sequence; two exact original baseline entries |
| Runtime group | aibean_runtime NOLOGIN; LOGIN/SUPERUSER/BYPASSRLS/CREATEDB/CREATEROLE/REPLICATION all false |
| Foreign keys | All 18 expected names/definitions present: 16 baseline plus 2 restrictive mapping FKs |
| Policies | 14 application runtime_service policies plus 2 mapping policies, scoped only to aibean_runtime; existing TestUsers policies unchanged |
| Client grants | Effective table/column/sequence checks find no direct anon/authenticated/service_role privileges on application/private/ledger objects; no PUBLIC application table grants |
| Existing data | TestUsers remains two; private content/definitions/sequence/RLS/table grants match; Auth users/identities, application Users and all fourteen application tables remain zero |

Tables: audit_logs, billing_webhook_receipts, claim_requests, featured_placements, orders, rate_limits, saved_tools, stack_tools, stacks, taxonomy, tool_reviews, tools, users and vendor_access. Both new private tables and the Drizzle ledger make **17 new tables** in total; TestUsers is preserved separately.

| Original migration | created_at | Preserved SHA-256 |
|---|---|---|
| 0000_numerous_skullbuster.sql | 1791247215670 | b58134b31944656eda45a6ba929fcdb66a5ec4e66e01a8cfd3d8d9b16d4f4468 |
| 0001_hesitant_hardball.sql | 1791249181547 | 168fd0b654a75e1174052fc444893a66362f89bb3d1cdaec3bbfe9fcbf4f4df1 |

Security ledger: id `aibean-foundation-v1`, supplement SHA-256 `eea0e7309e13440224ca80030a367afc76bc99c08b2027fc722b8fa2b388277a`. This is the reviewed security supplement digest, distinct from the whole atomic installation file's SHA-256 above. No original migration source, baseline timestamps or managed migration history was rewritten. No Supabase migrations API entry was added; Drizzle plus the independent security ledger remain the reviewed history mechanism.

Runtime cannot CREATE databases/public/private schemas, read Auth/TestUsers/ledgers, change User privileges/delete Users, mutate audit history or update/delete mappings. INSERT on users is limited to id, retaining ordinary default capabilities. PostgreSQL automatically recorded the creating postgres operator's ADMIN membership in the new group with INHERIT=false and SET=false; no other members or inherited parent roles were found. This does not create an application login. Runtime policies trust server code and do not independently isolate visitors; server ownership/capability checks remain required.

## Preservation and evidence limits

Managed schema/relation/column/constraint/policy/routine metadata, existing role flags/memberships, extension versions, defaults and Auth aggregate counts matched before/after. The only managed-table structural addition was the mapping's **two authorized internal referential-integrity triggers on auth.users**; these implement the reviewed restrictive FK and do not activate Auth or change its records. The approved package also added runtime USAGE on public. Original schema grants/owner, TestUsers table/sequence grants, database ACLs and defaults remain intact. No C was performed.

No managed routine bodies, credential/settings contents or unrelated managed row bodies were exported. Therefore unrelated platform row contents were not independently hashed; the preservation conclusion combines exact bounded SQL scope with matching managed metadata/counts. The MCP OAuth refresh failed, so execution/verification used the existing direct PostgreSQL stack with strict TLS. No MCP/Auth setting was changed to work around this.

Machine-readable [installation evidence](evidence/supabase-approval-a-installation-2026-10-09.json) contains only sanitized definitions, counts, role/grant results and approved hashes. The private .env.local connection is unchanged. Backup contents, row-content digest, private paths, certificate identifier and credentials remain outside Git/OneDrive/public reports. The preserved archive is a **pre-install TestUsers recovery point**; it does not cover the newly installed app/ledger/mapping objects. Expanded public/drizzle/private backup coverage and Auth dependencies need a separate reviewed scope/authorization. Independent-device key/off-device recovery remain unverified.

Lint, route type generation/typecheck, all 28 ordinary tests and runtime audit pass (zero runtime findings). Local production build twice hit a Windows EPERM unlink lock in the existing .next cache; [Clean GitHub Validate run 38001811549](https://github.com/nzagha/aibean/actions/runs/38001811549) passed for implementation commit 9ce0baff292042d44f7c2764fbb5eaf6dd4cd02d, including production build, lint/typecheck, all tests and runtime audit. The local cache-lock limitation remains separate from the passing clean build. The actual hosted Approval A transaction and read-only assertions pass. Earlier sixteen native synthetic installation scenarios remain evidence for unchanged SQL; no repeated hosted install/backup was run as a test. Website layout/branding and active identity behavior are unchanged.

## Approval B: exact next authorization

B is ready for an independent owner decision; it remains unexecuted. Its reviewed preparation SQL is unchanged. Password provisioning and private application connection replacement are separate operations covered only by explicit B authorization below. No password should enter chat, SQL files, command arguments, logs or Git.

> After A passes its postflight, I authorize db/install/runtime-login-proposal.sql with SHA-256 3c76ee6f5f203cbc3a140308a1360edb326ed5319fc3de9c3400c35b94e8b940 on yfknxidgphhepdtwazhn/postgres. Create only aibean_app_login with the reviewed aibean_runtime membership. Provision its password privately, enable its LOGIN, authenticate a new verified-TLS session and verify all reviewed privilege/ownership restrictions. Only after those checks pass, replace the private application DATABASE_URL and restart its pools, keeping the operator credential separate. Do not grant additional managed/Admin memberships, change database-wide privileges without further review, switch active Auth, seed records or enable live payments.

Before B, refresh package/live group/ledger/data metadata and recovery evidence, and refuse an unexpected existing login. If inherited CONNECT is unavailable, stop for an exact separately reviewed owner grant. Validate a new hosted login's TLS, flags, ADMIN=false/INHERIT=true/SET=false membership, effective object/column/RLS restrictions and denied elevated operations. Any test writes need an explicit rollback-only fixture procedure; create no persistent seeds. Replace/restart the application connection only after authentication/privilege verification succeeds. Keep the migration operator separate.

C remains independently pending browser-client impact acceptance. Supabase Auth integration follows validated runtime/database readiness; active provider cutover still requires real two-account mapping/session/ownership/capability tests and separate authorization. Stop at B's decision boundary.
