# Admin Review v1 hosted installation readiness

**LOCAL READINESS: PASS. HOSTED INSTALLATION: NOT EXECUTED / NOT AUTHORIZED BY THIS TASK.** Prepared on 13 October 2026 from source `30a7e475898c9684d7a3de880565caa306f4dab3`, repository `nzagha/aibean`, branch `codex/supabase-foundation`. All database rehearsals used freshly created loopback-only native PostgreSQL 17.11 with synthetic records. Historical private recovery artifacts were outside the test paths and were not restarted, modified or removed. Website code, behavior and branding are unchanged.

## Exact package and mechanism

| Item | SHA-256 |
| --- | --- |
| Approved SQL `db/proposals/admin-review-v1.sql` | `5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca` |
| New mechanism `db/proposals/admin-review-v1-readiness/mechanism.json` | `96f727fde749cc8ab56a647b7f9ed3dc750fb73bc4864c603f3502fbef94030b` |
| Required successful recovery v3 manifest | `00943149054982c8b52f2ce6d38bae32c557960c37365ab447284010de8e7469` |

The new mechanism seals **34 exact dependency byte hashes**, including its executor, verifier, tests, catalog expectations, connection/crypto helpers, immutable SQL and recovery evidence. Target is only `yfknxidgphhepdtwazhn`, database `postgres`, direct operator `postgres` on the project's port-5432 hostname. The mechanism and SQL hashes are separate approvals: SQL fixes database impact; the mechanism fixes how it is executed and verified. Existing SQL, original migrations, installation packages, v1/v2/v3 recovery manifests and historical Approval A installer have not been edited. Added scoped Git attributes preserve dependency bytes across checkouts without rewriting historical content.

## Reviewed objects and permissions

| New relation | Runtime permissions | RLS |
| --- | --- | --- |
| `public.creator_applications` | SELECT, INSERT, UPDATE | `runtime_service`, trusted runtime only |
| `public.creator_capability_requests` | SELECT, INSERT | `runtime_service`; no runtime fulfillment/update/delete |
| `public.vendor_edit_requests` | SELECT, INSERT, UPDATE | `runtime_service`, trusted runtime only |
| `public.verification_requests` | SELECT, INSERT, UPDATE | `runtime_service`, trusted runtime only |
| `public.claim_disputes` | SELECT, INSERT, UPDATE | `runtime_service`, trusted runtime only |
| `aibean_private.admin_review_installations` | SELECT | `runtime_read_review_ledger`, SELECT only |

Catalog expectations independently inspected from native PostgreSQL contain **63 columns, 42 constraints (16 FKs), 11 indexes and six policies** across six RLS tables. This includes partial unique indexes for pending capability/edit/verification requests and open disputes; links/evidence/proposed JSON shape, valid statuses, reviewer/reason/timestamp requirements and paid-edit restrictions. The private ledger must contain exactly `admin-review-v1` with the independently computed SQL hash. The native reference was produced from the unchanged SQL, then cross-checked against Drizzle column/type/nullability and FK target contracts. The committed catalog expectation contains metadata only and is itself sealed.

PUBLIC, anon, authenticated and service_role receive no direct table or column rights on the new objects, including service_role with BYPASSRLS. No DELETE/TRUNCATE, role management, schema CREATE, Auth access or protected User-column grant is added to the runtime. Effective inherited permissions and column privileges are inspected, not inferred from visible GRANT statements. Existing User IDs/capabilities and ownership remain unchanged. The shared trusted Drizzle role is not a visitor JWT; server Admin/Creator/Tool-owner checks remain mandatory. Database capability-request creation does not activate a Creator or Admin.

## Dedicated execution and verification

- `scripts/admin-review-v1/execute.ts`: operator-only CLI. No arguments or `--inspect` performs offline checksum inspection only. Execution requires both exact SQL and mechanism hashes; unknown/mixed flags fail before dotenv/private setup. It is not wired to startup, CI, `db:migrate` or any application route.
- `scripts/admin-review-v1/operator.ts`: fixed protected transport. Reads the existing private Windows DPAPI operator connection through the reviewed bridge, validates exact project/hostname/port/database/username, valid CA, rejectUnauthorized and certificate hostname. Existing application connection remains the restricted runtime. No alternate target, test-mode environment bypass, password argument or provider configuration is accepted.
- `scripts/admin-review-v1/core.ts`: package-specific guards and transaction. Reserves one verified operator socket, checks identity/history/security/recovery continuity in a repeatable-read read-only transaction, confirms exact foundation inventory and absent proposal relations, sets `aibean.review_install_sha256` on that same socket, then sends the **unaltered SQL file** in one simple-query message. Its existing BEGIN/COMMIT, advisory lock, five-second lock timeout and sixty-second statement timeout apply. PostgreSQL stops processing subsequent statements after an error.
- `scripts/admin-review-v1/verify.ts`: independent read-only command. Opens three new sessions with distinct backend PIDs: operator structure/continuity, separate operator effective browser/service privileges, and actual restricted-runtime login. Reads actual catalogs, ledger and effective permissions; also performs runtime SELECT/LIMIT-0 probes. It does not trust the installer receipt. NOLOGIN hosted browser/service roles are inspected through effective named-role privileges in separate operator sessions; native fixtures additionally authenticate directly as those roles and prove actual query denial. Real JWT/Data API tests remain a later Auth milestone.
- `scripts/admin-review-v1/prepare.ts`: offline seal preparer. Requires passing native evidence with matching tested source hashes; it creates only the new mechanism manifest. It is not an installer and has no database transport.

Diagnostics expose only fixed stages, known SQLSTATEs, attempt/commit/rollback flags and bounded verification counts. Raw exceptions, SQL bodies, assertion values, private paths, passwords, environment values, records and private integrity digests are withheld. Failure/success evidence is a local sanitized JSON file. An existing execution result is a stop/review boundary rather than permission to overwrite or retry.

## Recovery, continuity and preflight

The actual encrypted v3 export/isolated restoration passed under Authorization 3; see [actual recovery result](SUPABASE_EXPANDED_RECOVERY_V3_EXECUTION_RESULT.md). That foundation recovery gate is sufficient to review this first installation, without authorizing it. The executor freshly checks original and v3 archive/metadata hashes and decryptability using the existing protected CMS certificate, exact v3 package/source/database, and original TestUsers protected integrity. It compares the current scoped foundation catalogs, every table's server-computed digest, aggregate counts, both sequence states, original two Drizzle entries and foundation security ledger against the encrypted recovery metadata. No application record bodies are returned by its continuity queries. Runtime flags/memberships/effective restrictions and zero Auth/application User/identity counts are checked. Scope drift fails before SQL.

Pre-install inventory must be exactly the recovered eighteen tables/two sequences and all six review objects absent. Postflight allows only those six additions, while the full baseline metadata/data/sequence/history remains equal. Managed relation ownership/ACL/RLS metadata is fingerprinted before/after; managed record bodies, credentials and function bodies are not selected. The reviewed SQL contains no managed-schema writes. This is not an exhaustive audit of unrelated provider settings or activity by other actors.

Required future operator prerequisites: the existing protected recovery root and installed PowerShell runtime supplied through `AIBEAN_BACKUP_ROOT` and `AIBEAN_BACKUP_POWERSHELL`, valid project CA via `DATABASE_CA_CERT_PATH`, existing restricted application `DATABASE_URL`, existing DPAPI operator credential and accessible original/v3 encrypted backups. Configure process bindings privately using the existing operator procedure; do not put their values in GitHub or reports. No credential/password or private deployment setting was created or replaced in this task. Their **fresh hosted/private availability remains a mandatory execution-time check**, not a claim from local synthetic testing.

## Native acceptance and failure behavior

**15 scenarios PASS in three newly created native PostgreSQL 17.11 instances**, all stopped after testing; synthetic artifacts retained. [Native evidence](evidence/admin-review-v1-native-readiness.json) records exact tested source hashes and catalog counts.

Verified: valid TLS and rejection of untrusted CA/wrong hostname; wrong hash/operator/database rejection; TestUsers/history drift rejection; refusal of preexisting objects; full structure/RLS/grants; actual browser/service read denial; runtime protected Admin/Creator/request/ledger/DDL denial; allowed ordinary provisioning/application/request writes inside a rolled-back synthetic transaction; no capability activation; unchanged baseline counts/data/history/security after success; refusal to reapply; and rejection of extra grants, disabled RLS, missing index or forged ledger.

The concurrency test runs two complete dedicated executors with independent sockets and a deterministic barrier. The frozen SQL advisory lock yields exactly one committed package/ledger; the competitor fails and its transaction rollback is verified against the unchanged foundation and fully validated competing installation. No second package application occurs.

A local event trigger raises a late error at private-ledger DDL after the public tables were created. The exact reviewed SQL is not edited for this injection. Same-socket ROLLBACK leaves every new object absent and all original data/history/security unchanged. A separate post-commit verification failure confirms the package stays installed and the mechanism reports `REVIEW_FORWARD_FIX_OR_RECOVERY`, without a rollback claim, reset or automatic repair. Connection-class/unknown errors are explicitly excluded from verified-rollback classification: an unacknowledged COMMIT remains an operator decision, never an automatic retry.

The installed structure depends on PostgreSQL catalog normalization. Hosted 17.6 versus tested local 17.11, source ICU versus local C locale and real hosted operator privileges remain conditional checks. The catalog verifier fails closed on differences; do not alter frozen SQL or broaden grants just to pass. V3 excludes managed-platform Auth secrets, role passwords and Storage bytes. Before feature writes or real identities, separately prepare expanded recovery coverage that includes these six additions. Installation does not activate review feature flags, Auth or paid workflows.

## Future commands and exact authorization

Offline inspection (safe now; opens no database connection):

```powershell
npx --no-install tsx scripts/admin-review-v1/execute.ts --inspect
```

Only after a **new explicit owner approval**, in the prepared private operator terminal:

```powershell
npx --no-install tsx scripts/admin-review-v1/execute.ts --execute-approved=5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca --mechanism-sha256=96f727fde749cc8ab56a647b7f9ed3dc750fb73bc4864c603f3502fbef94030b
```

Independent postflight after authorized installation (read-only, requires the same prepared private prerequisites):

```powershell
npx --no-install tsx scripts/admin-review-v1/verify.ts --verify-readonly --mechanism-sha256=96f727fde749cc8ab56a647b7f9ed3dc750fb73bc4864c603f3502fbef94030b
```

Separately reviewable authorization text, **not exercised in this preparation task**:

> I authorize one Admin Review v1 installation on aiBean Supabase development project `yfknxidgphhepdtwazhn`, database `postgres`, branch `codex/supabase-foundation`. Execute only unchanged SQL `db/proposals/admin-review-v1.sql`, SHA-256 `5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca`, through dedicated executor `scripts/admin-review-v1/execute.ts`, bound to mechanism `db/proposals/admin-review-v1-readiness/mechanism.json`, SHA-256 `96f727fde749cc8ab56a647b7f9ed3dc750fb73bc4864c603f3502fbef94030b` and all 34 exact dependencies. Before any write reverify branch/checksums, protected operator/project/database/strict trusted TLS, original foundation inventory/history/RLS/grants/restricted runtime, absent six proposal objects, zero Auth/application User/mapping counts, both TestUsers records against protected continuity evidence, and accessible intact/decryptable original and successful v3 encrypted backups. Bind the independent SQL hash on the same verified reserved operator socket and execute the existing bounded atomic transaction once with stop-on-error. Create only the five reviewed public tables and private ledger with their reviewed constraints/indexes/RLS/grants. Preserve all existing records, internal IDs/capabilities, histories, TestUsers, managed objects, original/v3 backups and both historical failed targets. Run the dedicated independent read-only verifier and continuity checks. On pre-commit failure verify rollback; on unknown commit state or post-commit discrepancy stop for reviewed forward-fix/recovery without reset, drop, repair or retry. Publish only sanitized evidence and stop before any next package. This does not authorize other migrations, A/B/C repetition, capability activation, seeds, Auth/accounts/mail, provider activation, feature flags, backup/export/restore, private configuration changes or deployment.

## Project checks and publication

Lint, TypeScript, all **126 automated tests**, native scenarios, default production build and zero-vulnerability runtime dependency audit pass locally. The first sandboxed route-type generation was blocked by Windows path canonicalization; the normal Windows invocation passed. Native testing identified that this pinned postgres.js reserved handle exposes queries/release but not begin() despite its declared type; the new mechanism now uses explicit read-only BEGIN/COMMIT/ROLLBACK on that reserved socket. This correction was revalidated natively; no historical installer or approved SQL was changed.

Fresh hosted Admin Review preflight/installation/postflight remain **unexecuted**. The real recovery v3 result is a verified dependency; local synthetic results are not relabeled as hosted installation evidence. Implementation commit `99298e96defdc340f7782c4f4b5a4bc6770f2fe8` is pushed to `codex/supabase-foundation`; [GitHub Validate 38409932853 PASS](https://github.com/nzagha/aibean/actions/runs/38409932853) passed lint, TypeScript, all 126 automated tests, default production build and runtime dependency audit. Native PostgreSQL scenarios are the separately recorded local suite, not a CI-hosted database installation. Only new reviewed tooling, metadata expectations, synthetic acceptance evidence and active status documentation are published; private native artifacts, credentials, profiles and backups are excluded.
