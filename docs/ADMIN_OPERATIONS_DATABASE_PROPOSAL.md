# Admin operations database proposal v2

Status: forward-only custom Drizzle SQL proposal, validated in disposable PostgreSQL; not installed in hosted Supabase. No automatic migration runner or seed was enabled.

SQL: `db/proposals/admin-operations-v2/0000_admin_operations.sql`
SHA-256: `1d13ac175e967a2a9512f1ed1e0e2d6b5c34a3fa2c67692d9adcf70fef686d39`
Dependency: unchanged `admin-review-v1`, SHA-256 `5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca`.

The separate proposal journal and typed declarations in `src/lib/db/admin-commerce-schema.ts` preserve both applied baseline migrations and their original ledger. Installation records the exact reviewed SQL in a separate private package ledger. Do not run the default Drizzle migrator against this package or append a fabricated baseline entry.

Creates four RLS tables: billing_products, billing_transactions, tool_submissions and commerce_subscriptions, plus a private installation ledger. Eight new public foreign keys bind users, products and accepted draft Tools. Related request references are checked transactionally against the allowlisted request table and current owner; no arbitrary table identifier is accepted. No existing table, row, User capability, Auth setting, policy or grant is replaced. Prices start unconfigured; no invented prices or plans are seeded. Only verification can be zero-priced. Monthly Vendor/Creator plans cannot award roles, publishing, trust or organic rank.

Browser roles, service_role and PUBLIC receive no access. The restricted runtime gets SELECT/INSERT/UPDATE, no DELETE/TRUNCATE, on the four new tables; server capability and owner checks remain mandatory because pooled Drizzle does not inherit a visitor JWT. Installation gates check package hashes, RLS and effective browser table/column grants. Deliberate grant drift disables the workflow.

Local tests verify sandbox reconciliation, strict amount/currency/session/reference matching, live-mode rejection, idempotent receipts, cross-account denial, current Vendor ownership, Creator/Admin eligibility, paid editorial decisions, audit rollback, stale pricing decisions and concurrent checkout deduplication. Subscription webhooks retrieve the provider's current object to handle unordered delivery. A subscription event arriving before its reconciled checkout returns a retriable failure; receipts are not consumed prematurely. Expired checkout replacement, refunds, proration, quotas/discount entitlements and manual dispute settlement need their own approved workflow; they are not exposed as working controls.

Hosted review prerequisites: finish the separately authorized corrected recovery gate, refresh actual inventory/history and continuity, review recovery coverage for all proposed objects, verify privileged operator/TLS and exact checksums, and approve installation with validation/recovery impact. Neither `AIBEAN_REVIEW_WORKFLOWS` nor `AIBEAN_COMMERCE_WORKFLOWS` is enabled by this work. Actual sandbox provider/browser tests and canonical Admin/category readiness remain release gates. No real accounts or charges were created.

Independent proposed authorization (not yet requested or executed):

> I authorize installing only admin-operations-v2 SQL with SHA-256 `1d13ac175e967a2a9512f1ed1e0e2d6b5c34a3fa2c67692d9adcf70fef686d39` in Supabase development project `yfknxidgphhepdtwazhn`, database `postgres`, after verifying the exact unchanged admin-review-v1 prerequisite, fresh inventory/history, trusted TLS/operator identity, preserved records and approved expanded recovery coverage. Execute its bounded atomic transaction once; verify new table/column grants, RLS, eight foreign keys, private ledger, unchanged baseline histories and data. Stop on any discrepancy. This does not authorize Auth activation, capability grants, seeding, provider configuration, live billing or recovery exports.

After a committed issue, stop for a reviewed forward fix; never automatically drop/rebuild. This package does not change the frozen 18-table/two-sequence recovery executor or its scope.
