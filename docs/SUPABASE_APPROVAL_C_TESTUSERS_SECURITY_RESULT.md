# Approval C: existing TestUsers access correction

**Approval C PASS.** Completed 9 October 2026 at 23:33:11 UTC on `yfknxidgphhepdtwazhn / postgres`, branch `codex/supabase-foundation`, under the owner's explicit Approval C and accepted browser/API impact. Final A/B/C status: **A PASS, B PASS, C PASS**. A/B were not repeated. Supabase website Auth remains inactive; existing login flows are unchanged.

Executed file: `db/install/testusers-security-proposal.sql`.

SHA-256: `0c53e6cb250512624d4a73135e8ea122eb8573b8be494b9dbe55ac9bb29985db`.

The original bytes were hashed and executed once in their original BEGIN/COMMIT transaction with its five-second lock timeout. The sole hosted change was `REVOKE ALL ON public."TestUsers" FROM PUBLIC, anon, authenticated`. No SQL regeneration, sequence operation, record write, migration-ledger entry, provider setting, Auth account, credential change, seed or live payment was performed.

| Required check | Verified result |
|---|---|
| Approval C | PASS; exact transaction committed |
| Two original TestUsers records | PASS; private content matches original decrypted backup and fresh before/after snapshots |
| Anonymous table/browser access | PASS; effective table/column SELECT denied, hosted role SELECT returns 42501; actual anonymous Data API HEAD changed 206 to 401 |
| Authenticated table access | PASS; effective table/column SELECT and INSERT denied; hosted role SELECT and INSERT plan permission check return 42501 |
| Existing application schema/history | PASS; 14 RLS tables, 18 FKs, 2 original Drizzle entries and matching security ledger unchanged |
| Restricted runtime | PASS; new authenticated aibean_app_login sessions pass Drizzle, strict CA/hostname TLS and reviewed restrictions |
| Auth/platform preservation | PASS within observed scope; public Auth settings, zero Auth users/identities, managed metadata and existing roles/memberships unchanged |
| Local lint/typecheck/tests/runtime audit | PASS; 32 tests, zero runtime audit findings |
| Production build | Local Windows EPERM cache unlink lock; clean GitHub CI result recorded after publication |
| GitHub CI | Pending publication; recorded below when verified |

## Preflight and production dependency review

The separate Windows DPAPI-protected migration/operator connection authenticated as postgres against the exact direct project endpoint/database/port. Strict certificate-chain and hostname validation passed independently; ordinary application DATABASE_URL remained the restricted login throughout. Operator ownership/SELECT and permission to assume the required browser-role contexts were verified. The SQL and original baseline migrations matched approved hashes. A/B evidence and actual table/policy/FK/ledger/group/login metadata matched the reviewed installation; all application tables and identity mappings remained empty.

The retained encrypted archive and encrypted metadata were accessible and reverified by private decryption and trusted hashes. Scoped data, ordered definitions, constraints, indexes, RLS/FORCE RLS, both original policies, sequence definition/state and original privileges matched the recovery evidence before execution. Original table/schema/column/sequence/default grants and effective permissions are recorded in the sanitized [C evidence](evidence/supabase-approval-c-testusers-security-2026-10-09.json); the original encrypted recovery snapshot also retains the prior grants. No backup was repeated or private archive uploaded.

Repository inspection found **no production route, browser component or business repository using TestUsers**. The existing `src/lib/db/readiness-inventory.ts` helper references it for permission-aware aggregate diagnostics and is used by readiness/native-test scripts. It returns null/unverified when SELECT is denied; it already worked under restricted runtime B. Diagnostic/operator scripts, reviewed SQL and synthetic tests also reference the table. No new unsafe application dependency was found. External clients are not inventoried; the owner expressly accepted loss of direct anonymous/authenticated access.

The first local preflight guard incorrectly classified that already-reviewed diagnostic helper as a production dependency and stopped before connecting or attempting any SQL. Inspection confirmed its guarded reads and script-only usage, and the guard was corrected to admit only that unchanged reviewed helper while rejecting other source references. The subsequent real preflight passed. The [resolved local stop](evidence/supabase-approval-c-testusers-security-failure-2026-10-09.json) records attempted=false; it is not a failed hosted transaction or database drift.

## Postflight and evidence boundary

Private record content, both-row count, ordered columns/defaults/identity, constraints/indexes, owners, sequence value/called state, RLS and policy definitions match before/after. The exact removed ACL entries are limited to TestUsers table grants for PUBLIC/anon/authenticated; column, sequence, schema, database and default ACLs are unchanged. All other application/private/ledger relation definitions/owners/privileges, original histories, runtime flags/memberships, managed schema/relation/constraint/routine metadata, extension versions and Auth aggregate counts match. Operator access remains; dashboard_user's previous denial also remains unchanged rather than being expanded.

Actual hosted SQL checks used the verified operator's `SET LOCAL ROLE` within fresh READ ONLY transactions for the NOLOGIN browser roles. SELECT returned 42501 for anon and authenticated. Authenticated INSERT was checked using **EXPLAIN without ANALYZE** on a zero-row INSERT plan, which returned 42501 without executing writes or consuming sequence values. Effective table and column grants independently corroborate these denials. The isolated C test also proves atomic failure rollback and preservation of synthetic rows/policies/sequence/service access.

The real Data API check used only the saved publishable key, no user JWT, and HEAD with limit=0: no personal response body was requested before or after. Anonymous denial is verified as HTTP 401. A real authenticated JWT Data API request remains **UNVERIFIED** because no existing Auth account/token is available and C forbids creating one or activating Auth. Authenticated PostgreSQL role-context and effective-grant denial are verified; these are distinct evidence scopes.

Fresh password-authenticated runtime connections and `npm run supabase:check` pass with restrictedRole/transportVerified/hostnameVerified/drizzleSelectVerified=true. Auth/TestUsers counts remain null/unverified from runtime diagnostics because access is denied; the separate operator verified the original two records and zero Auth users. The public Auth settings response was privately compared before/after and matched; no settings were written. Private .env.local bytes and connection/CA configuration remained unchanged. Website layout, branding, assets and login flows have no code changes in this increment.

There were no failed hosted installation/postflight checks and no automatic grants, reset, recovery or forward fix. No hosted data-writing test was used. Unrelated managed record contents, routine bodies, Vault secrets or full Auth configuration were not exported/hashed; preservation rests on exact SQL scope plus matching observed metadata, counts and public settings. Current MCP OAuth refresh failed; the existing direct strict-TLS stack supplied the verified evidence without connector changes.

## Remaining exposure and recovery limits

- **anon/authenticated retain SELECT/USAGE/UPDATE on the TestUsers identity sequence.** No nextval/setval/reset was invoked. These grants do not restore table SELECT/INSERT, but could permit sequence observation or alteration through an independently exposed SQL/function surface. Public-schema functions were previously absent; this task does not claim a complete audit of every managed RPC surface. A separate reviewed sequence-privilege proposal is needed before any revocation.
- **service_role retains table SELECT/INSERT and sequence privileges**, with its existing bypass role. It remains a privileged server-only trust boundary; no privileged key was read, exposed, provisioned or tested through the Data API. Revoking these grants requires independent scope/impact approval.
- Original permissive TestUsers policies remain by design. Browser table grants are removed; a future grant could make those policies effective again. Broad schema default grants are unchanged; each later migration must explicitly secure its objects.
- The preserved encrypted backup is the pre-install/pre-C scoped TestUsers recovery point. Restoring it replays the original permissive grants; an authorized recovery must include explicit post-restore access checks and a separately reviewed C replay/forward correction. It does not cover the newer application/mapping/ledger objects, runtime credential lifecycle or Supabase Auth service. Expanded recovery scope, independent-device key recovery and off-device retention remain separate, unverified gates.

No excluded privileges were modified to hide these limits. The next stage is the proposed [Supabase Auth implementation plan](SUPABASE_AUTH_IMPLEMENTATION_STAGE.md). This report authorizes no Auth development activation, new accounts, hosted fixtures, additional migrations or legacy-provider retirement.
