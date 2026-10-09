# Approval B: restricted hosted runtime and application connection

**Approval B PASS.** Verified 9 October 2026 on `yfknxidgphhepdtwazhn / postgres`, branch `codex/supabase-foundation`. The owner supplied explicit Approval B authorization. Approval A was not repeated; no TestUsers permission changes, additional migrations, seeds, Auth activation/Clerk removal, Admin/Creator creation or live payments occurred.

Executed original file: `db/install/runtime-login-proposal.sql`.

SHA-256: `3c76ee6f5f203cbc3a140308a1360edb326ed5319fc3de9c3400c35b94e8b940`.

| Required result | Observed outcome |
|---|---|
| Approval B | PASS |
| Hosted runtime login | VERIFIED by a new password-authenticated connection, not SET ROLE |
| Reviewed privilege restrictions | PASS |
| Next.js DATABASE_URL switch | PASS; restricted runtime only |
| Drizzle connection | PASS; read-only transactions and application catalog queries |
| Trusted TLS | PASS; CA chain and expected hostname validated in new operator/runtime sessions |
| Existing data preservation | PASS; both original TestUsers records and permissions match privately |
| Local checks/build/tests | PASS; lint, route type generation/TypeScript, 31 tests, production build and runtime audit (zero findings) |
| HTTP runtime | PASS; 16 public pages, 8 guest redirects, unknown-tool not-found/noindex |
| GitHub CI | Recorded below after publication |

## Mandatory preflight and exact role installation

Read-only repeatable-read preflight verified the direct project host, port 5432, database postgres, operator postgres and strict TLS; all fourteen RLS application tables, eighteen expected FKs, two unchanged Drizzle migration hashes/timestamps, matching security supplement, sixteen reviewed application/mapping policies and restricted NOLOGIN group matched Approval A. The runtime login was absent. Operator CREATEROLE/BYPASSRLS and SCRAM password encryption were verified. Original migration and A/B package bytes matched their reviewed checksums.

The existing encrypted archive and encrypted metadata remained private, accessible, decryptable and hash-matching. Private TestUsers content, definitions, sequence state, RLS and grants matched the recovery snapshot. No repeat backup, unrelated managed export or personal data disclosure occurred.

The exact B bytes ran once in their original bounded BEGIN/COMMIT transaction. `aibean_app_login` was initially NOLOGIN, INHERIT, NOSUPERUSER, NOBYPASSRLS, NOCREATEDB, NOCREATEROLE and NOREPLICATION. Its only inherited parent is `aibean_runtime`, ADMIN=false, INHERIT=true, SET=false. Existing database CONNECT was inherited successfully; no database-wide ACL change was needed. PostgreSQL automatically records the existing postgres creator's ADMIN membership in the new login role with INHERIT=false/SET=false. The application login receives no postgres, service_role, Admin or other managed-role membership and owns no relations.

## Private credentials and actual runtime verification

A unique 48-byte cryptographically random credential was stored with Windows CurrentUser DPAPI in the already verified owner-controlled private directory, outside Git/OneDrive. The original operator connection was separately DPAPI-protected and privately roundtrip-verified. ACLs permit only the owner, SYSTEM and Administrators. Neither connection string, password, private path nor credential-store content is in this report or Git.

The existing native PostgreSQL 17 psql performed its non-echo password prompts over hidden, captured process pipes with `sslmode=verify-full`, the existing CA and startup/history/echo disabled. The Windows prompt implementation was checked; its documented native fallback read private stdin. `\password` generated the SCRAM verifier client-side: no cleartext password was placed in SQL, command arguments or process output. LOGIN was enabled only for this exact role after storage/membership checks. The credential is plaintext only in short-lived process memory and the explicitly approved ignored application environment file; DPAPI and ACLs do not protect against a compromised owner session or privileged local administrator. Independent-device credential recovery remains unverified.

New connections authenticated as session_user=current_user=`aibean_app_login`; strict TLS/hostname checks and read-only Drizzle transactions passed. The runtime read all fourteen permitted empty application tables and the permitted empty private mapping; catalog queries used the same Tool/review/vendor schema as the application. Actual SELECT attempts against Auth users, TestUsers, Drizzle history and the security ledger returned SQLSTATE 42501. The reviewed role cannot create permanent schemas/tables, administer roles, bypass RLS, alter User Admin/Creator flags, change/delete Users, mutate audit/billing receipt history or update/delete mappings. User INSERT is limited to id; mapping SELECT/INSERT remains permitted by the reviewed provisioning contract. Effective table/column/sequence checks continue to deny anon/authenticated/service_role access to the new application/private/ledger objects.

**Existing PUBLIC database TEMP privilege is still inherited.** Runtime can use temporary tables; zero permanent schemas permit CREATE. Approval B did not revoke database-wide defaults. Removing inherited TEMP would require separate reviewed owner authorization and impact analysis. Runtime restrictions PASS refers to the exact reviewed A/B permanent-object/grant contract, not a claim that every PostgreSQL facility is disabled. All managed function execution capabilities were not independently audited in this increment.

No hosted test writes were used. Ordinary User provisioning was tested only in isolated PGlite against the installed column grants, including quoted input, idempotence and rejected capability defaults. A small parameterized Drizzle SQL adjustment names only id; the previous builder included privileged columns with DEFAULT and failed INSERT(id)-only grants. Legacy identity behavior and capability defaults remain unchanged. This does not verify a hosted end-user identity flow.

## Corrected verification stop and connection switch

Execution first stopped after successful hosted authentication because the local TestUsers comparison removed the already-approved runtime public-schema USAGE from only its second snapshot. Comparing two post-A snapshots therefore produced a false ACL mismatch. No automatic database repair or rollback was attempted. Read-only diagnostics confirmed the original records/permissions, A objects/history and runtime login were correct. The comparator now validates and normalizes only that exact reviewed grant on both sides, with a regression test that still rejects CREATE/additional grants.

The original B authorization remained in force. A separate guarded continuation reverified private recovery, original operator credential, A inventory/history, exact login flags/membership and a fresh authenticated runtime. It repeated no CREATE ROLE, password reset, ALTER ROLE, grants or installation SQL. Corrected preservation comparisons passed; only then did it atomically replace DATABASE_URL in ignored .env.local. Every other parsed variable, including CA path, project URL and publishable key, remained unchanged. A second new connection from the saved runtime URL passed. Both TestUsers records and permissions remain original; Auth Users, application Users, mappings and all application rows remain zero. The preserved managed/application metadata remained stable across the continuation and connection switch. Unrelated managed record bodies/routine bodies were not exported or hashed.

Application DB construction and the readiness checker now fail closed unless DATABASE_URL names the approved runtime login; there is no operator-credential fallback. Existing strict CA/hostname TLS and prepare:false remain. No active aiBean server was found before the switch, so only a fresh local aiBean process was started at `http://127.0.0.1:3000`; no unrelated process was terminated. The fresh server's public routes and guest guards passed. Tables remain unseeded: the tools page correctly displays its existing empty state, and unknown Tool routes use the existing not-found UI. Branding, header/footer, grids, typography and assets were not changed.

`npm run supabase:check` returned restrictedRole=true, drizzleSelectVerified=true, hostnameVerified=true and transportVerified=true. Auth/TestUsers counts are null/unverified from runtime diagnostics by design because those reads are denied; the private operator continuity check verified the two original records and zero Auth users. applicationReady/loginFlowVerified remain false for the separate Supabase website identity gates. Auth settings were read, never changed.

Machine-readable [runtime evidence](evidence/supabase-approval-b-runtime-login-2026-10-09.json) and [resolved initial stop](evidence/supabase-approval-b-runtime-login-blocked-2026-10-09.json) contain sanitized facts only. Original migration files/ledgers and historical audit/version archives are unchanged. The existing CMS recovery point covers pre-install TestUsers only, not the newly installed application/mapping/ledger objects or new login credentials; expanded backup scope and off-device recovery remain separate approvals.

## Next independent step

Review Approval C's browser-client impact, then separately authorize `db/install/testusers-security-proposal.sql`, SHA-256 `0c53e6cb250512624d4a73135e8ea122eb8573b8be494b9dbe55ac9bb29985db`. It revokes TestUsers table privileges from PUBLIC/anon/authenticated while preserving both records, policies and operator/dashboard access. Existing browser access is still present; C has not been executed.

After C's reviewed execution and fresh continuity/grant checks, implement Supabase Auth against the restricted runtime/mapping foundation. Validate real two-account sessions, mapping/idempotence, ownership/capabilities, verification/recovery/logout and provider configuration before coordinated legacy-provider retirement. Approval B does not activate Auth, authorize subsequent migrations or establish those end-user flows as operational.
