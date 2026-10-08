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

