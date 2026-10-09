# Supabase connection and environment readiness

Updated 9 October 2026. Live inspection was performed during the 8–9 October work session. This report supersedes the connection blockers in the initial foundation assessment; `docs/audit/` remains a historical snapshot.

## Outcome

The existing project is reachable through authenticated MCP and the saved application publishable key. **The website's PostgreSQL connection and Supabase login are not yet operational.** No migration, seed, account creation, provider-setting change, grant change, or record modification was performed.

| Item | Verified evidence | Limit |
|---|---|---|
| Project reference | `yfknxidgphhepdtwazhn` | Owner designates this development; no disposable-environment assumption |
| Project URL | `get_project_url` returned `https://yfknxidgphhepdtwazhn.supabase.co` | Display name aiBean.io is owner-supplied, not independently verified |
| Database | `current_database()` returned `postgres` | MCP connection is separate from Drizzle |
| PostgreSQL | 17.6, aarch64 | Hosted server version, not local Docker version |
| Existing MCP alias | `supabase`, OAuth authenticated; 20 tools discovered | No duplicate `supabase-aibean-dev` registration created |
| Application Auth API | Saved publishable key accepted; `GET /auth/v1/settings` returned 200 | No user sign-in or email delivery tested |
| Public Data API | `HEAD /rest/v1/TestUsers?select=id&limit=0`, no user JWT, returned 206 and count 2 | No record bodies fetched |
| Application PostgreSQL | `DATABASE_URL` missing | SQL transport, runtime role, TLS and pooler remain unverified |

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

All 14 repository tables are **absent** from the inspected target:

`taxonomy`, `users`, `tools`, `saved_tools`, `stacks`, `stack_tools`, `tool_reviews`, `vendor_access`, `claim_requests`, `orders`, `billing_webhook_receipts`, `audit_logs`, `rate_limits`, `featured_placements`.

Consequently none of the repository's 16 application foreign keys is present. The existing one-owner-per-Tool constraint, review uniqueness/rating checks and featured-placement checks are source/test behavior, not deployed constraints.

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

1. Supply the official DATABASE_URL privately; verify TLS, project compatibility, role and pooling with the readiness command. Resolve runtime-role provisioning separately from the migration operator.
2. Recheck target metadata immediately before migration planning/application. Confirm backup/restore capability and preserve TestUsers. Establish an isolated PostgreSQL test target.
3. Generate an additive private Supabase UUID-to-internal text User mapping with unique UUID/internal ID, restrictive FKs and no email-only merging. Preserve all existing internal IDs and business relationships. No TestUsers-to-Auth import is implied.
4. Prepare a single reviewed installation of 0000/0001 plus additive mapping/RLS/grant hardening. Test empty installation, upgrade with representative historical ownership, concurrency, unauthorized roles and transaction failure. Restrict audit mutation and browser API access.
5. Present exact target, SQL/checksums, impact, lock expectations, test evidence and recovery plan for explicit owner approval. Do not apply while these gates are unresolved.
6. Implement email/password/confirmation/recovery and stable profile provisioning, then two-account isolation. Coordinate one active-auth cutover and retire Clerk/custom sessions only after real provider validation. Continue other approved methods, Admin CRUD and sandbox claim workflow in the order in the active plan.

Foundation completion remains blocked by direct PostgreSQL configuration, reviewed/applied migrations, validated identity flows and downstream feature work. No shared-database migration approval is being requested before a tested, concrete package exists.
