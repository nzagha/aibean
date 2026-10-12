# aiBean subscription pricing and entitlements — proposed v1.0.0

12 October 2026. **Proposed / Preview; no customer-facing production activation.** The model is implemented locally with native PostgreSQL and synthetic Stripe-compatible contracts. New hosted tables, private enablement, exact commercial approval and actual provider verification remain separate gates. No real charge, provider product creation, account/email, Auth activation, recovery retry or DNS/deployment action occurred.

## Provenance and approved rules

Master Plan v0.3 sections 21–24 require paid submission/claim/edit/verification, Creator/Vendor subscriptions, free membership and configurable commercial values; section 23.3 requires login before the full Pricing matrix. Original source file and manifest remain unchanged. The owner's revised directive authorizes recommendations and local implementation where values are missing. No prior approved subscription amounts, intervals, plan quota values or fee discounts were found. Existing sandbox `billing_products` values are historical configurations, not silently approved replacement requirements; stored transactions and the older package are preserved.

**Approved and preserved:** free User membership; public unauthenticated browsing; $99/five paid days for Featured Tool placement; independent Admin review; one approved owner per Tool; payment never grants Creator approval, ownership, verification, Admin privileges or organic rank. Existing two-to-four Tool comparisons, 100 account comparisons and 1,000 follows remain unchanged. The five-MB per-file cap remains the existing security limit. Every other numeric value below is a **new recommendation**, not an owner-approved live offer.

## Membership tiers and USD billing

| Tier | Monthly | Annual | Eligibility / purpose |
| --- | --- | --- | --- |
| User Free | $0 | $0 | Any canonical User; personal discovery and engagement. No payment/card requirement. |
| Creator Free | $0 | $0 | Existing approved Creator capability; baseline publishing and reporting. |
| Creator Pro | **$19** | **$190** | Approved Creator plus verified paid subscription; larger publishing volume and request-fee discounts. |
| Vendor Free | $0 | $0 | Existing approved Tool ownership; scoped requests/reporting and Event authorship. |
| Vendor Pro | **$39** | **$390** | Approved Tool owner plus verified paid subscription; higher request volume and fee discounts. |

Annual billing is one upfront payment, equivalent to ten monthly payments: $38/$78 savings against twelve monthly payments (16.67%). No trials, team/enterprise/SAML tiers, unlimited usage, automatic coupons or grandfathered lifetime deals are recommended for the MVP. A User with both approved capabilities may buy both subscriptions; allowances use the highest eligible limit and discounts use the highest eligible percentage, **never a sum**. Buying either plan does not grant the underlying capability.

## Feature comparison and exact quotas

| Feature / allowance | User Free | Creator Free | Creator Pro | Vendor Free | Vendor Pro |
| --- | ---: | ---: | ---: | ---: | ---: |
| Personal Stacks | 20 | 20 | 100 | 20 | 100 |
| Saved Tools + Skills/Playbooks/Events combined | 1,000 | 1,000 | 1,000 | 1,000 | 1,000 |
| Saved private comparisons | 100 | 100 | 100 | 100 | 100 |
| Followed targets | 1,000 | 1,000 | 1,000 | 1,000 | 1,000 |
| Non-archived Skills | 0 | 5 | 50 | 0 | 0 |
| Non-archived Playbooks | 0 | 3 | 25 | 0 | 0 |
| Non-archived Resource Pages | 0 | 3 | 50 | 0 | 0 |
| Non-archived/non-canceled Events | 0 | 2 | 10 | 2 | 10 |
| Stored non-failed files | 0 | 10 | 200 | 0 | 0 |
| Stored file bytes | 0 | 50 MiB | 500 MiB | 0 | 0 |
| Tool submission drafts / UTC month | 10* | 10 | 20 | 10 | 50 |
| Tool edit requests / UTC month | 10* | 10* | 20* | 10 | 50 |
| Verification requests / UTC month | 5* | 5* | 10* | 5 | 20 |
| Claim requests / UTC month | 10 | 10 | 10 | 10 | 10 |

`*` A quota is not authorization: Tool submissions still require approved Creator/Vendor/Admin, and edits/verification require ownership of the specific Tool. A Creator with no Vendor ownership cannot use edit/verification allowances. Vendor-only membership cannot author Skills/Playbooks/resources or upload their files. Administrative operational creation bypasses commercial caps but preserves audits and capability checks; uploaded files still count against the actual content owner's storage.

All tiers retain public discovery, approved free-to-read Skills/Playbooks/resources/Events, personal reviews/saves/comparisons/follows, existing in-app notices and **30-day actual engagement reporting** where capability/ownership permits. No conversion/unique-visitor analytics, media module, priority moderation SLA, automatic verified badge, sponsored inventory, guaranteed traffic or organic rank is bundled. Existing limits on individual content structure, safe file types, five-MB files, comparison size and moderated/private content remain independent security rules.

Lifetime inventory counts include drafts, pending, rejected and published items until archived; canceled Events release their count. Failed uploads release their reservation; pending/rejected/approved stored files continue to consume inventory/bytes. Monthly request allowances count request creation, including unpaid/rejected requests: checkout retries do not consume another request. UTC calendar months reset logically through timestamp queries; there is no rollover or destructive history reset. Storage counts track app-managed bytes, not provider-global capacity. Aggregate provider capacity must be reviewed before enabling uploads.

## Fees, discounts and promotions

| Action | Free base | Creator Pro | Vendor Pro | Rule |
| --- | ---: | ---: | ---: | --- |
| Tool submission | $49 | $39.20 (20%) | $34.30 (30%) | Draft request; paid review still does not publish/grant ownership. |
| Tool edit request | $19 | $14.25 (25%)* | $9.50 (50%) | Tool-scoped ownership and independent approval required. |
| Verification review | $49 | $39.20 (20%)* | $34.30 (30%) | Review fee, no guaranteed badge/result. |
| Tool claim | $49 | $49 | $49 | Separate proof/ownership review; existing three-per-day abuse limit remains. |
| Featured Tool placement | **$99** | **$99** | **$99** | **Five paid days**, labeled sponsored, independent review; no discount/included days. |
| Event authorship / external registration tracking | $0 within eligible quota | Same | Same | No native registration charge, sponsorship package or referral commission is activated. |
| Creator profile / account notifications / approved content reading | $0 | Same | Same | Profile/content approval and privacy rules unchanged. |

Percentages are stored as integer basis points. Discount cents are `floor(base_cents × basis_points / 10,000)`; payable cents are the remainder. Apply one highest eligible discount. No stacking, cash-equivalent credit or fee waiver from a redirect/JWT/client amount. No discount on subscriptions, claims or the approved placement. A reviewed, separately approved configuration may set verification to **$0** as a launch promotion; this creates an explicit zero-price settled review request and retains all editorial checks. Other service fees stay positive and Pro discount caps are 50%.

Other sponsored campaign/Event inventory and affiliate commissions are outside this membership pricing activation. Existing editorial Event featuring remains free, independent Admin work. A paid inventory/affiliate offering needs its own exact product/placement/attribution contract; membership does not create an unsupported paid control.

## Subscription lifecycle, renewal and changes

1. Free membership needs no billing record. Creator/Vendor approval is authoritative server data, independently checked on every privileged workflow.
2. A paid checkout pins config version/hash, plan, interval, base and discount. Only matched, signed test-mode settlement creates an incomplete subscription binding. An `active` provider status alone does **not** grant Pro.
3. A verified paid invoice must match subscription, approved price ID, full USD amount and monthly/annual period. It establishes `paid_from`/`paid_through`; Pro also requires current `active` status, provider end date in the future and retained capability. Invalid/unpaid/live/wrong-price/future-period events cannot extend benefits. Duplicate/stale receipts do not revert renewals.
4. Renewals preserve the purchased plan/version/benefits. New pricing versions retire older checkout configurations without rewriting existing paid memberships or request quotes. New service quotes use the currently approved base fee with the member's purchased discount; existing quotes retain their original payable amount.
5. Free → Pro upgrades take effect after paid checkout/invoice and role validation. Pro → Free is cancellation at period end; paid benefits continue only through the existing valid paid period. Cancellation alone does not delete content or refund money.
6. Monthly ↔ annual changes are scheduled at the current period boundary with no proration/credit. Current benefits stay unchanged until the matching paid renewal invoice. Prepared changes have a stable provider idempotency key; retries cannot create competing intent rows. Provider confirmation is recorded separately from request preparation.
7. `past_due`, `unpaid`, `paused`, `incomplete`, `incomplete_expired`, canceled/ended, missing paid proof and elapsed periods use Free benefits immediately; no unpaid grace period/trial benefits. Recovered `active` status can restore only an already valid paid period. Expiry is evaluated on access, without relying on a cron to revoke benefits.
8. Over-limit existing content is retained. Owner edits/removals remain available, while new allocations stop. Privileged publishing still obeys suspension/ownership rules. Capability loss stops the affected paid benefits; it does not automatically cancel provider billing. Account/Admin cancellation remains available through billing history.
9. Restarting after expiry requires a reconciled terminal provider subscription, avoiding a second subscription while a previous provider subscription could still renew. No history reset or auto-rebuild. Legacy subscriptions without a versioned membership binding retain their original history and do not automatically receive proposed Pro benefits; any assignment requires reviewed reconciliation of the provider purchase and its entitlements.

## Refund and cancellation policy — proposed

Seven-day request window measured from the original transaction's creation. Owner-scoped full-refund requests are idempotent and independently Admin-reviewed with reason/revision/audit. Completed approved review services cannot be approved for refund through this workflow. Pending or rejected review requests may be reviewed; money and editorial outcome remain independent.

Membership cancellation must already be confirmed with the provider before executing a refund, preventing an unexpected subsequent renewal. Only a matched **completed sandbox refund** revokes paid benefits and blocks refunded request fulfillment. An Admin approval or pending provider refund does not claim money returned. Original paid transaction/editorial/capability histories are preserved; the separate refund ledger records the outcome. Refund retries use a stable provider key. Chargebacks, tax adjustments, partial refunds, discretionary completed-service exceptions and automatic proration are not offered as working controls. A reviewed manual exception/provider contract would be required. Claim/Featured historical orders retain their original separate workflow; no automatic refund is attached to them by this package.

## Configuration, administration and safety

Central recommendation: `src/lib/pricing/config.ts` (`pricing-v1.0.0`), including approved placement constant, five stable plan IDs, cents, quotas, basis points, file/analytics/request-window limits and labels. Recommended configuration SHA-256: `263f3fdd0343f31f1cbaaf6ce516855b356b8416272c646ca36a9c83937a3ff6` (calculated from canonical validated JSON; editing any value requires a new approved digest).

Services: `src/lib/pricing/{releases,entitlements,payments,lifecycle,storage,sandbox-provider}.ts`. New Drizzle types: `src/lib/db/pricing-schema.ts`. Quota allocation checks are wired into Stack creation, combined saves, comparisons/follows, content drafts, upload reservation, Tool submissions, Vendor edits/verification and claims. Account advisory locks serialize allocation/quote state; audits and writes share transactions. Duplicate saves do not consume a quota slot; confirmed refunds cannot satisfy fee settlement.

Interfaces: authenticated `/pricing`; `/account/membership` and billing; Creator/Vendor dashboard membership summaries; `/admin/commerce/pricing` for create/edit proposed JSON, review, exact checksum/test-price activation and refund decisions. Shared components ensure consistency. Admin may not edit reviewed/active settings in place: clone a new version. Every change has reason, revision and audit. Legacy single-product controls are suppressed when the new model is enabled; unquoted historical pending checkouts require reconciliation rather than retroactive repricing.

Storage: five new public RLS tables `pricing_releases`, `pricing_quotes`, `membership_bindings`, `membership_changes`, `pricing_refunds`, **15 FKs**, separate private read-only installation ledger. No existing table/column/migration is altered. [Exact forward proposal, dependencies and recovery](PRICING_V1_DATABASE_PROPOSAL.md).

Enablement requires validated pricing storage and `AIBEAN_PRICING_WORKFLOWS=true`. Sandbox activation additionally requires **separate owner authorization for the exact config** reflected privately in `AIBEAN_PRICING_APPROVED_SHA256`, canonical Admin review and all four independently verified USD test-mode monthly/annual provider price IDs. These private settings were not changed. No source recommendation or Admin review automatically activates offers. UI stays **Proposed / Preview**, even for an approved sandbox rehearsal. Live keys/charges remain unsupported.

## Recommendation rationale and current research

These are launch hypotheses, not conversion/revenue guarantees. Moderate Creator pricing funds more publishing capacity; Vendor pricing reflects repeated commercial review/analytics usage. Annual prices simplify billing without an additional tier. Free accounts retain discovery/community utility; subscriptions sell volume and reduced operating fees, never trust/rank. Conservative discounts leave a positive review fee and avoid an unimplemented credit ledger.

On 12 October 2026, [Toolify's own submission page](https://www.toolify.ai/submit) showed a $99 submission fee. [The Next AI's own page](https://www.thenextai.com/submit-ai-tool/) showed free basic listing and $199/30-day featured placement. These demonstrate varied directory monetization, not equivalent audiences/results; aiBean's proposed $49 submission is an initial lower-cost hypothesis, and its owner-approved $99/five-day placement is preserved. Futurepedia/TAAFT pages could not be reliably fetched; third-party fee summaries were not used as verified pricing evidence.

Provider design follows [Stripe verified subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks), [scheduled subscription phases](https://docs.stripe.com/billing/subscriptions/subscription-schedules) and [proration controls](https://docs.stripe.com/billing/subscriptions/prorations). Actual event delivery, schedule/refund/provider-account behavior still requires separately authorized test-mode verification. No provider call was made during this implementation.

## Validation, version history and remaining gates

**109 automated tests**, **38 native PostgreSQL scenarios**, **12 new HTTP checks**, lint/TypeScript/build and runtime audit evidence are recorded in [validation](evidence/pricing-v1-validation.json), [native](evidence/pricing-v1-native-postgres.json), [HTTP](evidence/pricing-v1-http.json) and [browser](evidence/pricing-v1-browser.json). Tests use Admin, two ordinary Users, Creator and Tool Vendor fixtures; include activation denial/live-price rejection, integer discounts, duplicate checkout, actual Free/Pro content and Stack limits, monthly boundaries, pre-upload quota denial, downgrade preservation, invoice-backed renewal/expiry, stale receipt handling, refunded fulfillment denial, ownership, concurrency and audit rollback. Sampled desktop/mobile UI and Admin create/adjust/review work; real provider activation/checkout/schedule/refund remain unverified.

| Version | Date | Change / authority |
| --- | --- | --- |
| Master Plan v0.3 + owner placement amendment | Existing approved sources | Free membership, paid configurable commercial objects, gated Pricing, independent moderation, $99/five days. Original bytes retained. |
| Pricing proposal v1.0.0 | 12 Oct 2026 | Five tiers, recommended prices/quotas/discounts/lifecycle/refunds; owner-authorized proposal implementation, not live approval. |
| Future revisions | Separate reviewed proposal | New version/hash, before/after values, reason, audited review, independent activation authorization and verified test prices. Existing paid snapshots preserved. |

Next gates: current approved full-scope recovery/inventory; exact prior proposal and pricing schema approvals; review actual provider/global storage capacity; separately approved configuration hash and sandbox price bindings/webhook/schedule/refund tests; identity/provider readiness and coordinated launch/cutover. Affiliate management, extended campaign/media relationships and production release gates remain separate product work. No “pricing values unspecified” blocker remains for this proposed model.
