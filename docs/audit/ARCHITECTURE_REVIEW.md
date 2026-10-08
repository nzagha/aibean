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

