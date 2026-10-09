# Supabase connection and environment readiness

**Latest state — Approval B PASS (9 October 2026):** The explicitly authorized exact runtime-login package was executed once. A new password-authenticated aibean_app_login session passed trusted TLS, Drizzle reads and reviewed restrictions. The ignored application DATABASE_URL now uses that login; the operator connection and runtime credential are separately protected with private Windows DPAPI. Both TestUsers records/permissions, A objects/history and zero Auth/User/mapping counts are preserved. Local lint/typecheck, 31 tests, production build, runtime audit and public/guest HTTP checks pass. C and Supabase website Auth remain separately unexecuted. See [Approval B runtime result](SUPABASE_APPROVAL_B_RUNTIME_LOGIN_RESULT.md). Earlier observations below are chronological evidence, not current runtime configuration.

**Latest state — Approval B PASS (9 October 2026):** The explicitly authorized exact runtime-login package was executed once. A new password-authenticated aibean_app_login session passed trusted TLS, Drizzle reads and reviewed restrictions. The ignored application DATABASE_URL now uses that login; the operator connection and runtime credential are separately protected with private Windows DPAPI. Both TestUsers records/permissions, A objects/history and zero Auth/User/mapping counts are preserved. Local lint/typecheck, 31 tests, production build, runtime audit and public/guest HTTP checks pass. C and Supabase website Auth remain separately unexecuted. See [Approval B runtime result](SUPABASE_APPROVAL_B_RUNTIME_LOGIN_RESULT.md). Earlier observations below are chronological evidence, not current runtime configuration.

Updated 9 October 2026, including verified DATABASE_URL, actual scoped recovery and owner-authorized hosted Approval A. The latest live refresh used read-only Drizzle/PostgreSQL; earlier MCP observations are identified below. This report supersedes the connection blockers in the initial foundation assessment; `docs/audit/` remains a historical snapshot.

## Outcome

**Verified TLS PostgreSQL/Drizzle, scoped recovery and Approval A installation/postflight PASS.** Fourteen RLS application tables, private mapping, exact baseline/security ledgers and NOLOGIN group are installed. Auth/User/mapping counts remain zero; both TestUsers records and original permissions are preserved. Restricted login/connection B now PASS; website Supabase Auth remains pending. Earlier MCP/public API checks passed; current MCP OAuth refresh fails, so A used the existing direct verified-TLS connection without changing MCP/Auth settings. [Approval A installation result](SUPABASE_APPROVAL_A_INSTALLATION_RESULT.md) records current evidence.

| Item | Verified evidence | Limit |
|---|---|---|
| Project reference | `yfknxidgphhepdtwazhn` | Owner designates this development; no disposable-environment assumption |
| Project URL | `get_project_url` returned `https://yfknxidgphhepdtwazhn.supabase.co` | Display name aiBean.io is owner-supplied, not independently verified |
| Database | `current_database()` returned `postgres` | MCP connection is separate from Drizzle |
| PostgreSQL | 17.6, aarch64 | Hosted server version, not local Docker version |
| Existing MCP alias | `supabase`; previously authenticated, current OAuth refresh failed | Direct verified-TLS PostgreSQL used for A; no connector/Auth configuration changed |
| Application Auth API | Saved publishable key accepted; `GET /auth/v1/settings` returned 200 | No user sign-in or email delivery tested |
| Public Data API | `HEAD /rest/v1/TestUsers?select=id&limit=0`, no user JWT, returned 206 and count 2 | No record bodies fetched |
| Application PostgreSQL | DATABASE_URL present; direct PostgreSQL authentication, verified TLS and Drizzle SELECT succeeded with the downloaded CA | Current runtime role is aibean_app_login without elevated flags; the earlier postgres inspection connection is now stored separately |

## Downloaded certificate verification — latest result

Located the owner's downloaded certificate and saved only its path to ignored `DATABASE_CA_CERT_PATH`. The owner reported downloading it from official database SSL settings. Its CA identity is Supabase Root 2021 CA / Supabase Inc; its self-signature and validity check pass (valid through April 2031). Explicitly trusting this CA resolved the chain failure with `rejectUnauthorized:true` and hostname verification enabled. The successful handshake trusts the supplied CA only and verifies the expected project hostname; no network-intermediary certificate was accepted. Certificate contents, private paths and credentials are excluded from this report. Database credentials were not modified.

Verified results: direct connection; database `postgres`; database role `postgres`; TLS=true; transaction_read_only=on; superuser=false; BYPASSRLS/CREATEDB/CREATEROLE/REPLICATION=true. The readiness command exits 1 because restrictedRole=false, even though databaseReachable and transportVerified are true. This is a privilege gate, not a connection failure.

A separate successful check used the installed Drizzle/postgres.js stack and Drizzle's transaction API with `accessMode:'read only'`. It reconfirmed database identity, all eight schemas, two TestUsers records, zero Auth users/identities, and the existing public policies/grants using SELECT queries and aggregate counts. No personal record bodies were fetched. The earlier live findings below are historical; the authorized A installation supersedes absent-application-table/ledger findings.

The app, Drizzle Kit configuration, readiness checker, seed and legacy operator script now share `src/lib/db/tls-config.ts`. It reads the CA using the server-only environment variable, rejects absent/invalid/expired CA configuration, forces certificate and hostname verification, and strips URL SSL parameters before passing explicit options. Drizzle Kit receives structured credentials with the same TLS object. No global TLS override or plaintext fallback is used. Seed/operator scripts were inspected/updated but not executed.

Run the verified read-only check normally after configuring the local CA path:

```powershell
npm run supabase:check
```

The latest result confirms `hostnameVerified=true`, `transportVerified=true`, `drizzleSelectVerified=true`, selected schema public and server version 17.6. No special Node startup CA setting is now needed. No global trust store was modified.

**Recovery gate and authorized Approval A PASS; B is ready for an exact owner decision.** The owner-authorized read-only export and isolated restore verified both records, scoped definitions, RLS/grants, archive integrity/decryption and source continuity. The private encrypted archive/metadata remain; successful transient local files/log were removed. The owner confirms Supabase Free; no managed daily snapshot/PITR is assumed. See [Actual hosted recovery evidence](SUPABASE_HOSTED_SCOPED_RECOVERY_RESULT.md). The unchanged installation package retains its sixteen passing synthetic scenarios. A created only the reviewed objects/grants/history. B/C and Auth activation are not approved/executed; TestUsers and existing managed objects/data remain preserved.

Pre-install post-recovery Drizzle inventory confirmed eight schemas and all application tables/ledgers absent. Current A postflight confirms fourteen RLS application tables, private mapping/ledger and Drizzle history, plus the existing TestUsers table/sequence. New drizzle/aibean_private schemas bring the non-system schema count to ten. TestUsers remains two; Auth, User, mapping and every app table remain zero. Seven reviewed SQL hashes and baseline timestamps remain unchanged. Private source/restored/fresh-source digests establish content continuity for this capture without publishing identifiable values. [Exact approval wording and post-install sequence](SUPABASE_RECOVERY_GATE_AND_AUTHORIZATIONS.md) now require independent B/C decisions; A is complete.

The final SELECT-only refresh also verified postgres has database/schema CREATE, public CREATE, auth USAGE and auth.users REFERENCES. That pre-install inventory preceded A; current installation/postflight evidence records all new app/mapping/ledger objects and preserved TestUsers/count two. A future custom runtime account has not been created or authenticated on Supabase. The local shared runtime tests prove object/grant restrictions, not per-user server authorization or provider flows.

Readiness inventory is now privilege-aware: a runtime without Auth/TestUsers SELECT does not query those rows and reports null counts with verified=false. It discovers ledger names from catalogs without requiring private-schema USAGE or reading migration rows. Permission inventories explicitly state their current-role visibility scope. The shared inspector passes native read-only Drizzle tests under the restricted login before and after restore; it does not expand runtime grants.

## Initial configured DATABASE_URL recheck — resolved TLS finding

The owner configured DATABASE_URL privately in the existing `.env.local`. A presence-only check confirmed it is available to Node/dotenv, and Git still excludes the file. Its parsed connection settings passed the existing project validator for direct connection to the approved project. No environment variable was modified or displayed.

`npm run supabase:check` again reached Auth settings successfully. Its PostgreSQL connection, using postgres.js with prepared statements disabled and certificate verification enabled, failed during TLS with **SELF_SIGNED_CERT_IN_CHAIN**. A separate diagnostic using the same postgres.js client and Drizzle wrapper attempted a SELECT inside `BEGIN READ ONLY`; the connection failed before the query could execute. Only the allowlisted error code was printed, never raw driver errors or connection strings.

A retry with Node's Windows system certificate trust enabled (`NODE_USE_SYSTEM_CA=1`, temporary process setting only) produced the same error. Certificate verification was never disabled. This establishes a local TLS trust failure; it does not establish that the database password is correct or incorrect. Successful TCP/TLS negotiation far enough to receive a certificate is not successful PostgreSQL authentication. The runtime database role, authenticated TLS session, direct-query database identity and actual application ORM operations remain unverified.

The initial recommendation was to obtain the trusted project CA and distinguish any intermediary chain. This has now been resolved as recorded above, without changing credentials or disabling verification. See [Supabase connection configuration](https://supabase.com/docs/guides/database/connecting-to-postgres).

At the initial inspection the runtime did not explicitly install the CA. That gap is now corrected by the shared verified-TLS configuration described above. The runtime retains `prepare:false` and a five-connection pool; diagnostics use one connection. Ordinary runtime credential provisioning remains pending.

The earlier SELECT-only MCP inspection reconfirmed database postgres, PostgreSQL 17.6, all eight schemas listed below, TestUsers as the sole public table, both Drizzle ledger locations absent, and the Supabase ledger absent. MCP list_migrations returned an empty list. Counts remained TestUsers=2, Auth users=0, Auth identities=0, Storage objects=0. RLS policies, public table grants, constraints and broad default table grants were rechecked and match the findings below. MCP access does not prove that the new DATABASE_URL authenticates successfully.

**Current Auth gate:** direct TLS/Drizzle, scoped recovery, reviewed runtime-group design and authorized atomic installation/mapping/RLS/grants are complete. B must independently authorize and verify a new restricted hosted login/connection; real Auth/session/mapping/cross-account tests and a coordinated owner-approved cutover remain required. Do not activate Auth or apply unrelated migrations under A. Earlier read-only checks did not authorize execution.

## Read-only inspection boundary

Native Supabase tools were not exposed to this chat. The installed Codex app-server successfully accessed the existing OAuth registration using an ephemeral protocol context, without an AI turn or a persisted task. Only SELECT queries, project URL/key retrieval, migration listing and security-advisor reads were used. No OAuth token was read or displayed.

A runtime override adding `read_only=true` failed the MCP handshake with `Auth required` / `notLoggedIn`. The unchanged registered URL remained authenticated. Its SQL role was `postgres`, with `transaction_read_only=off` and BYPASSRLS. **The operations were read-only; the working transport was not permission-enforced read-only.** No persistent MCP configuration was changed.

To enforce read-only at the transport, update the existing alias (do not add another) to the owner's endpoint and complete OAuth for that URL:

`https://mcp.supabase.com/mcp?project_ref=yfknxidgphhepdtwazhn&read_only=true&features=database%2Cdocs`

Then verify tool discovery and query permissions again. `get_project_url` and `get_publishable_keys` belong to the development feature group and are not expected in database/docs-only mode. The official [MCP configuration documentation](https://supabase.com/docs/guides/ai-tools/mcp) explains these scopes.

## Observed database inventory

Non-system schemas: `auth`, `extensions`, `graphql`, `graphql_public`, `public`, `realtime`, `storage`, `vault`. There was no `drizzle`, `supabase_migrations`, or private aiBean identity schema.

The only public table was **`public."TestUsers"`**, which is distinct from aiBean's planned `public.users`:

| Column | Type | Nullability / constraint |
|---|---|---|
| id | bigint | Required; primary key |
| created_at | timestamptz | Required; default now() |
| email | text | Required; unique |
| age | bigint | Required; default 20 |
| name | text | Required; default 'name' |

Two unique indexes support its primary key and email constraint. No public foreign keys or triggers were found. Do not infer an Auth identity from TestUsers email or id. Preserve the table and its two rows until the owner approves a separately reviewed change.

Managed relations inspected by name included Auth users/identities/sessions/MFA/OAuth/passkey tables, Auth migration history, Storage objects/buckets/migrations, Realtime messages/subscriptions/history, extension statistics views and Vault relations. Their existence does not mean the corresponding product features are configured. No Vault contents, tokens, passwords, emails, names or personal record bodies were retrieved.

Aggregate checks: TestUsers **2** rows; auth.users **0**; auth.identities **0**; storage.objects **0**. Absence of aiBean tables means there are no aiBean ownership records in this target at inspection time. It does not prove that another historical database or an export contains no records.

## Comparison with repository schema and migrations

At the earlier read-only inspection, all 14 repository tables were absent. **All fourteen are now installed with RLS under approved A**; the following records the original baseline comparison:

`taxonomy`, `users`, `tools`, `saved_tools`, `stacks`, `stack_tools`, `tool_reviews`, `vendor_access`, `claim_requests`, `orders`, `billing_webhook_receipts`, `audit_logs`, `rate_limits`, `featured_placements`.

At that earlier inspection none of the 16 baseline FKs was present. A now deploys all 16 plus the two restrictive mapping FKs. The reviewed one-owner-per-Tool, review uniqueness/rating and featured-placement constraints are installed; complete application/provider workflow behavior remains unverified.

| History source | Observation |
|---|---|
| Repository 0000_numerous_skullbuster.sql | Base 13-table migration preserved |
| Repository 0001_hesitant_hardball.sql | Featured table migration preserved |
| Repository Drizzle journal | Entries 0 and 1; snapshots retained |
| MCP list_migrations | Empty list |
| drizzle.__drizzle_migrations | Absent |
| public.__drizzle_migrations | Absent |
| supabase_migrations.schema_migrations | Absent |

This supports a new aiBean schema installation on this project, not a reset of an empty database. Existing TestUsers and managed objects must remain intact. Do not rewrite 0000/0001 or apply them individually without the permission-hardening stage in the same controlled installation.

## Grants, RLS and security findings

TestUsers has RLS enabled, not forced. Its SELECT policy applies to PUBLIC with `USING (true)`. Its INSERT policy applies to authenticated/dashboard_user with `WITH CHECK (true)`. Anon and authenticated have SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER table grants. RLS still restricts row operations lacking policies; broad grants alone do not imply every operation succeeds.

**Confirmed exposure:** an unauthenticated Data API HEAD request can access the table and count its two rows. Its public-read policy and SELECT grants permit access to the email/name columns. Personal values were deliberately not fetched. RLS being enabled does not make this table private.

For future tables created by postgres or supabase_admin in public, default privileges grant broad table access to anon/authenticated/service_role. Therefore applying the existing migrations as-is is unsafe for private aiBean data: the SQL contains no RLS or grant hardening. The installation must atomically enable RLS and remove browser-role access before commit. Drizzle remains a server-only access path with explicit user/capability/ownership checks.

Observed roles include anon/authenticated (NOLOGIN, no BYPASSRLS), authenticator (LOGIN, no BYPASSRLS), postgres (LOGIN, BYPASSRLS), service_role (NOLOGIN, BYPASSRLS), supabase_read_only_user (LOGIN, BYPASSRLS), plus platform roles. No aiBean-specific runtime role was present. Use an explicitly provisioned restricted runtime role; a successful postgres connection is not least-privilege readiness.

Security advisors returned an empty lint list. This does **not** negate the verified permissive TestUsers policy. No storage policies were found by the inspected policy query. The complete exposed-schema setting was not returned in pg_db_role_setting; public exposure was verified over HTTP, but the complete Data API configuration remains unverified.

## Environment and Docker

The correct project URL and a publishable key retrieved from that project's MCP tool are stored in ignored `.env.local`. The key was transferred directly to the file without printing it. No secret/service-role key was retrieved. `git check-ignore .env.local` confirms exclusion.

`DATABASE_URL` must come from the project's official Connect panel. Do not derive credentials from the project URL. Set it locally, never in chat. The new `npm run supabase:check` validates project targeting, checks Auth settings and, when a database URL exists, executes only metadata SELECT queries inside a read-only transaction. It reports TLS, role privilege flags, public table names/RLS and ledger presence without printing credentials or personal data. It does not apply migrations or declare the application ready.

Connection rules follow [Supabase's PostgreSQL connection documentation](https://supabase.com/docs/guides/database/connecting-to-postgres): use the actual supplied direct/session/transaction endpoint; disable prepared statements for transaction pooling; require verified TLS. The check uses one connection and a ten-second connection timeout. Privileged role separation remains an explicit blocker.

Hosted Supabase is the selected authoritative development target. Compose's existing PostgreSQL 17 service is a separate local test option, not a local Supabase stack. Its existing named volumes are preserved. Local services now have an explicit profile; the Docker web service uses `.env.local` instead of overriding DATABASE_URL. No local database is automatically promoted to the hosted source of truth.

## Auth configuration versus implementation

The public settings endpoint reported email enabled, signup enabled and email confirmation required. Phone, all returned social-provider flags, anonymous sign-in, SAML and passkeys were disabled. A named SMS provider setting is not proof of configured delivery. MFA/manual-linking/SMTP/redirect/password-policy configuration is not established by these public flags.

Pinned packages: supabase-js 2.117.3, SSR 0.12.7. Prepared browser, request-scoped server, route and refresh utilities preserve cookie chunks and private cache headers. These are not connected to the active login/proxy yet. Existing password/Clerk code remains transitional until the replacement and identity continuity pass validation. No competing Supabase login has been activated.

## Exact next implementation stage

1. Confirm the actual hosted backup/retention or logical recovery process, privately record secure storage and a separate recovery target, and validate recoverability under the reviewed process. Synthetic and actual hosted scoped-data restoration have passed; encrypted artifacts remain private. Platform-wide and independent-device recovery remain unverified.
2. A is executed and verified. Obtain independent B/C decisions for the exact SQL, impact and validation in the final approval package. Recheck target metadata/role before each approved operation; preserve TestUsers and both baseline hashes. No permission to execute is implied by CONDITIONAL GO.
3. After separately approved B is applied, authenticate the new restricted runtime on the real target, verify grants/role flags/TLS and replace the runtime's private connection. Preserve the separate privileged migration profile.
4. Implement email/password/confirmation/recovery and atomic verified UUID-to-internal User provisioning. Test real two-account server ownership/capability enforcement before a coordinated single-provider cutover. Continue later approved features according to the active remediation plan.

Foundation completion remains blocked by the authenticated restricted runtime login/connection B, validated identity flows and downstream feature work. Reviewed Approval A tables/mapping/ledgers/NOLOGIN group are installed and verified. DATABASE_URL presence and authenticated PostgreSQL/Drizzle TLS connectivity are now confirmed; earlier missing-variable and certificate-chain blockers are resolved for the inspected processes. No shared-database migration approval is being requested before a tested, concrete package exists.
