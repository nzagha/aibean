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

