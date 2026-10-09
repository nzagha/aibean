# aiBean MVP — Stage 1

## Architecture audit and AI review

Start with the [complete audit](docs/audit/AIBean_FULL_AUDIT_2026-10-07.md), or use the [AI review brief](docs/audit/AI_REVIEW_BRIEF.md) and [full ZIP package](docs/audit/AIBean_Audit_Package_2026-10-07.zip). The [audit index](docs/audit/README.md) links the individual reports and evidence manifests.

The audit is a dated snapshot from before this GitHub publication. Its observation that the local folder had no Git repository describes that earlier state. This repository publishes the website source and audit; it does not deploy a live site or configure databases, authentication providers, or payments. Private environment files and original planning attachments are excluded. See [publishing notes](docs/PUBLISHING_NOTES.md).

## Temporary sign-in

Email/password login is enabled locally for the requested test account. Its salted password hash and signing secret live only in ignored `.env.local`. Use `/login`; social sign-in and public registration are deferred. See `docs/TEMPORARY_PASSWORD_LOGIN.md` for the password rules, session handling and later migration. Without a database, the account page shows signed-in status; account-backed saves and paid workflows remain pending setup.

## Stateful exploration

Version 1.1 is saved in `versions/aibean-version-1.1.zip`. The working site retains its original layout and styling while adding spring interactions, in-context preview drawers, browser-persisted exploration and a 20% head-start progress meter. Expanded insights, comparison selections and structured filters survive reloads. See `docs/BEHAVIORAL_UI.md` for behavior, reset controls, accessibility and validation limits.

## Saved design and tool logos

The approved brand/layout baseline is preserved in `versions/aibean-version-1.zip`, with a checksum manifest and restore notes alongside it. The working project adds distinct local SVG logos for all six fictional tools, consistently used in directory/industry cards, featured cards, tool details and comparisons. These are original demo marks, not logos of real businesses. An optional `logoUrl` field supports approved HTTPS image URLs or local `/tool-logos/` assets for real catalog entries; missing or failed images fall back to initials without changing card dimensions.

Featured AI Tools is available on the homepage with the owner-approved offer of **$99 USD for five days**, admin review before payment, and payment-confirmed activation. See `docs/FEATURED_PLACEMENTS.md` for setup and remaining live-service requirements. Test checkout requires `STRIPE_FEATURED_PRICE_ID`; live payments are still disabled.

The approved aiBean branding is retained. Functional authority is the September 30, 2026 MVP Development Master Plan v0.3. The user selected a staged implementation on October 5, 2026.

## Preview without service accounts

Requires Node.js 24 (Node 20.9+ supported by Next.js).

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. Without a database, development mode displays six clearly labeled fictional tools. No real reviews, prices, verification, events, or creator identities are invented. Authentication and charging do not silently run in a fake mode.

The new navigation, scoped search, tool filters/detail pages, industry pages and 2–4 tool comparison are usable. Skills, Playbooks, Events and Creators have clearly labeled later-stage landing pages. Legacy Explore/Knowledge/Collections URLs continue to redirect. The newsletter remains a demo form.

## Supabase development connection

The authoritative development target is Supabase project `yfknxidgphhepdtwazhn`. See [verified connection readiness](docs/SUPABASE_CONNECTION_AND_ENVIRONMENT_READINESS.md). Add the official project URL, publishable key and server-only DATABASE_URL to ignored `.env.local`; use `.env.example` as a checklist, without overwriting existing private settings. Run `npm run supabase:check` for a redacted, read-only service/SQL check. Missing configuration or an unsuitable database role returns a nonzero exit code.

Do not run the old migrations alone against hosted Supabase: observed default grants require atomic RLS and permission hardening. Shared-target migration execution requires the reviewed SQL, test evidence, recovery plan and owner approval. Prepared Supabase utilities are not yet the active authentication system.

## Optional local PostgreSQL tests

Docker Desktop must be running. Use a deliberately isolated local environment and matching local DATABASE_URL; this plain PostgreSQL service is not a Supabase stack. Do not overwrite the hosted development configuration or paste secrets into chat. The commands below are for that local target only, never the shared hosted project.

```sh
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

Postgres uses localhost:54329; Redis uses localhost:63799. No existing containers are deleted. The database persists in a named volume. Seed is idempotent and preserves existing records. Fictional tools are seeded only when AIBEAN_DEMO_MODE=true. Turn this off and curate real tool records before launch.

For the optional Docker app container, run `docker compose --env-file .env.local --profile app up --build`. It uses the explicit DATABASE_URL from `.env.local` and no longer silently substitutes the local database. Local PostgreSQL/Redis services have the `local-services` profile (explicit `npm run db:up` still starts them). For a containerized local database test use host `db`, not loopback. The app is served at localhost:3001; update NEXT_PUBLIC_APP_URL to match when testing there. Existing named volumes are preserved.

## Enable accounts

The owner approved Supabase Auth as the sole identity platform on October 8. The current application still uses transitional password/Clerk code; Supabase website authentication has not yet been implemented or validated. Do not create a new Clerk integration. Agent MCP login does not configure application authentication or database access.

Start with [the Supabase architecture](docs/SUPABASE_AUTH_ARCHITECTURE.md), [identity migration plan](docs/SUPABASE_AUTH_MIGRATION_PLAN.md), and [current stage evidence](docs/FOUNDATION_PROGRESS.md). Existing internal User IDs and ownership must survive migration. The current admin bootstrap is legacy and must be replaced after the identity mapping is verified. Enterprise, Anonymous and Web3 Auth are excluded.

## Test-only claim payments

After database and accounts work, create a Stripe test application/price. Set STRIPE_SECRET_KEY (sk_test only), STRIPE_WEBHOOK_SECRET and STRIPE_CLAIM_PRICE_ID (a fixed one-time test Price). Forward signed events to /api/billing/webhook.

The server owns amount/currency and verifies webhook signatures, order/session identity and paid status. Webhooks deduplicate in a database transaction. Only an independent admin review grants one-owner Vendor capability. No claim can award aiBean Verified or ranking benefits. Demo tools cannot be claimed. Add a real curated tool through Admin for a test journey.

Live Stripe keys are intentionally rejected. Refunds/disputes, abandoned checkout recovery, subscriptions and paid submission/edit/verification workflows are not complete. No live payments should be enabled before Stage 2 and launch security gates.

Reference: https://docs.stripe.com/checkout/fulfillment

## Taxonomy

Imported from the supplied aiBean_Taxonomy_Package_v1 (1).xlsx: 25 categories, 202 subcategories, 18 industries, 40 source use cases and 16 listing types. Source IDs/checksum are retained in src/data/taxonomy.json. The source remains unchanged.

UC-035 (community discussions) and excluded listing-type modules are inactive under v0.3. The workbook is v1 and has no standalone sub-vertical records; no v1.1 coverage is asserted. Re-import with scripts/import_taxonomy.py using the bundled Python/openpyxl runtime and the workbook path. Rerun tests after any taxonomy changes.

## Validation

```sh
npm run lint
npm test
npm run typecheck
npm run build
npm audit --omit=dev --audit-level=high
node scripts/smoke-http.mjs
```

The HTTP smoke script expects the unconfigured local development preview (no auth/billing keys). Unit/database tests cover taxonomy relationships, combined filtering, industry fit, trust/freshness, comparison limits, ranking commercial exclusion, URL validation, relational uniqueness and rollback. Database tests use isolated PGlite; they do not imply a connected PostgreSQL deployment has been verified.

PostgreSQL/provider/Stripe end-to-end journeys and full visual/mobile interaction QA remain pending. Next.js is patched to 16.3.8 on the Supabase foundation branch; the October 7 audit remains a historical snapshot of 16.3.6. Moderate development-only transitive advisories through drizzle-kit remain under review; do not apply an unreviewed forced downgrade to silence them. See docs/FOUNDATION_PROGRESS.md for current validation and blockers.

## Implementation and next stages

The active sequence is [MVP_REMEDIATION_PLAN.md](docs/MVP_REMEDIATION_PLAN.md), with stage evidence in [FOUNDATION_PROGRESS.md](docs/FOUNDATION_PROGRESS.md). It supersedes legacy authentication instructions in earlier stage documents.

See docs/MVP_SCOPE.md for the staged plan and docs/MVP_ACCEPTANCE_MATRIX.md for what is implemented versus verified or pending. Other contracts cover auth, security, data, ranking, billing, vendor workflows, Skills, Playbooks, Creators and Events.

Current schema uses a typed Tool JSONB payload plus relational category, identity, ownership, engagement, reviews, billing and audit records. Normalize the remaining taxonomy/content/ranking relations before expanding publishing workflows. Search is server-side filtering of the small initial catalog; indexed PostgreSQL search and pagination are required before scaling.

Original supplied logo, illustration and Satoshi/Inter/Caveat fonts stay self-hosted in public/brand. No deployment, service-account creation, live billing, real marketing signup, or production launch is performed by this stage.
