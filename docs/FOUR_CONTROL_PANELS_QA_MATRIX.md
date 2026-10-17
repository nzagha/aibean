## Current resumption status — 17 October 2026

**LOCAL WEBSITE — BLOCKED:** the eight-hour lease and pinned local TLS certificate have expired. All four preview ports are closed and the exact retained QA PostgreSQL cluster is stopped. Fixture and credential files remain present. No database connection, restart, certificate replacement or hosted access was attempted. The owner explicitly required stopping on TLS expiry. See [the verified blocker and proposed preserving renewal](LOCAL_QA_TLS_RENEWAL_READINESS.md). Earlier PASS/running observations below are historical.

## Current acceptance — 15 October 2026

**PARTIAL: native workflows and restart continuity verified; fresh real-browser acceptance BLOCKED.** Read [the consolidated acceptance report](AIBEAN_LOCAL_UI_ACCEPTANCE_REPORT.md) and [per-action evidence](evidence/local-ui-phase2-acceptance-matrix.json). This supersedes earlier lease/rotation/cross-port statements. Original identities/passwords, source seals, fixtures, private environment and historical evidence are preserved. No hosted connection or provider action occurred.

# Four Control Panels and public website QA matrix

Observed October 14, 2026 in the explicit disposable loopback fixture. **PASS means only the named executed check passed.** Route rendering/access is separate from full workflow acceptance. External integrations remain BLOCKED. Every row links to the actual [HTTP/native evidence](evidence/local-website-http-qa.json); browser checks are separately recorded below. No hosted state was inspected or modified.

## Actual route rendering and access

| Route | Persona | Expected / observed | Status | Severity / follow-up |
| --- | --- | --- | --- | --- |
| / | guest | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /tools | guest | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /categories | guest | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /industries | guest | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /use-cases | guest | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /search | guest | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /compare | guest | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /pricing | guest | Expected access/availability redirect; HTTP 307 | PASS | None observed; full mutations not implied |
| /creators | guest | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /skills | guest | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /playbooks | guest | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /events | guest | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /login | guest | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /register | guest | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /submit | guest | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /for-vendors | guest | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /account | guest | Expected access/availability redirect; HTTP 307 | PASS | None observed; full mutations not implied |
| /admin | guest | Expected access/availability redirect; HTTP 307 | PASS | None observed; full mutations not implied |
| /creator | guest | Expected access/availability redirect; HTTP 307 | PASS | None observed; full mutations not implied |
| /vendor | guest | Expected access/availability redirect; HTTP 307 | PASS | None observed; full mutations not implied |
| /admin | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/tools | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/tools/new | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/taxonomy | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/reviews | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/creators | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/capabilities | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/claims | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/edits | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/verification | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/disputes | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/content/skills | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/content/playbooks | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/content/resources | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/content/events | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/featured | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/commerce/pricing | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/commerce/payments | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/commerce/subscriptions | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/commerce/submissions | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/analytics | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/audit | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/affiliates | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/profiles | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/reports | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/files | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /account | user | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /account/profile | user | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /account/comparisons | user | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /account/following | user | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /account/activity | user | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /account/billing | user | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /account/membership | user | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /account/submissions | user | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /creator | creator | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /creator/profile/preview | creator | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /creator/analytics | creator | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /creator/content/skills | creator | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /creator/content/playbooks | creator | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /creator/content/resources | creator | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /creator/content/events | creator | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /creator/content/skills/new | creator | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /creator/content/playbooks/new | creator | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /creator/content/resources/new | creator | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /creator/content/events/new | creator | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /vendor | vendor | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /featured/manage | vendor | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /vendor/tools/8b865385-b502-4a39-bc4e-fc2d523e4e8c | vendor | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /vendor/tools/8b865385-b502-4a39-bc4e-fc2d523e4e8c/analytics | vendor | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /creator/content/events | vendor | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin | user | Expected access/availability redirect; HTTP 307 | PASS | None observed; full mutations not implied |
| /admin/tools/new | user | Expected access/availability redirect; HTTP 307 | PASS | None observed; full mutations not implied |
| /creator | user | Expected access/availability redirect; HTTP 307 | PASS | None observed; full mutations not implied |
| /creator/content/skills/new | user | Expected access/availability redirect; HTTP 307 | PASS | None observed; full mutations not implied |
| /vendor/tools/8b865385-b502-4a39-bc4e-fc2d523e4e8c | user | Expected access/availability redirect; HTTP 307 | PASS | None observed; full mutations not implied |
| /vendor | user | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin | creator | Expected access/availability redirect; HTTP 307 | PASS | None observed; full mutations not implied |
| /admin | vendor | Expected access/availability redirect; HTTP 307 | PASS | None observed; full mutations not implied |
| /vendor/tools/71f7a574-a7d7-4b8b-88e7-09a4f07b7895 | vendor | Expected access/availability redirect; HTTP 307 | PASS | None observed; full mutations not implied |
| /creator/content/skills/ef6860c0-cdcc-4848-8bad-c34f40c80fd1 | creator | Expected access/availability redirect; HTTP 404 | PASS | None observed; full mutations not implied |
| /skills/other-creator-private-draft | guest | Expected access/availability redirect; HTTP 404 | PASS | None observed; full mutations not implied |
| /account/stacks/2584c573-c65b-4cf8-b608-d2640ecce90c | user | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /account/stacks/2584c573-c65b-4cf8-b608-d2640ecce90c | creator | Expected access/availability redirect; HTTP 404 | PASS | None observed; full mutations not implied |
| /account | admin | Expected access/availability redirect; HTTP 307 | PASS | None observed; full mutations not implied |
| /account | creator | Expected access/availability redirect; HTTP 307 | PASS | None observed; full mutations not implied |
| /account | vendor | Expected access/availability redirect; HTTP 307 | PASS | None observed; full mutations not implied |
| / | guest | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /admin/tools/new | admin | Page rendered with main content; HTTP 200 | PASS | None observed; full mutations not implied |
| /account | guest | Expected access/availability redirect; HTTP 307 | PASS | None observed; full mutations not implied |
| /account | guest | Expected access/availability redirect; HTTP 307 | PASS | None observed; full mutations not implied |
| /account | guest | Expected access/availability redirect; HTTP 307 | PASS | None observed; full mutations not implied |
| /account | guest | Expected access/availability redirect; HTTP 307 | PASS | None observed; full mutations not implied |

## Actual security and action checks

| Check | Observed | Status | Severity / follow-up |
| --- | --- | --- | --- |
| Runtime is actual isolated PostgreSQL 17 TLS and restricted role | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| user unauthenticated panel denial | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| user genuine password login and signed cookie | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| admin unauthenticated panel denial | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| admin genuine password login and signed cookie | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| creator unauthenticated panel denial | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| creator genuine password login and signed cookie | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| vendor unauthenticated panel denial | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| vendor genuine password login and signed cookie | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/tools | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/tools/new | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/taxonomy | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/reviews | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/creators | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/capabilities | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/claims | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/edits | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/verification | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/disputes | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/content/skills | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/content/playbooks | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/content/resources | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/content/events | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/featured | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/commerce/pricing | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/commerce/payments | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/commerce/subscriptions | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/commerce/submissions | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/analytics | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/audit | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/affiliates | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/profiles | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/reports | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin render /admin/files | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| User render /account | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| User render /account/profile | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| User render /account/comparisons | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| User render /account/following | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| User render /account/activity | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| User render /account/billing | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| User render /account/membership | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| User render /account/submissions | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Creator render /creator | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Creator render /creator/profile/preview | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Creator render /creator/analytics | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Creator render /creator/content/skills | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Creator render /creator/content/playbooks | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Creator render /creator/content/resources | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Creator render /creator/content/events | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Creator render /creator/content/skills/new | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Creator render /creator/content/playbooks/new | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Creator render /creator/content/resources/new | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Creator render /creator/content/events/new | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Vendor render /vendor | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Vendor render /featured/manage | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Vendor render /vendor/tools/8b865385-b502-4a39-bc4e-fc2d523e4e8c | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Vendor render /vendor/tools/8b865385-b502-4a39-bc4e-fc2d523e4e8c/analytics | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Vendor render /creator/content/events | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Ordinary User capability denial /admin | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Ordinary User capability denial /admin/tools/new | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Ordinary User capability denial /creator | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Ordinary User capability denial /creator/content/skills/new | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Ordinary User capability denial /vendor/tools/8b865385-b502-4a39-bc4e-fc2d523e4e8c | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Ordinary User vendor overview remains a legitimate empty state | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| creator Admin denial | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| vendor Admin denial | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Vendor cannot edit another approved owner Tool | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Creator cannot inspect another Creator private draft | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Public cannot see another Creator private draft | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| User owns private Stack detail | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Creator cannot inspect User private Stack | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| User cookie rejected by admin preview | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| User cookie rejected by creator preview | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| User cookie rejected by vendor preview | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Forged login Origin rejected | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Registration cannot create privileged users in temporary mode | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Homepage JavaScript CSS and brand assets actually respond | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Derive rendered Admin create action reference | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin real server action creates unpublished Tool | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Ordinary User real Admin POST is denied without a write | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Forged cross-origin Admin action cannot write | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| Admin invalid Tool input returns safely without a write | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| user genuine logout clears session and denies account | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| admin genuine logout clears session and denies account | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| creator genuine logout clears session and denies account | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |
| vendor genuine logout clears session and denies account | Executed against real local server/database | PASS | See evidence assertions; no hosted acceptance claimed |

The forged ordinary User Admin action POST is rejected by the distinct preview action registry before a write; it is not evidence that that specific POST reached the Admin guard. Ordinary User Admin GET denial does exercise the actual server guard. Native verification independently confirms protected capability column grants reject assignments and a failing Tool transaction rolls back: [native evidence](evidence/local-website-native-qa.json).

## Browser workflow evidence

| Route / section | Persona | Expected / actual observation | Status | Evidence / severity |
| --- | --- | --- | --- | --- |
| /account | User | Signed in; created Browser QA Stack; success feedback and new heading | PASS | local-website-user-panel.png; none observed |
| /admin | Admin | Authorized dashboard, operational navigation and synthetic counts rendered | PASS | local-website-admin-panel.png; none observed |
| /admin/tools/new | Admin | Real HTTP Server Action created draft; independently read from DB | PASS | HTTP evidence; public publication not inferred |
| /creator | Creator | Four published fixture items and proper approved workspace rendered | PASS | local-website-creator-panel.png |
| /creator/content/skills/new | Creator | Required fields validate; valid form saved private draft, independent review notice | PASS | local-website-creator-draft.png |
| /vendor | Vendor | Exactly one approved owned Tool displayed | PASS | local-website-vendor-panel.png |
| /vendor/tools/[current owned ID] | Vendor | Submitted real edit request; pending/payment-required history, no public edit | PASS | local-website-vendor-request.png |
| / at 390px | Guest | Mobile dialog opens/closes; focused close button, no page overflow or broken images | PASS | local-website-mobile-menu.png |
| /tools?q=Acceptance | Guest | Homepage search submitted and two synthetic results rendered | PASS | browser evidence |
| /compare?tools=acceptance-tool-1,acceptance-tool-2 | Guest | Two Compare controls populated tray and opened comparison; internal scroll container | PASS | local-website-mobile-compare.png |
| Header/footer, brand imagery, loading and feedback | Sampled personas | Navigation links present; Creator loading resolves; draft/request success and required-field feedback observed | PASS | screenshots and browser evidence; not exhaustive link crawl |
| Console/hydration | Vendor, Creator, homepage/search/comparison sampled session | Zero captured console errors and hydration mismatches | PASS | browser evidence; not every interaction/session |

## Workflow completion limits and remaining owner tests

| Section / route | Persona | Expected behavior / current execution coverage | Status | Severity / required prerequisite |
| --- | --- | --- | --- | --- |
| Tool edits, publication/archive, taxonomy edits /admin | Admin | Screens render; exhaustive transition mutations not run in this UI pass | NOT TESTED | P2: owner synthetic workflow cases |
| Reviews, Creator applications/capability requests, ownership claims, disputes, verification /admin | Admin | Queues render; independent review/reason/transition mutations still need owner acceptance | NOT TESTED | P2: populate each synthetic queue |
| Skills/Playbooks/Events moderation and featured scheduling /admin | Admin | Pages render; full moderation/publication/scheduling cycle not executed here | NOT TESTED | P2: distinct reviewer and synthetic requests |
| Fees/plans, transactions/subscriptions, analytics/audit /admin | Admin | Route smoke passed; provider settlement and exhaustive configuration mutations not exercised | NOT TESTED | P2: local workflow tests; provider portion BLOCKED |
| Profile, saves, Stack reorder/visibility, reviews/claims /account | User | Routes and private isolation pass; creation passes; remaining individual mutations require follow-up | NOT TESTED | P2: owner acceptance checklist |
| Comparisons, follows, activity, notifications, billing/membership, submissions /account | User | Screens rendered; mobile guest compare works; every account mutation not run | NOT TESTED | P2: follow-up synthetic workflows |
| Playbook steps/resources/Events, moderation feedback, previews, followers/saves/analytics /creator | Creator | Screens render with published fixtures; Skill draft creation passes; complete editorial lifecycle not run | NOT TESTED | P2: independent Admin review and fixture interactions |
| Verification, claims, featured/paid submissions, subscription history /vendor | Vendor | Own routes render and edit-request action passes; other mutations/provider lifecycle not run | NOT TESTED | P2: owner cases; settlement portion BLOCKED |
| Payment cannot assign ownership or organic rank | Vendor/Admin | Existing automated workflow tests cover separation; real payment provider test not executed here | BLOCKED | P1: separately authorized Stripe sandbox |
| Registration/confirmation/recovery and hosted session release | Guest/User | Transitional password mode explicitly unavailable; no signup escalation or accounts created | BLOCKED | P1: reviewed Supabase Auth/SMTP activation prerequisites |
| Payments/subscriptions/refunds | Relevant personas | Disabled external provider; no real transaction attempted | BLOCKED | P1: separately authorized sandbox configuration |
| Upload, scanning and approved download | Creator/User | Storage/scanner unavailable and disabled | BLOCKED | P1: reviewed private Storage/scanner credentials |
| External affiliates and newsletter | Relevant personas | Providers unavailable; newsletter clearly preview-only | BLOCKED | P2: separate provider authorization |
| Exhaustive accessibility, keyboard flows, all breakpoints, large datasets/performance | All | Basic labels/main regions/nested forms and sampled mobile focus checked; full audit not run | NOT TESTED | P2: WCAG/performance acceptance pass |

All four panels **PASS for executed login, rendering and authorization smoke coverage**. None is claimed to have full end-to-end provider or all-mutation acceptance. There are no final HTTP failures; earlier test-infrastructure/route failures are retained in the new initial evidence. Full automated suite: 157/157; HTTP checks: 195/195.
