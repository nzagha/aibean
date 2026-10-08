# Database gap analysis

## Evidence boundary

**Schema code and migration SQL: inspected. Connected database: unavailable. Applied migration history: unknown.**

DATABASE_URL was absent from the inspected local configuration and inherited process environment. No connection was attempted with invented credentials. No migration, seed, grant, reset, deletion or database-altering command was executed.

PGlite tests create an isolated in-memory database and execute the two migration SQL files. They do not prove compatibility with a particular Supabase project, its permissions, default privileges, extensions, backups or existing data.

## Implemented table inventory

| Table | Purpose and constraints in source | Gaps |
|---|---|---|
| taxonomy | Text ID primary key, kind, name, slug, optional parent_id, JSON data | No parent FK, kind constraint or scoped slug uniqueness; limited typed relationships |
| users | Text ID, is_admin, is_creator, creation timestamp; flags default false | No profile, account lifecycle, provider mapping, organization or Creator application |
| tools | Unique slug, category FK, name, text status, typed JSONB payload, updated timestamp | One relational category only; many facts/relationships unenforced inside JSON; no created timestamp |
| saved_tools | Composite user/Tool primary key, user/Tool FKs, created timestamp | Tools only; policy for unavailable content and account deletion unresolved |
| stacks | ID, user owner FK, name | No type, visibility, position, public slug, notes or lifecycle timestamps |
| stack_tools | Composite Stack/Tool key; Stack cascade delete; Tool FK | No order, per-Tool notes/rationale or alternative relationships |
| tool_reviews | User/Tool FKs, one review per pair, rating check 1–5, body, text status, created timestamp | No reports, updated/reviewed metadata, independent moderation history |
| vendor_access | Tool primary key and user FK | Correct one-owner constraint; no organization, status/history, revocation/dispute metadata |
| claim_requests | User/Tool FKs, company, role, proof, text status, created timestamp | Missing structured proof type, organization relation, reviewer/timestamps and dispute/revocation lifecycle |
| orders | User FK, mandatory unique claim FK, amount, currency, text status, unique Stripe session | Cannot represent other order types; no generic payment attempts/refunds or commercial state history |
| billing_webhook_receipts | Unique provider event ID, received timestamp | Basic deduplication; no operational processing/retry/error metadata |
| audit_logs | Actor ID, action, entity ID, detail, timestamp | No verified append-only privilege controls; limited structured before/after/request metadata |
| rate_limits | Key primary key, count, window_start | Expired buckets accumulate without a retention job |
| featured_placements | User/Tool FKs, sponsor/note, review status, price/currency/duration, checkout attempt/session, payment/start/end timestamps | Editorial/payment information combined; expiry/cancellation/recovery, inventory controls and generalized orders missing |

### Placement constraints

The second migration checks:
- Status is one of pending_review, approved, rejected, active, suspended.
- Amount is null or positive.
- Duration is null or between 1 and 365 days.
- Active/suspended rows require payment/start/end, a positive time window, amount and duration.
- Stripe session is unique.

These are useful invariants. They do not enforce exactly five days at database level, prevent every direct insertion of overlapping placements, or model the whole refund/payment lifecycle. Application code currently supplies the $99/five-day policy.

## Migration history in source

| Migration | Snapshot table count | Evidence |
|---|---:|---|
| 0000_numerous_skullbuster.sql | 13 | Base tables, FKs, review constraints and uniqueness |
| 0001_hesitant_hardball.sql | 14 | Featured placements and checks/FKs |

The journal entries are indexed 0 and 1. Both SQL files and corresponding snapshots exist. Snapshot 0001.prevId matches snapshot 0000.id. Both SQL files execute successfully in the existing PGlite test.

This establishes source sequence consistency and a tested empty-database SQL path. It does not establish that Drizzle's migration runner has applied them to a live database or that the live schema matches the final snapshot.

Do not rewrite/squash either migration on the assumption that nothing was deployed. First verify actual targets and applied checksums. Prefer forward migrations unless a truly disposable environment is explicitly confirmed.

## Required MVP table families

| Family | Current state | Required direction |
|---|---|---|
| Identity/capabilities | Partial users and vendor_access | Profiles, stable identity/provider mapping, Creator applications/status, organizations and audited capability transitions |
| Taxonomy | Generic table + imported JSON | Stable IDs, parent integrity, kind-aware relations, v1.1 provenance and approved sub-verticals |
| AI Tools | Partial row + JSON | Multi-category/subcategory/use-case/vertical/sub-vertical relationships; fit/relevance; structured commercial/trust fields |
| Reviews | Rating/review table | Report records, moderation lifecycle, author/date projection, abuse controls |
| AI Skills | Missing | Authorship, instructions/prompts/examples, Tool/taxonomy relations, approved resources, moderation |
| Playbooks | Missing | Distinct objective, ordered steps, Tool/Skill/resource relations, time/difficulty and moderation |
| Creators/resources | Missing | Approved profiles, handles, Resource Pages/blocks, campaigns, owned assets and disclosures |
| Public Events | Missing | Organizer, format, location/timezone, times, approval/lifecycle, Tool/Skill/Playbook/taxonomy relationships |
| Saved content | Tools only | Saves for Skills, Playbooks and Events |
| Shared Stacks | Partial personal Stacks | Personal/Creator ownership and visibility, ordered membership, notes, publication policy |
| Compare sessions | Missing | Authenticated persistence and context, separate from browser convenience state |
| Follows/notifications | Missing | Owner/target integrity, delivery/read state, deduplicated product events |
| Vendor supply | Partial claims only | Paid submissions, proposed edits, verification requests, review/application history |
| Payments/subscriptions | Claim orders only | Configurable prices, generic orders/attempts/payments/refunds, plans, subscriptions, entitlements |
| Placements | Partial | Orders integration, schedule/expiry/recovery, inventory policy and operational history |
| Trust/ranking | Tool JSON + pure scorer | Evidence/logs, Last Checked/Verified integrity, contextual factors, score versions and snapshots |
| Analytics/links | Missing | analytics_events, tracked/affiliate links, outbound clicks, privacy-aware aggregates |
| Audit/operations | Basic audit/rate tables | Protected audit writes, useful indexes, retention, recovery/monitoring records |

Public events must use a different table/entity from analytics_events. The names are a product/domain distinction, not interchangeable event storage.

## Specific integrity recommendations

1. Keep a generic taxonomy table if it remains useful, but enforce parent/kind/slug relationships and valid typed Tool joins. A separate table for every taxonomy kind is not mandatory merely because the master plan lists families.
2. Normalize stable, queryable business relations. Avoid putting permissions, payment authorization or editorial truth only in JSON.
3. Add one-primary-category rules while permitting additional categories. Include fit_type and bounded relevance for industry associations.
4. Preserve the one-owner Tool constraint. Model revoke/dispute/history without accidentally permitting two active verified owners.
5. Keep User/Creator/Vendor capabilities additive. A boolean Creator flag can coexist with vendor_access; an exclusive role enum would regress the required model.
6. Add state checks and transition guards for Tools, claims, orders and reviews. Use affected-row or returning checks before recording successful mutations.
7. Add foreign-key/query indexes based on actual access patterns: owner/status queues, review Tool/status aggregation, Stack memberships, placement eligibility windows and audit chronology.
8. Separate order/payment state from content/claim review state. A refund is not an editorial decision; approval is not payment settlement.
9. Represent Last Verified with evidence and authorized transitions. Keep Last Checked and baseline verification separate from the aiBean Verified badge.
10. Define archival/deletion behavior before adding cascades. Preserve commercial/audit records where required; do not use blanket cascades as cleanup.
11. Define audit-log write privileges and retention. Free-form actor/entity text is useful for system actors but does not supply referential or tamper resistance on its own.
12. Apply runtime validation when reading transitional JSONB; a TypeScript generic is not validation of pre-existing database rows.

## Taxonomy v1.1 reconciliation

The workbook contains 25 category records, 18 vertical records and 40 use-case records; these sheets are unchanged from the imported v1 workbook. The importer derives 202 subcategories from category lists. Listing Types expands from 16 to 21.

New v1.1 sheets include Product Object Map, Relationship Map, Page Inventory, Creator Profile Modules, Smart Link Rules, Visibility & Permissions, MVP Scope and Schema Readiness. Several were authored before current scope locks. For example, older notes retain discussion/community concepts and defer payments. Use them for taxonomy/object relationships only where consistent with current scope.

Current problems:
- src/data/taxonomy.json identifies v1.
- scripts/import_taxonomy.py hard-codes sourceVersion to v1.
- Subcategory IDs derive from parent ID plus list position. Reordering a source list can silently change identity assignment.
- scripts/seed.ts uses onConflictDoNothing, so reruns do not refresh changed metadata.
- No approved dedicated sub-vertical records were found; do not invent official taxonomy data.

Acceptance for the update: report a deterministic diff, preserve stable IDs/relationships, explicitly map renamed items, record source version/hash, test repeated imports and keep excluded modules inactive.

## RLS, grants and credentials

Current code uses server-only Drizzle with postgres, not direct browser Supabase SDK access. No Supabase service key was observed as configured. DATABASE_URL remains server-side in the reviewed code.

Nevertheless, migration SQL targets public-schema tables and contains no RLS policies. A Supabase Data API exposure cannot be assessed without project metadata. Before deployment, either:
- Restrict API-exposed schemas/grants so application tables are backend-only, with least-privilege runtime access; or
- Implement and test correct grants/RLS for every exposed operation, including the actual identity integration.

Do not assume Clerk IDs automatically map to Supabase auth.uid(). Do not assume a service-role connection enforces per-user policies. Server-side ownership checks remain mandatory either way.

Reference: https://supabase.com/docs/guides/database/postgres/row-level-security

## Safe next database audit

After an approved isolated target is supplied, inspect tables, columns, constraints, indexes, migration ledger/checksums, roles/grants, RLS flags/policies and exposed API schemas using read-only queries. Record names and definitions, not user rows or secret connection strings. Verify backups and run a restore into a separate disposable target under explicit operational authorization. Never infer production state from the PGlite test.

