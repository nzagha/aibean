# Supabase foundation: stage evidence and next milestone

Initial assessment: 8 October 2026. Updated 9 October 2026. Branch: `codex/supabase-foundation`. This is a repository foundation, verified connection and SSR-preparation increment. Supabase website authentication and the complete aiBean MVP are not implemented by this stage.

## Stage 1 completed work

- Verified local baseline and GitHub main both pointed to `31234704677df5e7f0252b30d996232a6602e726`; created a feature branch without rewriting history.
- Verified baseline [GitHub Validate run](https://github.com/nzagha/aibean/actions/runs/37814625875) succeeded for that exact commit.
- Patched Next.js 16.3.6 -> exact 16.3.8, added pinned JS/TypeScript/React Hooks lint tooling, and committed the dependency lockfile. Implementation commit: `9b8a96c`.
- Added CI lint, route type generation/typecheck, a runtime high/critical vulnerability gate and a job timeout, retaining tests/build. CI still uses Node 24 and read-only repository permissions.
- Removed unused imports and resolved lint findings around effect dependencies and parser-ref updates. Kept narrowly explained exceptions for intentional modal cleanup and control-character rejection. No brand, grid, typography or page composition changes.
- Created the Supabase architecture diagram, routes, provider/configuration matrix, identity/database migration plan, account-security/MFA specification, authorization/RLS matrix and dependency-aware remediation plan.
- Updated active README/scope/security/capability instructions and root AGENTS.md; preserved the generated Next.js guidance. Original October 7 audit, migration SQL/snapshots and version archives are unchanged.

## Validation evidence

| Check | Observed result | Limits |
|---|---|---|
| Existing tests after patch | 20 passed, 0 failed | Unit/DOM/PGlite tests; no Supabase provider tests |
| `npm run lint` | Passed, zero warnings | JS/TS/Hooks rules, not complete accessibility/Next-specific rules |
| `npm run typecheck` | `next typegen` + non-incremental tsc passed | Static validation only |
| `npm run build` | Next 16.3.8 production build passed | First sandbox attempt failed Windows path permissions; rerun with required access succeeded |
| Existing HTTP smoke script | 15 public content checks, 8 guest redirects, billing-unconfigured 503 and unknown-Tool handling passed | Local development fixtures on temporary port 3100; no authenticated/payment/browser journey |
| `npm audit --omit=dev --audit-level=high` | Zero runtime vulnerabilities reported | Registry scan at this time, not security certification |
| Full npm audit | Four moderate, zero high/critical package entries | Pre-existing Drizzle Kit/esbuild development chain remains |
| Audit/migration/archive diff | No changes | Does not prove cloud history or backup health |
| Baseline foundation branch CI | [Run 37852480152](https://github.com/nzagha/aibean/actions/runs/37852480152) succeeded for c231624 | The subsequent connection/SSR increment has separate validation below |

The temporary HTTP preview was stopped after the smoke checks. No credentials, hashes, tokens or personal records were included in this report. Pre-existing untracked installed skills (`.agents/` and `skills-lock.json`) were preserved outside the foundation commits.

## Configuration and live-state evidence

Local password settings remain and AIBEAN_AUTH_MODE selects password. The verified Supabase project URL and securely retrieved publishable key are now saved to ignored `.env.local`; Auth settings API connectivity passes. DATABASE_URL, Clerk keys, Stripe and Upstash credentials remain absent. Supabase JS 2.117.3 and SSR 0.12.7 are installed with exact pins. No sensitive values are included in the report.

The existing `supabase` registration was successfully queried through the local Codex app-server: correct project URL, database postgres, PostgreSQL 17.6. Eight non-system schemas were inventoried. All 14 aiBean tables and both application migration ledgers are absent. TestUsers has two rows and public-read permission; Auth users/identities have zero rows. Metadata, grants, policies and aggregate counts were inspected without record bodies. See [connection readiness](SUPABASE_CONNECTION_AND_ENVIRONMENT_READINESS.md) for the exact evidence and unresolved enforced-read-only MCP authorization.

Docker initially reported an unavailable Linux engine. A hidden Desktop startup was attempted; its subsequent engine probe did not complete and was cancelled. No container or volume was created/deleted. Existing PGlite tests apply both migrations only in an ephemeral in-memory database; isolated real PostgreSQL/Supabase migration and role tests remain unverified.

## Stage status

| Stage | Status |
|---|---|
| 1 Repository/audit refresh | Completed; baseline foundation CI verified |
| 2 Live database/identity | Read-only live metadata verified; application SQL configuration, isolated migration validation and reviewed installation pending |
| 3 Core Supabase Auth | Client/SSR utilities prepared; login, mapping and cutover not implemented |
| 4 Other approved methods | Requirements/platform research completed; none operational in aiBean |
| 5 Authorization/retirement | Target contract prepared; legacy code retained pending validated replacement |
| 6–9 Data/Admin/workflows/dashboards | Planned with dependencies; not delivered by this stage |

No cloud data, identity, settings, tables, grants or migration history were changed. No new migration was generated or applied. No provider or live billing was enabled.

## Connection and SSR preparation increment — 9 October

Work completed: pinned Supabase clients; added project/key validation, browser/server/route clients, verified-claims refresh helper and per-request cookie/cache-header preservation. Added `npm run supabase:check`, which uses read-only SQL transactions and redacted output. Prepared utilities are deliberately not called by active login/proxy until migration validation. The site, shared header/footer, typography, grids, existing interactions and preview login are unchanged.

Changed files: package.json/lock; `.env.example`; Docker Compose; `src/lib/supabase/{config,client,server,cookies,route,proxy}.ts`; `src/lib/db/connection-config.ts`; `scripts/check-supabase-readiness.ts`; `tests/supabase-foundation.test.ts`; README and active foundation/architecture/provider/migration/connection documents. Ignored environment changes contain only the operator's local configuration and are not published. No historical audit/version/archive or migration changes.

Validation: lint passed; all **23 tests passed**, including three new tests for project/key rejection, PostgreSQL target/TLS validation and cookie chunk/cache-header propagation across redirects and repeated writes. Type generation/typecheck and production build passed after granting the required Windows path access. Runtime npm audit reports **zero vulnerabilities**; four pre-existing moderate development findings remain. The live readiness command confirms Auth connectivity and correctly exits nonzero for missing DATABASE_URL. No end-to-end login, two-account isolation, new migration or Stripe test is claimed.

Security implications: TestUsers public-read exposure and broad default table grants require review before launch/schema installation. Client-visible configuration accepts only a publishable key; privileged secrets stay server-only. The prepared SQL checker validates TLS and refuses other project URLs; the production Drizzle role has not yet been configured or validated. No active capability behavior has changed.

Regression checks: 15 public content checks, eight guest redirects, unconfigured billing rejection and unknown-Tool/noindex behavior passed on a temporary port-3100 development preview; the preview was stopped afterward. Compose profile validation lists only `web` for the hosted app profile. A scan of changed/new files against configured sensitive environment values found zero matches. Historical audit, migration and archive diffs remain empty.

GitHub publication: implementation commit `dfe191b05efea6d453538e0f3b1bf36f97694c75` is pushed to `codex/supabase-foundation`. [Validate run 37938432162](https://github.com/nzagha/aibean/actions/runs/37938432162) completed successfully for that exact commit, including clean dependency installation, lint, typecheck, tests, build and runtime audit. This evidence is separate from the earlier baseline run. All active findings and historical audit files are tracked in the repository; private environment settings and locally installed agent skills remain excluded from the findings publication.

## Verified TLS and installation-review increment — 9 October

The private DATABASE_URL and owner-supplied CA now pass direct authentication, strict certificate/hostname verification and read-only Drizzle queries to postgres/public on PostgreSQL 17.6. Shared `DATABASE_CA_CERT_PATH` configuration is used by runtime, Drizzle Kit, readiness and operator scripts. Credentials and private CA paths are excluded from committed reports. The connected postgres role has BYPASSRLS; ordinary runtime credential provisioning remains pending.

Prepared `db/install/` SQL, manifests and offline generator for atomic 0000/0001 installation, additive private Auth UUID-to-User mapping, NOLOGIN restricted role, RLS and grants. Original migration contents/journal/snapshots remain unchanged. The generated package uses original Git LF checksums and rejects mismatched historical ledgers. `db:migrate` is gated; no hosted migration or permission change ran. TestUsers access hardening is a separate optional SQL proposal. Server capability helpers were extended without changing the active identity provider or UI.

Validation: 28 tests passed, including four new installation/upgrade/RLS/rollback/capability tests and a missing-CA failure test; lint, typecheck and production build passed; runtime audit reports zero vulnerabilities. Readiness SQL passed transport/hostname/ORM checks and deliberately returns a nonzero result for the privileged postgres role. Native Docker engine still times out. Full multi-session PostgreSQL, Auth integration and backup restoration remain unverified. See [the approval package](SUPABASE_DATABASE_INSTALLATION_APPROVAL.md) for exact target, files, data impact, privileges, tests, recovery and approval gates.

## Next stage after review

Verified TLS/role targeting, prepared mapping/security installation and native PostgreSQL continuity/concurrency/permissions/recovery tests have passed. The owner confirms Free/no backups; private storage, Windows encryption and an empty native recovery target are now prepared. The next gate is explicit scoped-export approval and actual local recovery of hosted data, followed by independent owner A/B/C decisions. Hosted execution is NO-GO until recovery passes. No hosted mutation or Auth activation has been authorized or executed. Enforced-read-only MCP URL authorization remains separate from the successful SELECT-only inspection.

The first operational milestone after those gates is verified email registration/login/recovery plus stable User mapping and two-account isolation, preserving existing account data and UI. It is not the entire MVP. See `MVP_REMEDIATION_PLAN.md` for acceptance of subsequent methods, capability cutover, Admin CRUD and the paid-claim workflow.

## Final PostgreSQL installation validation — 9 October

Docker Desktop processes are running but engine/status probes time out. A portable official-distributor PostgreSQL 17.11 alternative created three independent loopback-only clusters with verified temporary CA/hostname TLS and synthetic credentials/fixtures. All sixteen native scenarios passed: exact clean/repeat/historical installation, original hashes, eighteen FKs, late rollback, tampered/missing ledgers, concurrent installers with invisible uncommitted schema, advisory wait/timeout, independent browser/service/runtime logins, capability-column restrictions, identity constraints, competing Tool owners and separate TestUsers permission proposal.

Synthetic pg_dump/role backup restored into a fresh separate instance with matching effective database/schema/table/column grants, ownership, constraints/indexes/policies, memberships/flags, counts and both ledgers. The recovery test found and corrected omission of database-level grants by including --create. Explicit owner-only ACLs are compared to their equivalent restored defaults. Existing installation/migration/security manifest files remain unchanged. New B and read-only validation SQL are independent approval artifacts.

All 28 ordinary tests, lint, typecheck, production build and runtime dependency audit passed. The hosted read-only refresh still finds two TestUsers, zero Auth users and no aiBean tables/ledgers; operator CREATE/Auth REFERENCES permissions pass. Readiness is privilege-aware and tested with restricted native Drizzle sessions, so private counts are omitted rather than requiring forbidden grants. Actual managed recovery, custom runtime authentication, provider flows and multi-user application enforcement remain unverified. See [evidence](SUPABASE_POSTGRESQL_TEST_AND_RECOVERY_EVIDENCE.md) and [A/B/C decisions](SUPABASE_DATABASE_INSTALLATION_APPROVAL.md). Overall readiness is CONDITIONAL GO for staged owner review, with no hosted execution before secure recovery and explicit approval.

## Supabase Free backup preparation — 9 October

Owner confirms Free/no backups and explicitly selects a Windows encryption certificate. Latest verified-TLS read-only Drizzle refresh confirms the unchanged source: TestUsers two, Auth users zero, no aiBean tables/ledgers, sequence TestUsers_id_seq, five columns, two policies, broad browser/default grants. Original installation and migration hashes remain unchanged. No personal record bodies were read or exported.

Prepared an inspected non-OneDrive/non-repository NTFS root with protected owner/SYSTEM/Administrators ACLs and verified child/private-key ACLs; approximately 682 GiB free. Windows RSA-3072 certificate is separate in CurrentUser/My. AES-256-CBC CMS encryption/decryption preserves a synthetic custom archive SHA-256; synthetic ciphertext and plaintext bootstrap password were removed. Independent-device private-key recovery remains unverified. A new empty PostgreSQL 17.11 recovery instance passes loopback-only verified TLS/SCRAM and is stopped; its separate credential uses current-user DPAPI.

Added local preparation and read-only scope inspection scripts, sanitized evidence and [the Free recovery plan](SUPABASE_FREE_BACKUP_AND_RECOVERY_PLAN.md). A Windows Start-Process -Wait descendant wait initially blocked setup; the owned empty cluster was stopped and the helper corrected to bounded process-only WaitForExit, then preparation passed. No existing database was reinitialized. Actual backup and hosted-data restore are NOT EXECUTED, recovery is NO-GO, and A/B/C execution is BLOCKED pending the recovery gate and independent approvals. No auth, application UI, shared SQL package or hosted settings/data changed.

Current validation passes lint, typecheck, all 28 ordinary tests, production build and runtime dependency audit (zero findings). PowerShell preparation parses without errors and actual synthetic CMS/ACL/empty-target TLS checks pass. The read-only scope helper ran successfully against the approved source, including identity-column, ownership, membership and checksum metadata. The earlier sixteen native installation scenarios were not rerun because no SQL/package/runtime implementation changed. Historical audit/version archives and original migration/install sources remain untouched.

## Recovery gate follow-up — 9 October

Reviewed local/unpublished work: only pre-existing skills remain untracked; no actual hosted backup, archive/manifest or restoration evidence exists. Private backup storage is empty and export approval remains false. Operator-context certificate decryption/ACL checks pass without replacement; prepared local target is stopped and its CA remains valid. Fresh read-only Drizzle confirms both TestUsers rows by count, zero Auth users, absent ledgers and all fourteen aiBean tables individually absent. A/B/C and baseline hashes remain unchanged. Earlier preparation commit 682df26 has passing GitHub validation.

Extended the read-only scope inspector to check non-table public custom types/operators/collations/conversions/operator/text-search objects/triggers/rules/extensions; all counts zero. No record values were read, so personal-value equality is not claimed from count two alone. [Recovery gate and authorization wording](SUPABASE_RECOVERY_GATE_AND_AUTHORIZATIONS.md) provides the exact scoped-export checkpoint, independent conditional A/B/C wording, remaining blockers and post-install/Auth sequence. Actual export/restoration and A/B/C remain NOT EXECUTED/BLOCKED until separate approvals and recovery verification. No website/auth/schema/hosted setting change.

The local target was briefly started and verified through strict libpq TLS/SCRAM with transaction_read_only=on: PostgreSQL 17.11, public table count zero and TestUsers relation absent; it was stopped afterward. The expanded hosted scope query succeeds read-only. Lint/typecheck, all 28 tests, production build and runtime audit pass (zero runtime findings). Native installation scenarios were not unnecessarily repeated; original SQL/history and historical archives remain unchanged.

GitHub publication verified: recovery-gate commit `af34bf7988114fc08a72624496140d218511a798` is on `codex/supabase-foundation`; [Validate run 37997221262](https://github.com/nzagha/aibean/actions/runs/37997221262) completed successfully for that exact commit. All created/updated recovery findings and the read-only inspection helper are tracked and published. Private environment, certificate/key material, backup/recovery directories and pre-existing local skill installation files are excluded. Actual scoped export/restoration still await explicit owner authorization; this publication does not authorize A/B/C execution.
