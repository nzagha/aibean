# Admin review database proposal — v1

Status: prepared and verified only with synthetic data in disposable PostgreSQL. Not authorized or executed against hosted Supabase.

Target for any later separately approved installation: development project `yfknxidgphhepdtwazhn`, database `postgres`, branch `codex/supabase-foundation`.

Reviewed SQL: `db/proposals/admin-review-v1.sql`

Current exact SHA-256: `5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca`.

The earlier unapproved draft in core commit e9843b0 had hash `b91caab17937c8db7b1d56b44b6c8a1d8262d8adecda995725d195e4e9acf935`. The current draft additionally checks original migration timestamps and all 14 baseline RLS tables. Neither draft was approved or installed on hosted Supabase. Use the current manifest/hash, not the historical draft.

## Impact

Create only:

| Object                                      | Purpose                                                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `public.creator_applications`               | One application per internal User, portfolio and review metadata                                                   |
| `public.creator_capability_requests`        | Immutable runtime-created request for independently authorized operator capability change                          |
| `public.vendor_edit_requests`               | One pending proposal per Tool, canonical base revision, allowlisted content, payment readiness and review metadata |
| `public.verification_requests`              | Evidence, canonical base revision, payment readiness and review metadata                                           |
| `public.claim_disputes`                     | One open dispute per Tool, original approved claim/owner snapshot and resolution metadata                          |
| `aibean_private.admin_review_installations` | Proposal ID, exact reviewed SQL hash and installation timestamp                                                    |

Definitions: `src/lib/db/admin-review-schema.ts`; service contracts: `src/lib/admin/`. The original schema/migration files and baseline ledgers are not regenerated or modified. This is a standalone forward proposal; existing `db:generate` remains aimed at the baseline. Do not treat these isolated-tested declarations as an already-applied hosted schema.

The transaction applies RLS and revokes PUBLIC, anon, authenticated and service_role privileges on every new public table before commit. The shared trusted `aibean_runtime` receives SELECT/INSERT/UPDATE on four review tables, SELECT/INSERT only on capability requests, and SELECT only on the private proposal ledger. No new schema CREATE, protected User-column, Auth, role-management, DELETE/TRUNCATE or elevated privileges are granted. Server capability/ownership checks remain mandatory: the shared Drizzle runtime does not represent a visitor JWT.

Edit requests always remain payment-required; approval cannot apply changes until a separate paid settlement integration is implemented. Verification accepts only payment-required or explicit server-created promotional-zero state; only the latter can presently be approved. No browser payload sets this state. Neither path awards aiBean Verified, organic ranking or capability access. No live checkout or price is invented.

Creator approval/suspension writes application decisions and capability requests. The runtime cannot set `users.is_creator` or `users.is_admin`. A future operator procedure must reject stale/superseded activation requests, check the current application state and be independently authorized; this SQL does not install an activation function or grant an Admin escalation path.

## Required pre-execution evidence

1. Fresh read-only project/database/operator identity, trusted TLS/hostname verification, installed baseline inventory/grants/RLS/history, two TestUsers continuity checks and Auth/mapping/application counts. Reconcile any changed state before approval; do not copy old evidence as a new verification.
2. A successful, preserved, verified encrypted recovery backup appropriate to the actual current data. The corrected expanded baseline package is still awaiting separate hosted execution authorization. Its frozen 18-table/two-sequence manifest is unchanged. Before installing new tables, review the restoration coverage and confirm recovery limitations; after installation, a newly reviewed expanded scope must include the five new tables and private ledger. Never silently expand the frozen package.
3. Independently verify this SQL's exact bytes and manifest against the approved hash. `db/proposals/.gitattributes` preserves canonical LF. Verify all proposal objects are absent; unexpected objects require review, not an automatic repair/drop.
4. Establish a bounded privileged operator session privately. Set the `aibean.review_install_sha256` session variable to the independently checked hash. This metadata does not itself prove the project or trusted TLS; those checks must be completed with the verified private operator connection before execution.
5. Obtain explicit owner approval for the exact SQL, impact and postflight/recovery plan. Nothing in current website/source-import authorization permits this hosted execution.

SQL preflight independently requires database `postgres`, both original Drizzle hashes and timestamps, the exact security ledger, all 14 baseline RLS tables, restricted NOLOGIN runtime group and no proposal objects. Lock and statement timeouts plus an advisory lock bound a single atomic BEGIN/COMMIT. Re-running into existing proposal objects intentionally fails; no destructive idempotent reset or automatic repair is available.

## Postflight and recovery

Verify all five new public tables, the private ledger with this exact hash, all constraints/partial unique indexes/FKs, RLS and effective table/column privileges. Independently connect as browser/service/runtime roles to verify denial; confirm runtime capability-request UPDATE/DELETE and protected User-column writes fail. Compare original table definitions/policies/ACLs/owners, exact baseline/security history and private identity mapping. Privately compare TestUsers/source continuity and confirm no Auth users or unrelated objects were changed.

After a failed transaction, verify rollback and original continuity. If an issue appears after commit, stop for a reviewed forward fix or recovery decision. Do not drop or rebuild the shared database. Only after postflight and owner release review configure `AIBEAN_REVIEW_WORKFLOWS=1` privately. A zero-price verification promotion is a separate explicit private configuration; leave it off by default. Auth/SMTP/provider fixtures/legacy cutover and payments remain independently gated.

Native PostgreSQL 17.11 and PGlite restricted-runtime validation passed; see [implementation result](ADMIN_CONTROL_PANEL_IMPLEMENTATION_RESULT.md) and [sanitized evidence](evidence/admin-control-panel-native-validation.json). Browser/provider and actual hosted proposal installation remain unverified.

## Future exact authorization wording

Use only after the preceding recovery and fresh read-only prerequisites pass:

> I authorize installation of the Admin review v1 forward package into Supabase development project yfknxidgphhepdtwazhn, database postgres, on codex/supabase-foundation. Execute only db/proposals/admin-review-v1.sql with SHA-256 5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca, after verifying trusted TLS, privileged operator identity, current baseline metadata/history/RLS/grants, TestUsers continuity and a verified recovery backup. Create only the five proposed public review tables and private installation ledger with the reviewed constraints, RLS and grants in the existing bounded atomic transaction. Preserve all existing data, baseline migrations/ledgers, identity mapping, TestUsers, Supabase-managed objects and Auth settings. Run the documented independent postflight checks. Stop on any discrepancy; verify rollback on pre-commit failure and do not reset or automatically recover after commit. This does not authorize capability grants, Auth activation, payment integration, private release flags or expansion/retry of any recovery scope.

This is prepared wording, not a request for execution now or evidence of owner approval.
