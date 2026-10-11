# MVP acceptance matrix — 11 October 2026

Available local workflows pass bounded acceptance; **full hosted MVP acceptance is incomplete**. Local execution does not imply hosted installation/provider readiness. This supersedes the earlier 94-test snapshot; historical audit/version documents remain unchanged.

The required classifications below are literal. An incomplete portion is listed separately from working installed/provider-dependent behavior.

| Requirement | Classification | Evidence / exact dependency |
| --- | --- | --- |
| Existing brand/layout/assets and unauthenticated public browsing | Implemented and locally verified | Actual desktop/tablet/mobile renders; existing homepage composition/fonts/colors/card grids preserved. |
| Shared navigation, scoped search and canonical workspace denial | Implemented and locally verified | Browser/HTTP plus independent server authority tests. |
| Registration/onboarding and inactive Supabase candidate forms | Implemented but awaiting provider testing | Accurate password-mode unavailability; candidate tests pass; no hosted signup/mail. |
| Admin counts/queues, Tool CRUD/preview/lifecycle/search/pagination/audits | Implemented and locally verified | Existing-schema PGlite/native, actual Admin browser moderation, stale/concurrent/rollback checks. |
| Stable-ID taxonomy metadata and subcategory routing | Implemented and locally verified | Duplicate historical slug fails closed without parent; no taxonomy bytes/IDs changed. |
| Approved v1.1 reconciliation and sub-vertical source | Incomplete implementation | Later approved binary unverified; do not substitute historical v1 or invent records. |
| Review/claim moderation, ownership and self-review exclusion | Implemented and locally verified | Native independent sessions, Tool-first locking, canonical ownership and browser ordinary review → Admin → public. Real payment gated. |
| Creator application, Vendor requests, disputes and capability requests | Implemented but awaiting hosted installation | Five-table review proposal; transitions, reasons, payment/ownership/revisions and audit. |
| Protected Admin/Creator capability activation | Incomplete implementation | Operator-specific User/request/revision/evidence approval and validated procedure required; runtime cannot set flags. |
| Commercial submissions/payments/subscriptions/pricing administration | Implemented but awaiting hosted installation | Four-table commercial proposal/eight FKs; restricted grants, idempotency and rollback pass. |
| Real Stripe sandbox checkout/webhook/subscription reconciliation | Implemented but awaiting provider testing | Exact test product/price/webhook/fixture approval; no real provider execution. |
| $99/five-day sponsored review/scheduling and organic-rank separation | Implemented and locally verified | Synthetic scheduling and independent editorial/payment/rank tests; real provider activation remains gated. |
| Subscription quotas/discount entitlements and commercial exceptions | Incomplete implementation | Reviewed entitlement/exception contracts/persistence and approved plan values missing. |
| User Tool saves, owned Stacks and review submit/edit feedback | Implemented and locally verified | Browser saves/create/add/review/reload; native cross-account, stale CAS and atomic audit. |
| User profiles/content saves, Stack order/notes/visibility | Implemented but awaiting hosted installation | Content package; native owner/privacy/order/confirmation tests and actual User journey. |
| Durable authenticated saved comparisons and complete fit model | Incomplete implementation | Missing account comparison/member model and reviewed fact/fit inputs. Required MVP, not optional. |
| Browser comparison persistence/context explanation/keyboard table | Implemented and locally verified | Four-item bound/reload, missing facts, current verification/version checks, contained scrolling. |
| Creator follows and account-scoped in-app decision notifications | Implemented but awaiting hosted installation | Existing content model; recipient isolation, stale/no-duplicate and notification/decision/audit rollback. No mail. |
| Tool/Skill/Playbook/Event/industry follows and update fan-out | Incomplete implementation | creator_follows is Creator-only; additional target/fan-out model needed. |
| Separate Skills/free Playbooks, steps and relationships | Implemented but awaiting hosted installation | Native moderation/privacy; public detail HTTP; reverse Skill → published Playbooks added. |
| Creator profiles/resources/campaigns/public Stacks | Implemented but awaiting hosted installation | Actual @handle/profile/resource publication; private/suspended excluded; Stack relationship query passes. |
| Campaign Tool/Stack/Event/media blocks and profile media/social metadata | Incomplete implementation | Current external CTA and Skill/Playbook links work; additive relationship/media/profile storage needed. |
| Public Events/formats/dates/timezone/external registration/moderation | Implemented but awaiting hosted installation | Native published/canceled filtering, HTTP editor and validated outbound POST; no real registration sent. |
| Tools/Skills/Playbooks/Events/Creator scoped search and context filters | Implemented and locally verified | HTTP directory/empty/context routes; pagination tests; Creator matching excludes drafts. Content hosted package still gated. |
| Categories/verticals/use cases and strong/native industry fit | Implemented and locally verified | Stable taxonomy/filter contracts, redirects and contextual discovery links. |
| Private resource upload/scan/review/download application services | Implemented but awaiting hosted installation | File proposal/five FKs and native owner/metadata contracts; separated action forms. |
| Real private Storage policies/scoped secrets/malware engine | Implemented but awaiting provider testing | Synthetic adapters/protocol pass; actual bucket/engine/signatures/provider behavior unverified. |
| Vendor owned inventory/requests/Events/aggregates | Implemented but awaiting hosted installation | Native Tool scope/HTTP denial, browser owned inventory; proposals and Stripe provider gate. |
| Daily outbound aggregates and operational summaries | Implemented but awaiting hosted installation | engagement_counters/concurrency/account isolation; synthetic evidence only. |
| Behavioral/campaign/conversion analytics and aiBean affiliate management | Incomplete implementation | analytics_events, attribution/session/affiliate configuration models and privacy/retention contracts missing. |
| Production identity/session engineering and exclusive Supabase cutover | Incomplete implementation | Shared Auth throttle/replay, recent-auth/revocation guarantees, legacy continuity and release mode still need engineering. |
| Hosted email/recovery/social/MFA/account-security behavior | Implemented but awaiting provider testing | Inactive candidate only; concrete SMTP/password/redirect/provider and two-account/mail approval. |
| Full accessibility conformance and indexed production load | Incomplete implementation | Sampled keyboard/focus/reduced-motion/responsive checks pass; no full WCAG/scale claim. |
| Real launch content and selected HTTPS deployment | Incomplete implementation | Synthetic fixtures are not launch content; curated import, hosting/DNS/monitoring/release approvals. |
| Discussions/Replies/News/Courses/Social Videos, DM/native video/payouts | Outside approved MVP scope | No excluded historical listing-type modules activated. External course/resource links allowed. |
| Enterprise/SAML, anonymous identities and Web3 | Outside approved MVP scope | Owner exclusions; public anonymous browsing remains allowed. |

Current evidence: **104 automated tests**, **29 native PostgreSQL scenarios**, lint/TypeScript/build PASS and **zero runtime vulnerabilities**. Exact HTTP count/outcomes: [route evidence](evidence/mvp-product-http-acceptance.json). Actual browser journeys and limits: [browser evidence](evidence/mvp-product-browser-acceptance.json). No skipped tests or fabricated provider PASS.

[Corrections, prioritized gaps and external approvals](MVP_PRODUCT_ACCEPTANCE_AND_UX_RESULT.md), [route-by-route coverage](MVP_ROUTE_FUNCTIONAL_COVERAGE.md), [native evidence](evidence/mvp-product-native-acceptance.json), [completion report](AIBEAN_MVP_PRODUCT_COMPLETION_REPORT.md).
