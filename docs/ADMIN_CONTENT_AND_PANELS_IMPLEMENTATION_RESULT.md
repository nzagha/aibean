# Admin content and four-panel implementation — 11 October 2026

Status: core Admin implementation and isolated functional verification pass. Hosted activation and full MVP release acceptance remain gated.

The existing Next.js app was extended in place. Public homepage composition, header/footer, fonts, colors, brand assets and existing discovery grids are preserved. No source import, Auth activation, hosted migration, recovery retry, real account, email, DNS or live-payment operation occurred.

## Admin workflows

| Contract               | Working implementation                                                                                                                                                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Operations             | Canonical Admin navigation, actual Tool/review/claim/featured/commercial/content queue counts, recent audited activity, readiness summaries and responsive loading/error boundaries.                                                                                                                                           |
| Tool management        | Full existing-schema draft/edit/preview/publish/archive workflows, taxonomy/pricing fields, search/filter/pagination, explicit similar-Tool relationships and published related Skills/Playbooks/Events.                                                                                                                       |
| Taxonomy               | Stable approved IDs and parent relationships remain immutable; safe installed display-name/description edits use revisions and audit reasons. Historical v1 was not installed over a later taxonomy.                                                                                                                           |
| Moderation             | Reviews, paid claims, ownership disputes, paid submissions, Vendor edits/verification, Creator applications, profiles, content, reports and files have separate server guards, valid transitions and transactional audits.                                                                                                     |
| Verification/rank      | Independent evidence, badge/checklist, verification state and Last Verified continuity; versioned organic factors/weights/explanations exclude payments, ownership and sponsored inventory.                                                                                                                                    |
| Creator administration | Application review queues immutable operator capability requests; profile review/suspension and editorial content decisions are functional. Application approval cannot activate a protected User flag. A suspended profile cannot self-reopen by editing.                                                                     |
| Vendor administration  | One Tool owner; scoped claim/request/history/payment/analytics access. Vendors may propose their own Tool changes or Events, and cannot moderate reviews, publish content or access another Vendor's operations.                                                                                                               |
| Commerce               | Configurable USD test fees/plans, paid-request settlement, signed test webhook reconciliation, subscription state/cancellation and commercial inventory. Sponsored placement scheduling retains $99/five full paid days and starts no earlier than confirmed payment.                                                          |
| Content                | Separate typed Skill and Playbook models; ordered Playbook steps, Tool/Skill/taxonomy references; public Creator profiles, campaigns, Events, editorial featuring/cancellation/archive. Draft revisions stay private until reviewed.                                                                                           |
| Reports/analytics      | Logged-in reports do not automatically remove content. Admin removal and report resolution share an atomic audit/notification transaction. Daily UTC outbound aggregates count explicit requests, not unique visitors/conversions; no visitor identities, raw referrers or IPs are retained. Counts never change organic rank. |
| File resources         | Allowlisted MIME/extensions, signature/UTF-8 checks, 5 MB bound, random server keys, SHA-256, mandatory clean scanner verdict, private bucket checks, reservation/failure compensation, independent file review and 60-second signed attachment downloads. Files are hidden with private/suspended parents.                    |

## Continuation into User, Vendor and Creator panels

User: existing saved Tools/stacks/reviews/claims are retained; new private profiles, saved Skills/Playbooks/Events, follows, notifications, billing/submission history and stack ordering/notes/visibility are wired to actual services. Other authors' private revised titles are not exposed through saves or follows. Public Creator stacks require an approved public profile and show only published Tools.

Creator: owned structured Skill/Playbook/campaign/Event editors, application/profile status, file uploads/review history, public profile/campaign routes, Creator stacks, follower/save counts and scoped outbound aggregates. Skills and Playbooks are separate first-class models; Playbooks remain free to read. Edit returns published content to draft and requires a new publication decision.

Vendor: per-Tool ownership/request/payment history, submissions, subscriptions, promotions, Event authoring and scoped outbound aggregates. No analytics claim is fabricated when no events were collected.

Public `/skills`, `/playbooks`, `/events` and `/creators` now read approved records and offer scoped search/filter/pagination. Detail routes, `/@handle`, `/@handle/campaign` and public stack routes preserve anonymous browsing. Uninstalled workflows show truthful unavailable states.

## Validation

- Lint and Next.js route generation/TypeScript: PASS.
- Automated suite: 94 tests PASS. The Windows V8/WASM parallel-worker crash was reproduced, the affected installation file passed independently, and the full suite passed with `--test-concurrency=1`; no assertions were removed.
- Native PostgreSQL 17.11: 28 scenarios PASS in fresh disposable loopback clusters. Actual independent restricted/browser/service connections verify grants/RLS, ordinary User denial, capability/ownership boundaries, two-Vendor isolation, concurrent edits/moderation/order preparation, audit rollback and unchanged baseline histories/synthetic TestUsers. All disposable instances stopped afterward.
- Production build: PASS; runtime dependency audit: zero vulnerabilities.
- Local production HTTP smoke: 11 checks PASS across public pages, guest Admin/account denial and unavailable profiles/files. Loading boundaries can stream the account login redirect with HTTP 200; denial semantics were checked.
- React/JSDOM verifies form error preservation/confirmation and accessible ordered-step/stack controls. Real authenticated browser/visual/provider journeys remain unverified.
- Native scheduling uncovered an actual PostgreSQL driver Date serialization difference; ISO timestamptz parameters now pass the exact native workflow.

[Sanitized native evidence](evidence/admin-content-native-validation.json). These tests use synthetic content, in-memory private Storage/scanner adapters and a temporary loopback protocol fixture. They do not prove a real private bucket, malware engine/signature configuration, Stripe provider or hosted Supabase Auth operational.

## Installation and release boundaries

All four new packages remain proposals: [review](ADMIN_REVIEW_DATABASE_PROPOSAL.md), [commercial](ADMIN_OPERATIONS_DATABASE_PROPOSAL.md), [content/files](ADMIN_CONTENT_DATABASE_PROPOSAL.md). Their separate journals/snapshots and private package ledgers preserve the original two Drizzle entries. Runtime flags and private credentials were not enabled or changed.

Hosted readiness needs the separately authorized corrected recovery gate, fresh inventory/history/continuity and a new recovery plan covering approved new objects. The frozen 18-table/two-sequence recovery package and original binaries/migrations remain unchanged. Do not claim the current recovery archive covers new proposed tables or Storage objects.

Real Admin/category readiness, operator capability activation, provider configuration/testing, safe private bucket policies and scanner deployment, hosted install, visual/accessibility QA, observability, deployment and exclusive Auth cutover remain external acceptance gates. Direct browser/service access to new app tables is denied; Drizzle ownership guards remain necessary because the runtime login has no visitor JWT.

MVP limitations: comparison shortlist remains browser-persistent; account security/provider settings are in the separately gated Auth plan. Refunds/proration/transfer exceptions, subscription quota entitlements, bulk content tooling and conversion/unique-visitor analytics are not offered as working controls. No excluded Discussions/News/Courses/Web3/SAML modules were activated.

Provider reference: [Supabase private Storage access](https://supabase.com/docs/guides/storage/security/access-control), [signed downloads](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl), [ClamAV daemon/scanning requirements](https://docs.clamav.net/manual/Usage/Scanning.html). The implemented checks must be exercised against approved real infrastructure before enabling uploads.
