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

