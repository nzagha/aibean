# Pricing v1 forward database proposal

12 October 2026 — **prepared and locally validated, not hosted-installed**. Exact SQL: `db/proposals/pricing-v1/reviewed-installation.sql`; SHA-256 **`80ad136519030266bbf03d7b6edab9a541d3548874f9c5f89a9b2a416821fcab`**. Adjacent migration/journal/manifest and `src/lib/db/pricing-schema.ts` define a separate proposal. Offline assembler: `scripts/prepare-pricing-proposal.ts`, no dotenv/network/database access. Package-local LF rules preserve executable hashes.

## New objects and impact

| Object | Purpose |
| --- | --- |
| `pricing_releases` | Validated version/config hash, proposed/reviewed/active/retired state, canonical author/reviewer, revision, reason, test price bindings and activation time. One active release. |
| `pricing_quotes` | Transaction/account/config FKs; pinned interval/plan, base/discount/payable cents and applied plan snapshot. No retrospective repricing. |
| `membership_bindings` | Existing commercial subscription and quote linkage, account/config/plan/price, paid invoice period and monotonic revision. No identity merge. |
| `membership_changes` | One open interval-change intent per binding, owner/config/price, idempotent schedule and future billing boundary. |
| `pricing_refunds` | One full-refund request per transaction, account/amount/reviewer/reason/revision and matched confirmed provider refund. Original transaction remains intact. |
| `aibean_private.pricing_installations` | Separate exact package/checksum history, RLS and runtime SELECT only. |

Five new public RLS tables, **15 FKs**, five secondary/partial indexes, primary/unique/check constraints and six policies including ledger. Runtime has SELECT/INSERT/UPDATE; no DELETE/TRUNCATE or ledger writes. PUBLIC/anon/authenticated/service_role direct table/column access denied. Trusted server enforces canonical capability/ownership because shared Drizzle sessions do not inherit visitor JWTs. No User flags, Auth objects, role/login, sequence or existing columns/constraints are changed. No seed, account creation or billing activation occurs from executing SQL. Admin activation may insert missing legacy product FK rows within its independently approved sandbox transaction; existing product/transaction history is not overwritten.

## Prerequisites and atomic execution

Independently verify project `yfknxidgphhepdtwazhn`, database `postgres`, privileged reviewed operator, intended development endpoint, trusted CA/hostname TLS, exact actual file digest, inventory/ledgers/effective grants and unchanged TestUsers. SQL checks postgres database/operator, safe NOLOGIN runtime, exact two baseline migration entries and all five previous package hashes; unexpected new objects/ledger stop installation. The checksum setting records an externally verified digest; it is not proof by itself. Five-second lock/sixty-second statement bounds and advisory serialization wrap one atomic transaction. A late failure rolls back all new objects; existing objects are never replaced/reset.

Dependencies are the unchanged `admin-review-v1`, `admin-operations-v2`, `creator-content-v1`, `creator-files-v1` and `discovery-v1` packages, with exact hashes recorded in the new manifest. They must be separately approved/installed first. Hosted A/B/C are not repeated. Original Drizzle files and ledgers remain unchanged.

The currently reviewed corrected 18-table/two-sequence recovery scope does not include the five prior proposed packages or pricing objects. Before eventual hosted installation, separately review/authorize current full application backup/isolated restoration, preserving original encrypted archives and the failed retained target. Include all then-installed application tables, new private ledgers and existing data. No hosted recovery execution occurred here.

After independently authorized installation: verify five RLS tables/15 FKs/indexes/constraints, denied effective browser/service grants, restricted runtime and private ledger writes, exact dependency/baseline histories, unchanged TestUsers/Auth/User continuity, then multi-account workflows and rollback/concurrency. Only afterward review separate commercial configuration/test-provider enablement. Precommit failure must roll back; a postcommit discrepancy requires an approved forward fix/recovery, not reset.

## Business/configuration approval is separate

[Recommended full model](AIBEAN_SUBSCRIPTION_PRICING_AND_ENTITLEMENTS.md). Installing these tables does not approve live prices or benefits. `AIBEAN_PRICING_WORKFLOWS` remains unconfigured; activation requires exact config digest owner authorization, audited Admin review and verified test price IDs. Native fake-provider tests prove contracts, not actual Stripe execution. Live billing remains prohibited.

Evidence: [native](evidence/pricing-v1-native-postgres.json), [HTTP](evidence/pricing-v1-http.json), [browser](evidence/pricing-v1-browser.json), [frozen hashes](evidence/pricing-v1-preservation.json), [validation](evidence/pricing-v1-validation.json). Native runs use new loopback PostgreSQL 17.11/SCRAM/trusted test CA and synthetic records only; clusters stopped and previous recovery artifacts preserved.
