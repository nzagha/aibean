# aiBean — Full Codebase, Architecture, Database and Security Audit

**Snapshot: 7 October 2026. Prepared for independent AI review.**

This is the complete review document. Application code, migrations, configuration and services have not been changed. The owner requested this documentation package after the read-only audit; remediation remains proposed, not approved or executed.

**Recommendation: CONDITIONAL GO for incremental dashboard work after foundation fixes; no live billing or public multi-user launch until the relevant gates pass.**

## Contents

1. Current-state audit
2. Architecture review
3. Database gap analysis
4. Security and authentication review
5. MVP feature and route matrix
6. Dashboard readiness
7. Remediation backlog
8. Recommended build sequence
9. Evidence register and validation record
10. Proposed repository instructions
11. Independent AI review brief

All source paths are relative to the project root. D/E/F/A identifiers connect requirements, evidence, findings and tasks. Live database metadata was unavailable; source schema is not presented as deployed state. The source-code fingerprint manifest and individual report files are included in the ZIP package. Original reference documents and source code are not included.


---

<!-- Source report: CURRENT_STATE_AUDIT.md -->

# Current-state audit

**Product:** aiBean  
**Audit date:** 7 October 2026  
**Scope:** Existing Next.js application, source schema, migrations, requirements, security, feature coverage and dashboard readiness.  
**Method:** Read-only source/document inspection, configuration-presence checks, existing isolated tests, typecheck, build and local HTTP smoke checks.  
**Implementation authorization:** None granted by this report. The current follow-up authorizes audit-document creation only.

## Executive assessment

The existing application is a useful staged-MVP foundation. Retain its brand, layout, App Router architecture, Drizzle integration, components and working interactions. It is not a completed monetized MVP.

The strongest evidence supports discovery UI, filtering, comparison, exploration persistence, temporary authentication primitives and initial server-side permissions. Database-dependent workflows have code and isolated-test evidence but cannot be claimed operational against a connected database.

The current architecture can support the full MVP with incremental relational modeling, service boundaries, secure identity/permission work and operational verification. A rewrite or new design system is not justified by the evidence.

## Authority and document hierarchy

| Source | Status and use |
|---|---|
| Owner's direct decisions in this conversation | Controlling amendments: preserve brand/layout; staged MVP; paid featured placements; temporary password login; Playbooks explicitly included. |
| aiBean MVP Product Scope & Functional Specifications v1.1, 27 September 2026 | Reviewed 17-page PDF. Defines functional behavior. Its explicit exclusion of Playbooks conflicts with Master Plan v0.3 and is superseded for that point by the owner's confirmation. |
| aiBean MVP Development Master Plan v0.3, 30 September 2026 | Reviewed as the authoritative technical build plan. Playbooks, Skills, Events, monetization, approvals, capabilities and trust requirements are in scope. Two discovered copies have identical SHA-256 values. |
| aiBean Taxonomy Package v1.1 | Located and compared with v1. Categories, Verticals and Use Cases are unchanged; listing types and architecture sheets expanded. Older product notes are not permission to reactivate excluded modules. |
| Earlier PRD, BestURL specifications/ERDs and ranking documents | Historical references. Relevant sections and ERD text reviewed; not every paragraph of every older document was reviewed. They contain superseded discussion, mobile, authentication and payment assumptions. |
| Repository docs | Implementation notes, not proof of deployed behavior or independent product approval. Several are stale. |

### Confirmed product decisions

1. Preserve the approved brand, layout composition, grid and typography.
2. Deliver in stages; do not call an incomplete stage the full MVP.
3. Featured Tool placements are available to signed-in users, Creators and Vendors, with admin approval before publication.
4. The approved price is $99 for five days. The implementation uses USD; USD was an implementation assumption, not a separately recorded currency confirmation.
5. The implemented placement sequence is review, approval, checkout, verified payment, activation. The owner explicitly required approval before publishing; approval before charging is the current implementation choice.
6. Keep the requested single email/password account temporarily; additional providers are deferred to a later version. This is not authorization to use one shared identity for public multi-user access.
7. Playbooks are included. The owner explicitly resolved the Product Scope/Master Plan conflict during this audit.
8. Discussions, Replies, News, Courses, Social Videos, native mobile, native video hosting, direct messaging and Creator payouts remain excluded from the locked MVP.
9. Paid status never grants editorial approval, organic rank, positive reviews or verification.

## Repository and installed stack

The project uses Next.js App Router, TypeScript, Tailwind, React, Framer Motion, Clerk integration, Drizzle/Postgres and Stripe test integration.

Installed versions observed:
- Next.js: 16.3.6.
- React: 19.3.0.
- TypeScript: 5.9.3.
- Drizzle ORM: 0.45.3.
- Clerk Next.js: 7.9.11.

Other manifest dependencies include Stripe, postgres, Zod, server-only, Upstash Redis/ratelimit and Lucide. Development tools include tsx, PGlite, jsdom, Drizzle Kit, Prettier and Tailwind tooling. Manifest ranges are not the same thing as installed versions.

The directory is not a Git repository. Git status, branch and history checks therefore could not supply evidence. Version 1 and 1.1 source snapshots are documented under versions/. Those checkpoints do not establish a Git remote, CI execution, deployed state or database backup.

### Source organization

- src/app/: public pages, protected account areas, Server Actions and three API handlers.
- src/components/: shared branding, header/footer, cards, search/filter UI, previews, forms and providers.
- src/lib/catalog/: Tool types, imported taxonomy access, filters, logo rules and repository.
- src/lib/db/: server-only Postgres/Drizzle client and schema.
- src/lib/auth.ts and password modules: provider selection, session identity and capability checks.
- src/lib/featured/: placement plan, pure rules and public placement query.
- src/lib/billing.ts: test-only Stripe configuration/client.
- src/lib/ranking.ts: standalone weighted scorer.
- db/migrations/: two SQL migrations with journal and snapshots.
- tests/: 20 tests across catalog, database constraints, placement rules, password/session primitives and UI persistence/hydration.
- scripts/: taxonomy import, seed, admin bootstrap, password setup and HTTP smoke checks.
- docs/: staged product/technical notes.
- public/brand and public/tool-logos: local brand/font assets and example logos.

### TypeScript and framework conventions

TypeScript strict mode and noEmit are enabled; incremental compilation and skipLibCheck are configured. App Router pages use asynchronous request parameters where appropriate. The installed Next.js authentication and TypeScript guidance was consulted. Root AGENTS.md requires reading relevant installed Next.js documentation before coding.

next.config.ts disables development indicators and generated agent rules. There is no production CSP/header configuration in that file. Reading password-session cookies in the root layout makes the current build's routes dynamic; do not mistake this build output for a comprehensive caching design.

## Actual configuration observed

Only presence/absence was inspected; values are intentionally omitted.

| Capability | Observed state |
|---|---|
| Authentication mode | Temporary password mode |
| Temporary account email/hash/session secret | Present |
| DATABASE_URL | Absent |
| Clerk publishable/secret keys | Absent |
| Stripe secret/webhook/claim-price/featured-price settings | Absent |
| Upstash URL/token | Absent |
| Compose local Postgres password | Missing required value during validation |

This establishes that the current app cannot verify database saves, reviews, claims or purchases against a configured service. It does not prove that no unrelated database or cloud project exists elsewhere.

## Working behavior worth preserving

The current navigation matches the locked labels: AI Tools, AI Skills, Events, Creators, Submit, For Vendors and Login/Account. Public discovery supports keyword and structured filters. Invalid/future verification dates do not pass recency filters. General/suggested industry fit is excluded from native/strong industry discovery.

Compare supports two to four Tools and preserves a browser shortlist. Structured unknowns remain visible; no invented recommendation is shown. Preview interactions persist bounded, sanitized exploration data and support reduced motion. The header hydration regression test passes.

Temporary auth uses salted scrypt hashes and signed, expiring, HTTP-only sessions. Admin permissions and object ownership are checked on the server. The database schema enforces one vendor owner per Tool and one review per user/Tool. Stripe test code verifies signatures and separates confirmed payment from claim approval.

Demo Tools and demo placements are explicitly labeled. The newsletter says no email is stored or sent. Production with no database does not automatically claim the development fixtures are a real catalog.

## Validation summary

| Check | Observation | Limit |
|---|---|---|
| npm test | 20 passed, zero failed | Mostly pure/unit/DOM tests plus isolated PGlite constraints; not complete service integration |
| TypeScript, noEmit and incremental false | Passed | Does not prove runtime correctness |
| npm run build | Passed | Generated output changed; pre/post hashes found no non-generated file changes |
| HTTP smoke script | 15 public checks, eight guest redirects, unconfigured billing and unknown Tool handling passed | No authenticated multi-account or real payment journey |
| Migration metadata | Two sequential entries, SQL files present, linked snapshots of 13 then 14 tables | Live migration application unknown |
| Migration execution | Both SQL files execute in isolated in-memory PGlite | Not equivalent to Supabase PostgreSQL permissions/extensions/runtime |
| Docker Compose | Actual env failed on missing password; syntax passed with ephemeral dummy value | No image build, containers, networking or service health verified |
| Lint | Not run: no configured lint script/tooling | Adding lint is proposed |
| npm audit, final full scan | One high-severity package, four moderate development packages | Advisory applicability is configuration-dependent; not proof of exploitation |
| npm audit --omit=dev | One high-severity package finding for Next.js | Earlier clean-runtime statements are superseded |
| Git checks | Not a Git repository | No branches, commits, remotes or working-tree diff verified |

No dependencies were installed, migrations applied, data seeded, accounts granted, settings altered or deployments performed during the audit. Build outputs were the only generated app artifacts refreshed. Audit documents are being written now at the owner's request.

## Missing or unverified inputs

- Connected development/staging/production database metadata and applied migration records.
- Database roles, grants, exposed schemas, RLS, backup and restore evidence.
- Configured Clerk/provider tenant and Stripe sandbox/live configuration.
- Deployment target, TLS/proxy behavior, monitoring and runtime secret provisioning.
- Approved sub-vertical records: neither reviewed taxonomy workbook supplies a dedicated sub-vertical dataset.
- Real researched launch content and verification evidence.
- Full visual/mobile/accessibility browser QA.
- Signed business approval history beyond the documents and conversation available here.

## Documentation drift

docs/PRODUCT_SCOPE.md still refers to taxonomy v1. docs/SECURITY_BASELINE.md says protected actions authenticate from Clerk despite active password mode. docs/DATABASE_SCHEMA_DRAFT.md describes 13 current tables and treats placements as later even though the second migration adds them. Several vendor/billing/route notes predate later additions. Update these after review; do not use them to overrule actual source.


---

<!-- Source report: ARCHITECTURE_REVIEW.md -->

# Architecture review

## Recommendation

Continue with the existing Next.js/React/Tailwind/Drizzle application. The framework and component model can support the approved MVP. The necessary changes concern data relationships, security boundaries, workflow state and operational proof, rather than a frontend rewrite.

Keep current visual composition. A shared dashboard shell means reusing navigation, page chrome, forms, tables and permission/error states within that visual system.

## Current request/data paths

~~~~text
Browser
  -> App Router pages / Server Actions / API handlers
  -> auth.ts -> password session or Clerk -> database capabilities
  -> catalog repository / direct action queries -> server-only Drizzle
  -> PostgreSQL (not configured in the inspected environment)

Discovery:
  imported taxonomy JSON + demo fixtures when permitted
  -> filtering / cards / compare / previews

Payments:
  claim or placement action -> Stripe test Checkout
  -> signed webhook -> database payment/status transition
  -> separate admin approval where required

Browser convenience state:
  localStorage -> exploration / comparison / filter preferences
~~~~

Local browser state is not authoritative identity, permissions, editorial state, payment state or analytics.

## Findings register

Priority indicates sequencing or release gating, not CVSS severity. P0 can be a foundational blocker without an exploitable vulnerability.

### F01 — No source-control baseline
**P0 foundation; confirmed.** Git checks report that the directory is not a repository. Existing ZIP snapshots are not commit history. Before edits, establish a secret-free baseline and preserve version 1/1.1 archives. Evidence E01/E16. Task A01.

### F02 — Runtime database behavior cannot be established
**P0 foundation; confirmed configuration gap.** DATABASE_URL is absent. Source migrations are not evidence of deployed tables, grants or rows. Establish an isolated target and inspect actual metadata before migration planning. Evidence E04/E05/E13. Task A04.

### F03 — Temporary auth cannot use documented admin bootstrap
**P0 foundation; confirmed code mismatch.** Password identities begin password_; scripts/grant-admin.ts accepts only user_ Clerk IDs. Database connection alone does not resolve this. Add an explicit, audited, development-only operator path or an approved identity transition. Do not turn the shared test credential into a production admin identity. Evidence E06. Task A03.

### F04 — Core Tool relationships are under-modeled
**P0 before broader publishing; confirmed.** One relational category plus a JSONB Tool payload cannot enforce required multi-category, use-case, industry and sub-vertical relationships. Keep JSONB for suitable flexible attributes, but move ownership, relationships, trust and commercial invariants to enforceable structures. Evidence E05/E11. Task A04.

### F05 — Taxonomy source and importer lag v1.1
**P1 data integrity; confirmed.** The imported JSON is v1; importer provenance is hard-coded and generated subcategory IDs depend on list order. The seed script does not update existing taxonomy rows. Preserve stable identities and explicitly reconcile changed metadata. Evidence E11/D03. Task A04.

### F06 — Orders support claims only
**P0 before commercial expansion; confirmed.** orders.claim_id is mandatory and unique. Placements separately contain payment fields. Shared orders/payment attempts/refunds/entitlements are needed for submissions, edits, verification and subscriptions. Preserve editorial state separately. Evidence E05/E08/E09. Task A08.

### F07 — Checkout recovery crosses database/provider boundaries
**P0 before charging real money; confirmed design risk, not reproduced failure.** Placement checkout performs Stripe calls inside a database transaction; claim creation persists claim/order before remote checkout creation and later session recording. Row locks and provider idempotency help but do not create an atomic distributed transaction. Define durable attempts and reconciliation for timeouts, rollback, abandoned sessions and delayed webhooks. Evidence E08/E09. Task A08.

### F08 — Unpaid placement request can reserve a Tool indefinitely
**P1 before operational promotion; confirmed.** pending_review/approved requests block another open request for the Tool. There is no expiry/cancel transition for an unpaid approved request. Because any authenticated user may apply, one applicant can prevent another sponsor from proceeding. Keep the owner's broad eligibility decision; add expiration, cancellation and operational resolution. Evidence E08. Task A15.

### F09 — Catalog and detail queries are unbounded
**P1 before catalog growth; confirmed.** getTools loads all published Tools, all approved reviews and all vendor-access rows. Per-Tool processing repeatedly scans arrays. getTool loads that catalog and finds one slug. Implement SQL predicates, page limits, aggregate queries and necessary indexes. Evidence E10. Tasks A04/A05.

### F10 — Ranking exists as a function, not a product workflow
**P1; confirmed.** calculateToolScore is not integrated into catalog rendering or stored contextual rankings. UI honestly says not scored. Input derivation, evidence, version history, decay and context explanations remain missing. Evidence E12. Task A07.

### F11 — Trust fields lack a managed evidence lifecycle
**P1; confirmed.** The Tool type distinguishes verification status, separate verified badge and Last Verified, but no Last Checked/evidence/reverification service exists. Admins cannot currently perform a complete audited verification workflow. Evidence E05/E07/E12. Tasks A07/A11.

### F12 — Public and featured repositories can disagree
**P1 consistency; confirmed source difference.** Normal Tool reads derive rating/review counts and claimed status from relational records. Featured reads spread Tool.data without those same derived values. Preview content can therefore use stale denormalized facts. Share a canonical projection when normalizing the catalog. Evidence E10. Task A05.

### F13 — Dashboard and service boundaries are incomplete
**P1/P2; confirmed.** Admin forms, account queries and actions directly combine workflow logic and persistence. Shared forms and some service modules exist, but there is no common dashboard layout or complete centralized capability API. Incrementally extract tested services; avoid a speculative large framework. Evidence E06/E07/E14. Tasks A03/A05/A12.

### F14 — Operational observability and recovery are unverified
**P0 external-release gate; partly missing, partly unverified.** There is a generic error boundary and audit table, but no verified structured monitoring, payment reconciliation alerts, backup restoration or production deployment pipeline. Evidence E13/E17. Task A17.

### F15 — Authentication hardening is incomplete
**P0 external-release gate; confirmed preview limitations.** Process-wide login budget, stateless logout limitations, no recovery/verified multi-user lifecycle and body-size checking after buffering. Preserve the temporary mode while defining its boundary. Evidence E06. Tasks A03/A17.

### F16 — Supabase grants/RLS decision is unverified
**P0 before exposing database-backed services; confirmed absence of migration policies.** No client Supabase SDK was found, but public-schema SQL has no RLS policies. Actual exposure is unknown. Inspect grants and API schemas; do not infer protection from server-only imports. Evidence E05/E13. Task A04.

### F17 — Framework dependency advisories
**P0 first remediation batch; confirmed scan, conditional exploitability.** Next.js 16.3.6 is flagged by the final scan. Specific image SSRF conditions are absent from current configuration. Development-tool transitive advisories also exist. Patch and retest without a blind major downgrade. Evidence E15. Task A02.

### F18 — Test coverage is narrower than the product boundary
**P0/P1 validation gate; confirmed.** Existing tests protect pure rules, DOM interactions and database constraints. They do not prove signed webhook routes, cross-account actions, live provider sessions or browser/mobile behavior. Evidence E13. Tasks A02/A03/A06/A08/A17.

### F19 — Stored states and audit integrity are incomplete
**P1 data integrity; confirmed.** Most status columns are free text. Some admin mutations log a transition without checking that a target row actually changed. Audit records have no verified append-only database privilege policy. Tighten transitions, affected-row checks and operational privileges. Evidence E05/E07. Tasks A04/A05/A08.

### F20 — Missing content and commercial families
**P2 locked-MVP gaps; confirmed.** Skills, Playbooks, Creator resources, Events, follows, notifications, uploads and subscriptions are not complete implementations. Placeholder routes do not supply schema or workflow coverage. Evidence E05/E14. Tasks A11–A17.

## Existing design strengths

- Clear App Router and shared-component organization.
- server-only markers on sensitive data modules.
- Provider selection behind getIdentity/requireUser.
- Server-side user/admin checks rather than trusted client role fields.
- Tool-scoped vendor ownership, compatible with simultaneous User/Creator/Vendor capabilities.
- Explicit separation of sponsored presentation and organic scorer.
- Versioned migrations, pure validation/ranking/placement utilities and executable tests.
- Local fonts/assets, reusable card/logo components and honest demo labeling.

## Recommended incremental boundaries

| Boundary | Responsibility | Preserve / extend |
|---|---|---|
| Identity and permissions | Stable account identity, capabilities, ownership, audited grants/revocations | Existing auth helpers; add requireCreator and per-object authorization |
| Catalog | Validated reads, joins, search, publication quality, canonical projection | Existing Tool UI and filter semantics |
| Trust/ranking | Evidence, timestamps, scoring inputs, versions and explanations | Existing scorer and separate trust concepts |
| Engagement/Stacks | Owner-scoped saves, ordering, visibility, Creator/public variants | Existing Stack tables, extended deliberately |
| Billing | Products, price rules, orders, attempts, payments, entitlements, reconciliation | Stripe test adapter; remove claim-specific assumptions |
| Moderation | State transitions, reasons, review queues, immutable audit intent | Existing admin checks and audit events |
| Analytics/links | Durable privacy-aware events, deduplication, attribution, safe destinations | New service; localStorage is not a substitute |
| Uploads | Ownership, allowlists, limits, storage keys, access, scan/moderation | New service before accepting files |

## Performance and infrastructure

Redis/Upstash dependencies and a Compose Redis service exist but application code does not use them. Current mutation rate limits use atomic PostgreSQL counters. That is a defensible early choice, but retention and scale must be addressed; do not claim Redis protection is implemented.

Docker is development-oriented: floating Node/Postgres/Redis image tags, npm ci, source copy and next dev. It is not a demonstrated production image. The current web container is localhost-published but runs as the image default user. Production multi-stage/non-root construction, separate credentials, health checks and deployment verification belong to the release work.

No full architecture replacement, microservices, Kubernetes or dedicated search engine is justified for this stage. Start with indexed PostgreSQL search and measured query improvements.


---

<!-- Source report: DATABASE_GAP_ANALYSIS.md -->

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


---

<!-- Source report: SECURITY_AND_AUTH_REVIEW.md -->

# Security and authentication review

## Conclusion and limits

The implementation has useful foundational controls. It is not security-certified or ready for public multi-user commerce. No demonstrated IDOR or privilege escalation was found in the reviewed owner-scoped paths; the absence of full multi-account tests prevents a stronger conclusion.

Findings distinguish:
- Confirmed source behavior.
- Reproduced isolated-test behavior.
- Configuration-dependent risk.
- Missing functionality.
- Unverified deployment controls.

P0 refers to sequencing/release gates. It does not mean every P0 is a critical exploitable vulnerability.

## Authentication and session matrix

| Area | Observed implementation | Assessment |
|---|---|---|
| Provider selection | Password mode ignores Clerk; otherwise configured Clerk is used | Clear temporary switch; transition/account linking is undefined |
| Password storage | Salted scrypt; randomized salts; timing-safe comparison | Good primitive tests; not a full identity product |
| Password policy | 8–128 characters, uppercase ASCII, digit, special non-space character | Matches implemented interpretation of owner's requirement; no added lowercase requirement |
| Session | HMAC-signed subject/expiry/nonce, eight-hour limit, bound to password hash | Forgery/expiration/rotation tests pass |
| Cookie | HttpOnly, SameSite=Lax, Secure when request protocol is HTTPS | Deployment proxy/TLS behavior needs verification |
| Logout | Clears cookie | Previously copied valid token remains valid until expiry or credential/secret rotation |
| Login/logout CSRF | Origin checked against allowed request/app origins | Useful control; deployment behavior and integration attack tests unverified |
| Login attempts | One process-wide 10-attempt/15-minute budget | Global lockout/availability risk; restart and multiple instances weaken durable enforcement |
| Body limit | Login buffers text before testing length >4096 | Not a streaming byte-limit defense |
| Google/Apple/Email via Clerk | Components and conditional integration; keys absent | Provider configuration and sessions unverified; deferred by owner for current version |
| Recovery/email verification | No temporary account recovery/verification workflow | Required before public identity release |
| Admin bootstrap | Only accepts Clerk user_ IDs | Incompatible with active password_ identity |
| User sync | Inserts user ID lazily on protected DB-backed access | No profile/deletion/provider synchronization |
| Identity continuity | Password ID derived from email; Clerk uses separate ID | Plan linking/migration before changing providers |

No plaintext credential, hash value, signing secret or session token is reproduced in this package.

## Authorization assessment

Existing controls:
- requireUser resolves session identity server-side.
- requireAdmin checks the stored isAdmin flag.
- requireVendor loads vendor_access rows by current user.
- Save removal includes the authenticated user's ID.
- Stack insertion first checks Stack ownership.
- Reviews use authenticated IDs, validated values and unique user/Tool constraints.
- Current Tool owners cannot submit a review of their own Tool.
- Admin moderation uses server-side authentication and writes audit records.
- Featured checkout queries by placement ID AND signed-in user ID.
- Claim approval requires paid order plus pending-review state and unique Tool ownership.

Limits:
- requireVendor returning an empty list is an empty workspace state, not authorization to mutate every Tool. Future mutations need explicit per-Tool checks.
- requireCreator and per-content ownership helpers are not complete.
- Creator flag transitions, suspension and ownership lifecycle are absent.
- No integrated two-account/forged-form tests establish the complete boundary.
- Historical reviews after ownership changes need an explicit policy.
- Server Actions are server endpoints, not trusted merely because buttons are hidden.

## Input, output, CSRF and URLs

Zod validates names, slugs, rating ranges, review/claim text and URLs. React renders plain text; no arbitrary rich-text HTML editor was found. Safe return paths reject absolute, protocol-relative, backslash and control-character forms.

The current website URL validator permits HTTP/HTTPS without credentials. It does not prove a URL is public or safe for server-side fetching. Existing code primarily renders links. Before adding previews, imports, tracked redirects or file retrieval, define private-network protections, destination ownership/moderation and safe fallback rules. Do not label a missing future fetch policy as a demonstrated current SSRF endpoint.

Next.js Server Actions retain framework origin/host protections. Login/logout have explicit Origin checks. Stripe webhooks appropriately use signatures rather than browser CSRF tokens. Deployment-level and cross-origin tests remain necessary.

CSP and production security headers are not configured in the inspected next.config.ts. Plan compatibility with Clerk, images/fonts and any approved external embeds before enabling them.

## Payments and sponsored integrity

Good controls:
- Only test Stripe keys are accepted.
- Server chooses claim prices and validates the fixed featured Price.
- Featured purchase is exactly 9900 USD minor units and five days in current code.
- Signature verification uses the raw webhook body.
- Live-mode events are rejected by the test implementation.
- Paid status, amount/currency and order/placement identity are reconciled.
- Webhook event receipts are unique and transactionally inserted.
- Browser return pages never grant ownership or activate advertisements.
- Claim payment leads to pending review; admin approval grants ownership separately.
- Featured placement payment activates only an approved placement.
- Repeated paid events do not extend a paid placement's dates.
- Paid placements require a published non-demo Tool and are labeled Sponsored.
- Organic scoring deliberately excludes commercial fields.

Risks/gaps:
- Generic payment, refund, dispute, failed/canceled/expired states and subscriptions are incomplete.
- Remote Stripe calls within a database lock can lengthen contention and complicate recovery.
- Claim checkout failures can leave pending orders without a usable session.
- Placement approval/request expiration and sponsor cancellation are absent.
- Operational reconciliation, retry alerts and payment-resolution tooling are absent.
- Pure payment-matching tests do not verify the actual signed webhook handler against PostgreSQL.
- No real Stripe sandbox journey was run because settings are absent.
- USD and inventory policy should be explicitly confirmed before live commercial launch; do not alter the agreed $99/five-day offer without approval.

Required tests: duplicate events, separate success events for one session, invalid signatures, amount/currency mismatch, wrong user/order/placement, concurrent claims, provider timeout, rollback after provider success, delayed webhook, archived Tool after checkout, expiration, refund/dispute and negative entitlement cases.

Reference for delivery/signature/retry behavior: https://docs.stripe.com/webhooks

## Dependency findings — final scan

The final npm audit result supersedes the earlier scan during the same audit.

| Package group | Final finding | Applicability |
|---|---|---|
| next 16.3.6 | One package reported high, containing multiple advisories | Audit identifies affected ranges below 16.3.8. Patch through a tested update. No exploit was attempted. |
| drizzle-kit -> @esbuild-kit/esm-loader -> @esbuild-kit/core-utils -> esbuild | Four moderate package entries in a transitive development chain | Not four unrelated production vulnerabilities. Triage compatible upgrade path rather than accepting a suggested major downgrade. |

Reported Next.js advisory identifiers:
- GHSA-3w37-wq28-93x7 — pending use-cache fill / Draft Mode content leakage.
- GHSA-4jqv-mc3x-m676 — self-hosted SSG/ISR cache poisoning.
- GHSA-39w2-rjm5-chcv — development MCP endpoint information disclosure.
- GHSA-f87g-xv8r-7p7x — metadata image route dynamicParams bypass.
- GHSA-mcj8-r9mp-w47p — SSG/ISR cross-user substitution/denial of service.
- GHSA-cjq9-62q9-8jv4 — image optimization SSRF.

The highest-severity image advisory requires attacker-controlled allowed remote images. Current next.config.ts has no images.remotePatterns. The upstream advisory says apps without that configuration are not affected by this specific issue. That narrows applicability; it does not erase other advisories.

The current build reports all routes dynamic. No use-cache/Draft Mode or dynamic metadata-image feature was identified in the inspected app. These observations reduce some known conditions but are not a complete exploitability study.

The npm advisory data identifies 16.3.8 as outside its affected ranges; the viewed upstream page displayed an incomplete patched-version placeholder. Recheck current official advisory/release metadata when executing A02 rather than relying forever on this audit snapshot.

Sources:
- https://github.com/vercel/next.js/security/advisories/GHSA-cjq9-62q9-8jv4
- https://github.com/vercel/next.js/security/advisories/GHSA-39w2-rjm5-chcv
- https://github.com/vercel/next.js/security/advisories/GHSA-4jqv-mc3x-m676
- https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99

## Database and secret boundaries

server-only modules hold database, auth and Stripe configuration. .gitignore and .dockerignore exclude environment files. The audit inspected presence flags, not values. This is not proof of historical secret hygiene because Git history is unavailable.

RLS policies are absent from migrations. Actual Supabase API exposure, runtime database privileges and service credentials cannot be verified without a connected project. Do not claim an active public leak; treat configuration as a required gate.

Audit logs exist but are not demonstrated append-only under database permissions. Most statuses remain unconstrained text outside the placement checks. Mutation counters use durable database writes but lack cleanup. Search/compare anonymous rate controls and Redis integration are absent.

## Uploads, analytics and privacy

No upload endpoint/service exists. There is therefore no implemented upload pipeline to certify. Before accepting resources, require MIME/extension/signature checks, size limits, server-generated keys, owner access, non-executable storage, moderation and scanning where feasible.

No durable analytics/tracked-link system exists. Exploration localStorage is browser convenience state. Future analytics must minimize raw personal data, deduplicate spam, respect retention rules and keep private Stack/resource access protected.

## Infrastructure and observability

Compose binds database/Redis to localhost and requires a database password. The checked-in Dockerfile runs next dev and is a development configuration, not a verified production deployment. The syntax check used an ephemeral dummy password only; no services were started.

The CI workflow declares npm ci, npm test and npm run build, with read-only contents permission. No lint/advisory checks are configured and there is no verified repository/remote execution. Operational monitoring, health checks, structured redacted logging, payment alerts, backups and restore are missing or unverified.

## Security gates before external multi-user alpha

- Patched dependencies and documented residual advisory applicability.
- Individual identities, provider verification/recovery and protected admin access.
- Explicit development-only boundary for the shared password test account.
- Tested grants/RLS/exposure and least-privilege database access.
- Cross-account and per-Tool authorization tests.
- Payment/webhook recovery and reconciliation tests.
- Safe upload/tracked-link services before enabling those features.
- CSP/TLS/proxy/session behavior verified in the actual hosting environment.
- Redacted operational logging, alerting and a demonstrated database restore.


---

<!-- Source report: MVP_FEATURE_MATRIX.md -->

# MVP feature and route matrix

## Classification

- **Implemented and verified:** a bounded behavior has direct test/HTTP evidence.
- **Implemented but untested:** source exists but its runtime path lacks relevant execution evidence.
- **Partially implemented:** meaningful code exists; required behavior remains incomplete.
- **UI-only/placeholder:** a visible route or message exists without the complete domain workflow.
- **Missing:** no substantive implementation located.
- **Blocked by dependency:** runtime verification or use requires unconfigured services.

A module can be partial and blocked simultaneously. No completion percentage is assigned because scope and verification are not interchangeable.

## Feature coverage

| Module | Status | Actual evidence | Remaining acceptance |
|---|---|---|---|
| Brand/header/footer | Implemented and verified within build/HTTP scope | Shared components/local assets, required navigation, hydration regression | Visual/mobile/browser/accessibility QA; preserve design |
| Homepage | Partially implemented | Hero, discovery sections, featured Tools, newsletter, module previews | Real approved content across active modules; no invented social proof |
| Exploration previews | Implemented and verified by tests | Bounded localStorage, 20%-to-100% exploration, in-context previews, reduced motion | Real browser focus/modal/mobile checks |
| Tool logos | Implemented but full browser/provider behavior untested | Local demo logos; configured HTTPS/local sources; fallback component | Approved real catalog assets and failed-image behavior |
| Tool directory/detail | Partially implemented | Public pages, structured facts, actions, demo labels, empty states | Real content, richer facts/company/relationships, paginated SQL queries |
| Categories/subcategories | Partially implemented | 25 categories/202 derived children, dependent selection/filtering | v1.1 provenance, stable IDs, integrity; dedicated subcategory route |
| Industries/use cases | Partially implemented | 18 verticals, 40 imported use cases, native/strong fit filtering | Approved sub-verticals, related Skills/Creators/Events and contextual ranking |
| Scoped search | Partially implemented | Five scopes offered; Tools redirect to functional search | Real scoped results/filters for Skills, Playbooks, Creators, Events |
| Ranking | Partially implemented | Weighted scorer, commercial-exclusion test | Input collection, context factors, persisted versions, explanations and visible ranks |
| Verification | Partially implemented | Distinct baseline status/badge/claimed/Last Verified fields and filters | Evidence, Last Checked, review workflow, authorized timestamp changes, recency jobs |
| Ratings/reviews | Partially implemented; blocked by DB | Authenticated action, uniqueness/range checks, admin moderation | Reports, author/date UI, multi-account service tests, abuse policy |
| Saved Tools | Partially implemented; blocked by DB | Owner-scoped action/read, unique pair | End-to-end persistence/removal and unavailable Tool policy |
| Personal Stacks | Partially implemented; blocked by DB | Create Stack/add Tool, owner query | Rename/remove/order/notes/visibility; cross-account tests |
| Compare | Partially implemented | 2–4 cap, deduplication, table, browser shortlist | Context selector, supported verdict, account session persistence |
| Temporary password login | Partially implemented as identity product | Salt/session/policy tests; local configuration; guest redirects | Full route/browser testing in this audit, durable throttling, recovery/identity lifecycle |
| Clerk and social providers | Blocked by dependency | Conditional integration/proxy/provider UI | Tenant setup, Google/Apple/Email verification and production sessions; intentionally deferred now |
| User Control Panel | Partially implemented; blocked by DB | Account route, saved Tools/Stacks/reviews/claims UI | Multi-content saves, settings, follows, notifications, billing |
| Vendor Control Panel | Partially implemented; blocked by DB | Per-Tool ownership list | Analytics, submission/edit/verification/promotions/billing/history |
| Creator Control Panel | UI-only/placeholder | Protected page and capability message | Application/approval, profile, content editors, assets, analytics/billing |
| Admin Control Panel | Partially implemented; blocked by DB/admin bootstrap | Draft create/publish/archive, review/claim/placement moderation, recent audits | Tool editing, taxonomy, trust controls, filtered queues, payments/subscriptions and broader content |
| AI Skills | UI-only/placeholder | Landing page/search option | Structured schema/editor, resources, moderation, relationships, discovery, saves |
| Playbooks | UI-only/placeholder | Landing page/search option; owner confirmed in scope | Ordered workflow schema/editor, Tools/Skills/resources, moderation and free discovery |
| Creator public profiles | Missing | /creators index is a preview only | /@handle contract, approved profile, public Stacks, Skills/Playbooks/resources/social links |
| Creator Resource Pages | Missing | Specification only | /@handle/resource contract, campaign blocks, resources, disclosures and attribution |
| Public Events | UI-only/placeholder | /events landing preview | Organizer/format/timezone/location, submission/approval, lifecycle, external registration |
| Paid Tool submission | UI-only/placeholder; blocked | Eligibility message for Admin/Creator/Vendor | Authorized draft, order/payment, admin review, publication |
| Paid Claim | Partially implemented; blocked | Claim/order checkout source, signed webhook and separate review | Service setup, recovery, disputes/revocation, simultaneous claims tests |
| Paid edits | Missing | Contract only | Owner-scoped proposals, fee, review/apply/history |
| Paid verification | Missing | Contract only | Fee/promo-zero path, evidence and review; payment must not confer trust |
| Featured Tool placements | Partially implemented; blocked | $99/five days, request/review/test checkout/window, labels | Connected journey, cancellation/expiry, recovery/refunds, operational inventory |
| Other sponsorship/event promotion | Missing | Requirements only | Defined inventory, labeled placement, commercial approval and attribution |
| Pricing | UI-only/placeholder with verified guest gate | Protected /pricing route | Configurable eligible fees/plans and entitlement display |
| Subscriptions/entitlements | Missing | No dedicated schema/workflow | Vendor/Creator plans, lifecycle reconciliation, management and quotas |
| Follows/in-app notifications | Missing | No schema/services | Authorized follows, deduplicated updates, delivery/read state |
| Analytics/tracked links/affiliate | Missing | No durable events/link services | Private attribution, safe destinations, bot/deduplication, creator/vendor reports |
| Resource uploads | Missing | No storage/API pipeline | File validation, owner access, scanning/moderation and safe delivery |
| Newsletter | UI-only/placeholder | Explicit preview form, validation only | Service hookup if prioritized; no false signup success |
| Production operations | Partially implemented | Development Docker, CI file, error boundary, audit table | Deployment, monitoring, restore, secrets, provider and security validation |

## Current route coverage

### Functional public surfaces, subject to demo/service limitations

/, /tools, /tools/[slug], /categories/[slug], /industries, /industries/[slug], /use-cases/[slug], /compare, /search, /submit, /for-vendors, /featured.

Search is functional for Tools only. /submit is an entry surface, not a completed submission workflow. /featured displays the offer; it does not establish that checkout is configured.

### Public module placeholders

/skills, /playbooks, /events, /creators.

### Auth and protected surfaces

/login and /register show the selected auth mode. Public registration and other providers are disabled in temporary password mode.

/account, /admin, /vendor, /creator, /pricing, /submit/tool, /claim/[slug], /featured/manage require identity. Database-dependent surfaces additionally require configured storage; without it they redirect or show a setup status. /creator currently has no publishing actions to approve.

### API handlers

- POST /api/auth/login — password-mode login and cookie issuance.
- POST /api/auth/logout — origin-checked cookie removal.
- POST /api/billing/webhook — signed Stripe test events; returns 503 when unconfigured.

There is no implemented upload, tracked-redirect, notification or Creator publishing API.

### Compatibility routes

/explore redirects to Tools; /knowledge to Skills; /collections to Playbooks. These are compatibility redirects, not additional completed modules.

### Required route families not implemented

- /skills/[slug], /playbooks/[slug], /events/[slug].
- Public /@creator-handle and /@creator-handle/resource-slug.
- /subcategories/[slug] and /industries/[industry]/[sub-vertical].
- /vendor/edit-request/[slug] and /vendor/verification/[slug].
- Detailed /account/*, /creator/* and /vendor/* management areas.
- Specialized /admin/* operations beyond the single current admin page.
- Tracked-link/resource-delivery endpoints as determined by the approved routing contract.

A consolidated initial dashboard can satisfy some workflow requirements without copying every suggested folder immediately. Public URL contracts and complete permission boundaries still matter.

## Scope reconciliation rules for reviewers

- Playbooks are now explicitly confirmed in scope by the owner.
- Do not revive Discussions/Replies based on older taxonomy/PRD notes.
- Do not mark the temporary password-only choice as an unauthorized regression; it was requested. Its public multi-user limitations remain.
- Do not treat the public $99 placement teaser as proof the entire gated pricing requirement was violated. The owner requested monetized featured placement; full pricing remains login-gated.
- Do not confuse local exploration progress or comparison persistence with durable account saves, analytics or permission state.
- Do not treat visible example cards as paid customers; the UI labels them fictional.


---

<!-- Source report: DASHBOARD_READINESS.md -->

# Dashboard readiness

## Decision

**Build the Admin foundation next, after repository, dependency, identity and database prerequisites.**

The existing User dashboard has reusable work. Vendor and Creator areas depend on data and moderation systems that are not complete. A visual dashboard shell alone would not satisfy those dependencies.

## Readiness comparison

| Dashboard | Already exists | Missing dependencies | Safe next increment |
|---|---|---|---|
| Admin | requireAdmin, Tool draft creation/publication/archive, reviews, paid-claim review, placement review and 25 recent audit rows | Working admin identity; connected DB; full Tool/taxonomy editing; reliable transitions; trust evidence; searchable queues; commercial recovery | Extend current operations into audited Tool/taxonomy CRUD using existing styling |
| User | Session gate; saved Tools; create/add-to-Stack; reviews/claims display; browser compare | Real persistence and isolation tests; Stack editing/order/removal; multi-content saves; profile settings; follows/notifications; billing | Complete the existing Tool engagement workflow once DB is connected |
| Vendor | Per-Tool vendor_access, ownership approval constraint, listing of owned published Tools | Payment reliability; claims history/revoke/dispute; paid submission/edit/verification; analytics; subscription/entitlement model | Prove paid Claim -> review -> one-owner access, then controlled requests |
| Creator | isCreator flag and protected placeholder | Application/status transitions; profiles; content ownership; Skill/Playbook schemas; shared public Stacks; uploads/resources; events; attribution/billing | Build application/approval and one moderated publishing flow before full dashboard |

## Admin Control Panel

The present /admin page performs real server queries and actions when dependencies exist; it is not merely a mockup. However, the current auth mode cannot obtain admin capability through the documented bootstrap script.

First acceptance:
- Operator access is explicitly granted and audited.
- Non-admins fail at the server boundary even when posting crafted action payloads.
- Admin edits canonical Tool data and typed taxonomy relations.
- Publication validates completeness, allowed state and target existence.
- Status transitions include reviewer/reason/history.
- Lists are paginated/searchable and show pending/error/empty states.
- Audit history can trace the underlying operation.
- Existing visual treatment is retained.

Do not initially build every /admin/* route. Extract common shell/forms and add operational pages as real workflows arrive.

## User Control Panel

The current /account page includes saves, Stacks, reviews and claim status. Owner filters are visible in source. Without DB, it correctly acknowledges sign-in and states persistence is unavailable.

First acceptance:
- Two test users cannot read/write each other's Stacks, reviews, saved content or claims.
- A user can remove a saved Tool even when the Tool becomes unavailable, according to an explicit product policy; current publishedTool gating needs review for this case.
- Stack creation, renaming, removal, ordering and membership changes work consistently.
- Review edits re-enter moderation; status is visible.
- Comparison browser state and account persistence are distinguishable.
- Sensitive account data is never placed in shared cache output.

Following, notifications, saved Skills/Playbooks/Events and billing depend on later domain modules. Implement them when their sources exist rather than presenting false completion.

## Vendor Control Panel

Vendor is a capability on a User/Creator account. Preserve that model. The current ownership list is a useful starting point, and the database primary key enforces one owner per Tool.

First acceptance:
- Successful payment alone cannot assign ownership.
- Admin approval can assign only one verified owner.
- Rejected or competing claims have defined handling.
- Every edit request is constrained to an owned Tool.
- Proposed facts remain separate from public canonical data until approved.
- Vendors cannot change rankings, verification dates/badges or review moderation.
- Analytics derive from real, deduplicated records.
- Claims, paid requests and entitlements have visible history.

## Creator Control Panel

The current page only reports whether the Creator flag is set. No application workflow or publishing model exists.

First acceptance:
- Registered user applies; admin approves/rejects/suspends with a reason.
- Creator profile has stable handle and ownership.
- Creator edits only owned drafts.
- Skill and Playbook remain distinct objects.
- Resource assets use secure upload/delivery controls.
- Public Stacks reuse core Stack infrastructure with explicit visibility/type.
- Content publication follows moderation rules.
- Resource campaigns preserve attribution and approved affiliate disclosures.
- Unpublished/private resources remain inaccessible even through tracked URLs.

## Shared dashboard components

Introduce a common layout, capability-aware navigation, form error/pending feedback, table pagination, empty states and audit-status presentation using the current brand components and tokens.

Navigation should expose only available capabilities, but hidden navigation is not authorization. All actions and data reads still enforce permissions. Retain an ordinary User experience for someone who also has Creator and Vendor capabilities.

## Build order

1. A01–A04: baseline, patched dependencies, identity/permissions and real database.
2. A05: Admin catalog/taxonomy operations.
3. A06: User engagement and isolation.
4. A07–A10: trust/ranking, billing, paid claim/submission and initial Vendor analytics.
5. A11: controlled Vendor edits and verification.
6. A12–A13: Creator approval, Skills/Playbooks, public Stacks and resource funnels.
7. A14–A16: Events, subscriptions/placements and notifications.
8. A17 before external release; A18 for broader optimization/polish.

Some implementation work can overlap after contracts stabilize, but no parallel-agent work or implementation is authorized by this report.


---

<!-- Source report: REMEDIATION_BACKLOG.md -->

# Remediation backlog

## Planning rules

Tasks are proposals for owner review, not completed work or execution authorization. Complexity is relative: S small, M medium, L large. No calendar dates are estimated. Dependencies describe prerequisites, not a mandate to implement everything in one change.

P0 covers security, data integrity, identity and foundational blockers. Some P0 tasks are specifically release gates and do not block unrelated local development. P1 proves the first end-to-end Tool/User/Vendor flow. P2 completes remaining locked MVP scope. P3 is nonessential polish/optimization.

Each task should become smaller reviewable changes during implementation. Preserve working code and brand/layout. Do not reset any database or overwrite version snapshots.

## A01 — Establish baseline and reconcile authority

- **Priority / complexity:** P0 / S.
- **Dependencies:** Owner review of audit; report creation is authorized, code remediation is not.
- **Evidence/source:** F01; E01/E16; D01–D03; stale docs identified in Current State.
- **Affected files/modules:** Repository metadata, versions/, docs/, AGENTS.md. Proposed audit files are now supplied; remaining baseline/reconciliation is still pending.
- **Description:** Establish a secret-free Git baseline if this is the intended repository; preserve existing archives; record Playbooks inclusion, temporary auth and placement decisions; reconcile implementation notes.
- **Acceptance:** Source is reviewable/versioned; environment/generated/private files excluded; documented authority is consistent; snapshots preserved; no claims of database or production state without evidence.
- **Validation:** Inspect initial tracked-file list for secrets/private attachments; verify snapshot checksums and exclusions; verify docs distinguish existing/partial/missing/unverified.
- **Risk/constraint:** Do not accidentally commit reference attachments or environment secrets. Source-control creation is a separate implementation action from this documentation request.

## A02 — Patch dependencies and make validation reproducible

- **Priority / complexity:** P0 / M.
- **Dependencies:** A01.
- **Evidence/source:** F17/F18; E01/E13/E15.
- **Affected files/modules:** package.json, package-lock.json, lint configuration, CI workflow, affected Next.js integration.
- **Description:** Recheck official advisories, update Next.js to a compatible patched release, triage Drizzle/esbuild development chain, and configure meaningful lint/advisory checks.
- **Acceptance:** Runtime dependency findings are resolved or explicitly assessed; no blind major downgrade; typecheck, lint, tests and build run consistently in CI.
- **Validation:** Full/runtime npm audit; all existing tests; production build; HTTP route checks; header hydration and password-mode/Clerk-disabled behavior. Review lockfile diff.
- **Risk/constraint:** Dependency installation/update requires implementation approval. Preserve installed-version API conventions and read relevant Next.js docs.

## A03 — Repair temporary identity/admin integration and permissions

- **Priority / complexity:** P0 / M.
- **Dependencies:** A01–A02; coordinate data contract with A04.
- **Evidence/source:** F03/F15/F18; E06; Master Plan §§27–28; owner's temporary-password decision.
- **Affected files/modules:** src/lib/auth.ts, password modules, auth API routes, scripts/grant-admin.ts, protected actions/tests.
- **Description:** Keep password-only access for the current version. Define an explicit development-only admin bootstrap, improve limiter/body handling and centralize Creator/per-Tool/per-content permission helpers. Document identity continuity before later Clerk migration.
- **Acceptance:** Credentials alone never grant privileges; operator grants are explicit/audited; ordinary users cannot elevate; temporary mode cannot silently become shared production admin access; state-changing endpoints validate session/ownership.
- **Validation:** Forged/expired/rotated sessions, origin rejection, safe redirects, global lockout scenario, size limits, missing services, ordinary-user denial and simultaneous capabilities using isolated identity fixtures.
- **Risk/constraint:** Do not enable Google/Apple or public registration prematurely against the owner's current instruction. Individual production identities are required in A17.

## A04 — Establish verified database and core relational integrity

- **Priority / complexity:** P0 / L.
- **Dependencies:** A01; coordinate A03; validate with A02 tooling.
- **Evidence/source:** F02/F04/F05/F09/F16/F19; E04/E05/E11; D01 §32 and D03.
- **Affected files/modules:** src/lib/db/, db/migrations/, drizzle.config.ts, import/seed scripts, catalog types/repositories, environment documentation.
- **Description:** Inspect an approved isolated PostgreSQL target, verify migration ledger/grants, introduce forward migrations for core Tool/taxonomy/profile relationships and indexes, and reconcile taxonomy v1.1 with stable IDs.
- **Acceptance:** Actual metadata is recorded; migration source/live state agree; invalid relationships fail; taxonomy import is deterministic and repeatable; API exposure/grants/RLS are explicit; deployment roles are least-privilege.
- **Validation:** Empty-target and upgrade-path migration tests in PostgreSQL, FK/kind/state checks, stable-ID reimport, invalid/duplicate relations, role/grant/RLS allow/deny cases and restore to a separate target.
- **Risk/constraint:** No reset/squash until target history is verified. Do not invent approved sub-vertical records. Keep backend-only tables private unless policies are implemented.

## A05 — Complete Admin Tool/taxonomy operations and catalog projection

- **Priority / complexity:** P1 / L.
- **Dependencies:** A02–A04.
- **Evidence/source:** F09/F12/F13/F19; E07/E10/E14; D01 §§13,35.
- **Affected files/modules:** Admin page/actions, catalog services/queries, shared forms/dashboard shell, Tool views.
- **Description:** Add full edit/taxonomy operations, publication gates, paginated queries and a shared Tool projection used by normal and sponsored discovery.
- **Acceptance:** Admin creates/edits/publishes/archives a real Tool with required relations; nonexistent/stale targets cannot produce false success audits; public pages reflect canonical facts; branded layout is unchanged.
- **Validation:** Non-admin denial, malformed taxonomy, stale concurrent edit, unknown target, publication completeness, archived visibility, consistent featured/ordinary ratings and ownership, query pagination.
- **Risk/constraint:** Payment or vendor role must not authorize canonical trust/ranking edits.

## A06 — Complete User engagement and private-data isolation

- **Priority / complexity:** P1 / M.
- **Dependencies:** A04–A05; permissions from A03.
- **Evidence/source:** E05/E07/E14; F18; D01 §§19–20,36.
- **Affected files/modules:** Account page, saves/reviews/Stack actions, comparison persistence and engagement schema.
- **Description:** Finish Stack rename/remove/order/membership, saved-content handling, review status and account comparison persistence. Define unavailable-Tool behavior.
- **Acceptance:** Two users have isolated private state; one review per user/Tool; review edits re-enter moderation; comparison stays within 2–4; browser convenience does not impersonate account storage.
- **Validation:** Cross-account forged IDs, duplicate/concurrent saves, Stack ownership, removed/unpublished Tools, review moderation transitions and compare hydration/persistence.
- **Risk/constraint:** Shared public/Creator Stack support must not accidentally expose personal Stacks.

## A07 — Integrate evidence-based verification and contextual ranking

- **Priority / complexity:** P1 / L.
- **Dependencies:** A04–A05; coordinate initial signals with A06/A10.
- **Evidence/source:** F10/F11; E12; D01 §§22,24.
- **Affected files/modules:** Ranking/trust services, score/evidence schema, Admin trust controls, Tool filters/details/compare.
- **Description:** Derive reviewed scoring inputs, store versions/context/explanations, implement Last Checked/Verified evidence and freshness, and keep commercial fields excluded.
- **Acceptance:** Visible rank is tied to a context/version; unknown data remains unknown; verification requires authorized evidence; paid/claimed status cannot substitute for verification or organic quality.
- **Validation:** Deterministic scoring, factor/penalty bounds, missing/NaN input validation, freshness boundaries/future dates, evidence permissions, commercial-exclusion and explanation consistency.
- **Risk/constraint:** Do not fabricate ranking data to populate empty UI.

## A08 — Generalize billing and implement durable recovery

- **Priority / complexity:** P0 before commercial expansion / L.
- **Dependencies:** A04 and A03.
- **Evidence/source:** F06/F07/F19; E08/E09; D01 §§23,29.
- **Affected files/modules:** Order/payment/attempt/refund schema, billing services, claim/featured actions, webhook handler and operational queues.
- **Description:** Support generic purchases, durable checkout attempts and reconciliation; separate payment, editorial and entitlement state. Avoid holding DB locks across unnecessary provider work.
- **Acceptance:** Provider timeout/rollback can be reconciled; retries cannot duplicate purchase/entitlement; failed/refunded/disputed state is auditable; no redirect grants access.
- **Validation:** Signed raw-body webhook tests against PostgreSQL; replay, out-of-order, amount/currency/identity mismatch, concurrency, failure after provider success, rollback, cancellation and refund/dispute tests.
- **Risk/constraint:** Remain in Stripe sandbox until launch gates and business policies are approved.

## A09 — Prove paid submission/claim and Vendor access

- **Priority / complexity:** P1 / L.
- **Dependencies:** A03–A08; A07 can be developed alongside claim mechanics.
- **Evidence/source:** Partial claim code and submission placeholder, E07/E09/E14; D01 §§21,37.
- **Affected files/modules:** Submission/claim services and schema, Admin queues, Vendor workspace, account request history.
- **Description:** Complete eligible paid submission and claim workflows, proof review, rejection/dispute/revocation rules and one-owner assignment.
- **Acceptance:** Ordinary users cannot directly submit new Tools; eligible actors pay and enter review; paid claim cannot bypass proof review; only one approved owner; all outcomes are visible.
- **Validation:** Competing claimants, unpaid approval rejection, ineligible submitter, foreign request ID, rejected/refunded order, archived Tool, revocation and capability combinations.
- **Risk/constraint:** Define rejected/competing paid-claim fee/refund policy before live checkout; do not invent terms.

## A10 — Add initial analytics and safe outbound attribution

- **Priority / complexity:** P1 / M.
- **Dependencies:** A04–A06; agree event contracts with A07/A09.
- **Evidence/source:** Missing analytics/link services, E05/E14; D01 §25.
- **Affected files/modules:** analytics_events, tracked/outbound links, instrumentation, aggregate queries and Vendor reporting.
- **Description:** Record real Tool views, clicks, saves/compare signals with privacy-aware deduplication; validate destinations and ownership; implement minimal Vendor metrics.
- **Acceptance:** Metrics trace to real records, do not leak another account's private state and exclude inflated/replayed activity according to documented rules.
- **Validation:** Duplicate/bot bursts, private destinations, unsafe URLs, missing/archived targets, attribution retention and owner-scoped aggregate reads.
- **Risk/constraint:** Do not repurpose public events for analytics or treat localStorage progress as server analytics.

## A11 — Complete paid Vendor edits and verification

- **Priority / complexity:** P2 / L.
- **Dependencies:** A07–A10.
- **Evidence/source:** Missing request families, E05/E14; D01 §§21–23.
- **Affected files/modules:** Edit/verification schema/services, Vendor forms, Admin queues, billing products and trust logs.
- **Description:** Separate proposed edits from canonical data; support paid verification and configurable zero-price promotions through the same approval workflow.
- **Acceptance:** Vendor modifies owned proposals only; admin applies approved changes; payment never awards verification; zero-price promotion retains checks/history.
- **Validation:** Foreign Tool IDs, stale proposals, duplicate payment, rejected changes, trust-field tampering and zero-price workflow.
- **Risk/constraint:** Last Verified remains controlled by the verification process.

## A12 — Build Creator approval, Skills, Playbooks and shared Stacks

- **Priority / complexity:** P2 / L.
- **Dependencies:** A03–A07; secure assets from A13 before enabling uploads.
- **Evidence/source:** Creator/Skills/Playbooks placeholders, E14; D01 §§14–16; confirmed Playbook inclusion.
- **Affected files/modules:** Creator applications/profiles, Skill/Playbook/step relations, shared Stacks, publishing/moderation UI.
- **Description:** Implement explicit ownership and moderation with distinct Skill and Playbook semantics. Extend existing Stacks for public Creator use rather than duplicating unrelated systems.
- **Acceptance:** Approved Creator owns profile/drafts; Skills have task instructions/resources; Playbooks have ordered steps; only approved content appears publicly; personal visibility remains private.
- **Validation:** Cross-Creator edits, suspension, draft/private lookup, step order, relation integrity, submission/rejection/publication and public Stack boundaries.
- **Risk/constraint:** Do not activate excluded discussions or courses based on old workbook notes.

## A13 — Build secure resources, campaign pages and affiliate tracking

- **Priority / complexity:** P2 / L.
- **Dependencies:** A10, A12; security/permission foundation.
- **Evidence/source:** Missing asset/resource/link families, E05/E14; D01 §§16,25,30.
- **Affected files/modules:** Asset/upload service, resource pages/blocks/campaigns, storage adapter, tracked links and disclosures.
- **Description:** Add validated resource uploads/delivery, campaign-specific Creator pages, related content and approved affiliate/external CTAs.
- **Acceptance:** Owned assets obey access/moderation rules; filenames/keys are safe; resources have real campaign attribution; affiliate disclosures are visible.
- **Validation:** Oversized/spoofed/unsafe files, private direct links, malicious SVG/HTML where relevant, revoked resources, foreign ownership, safe fallback and attribution.
- **Risk/constraint:** Do not accept arbitrary executable uploads or implement native video hosting.

## A14 — Implement public Events and external registration

- **Priority / complexity:** P2 / M.
- **Dependencies:** A05, A10, A12.
- **Evidence/source:** Event placeholder, E14; D01 §17.
- **Affected files/modules:** events/organizers/relationships, submission/moderation, discovery and lifecycle processing.
- **Description:** Add format/location/timezone, approved submission, external tracked registration and upcoming/ongoing/cancelled/completed/archived behavior.
- **Acceptance:** Eligible actor submits; admin approves; correct filtered discovery; historical records remain appropriately accessible; no native ticketing implied.
- **Validation:** Timezones/DST, invalid intervals, cancellation/archive, unauthorized changes, registration destination and related-content integrity.
- **Risk/constraint:** Keep public Event records distinct from analytics.

## A15 — Complete subscriptions, configurable pricing and placement operations

- **Priority / complexity:** P2 / L.
- **Dependencies:** A08–A09, A12; analytics from A10.
- **Evidence/source:** F08; absent subscription families; E08/E14; D01 §23.
- **Affected files/modules:** Plans/pricing/subscriptions/entitlements, pricing/billing UI, placement lifecycle and admin operations.
- **Description:** Reconcile subscription lifecycle and entitlements; complete unpaid request expiry/cancel, placement recovery/refunds, inventory and sponsorship operations.
- **Acceptance:** Full pricing remains authenticated; plan state is server-authoritative; abandoned requests release inventory; paid placements are visible for the purchased interval and distinctly sponsored.
- **Validation:** Renewal/cancellation/past_due/refund/dispute events, replay, entitlement drift, request expiry, date boundaries, unpaid requests and concurrent purchases.
- **Risk/constraint:** Preserve approved $99/five-day offer unless owner changes it; confirm currency/inventory/refund rules before live billing.

## A16 — Add follows and in-app notifications

- **Priority / complexity:** P2 / M.
- **Dependencies:** A06/A09; add content/billing sources as A12/A14/A15 land.
- **Evidence/source:** Missing schemas/services, E05/E14; D01 §§19,36.
- **Affected files/modules:** Follows, notification records/jobs, account and dashboard status UI.
- **Description:** Support authorized follows and deduplicated submission/claim/edit/verification/content/Event/billing notifications.
- **Acceptance:** Intended recipients see relevant status changes; reads/unsubscribe state works; private details are never exposed to followers.
- **Validation:** Recipient isolation, duplicate/retried events, archived targets, unfollow/unsubscribe and read-state persistence.
- **Risk/constraint:** No discussion/reply notifications.

## A17 — Pass external-alpha security and operations gates

- **Priority / complexity:** P0 release gate / L.
- **Dependencies:** A02–A04 foundations; relevant workflow tasks before release.
- **Evidence/source:** F14–F18; E04/E13/E15/E17; D01 §§27–31,41.
- **Affected files/modules:** Production identity integration, headers/CSP, shared limits, logging/monitoring, deployment/backup runbooks, CI/security tests.
- **Description:** Replace shared-preview assumptions for public users; configure and verify required providers when approved for the next version; establish monitored staging/production, least privilege, backup restoration and release controls.
- **Acceptance:** Individual identities/recovery/provider controls work; no shared admin; deployment secrets separated; access grants verified; payment failures observable; restore demonstrated; no open critical release blocker.
- **Validation:** Full multi-user IDOR/CSRF/session tests, TLS/proxy cookie behavior, CSP/provider compatibility, dependency scan, deployment smoke, alert tests and isolated restore.
- **Risk/constraint:** Do not turn this gate into an excuse to redesign the app. Do not enable deferred providers without the owner's next-version approval.

## A18 — Improve accessibility, browser coverage and measured performance

- **Priority / complexity:** P3 for polish/optimization / M.
- **Dependencies:** Core workflows complete; baseline accessibility applies throughout earlier tasks.
- **Evidence/source:** Browser QA limits and unbounded discovery evidence, E02/E10/E13.
- **Affected files/modules:** Existing components, dialogs/navigation/forms, loading/error states, query/cache boundaries and browser tests.
- **Description:** Broaden device/browser coverage and optimize measured bottlenecks while retaining approved visual composition.
- **Acceptance:** Keyboard/focus/mobile/reduced-motion flows pass; no new hydration failures; query/page budgets meet an agreed baseline; no layout redesign.
- **Validation:** Browser matrix, screen-reader/keyboard checks, focus restoration, mobile overflow, hydration, representative query/load measurements.
- **Risk/constraint:** Accessibility/security/correctness defects discovered during earlier tasks are not deferred simply because this optimization task is P3.


---

<!-- Source report: RECOMMENDED_BUILD_SEQUENCE.md -->

# Recommended build sequence

## Recommendation

**CONDITIONAL GO** for incremental development. Proceed with the first foundation tasks after owner review. Extend Admin operations before full Vendor or Creator dashboards. **NO-GO for live billing or public multi-user release** until the relevant identity, data, payment and operational gates pass.

This is not a recommendation to start over. Retain the existing UI, Next.js/Drizzle architecture, tests, constraints and working interactions.

## Exact next five tasks

1. **A01 — Baseline and authority.** Preserve version archives, establish Git/source review, reconcile documents and record the owner's amendments. Audit documentation creation is now authorized; remaining remediation is not yet approved.
2. **A02 — Dependencies and validation.** Patch Next.js, triage development advisories and add lint/CI validation without blind downgrade.
3. **A03 — Identity/admin/permissions.** Repair the documented admin path for temporary auth, strengthen its preview boundary and centralize authorization.
4. **A04 — Verified database and core relationships.** Inspect an approved isolated PostgreSQL target; verify migrations/grants; add forward relational corrections and taxonomy v1.1 reconciliation.
5. **A05 — Admin Tool/taxonomy operations.** Complete canonical editing/publication and scalable reads in the existing design.

A03/A04 require coordinated contracts. They are ordered for planning clarity, not permission to bypass one another's database or identity dependencies.

## First implementation milestone

**A verified Tool -> User -> paid Claim -> Admin approval -> Vendor access workflow.**

This milestone requires work beyond the first five tasks: A06–A10 and the applicable release gates. Do not call A01–A05 alone a completed private alpha.

Demonstration:
1. Administrator creates and classifies a real researched Tool.
2. Validated publication makes it discoverable on directory/detail pages.
3. Separate authenticated test users save, organize, compare and review Tools.
4. Private account data is isolated across those users.
5. Trust fields and initial contextual ranking use reviewed evidence, with unknowns visible.
6. Claimant completes a Stripe sandbox purchase.
7. Verified payment enters an admin review queue.
8. Approval grants one Tool-scoped owner; payment alone grants none.
9. Rejected/competing/interrupted requests have defined visible outcomes.
10. Vendor sees ownership/history and initial real engagement metrics.
11. Migration ledger, permissions, audit history and restoration are verified against PostgreSQL.
12. Existing branding/layout remains intact.

The user's single temporary account can support local preview work, but cannot by itself demonstrate real multi-user isolation. Automated isolated identities and, before external testing, approved individual identity configuration are required.

## Later vertical slices

### Tool supply and trust
A11 completes paid Vendor edit and verification requests, preserving canonical-data review and promo-zero verification controls.

### Creator / Skill / Playbook
A12–A13 prove user application -> approval -> owned Skill/Playbook -> moderation -> public Creator Stack/Resource Page -> secure asset -> attributed visitor engagement.

### Events
A14 proves eligible submission -> admin approval -> scoped discovery -> external registration click -> cancellation/completion/archive lifecycle.

### Commercial and return loops
A15–A16 finish subscriptions/entitlements, placement operations, follows and notifications. A17 verifies public release readiness. A18 broadens browser/performance polish while accessibility remains part of every feature's acceptance.

## Gate definitions

| Gate | Required evidence |
|---|---|
| Code baseline | Reviewable source history, preserved archives, secret exclusions |
| Database | Actual metadata and migration ledger; relationship checks; tested exposure/roles; restore |
| Identity | Explicit admin access, user isolation, temporary-mode boundary and production account plan |
| Catalog | Real content, validated publication, consistent normal/sponsored projections, indexed queries |
| Trust | Evidence-backed timestamps and contextual versioned scores; paid exclusion |
| Billing | Signed/replayed/out-of-order events, recovery, admin/payment separation and refund/dispute policy |
| Creator/resources | Ownership/moderation; secure uploads; private-resource and link controls |
| Operations | Monitored deployment, redacted logs, alerts, backups, restore and rollback/forward-fix plan |
| Visual/product | Existing brand/layout retained; honest empty/unknown/demo states; functional browser flows |

## Decisions still needed at the appropriate stage

These do not block preparing the audit:
- Which isolated development/staging database and hosting target will be used.
- Explicit USD confirmation for live featured billing.
- Rejected/competing claim and placement refund/fee policies.
- Placement capacity/scheduling, unpaid approval expiration and cancellation rules.
- Verification evidence standards and reviewed ranking-input derivation.
- Approved sub-vertical records and real researched launch content.
- Timing/approval for the later individual-account/provider version.

Do not ask the owner to repeat confirmed decisions: Playbooks are included; brand/layout stay; the current version uses temporary password-only login; featured price is $99 for five days with approval before publication.

## What remains unchanged during audit-document delivery

Application code, database migrations, root AGENTS.md, environment configuration and deployed services are not modified. This report set is a review artifact, not an implementation change or production approval.


---

<!-- Source report: EVIDENCE_AND_VALIDATION.md -->

# Evidence register and validation record

## How to use this register

D-identifiers refer to source requirements. E-identifiers refer to implementation or validation evidence. F-identifiers identify findings in Architecture Review. A-identifiers identify proposed remediation tasks.

Repository-relative paths resolve from the AIBean project root. Original reference documents were located outside that root in Downloads or among project attachments; names and fingerprints below help the owner provide the correct files. Original documents and application source are not bundled in this audit archive.

Line numbers were observed during the audit and may change. SOURCE_FILE_MANIFEST.json records report-packaging-time hashes of the allowlisted source files that still exist. A hash establishes a file identity, not correctness or proof that every line was audited.

## Requirement sources

### D01 — aiBean MVP Development Master Plan v0.3

Original supplied filename: aiBean _MVP_Development_Master_Plan_v0_3.docx.  
Also found: aiBean_MVP_Development_Master_Plan_v0_3 (1).docx.  
Both SHA-256: 681babdd70cbf6d969c3ef21803bb8c0588436de2d2a711397f4350c412c6989.  
Document date: 30 September 2026.

Key requirements used:
- §§10–12: additive capabilities, one owner, distinct product objects and relationships.
- §§13–20: Tool discovery, Skills, Playbooks, Creator resources, Events, search, engagement and reviews.
- §§21–23: paid supply/trust workflows, distinct verification concepts, monetization/subscriptions.
- §§24–25: explainable contextual ranking and durable analytics.
- §§26–31: stack direction, server permissions, security, payments, upload controls and rate limits.
- §32: required database families.
- §§33–36: routes, UI contracts and dashboard operations.
- §§37–41: vertical slices, prioritization, seed content and launch gates.

The document's minimum private-alpha direction includes a core Tool/User/Admin workflow and an end-to-end paid Vendor flow. Full MVP remains larger than the current staged implementation.

### D02 — MVP Product Scope v1.1

Filename: aiBean_MVP_Product_Scope_v1_1.pdf.  
17 pages; date 27 September 2026.  
Reviewed full extracted text.

Primary evidence includes locked navigation, User/Creator/Admin experiences with Vendor capability, paid approvals, separate trust concepts, Events, resources and gated pricing. Pages 8, 14, 15 and 17 exclude Playbooks, conflicting with D01. The owner explicitly resolved that conflict in favor of including Playbooks.

### D03 — Taxonomy v1.1

Filename: aiBean_Taxonomy_Package_v1_1.xlsx.  
SHA-256: cdf562820a74ff5001821ff91f39f4a53f4729b6a5096ff55f8828b573bd5f54.  
Workbook README generation date: 4 June 2026.

Compared normalized non-empty records with aiBean_Taxonomy_Package_v1 (1).xlsx:
- Categories: 25 data records, unchanged.
- Verticals: 18 data records, unchanged.
- Use Cases: 40 data records, unchanged.
- Listing Types: 21 data records versus 16 previously.
- Eight new architecture sheets: Product Object Map, Relationship Map, Page Inventory, Creator Profile Modules, Smart Link Rules, Visibility & Permissions, MVP Scope, Schema Readiness.
- Facets/notes also changed.
- The importer derives 202 subcategories from the unchanged category list.

The imported v1 JSON records source SHA-256 3adb157a616c8a4acecef8d0f9fce05b9f7e67982fce25314259ed52b5436cf6. Source fingerprints are provenance, not approval of all old product notes.

### D04 — Historical supporting material

Relevant sections/headings and ERD text were reviewed, rather than claiming an exhaustive read of every older paragraph:
- AI_Sites_Ranking_Reviews_Technical_Specifications_v1.4.docx (internal title/version references include v1.3).
- BestURL_Ranking_Methodology_v1.docx.
- BestURL_Screen_Specs_v1.docx.
- BestURL_ERD_Core_v1.pdf.
- BestURL_ERD_Monetization_Ops_v1.pdf.
- Update this page to have the Subcategory automatically updates.docx.
- aiBean _PRD_Private_MVP_v0_3.md: identified as an older working draft; reviewed relevant scope content.

The old PRD is dated June 7, 2026 and includes discussions and deferred payments; it does not override the later September scope. Old screen specs include Expo/mobile; native mobile remains excluded.

### D05 — Direct owner decisions

Conversation evidence:
- Preserve brand/layout and deliver a staged MVP.
- Featured placement price: $99 for five days.
- Admin approval before publication.
- Temporary email/password account; other login features later.
- Read-only audit, no application/database changes.
- During audit: “Include Playbooks, following Master Plan v0.3.”
- Subsequent request: provide the full audit in a form another AI can review.

Credential values are intentionally excluded.

## Implementation evidence

| ID | Files / observation | What it supports |
|---|---|---|
| E01 | package.json, package-lock.json, tsconfig.json, next.config.ts, AGENTS.md; Git command results | Stack, scripts, strict typing, framework instructions, no Git repository |
| E02 | src/app/globals.css, layout.tsx; components/header.tsx, footer.tsx, logo.tsx, exploration-provider.tsx, interactive-preview.tsx; hooks/use-local-storage.ts | Existing brand/shared layout, local fonts, nav, persistence and interactions |
| E03 | src/app route inventory and production build route output | Existing public/protected/API/compatibility route coverage |
| E04 | Presence-only configuration check; no values printed | Password mode present; database/Clerk/Stripe/Upstash settings absent |
| E05 | src/lib/db/schema.ts; db/migrations/*.sql and meta/*.json; src/lib/db/index.ts | Fourteen source tables, FKs/checks, server-only client, migration sequence; not live state |
| E06 | src/lib/auth.ts, password-auth.ts, password-crypto.ts, password-policy.ts; src/app/api/auth/*/route.ts; src/proxy.ts; scripts/grant-admin.ts | Sessions, capability checks, temporary-mode limits and admin mismatch |
| E07 | src/app/actions.ts, src/app/admin/page.tsx, src/lib/validation.ts | Ownership/auth guards, admin/review/claim actions, input validation and mutation limitations |
| E08 | src/app/featured/actions.ts; src/lib/featured/plan.ts, rules.ts, repository.ts; components/featured-tools.tsx | Price/window, sponsorship disclosure, eligibility, blocking requests and checkout logic |
| E09 | src/lib/billing.ts; src/app/claim/actions.ts; src/app/api/billing/webhook/route.ts | Test-only Stripe, claim-specific orders, signatures, reconciliation and editorial separation |
| E10 | src/lib/catalog/repository.ts and src/lib/featured/repository.ts | Unbounded reads, detail lookup, relational derivation versus JSON featured projection |
| E11 | src/data/taxonomy.json; src/lib/catalog/taxonomy.ts; scripts/import_taxonomy.py and seed.ts | Imported v1 source, source-version hardcoding, generated IDs, no-update seeding and excluded use case |
| E12 | src/lib/ranking.ts; src/lib/catalog/types.ts, filter.ts; src/app/compare/page.tsx | Pure scorer, absent integrated rank, trust fields, recency and compare unknowns |
| E13 | tests/*.test.ts; scripts/smoke-http.mjs; executed command results | Exact bounded validation described below |
| E14 | src/app/account, vendor, creator, admin, submit/tool, search, skills, playbooks, events, creators and pricing pages | Dashboard partial implementations and placeholders |
| E15 | Final npm audit and npm audit --omit=dev results; upstream advisory pages | Dependency findings and conditional applicability |
| E16 | versions/README.md, version-1.json, version-1.1.json | Documented version snapshots; not verified deployment or Git history |
| E17 | Dockerfile, docker-compose.yml, .dockerignore, .gitignore, .github/workflows/ci.yml, src/app/error.tsx and security.ts | Development infrastructure, declared CI, generic errors and DB rate counters |

## Selected source excerpts

These excerpts are small review aids, not a replacement for the complete files.

### Claim-only order model — E05

src/lib/db/schema.ts, around line 123:

~~~~typescript
export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  claimId: text("claim_id").notNull().references(() => claims.id).unique(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull().default("pending"),
  stripeSessionId: text("stripe_session_id").unique(),
});
~~~~

Formatting is condensed; field semantics match inspected source. Mandatory claimId is the reason for F06, not merely the name of the table.

### Admin bootstrap identity restriction — E06

scripts/grant-admin.ts, around line 5:

~~~~typescript
if (!id?.startsWith("user_") || !process.env.DATABASE_URL)
  throw new Error("Usage: npm run admin:grant -- user_<verified Clerk user ID>");
~~~~

The password identity function prefixes a hash-derived ID with password_. No credential value is involved in this observation.

### Global temporary limiter — E06

src/lib/password-auth.ts, around line 31:

~~~~typescript
const processState = globalThis as unknown as {
  passwordAttempts?: { count: number; expires: number };
};
// On expiry: { count: 0, expires: now + 15 * 60_000 }
const state = processState.passwordAttempts;
if (state.count >= 10) return false;
state.count++;
return true;
~~~~

This is an explanatory excerpt; initialization checks are omitted. The bucket is shared by all requests on that process.

### Catalog detail lookup — E10

src/lib/catalog/repository.ts, around line 36:

~~~~typescript
export async function getTool(slug: string) {
  return (await getTools()).find((t) => t.slug === slug);
}
~~~~

getTools also loads all approved reviews and vendor owners and repeatedly filters them for each Tool.

### Unpaid placement blocking — E08

src/app/featured/actions.ts, around line 49, includes this qualifying branch:

~~~~typescript
inArray(featuredPlacements.status, ["pending_review", "approved"])
~~~~

It is OR'ed with unexpired active/suspended placements. There is no age/expiry condition for the pending/approved branch; the request function rejects when an existing qualifying row is found.

### Source-version hardcoding — E11

scripts/import_taxonomy.py constructs the result with:

~~~~python
"sourceVersion": "v1 (provided workbook)"
~~~~

The seed uses onConflictDoNothing for imported records. Updating the source workbook alone does not update existing DB metadata.

## Safe validation performed

### Unit/DOM/isolated database suite

Command: npm test. Result: 20 pass, 0 fail.

The observed test behaviors:
1. Taxonomy counts, unique IDs and valid category references.
2. Combined category, pricing and search filters.
3. Industry discovery excludes general/suggested fits.
4. Unknown/future dates and missing reviews fail applicable trust filters.
5. Comparison cap, removal and deduplication.
6. Ranking ignores monetary/ownership fields.
7. Unsafe return paths/protocols and invalid reviews are rejected.
8. Migrations enforce ownership, review/rating constraints and billing deduplication.
9. Exploration starts at 20%, rewards distinct inspections and stops at 100%.
10. Stored exploration is sanitized and bounded.
11. Filter preferences exclude search text/arbitrary fields.
12. Featured checkout price validation accepts only the approved one-time test offer.
13. Placement duration is five days and end boundary is exclusive.
14. Payment matching rejects unpaid/mismatched/unrelated sessions.
15. Server-rendered header hydrates under reduced motion without attribute mismatch.
16. Persistence survives remount, syncs tabs and tolerates blocked/corrupt storage.
17. Password policy enforces length, uppercase, digit and special character.
18. Password hashing uses random salts and rejects incorrect/malformed inputs.
19. Sessions reject forgery, expiry, identity changes and rotated credentials.
20. Preview interaction stays in context and preserves expansion/progress.

The database test creates new PGlite(), applies SQL to that isolated instance and closes it. It does not use DATABASE_URL. DOM tests use jsdom; native dialog/focus/visual behavior is not fully established.

### TypeScript

Command: node node_modules/typescript/bin/tsc --noEmit --incremental false.  
Result: exit 0, no diagnostics. No incremental cache was requested by this command.

### Production build

Command: npm run build under a hash-comparison wrapper.  
Result: exit 0, Next.js 16.3.6, compiled/typechecked/generated route output successfully.  
All current application routes reported dynamic server rendering.

The wrapper hashed non-generated workspace files before and after. Output: NON_GENERATED_FILES_CHANGED []. It excluded node_modules, .next, .git and tsbuildinfo. Therefore this proves no non-generated content changes during that build, not a Git diff for the entire historic task.

The first build attempt was not executed because automatic approval review temporarily hit a usage limit. After the owner asked to continue, the retry executed and passed. There is no remaining build-approval blocker.

### HTTP smoke

Command: node scripts/smoke-http.mjs against the existing localhost development app.

Passed:
- Homepage and featured offer.
- Tool directory, combined filters, no-results and verification filters.
- Tool detail and industry discovery.
- Valid/invalid comparison.
- Skills/Playbooks/Events/Creators placeholder pages.
- Login page.
- Guest redirects for account/admin/pricing/vendor/creator/submission/claim/placement management.
- Unconfigured billing returns 503 before database access.
- Unknown Tool shows not-found content and noindex.

The script permits 200 or 404 for streamed not-found responses; this is not proof that every unknown route returns HTTP 404. It does not log in as multiple users or create a purchase.

### Docker

Actual command: docker compose --env-file .env.local config --quiet.  
Initial result: missing required POSTGRES_PASSWORD value.

A second validation supplied an ephemeral dummy value only in that command's process environment, then removed it. Syntax validation passed. No file was changed and no containers started. This is not a configured working development database.

### Migration metadata

Journal entries 0/1 and SQL files exist. Snapshot 0000 contains 13 tables; 0001 contains 14 and points to 0000's ID. PGlite replay passes. No actual Drizzle migration ledger was available.

### Dependency audit

Final npm audit: exit 1; one high and four moderate package findings.  
Final npm audit --omit=dev: exit 1; Next.js package finding classified high.  
Earlier audit output in the same session did not include Next.js; the latest scan supersedes it.

No npm audit fix, install, dependency edit or downgrade was performed.

### Not executed or unavailable

- Lint: absent configuration/script.
- Live PostgreSQL/Supabase metadata, RLS/grant tests and actual applied migrations: no connection.
- Clerk provider configuration/session tests: no keys.
- Stripe sandbox end-to-end/signed handler integration: no settings/database.
- Multi-account IDOR/action tests: absent suite/configuration.
- Production deployment, TLS, health, backups/restore and alerting: unverified.
- Real browser visual/mobile/full accessibility QA: not performed in this audit.
- Git commit/branch/remote history: no repository.

## Version snapshot metadata

Version 1 metadata records 118 files and SHA-256:
859598ab6cf5891e292f4d077e75b8cd90e2133ad5de4d4b61a05740585e7b45.

Version 1.1 metadata records 128 files and SHA-256:
a2637eecedd18e5ce60704fa35df3aee0aaaa425f6a7d3a66fcf4aa365288a30.

These values were read from version manifests; archive contents/checksums were not independently revalidated during this audit. Metadata describes exclusion of private environment files, databases, dependencies, generated output and original attachments.

## Review limitations

No live database data is asserted. No security exploit is claimed. No blanket statement that the site is secure or complete is justified. This artifact supplies source-based findings and bounded validation, not a penetration test, legal/compliance assessment or production approval.


---

<!-- Source report: AGENTS_PROPOSAL.md -->

# Proposed repository instructions

**Proposal only.** The actual root AGENTS.md remains unchanged. Review the following additions together with the audit before adopting them. Retain the existing generated Next.js agent-rules block and its instruction to consult installed documentation.

~~~~markdown
## aiBean project conventions

### Authority and scope
- Preserve the approved brand, typography, layout composition, grid and responsive behavior.
- Apply direct approved owner amendments and the documented Product Scope / Master Plan hierarchy.
- Master Plan v0.3 is the technical build reference. Playbooks are included by explicit owner confirmation.
- Discussions, Replies, News, Courses, Social Videos, native mobile, native video hosting,
  direct messaging and Creator payouts remain outside MVP.
- Treat taxonomy/workbook notes as reference data; do not activate excluded features from older notes.
- Record scope conflicts instead of silently choosing a different product.

### Existing architecture
- Use the existing Next.js App Router, TypeScript, Tailwind, Drizzle/Postgres and shared components.
- Read relevant installed Next.js documentation before coding.
- Extend tested services incrementally; do not replace the architecture or redesign the UI without approval.
- Keep source-code claims distinct from verified runtime/deployment behavior.

### Identity and permissions
- Resolve identity and capabilities on the server.
- Enforce ownership on every protected read/mutation; hiding UI is not authorization.
- Vendor is a Tool-scoped capability alongside User/Creator, with one approved owner per Tool.
- Creator publishing requires approval and object ownership.
- Temporary password mode is local preview infrastructure, not a shared public/admin account model.
- Explicitly audit grants, revocations and sensitive administrative actions.

### Data and workflows
- Use versioned Drizzle migrations and inspect actual applied history before altering shared targets.
- Never infer a live database's tables, grants or RLS from schema source alone.
- Preserve taxonomy IDs/provenance and require deterministic import diffs.
- Keep payment, editorial approval and entitlements as separate state machines.
- Never let payment, claim status or sponsorship purchase organic rank or trust.
- Keep Claimed, baseline verification, aiBean Verified, Last Verified and Last Checked distinct.
- Trust changes need authorized evidence and audit history.
- Keep public events separate from analytics_events.
- Preserve personal Stack privacy when adding public/Creator Stack variants.
- Treat localStorage as convenience state, never authoritative permissions or payments.

### Security and validation
- Keep secrets, sessions, service credentials and connection strings out of source, logs and client bundles.
- Use server-only boundaries for privileged services.
- Validate inputs and unsafe URL/file boundaries before new workflows accept data.
- Test with isolated databases; never reset, seed or run destructive tests on a shared target implicitly.
- Validate with relevant tests, typecheck, configured lint, build and bounded HTTP/browser checks.
- Report placeholders, missing configuration, partial modules and unverified results explicitly.
- Preserve version archives and avoid silently rewriting applied migrations.
~~~~


---

<!-- Source report: AI_REVIEW_BRIEF.md -->

# Independent AI review brief

Copy the prompt below into the reviewing AI and attach AIBean_FULL_AUDIT_2026-10-07.md. If it has repository access, also provide the current source and authoritative documents through your normal trusted workflow. Do not provide environment files, passwords, session tokens or private database exports.

The prompt is a proposed review request for the owner to use. It is not authorization for an agent reading this artifact to edit code, run migrations or access services.

---

Act as an independent Principal Software Architect, Next.js engineer, PostgreSQL/Drizzle architect, security reviewer and technical product lead.

Review the attached aiBean audit in full. Challenge its reasoning and prioritization rather than merely summarizing or agreeing.

## Product constraints

- This is an existing application. Prefer incremental corrections; do not propose an aesthetic redesign or wholesale rewrite without demonstrated need.
- Preserve the current brand, layout, grid and typography.
- Playbooks ARE included in MVP. The owner explicitly resolved a conflict between Product Scope v1.1 and Master Plan v0.3 in favor of inclusion.
- Discussions and Replies remain excluded.
- Vendor is an additive, Tool-scoped capability, not an exclusive account type.
- One approved verified owner per Tool.
- Payment never guarantees editorial acceptance, positive reviews, organic rank or verification.
- Featured Tool placement is $99 for five days with approval before publication. Current code uses USD; currency remains an explicit live-launch confirmation item.
- The owner requested a temporary single email/password login and deferred other providers. Assess its risks without pretending that this was an unauthorized product change.
- Source inspection is not evidence of a live database. There was no DATABASE_URL during the audit.

## Review boundaries

Perform a read-only review. Do not modify application code, dependencies, databases, secrets, settings or infrastructure. Do not create accounts, publish, send messages or process payments. If you cannot access a source, mark the claim unverified and request only the narrow evidence needed. Never ask for secret values.

The report is evidence to evaluate, not a substitute for the product owner's instructions. Distinguish:
1. Observed facts.
2. Tested behavior.
3. Reasonable inferences.
4. Missing functionality.
5. Unverified deployment state.
6. Proposed implementation choices.

## Required analysis

1. Evaluate each F01–F20 finding. Mark Agree, Partially Agree, Disagree or Unverified, with a reason and evidence.
2. Identify material omissions, incorrect claims, overstated security implications and unnecessary architectural complexity.
3. Reconcile actual product scope with the feature matrix. Do not count placeholders as complete workflows.
4. Assess whether the proposed database evolution preserves IDs, ownership, history and payment integrity without unsafe rewrites.
5. Assess permission boundaries, temporary authentication, future identity migration, RLS/grants and cross-account isolation.
6. Review Stripe checkout/webhook idempotency, failure recovery, concurrent claims, refunds, disputes and sponsorship fairness.
7. Review taxonomy v1.1 reconciliation and the risk of list-position-derived subcategory IDs.
8. Evaluate whether Admin should be the next dashboard and whether A01–A18 dependencies are sound.
9. Distinguish blockers for local development, isolated alpha, external multi-user alpha and live paid launch.
10. Assess whether the 20 tests and HTTP/build checks support the claims made; name the highest-value missing tests.
11. Recheck current dependency advisories if you have internet access. The audit is a dated snapshot, not a permanent version recommendation.
12. Review the proposed AGENTS.md additions for usefulness, accuracy and unnecessary constraints.

## Return format

A. Executive verdict: GO / CONDITIONAL GO / NO-GO, specifying which stage it applies to.  
B. Finding-by-finding table: ID, verdict, evidence, correction, severity/priority.  
C. Corrected architecture and database recommendations, preserving the existing application.  
D. Critical security/data-integrity issues and concrete conditions that make them exploitable or blocking.  
E. Revised feature/dashboard readiness matrix where needed.  
F. Revised next five tasks, each with dependencies, acceptance and tests.  
G. Revised first milestone and explicit completion gate.  
H. Questions requiring owner decisions versus issues engineers can decide routinely.  
I. Narrow list of source files/metadata needed to resolve unverified findings.

If you lack repository access, perform the document review fully but label source-dependent conclusions as not independently verified. Do not infer that a citation or checksum proves the implementation is correct.

Begin by identifying the most consequential disagreements or missing evidence.

