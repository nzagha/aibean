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

