# Current-state audit

**Product:** aiBean  
**Audit date:** 7 October 2026  
**Scope:** Existing Next.js application, source schema, migrations, requirements, security, feature coverage and dashboard readiness.  
**Method:** Read-only source/document inspection, configuration-presence checks, existing isolated tests, typecheck, build and local HTTP smoke checks.  
**Implementation authorization:** None granted by this report. The current follow-up authorizes audit-document creation only.

## Executive assessment

The existing application is a useful staged-MVP foundation. Retain its brand, layout, App Router architecture, Drizzle integration, components and working interactions. It is not a completed monetized MVP.

The strongest evidence supports discovery UI, filtering, comparison, exploration persistence, temporary authentication primitives and initial server-side permissions. Database-dependent workflows have code and isolated-test evidence but cannot be claimed operational against a connected database.

The current architecture can support the full MVP with incremental relational modeling, service boundaries, secure identity/permission work and operational verification. A rewrite or new design system is not justified by the evidence.

## Authority and document hierarchy

| Source | Status and use |
|---|---|
| Owner's direct decisions in this conversation | Controlling amendments: preserve brand/layout; staged MVP; paid featured placements; temporary password login; Playbooks explicitly included. |
| aiBean MVP Product Scope & Functional Specifications v1.1, 27 September 2026 | Reviewed 17-page PDF. Defines functional behavior. Its explicit exclusion of Playbooks conflicts with Master Plan v0.3 and is superseded for that point by the owner's confirmation. |
| aiBean MVP Development Master Plan v0.3, 30 September 2026 | Reviewed as the authoritative technical build plan. Playbooks, Skills, Events, monetization, approvals, capabilities and trust requirements are in scope. Two discovered copies have identical SHA-256 values. |
| aiBean Taxonomy Package v1.1 | Located and compared with v1. Categories, Verticals and Use Cases are unchanged; listing types and architecture sheets expanded. Older product notes are not permission to reactivate excluded modules. |
| Earlier PRD, BestURL specifications/ERDs and ranking documents | Historical references. Relevant sections and ERD text reviewed; not every paragraph of every older document was reviewed. They contain superseded discussion, mobile, authentication and payment assumptions. |
| Repository docs | Implementation notes, not proof of deployed behavior or independent product approval. Several are stale. |

### Confirmed product decisions

1. Preserve the approved brand, layout composition, grid and typography.
2. Deliver in stages; do not call an incomplete stage the full MVP.
3. Featured Tool placements are available to signed-in users, Creators and Vendors, with admin approval before publication.
4. The approved price is $99 for five days. The implementation uses USD; USD was an implementation assumption, not a separately recorded currency confirmation.
5. The implemented placement sequence is review, approval, checkout, verified payment, activation. The owner explicitly required approval before publishing; approval before charging is the current implementation choice.
6. Keep the requested single email/password account temporarily; additional providers are deferred to a later version. This is not authorization to use one shared identity for public multi-user access.
7. Playbooks are included. The owner explicitly resolved the Product Scope/Master Plan conflict during this audit.
8. Discussions, Replies, News, Courses, Social Videos, native mobile, native video hosting, direct messaging and Creator payouts remain excluded from the locked MVP.
9. Paid status never grants editorial approval, organic rank, positive reviews or verification.

## Repository and installed stack

The project uses Next.js App Router, TypeScript, Tailwind, React, Framer Motion, Clerk integration, Drizzle/Postgres and Stripe test integration.

Installed versions observed:
- Next.js: 16.3.6.
- React: 19.3.0.
- TypeScript: 5.9.3.
- Drizzle ORM: 0.45.3.
- Clerk Next.js: 7.9.11.

Other manifest dependencies include Stripe, postgres, Zod, server-only, Upstash Redis/ratelimit and Lucide. Development tools include tsx, PGlite, jsdom, Drizzle Kit, Prettier and Tailwind tooling. Manifest ranges are not the same thing as installed versions.

The directory is not a Git repository. Git status, branch and history checks therefore could not supply evidence. Version 1 and 1.1 source snapshots are documented under versions/. Those checkpoints do not establish a Git remote, CI execution, deployed state or database backup.

### Source organization

- src/app/: public pages, protected account areas, Server Actions and three API handlers.
- src/components/: shared branding, header/footer, cards, search/filter UI, previews, forms and providers.
- src/lib/catalog/: Tool types, imported taxonomy access, filters, logo rules and repository.
- src/lib/db/: server-only Postgres/Drizzle client and schema.
- src/lib/auth.ts and password modules: provider selection, session identity and capability checks.
- src/lib/featured/: placement plan, pure rules and public placement query.
- src/lib/billing.ts: test-only Stripe configuration/client.
- src/lib/ranking.ts: standalone weighted scorer.
- db/migrations/: two SQL migrations with journal and snapshots.
- tests/: 20 tests across catalog, database constraints, placement rules, password/session primitives and UI persistence/hydration.
- scripts/: taxonomy import, seed, admin bootstrap, password setup and HTTP smoke checks.
- docs/: staged product/technical notes.
- public/brand and public/tool-logos: local brand/font assets and example logos.

### TypeScript and framework conventions

TypeScript strict mode and noEmit are enabled; incremental compilation and skipLibCheck are configured. App Router pages use asynchronous request parameters where appropriate. The installed Next.js authentication and TypeScript guidance was consulted. Root AGENTS.md requires reading relevant installed Next.js documentation before coding.

next.config.ts disables development indicators and generated agent rules. There is no production CSP/header configuration in that file. Reading password-session cookies in the root layout makes the current build's routes dynamic; do not mistake this build output for a comprehensive caching design.

## Actual configuration observed

Only presence/absence was inspected; values are intentionally omitted.

| Capability | Observed state |
|---|---|
| Authentication mode | Temporary password mode |
| Temporary account email/hash/session secret | Present |
| DATABASE_URL | Absent |
| Clerk publishable/secret keys | Absent |
| Stripe secret/webhook/claim-price/featured-price settings | Absent |
| Upstash URL/token | Absent |
| Compose local Postgres password | Missing required value during validation |

This establishes that the current app cannot verify database saves, reviews, claims or purchases against a configured service. It does not prove that no unrelated database or cloud project exists elsewhere.

## Working behavior worth preserving

The current navigation matches the locked labels: AI Tools, AI Skills, Events, Creators, Submit, For Vendors and Login/Account. Public discovery supports keyword and structured filters. Invalid/future verification dates do not pass recency filters. General/suggested industry fit is excluded from native/strong industry discovery.

Compare supports two to four Tools and preserves a browser shortlist. Structured unknowns remain visible; no invented recommendation is shown. Preview interactions persist bounded, sanitized exploration data and support reduced motion. The header hydration regression test passes.

Temporary auth uses salted scrypt hashes and signed, expiring, HTTP-only sessions. Admin permissions and object ownership are checked on the server. The database schema enforces one vendor owner per Tool and one review per user/Tool. Stripe test code verifies signatures and separates confirmed payment from claim approval.

Demo Tools and demo placements are explicitly labeled. The newsletter says no email is stored or sent. Production with no database does not automatically claim the development fixtures are a real catalog.

## Validation summary

| Check | Observation | Limit |
|---|---|---|
| npm test | 20 passed, zero failed | Mostly pure/unit/DOM tests plus isolated PGlite constraints; not complete service integration |
| TypeScript, noEmit and incremental false | Passed | Does not prove runtime correctness |
| npm run build | Passed | Generated output changed; pre/post hashes found no non-generated file changes |
| HTTP smoke script | 15 public checks, eight guest redirects, unconfigured billing and unknown Tool handling passed | No authenticated multi-account or real payment journey |
| Migration metadata | Two sequential entries, SQL files present, linked snapshots of 13 then 14 tables | Live migration application unknown |
| Migration execution | Both SQL files execute in isolated in-memory PGlite | Not equivalent to Supabase PostgreSQL permissions/extensions/runtime |
| Docker Compose | Actual env failed on missing password; syntax passed with ephemeral dummy value | No image build, containers, networking or service health verified |
| Lint | Not run: no configured lint script/tooling | Adding lint is proposed |
| npm audit, final full scan | One high-severity package, four moderate development packages | Advisory applicability is configuration-dependent; not proof of exploitation |
| npm audit --omit=dev | One high-severity package finding for Next.js | Earlier clean-runtime statements are superseded |
| Git checks | Not a Git repository | No branches, commits, remotes or working-tree diff verified |

No dependencies were installed, migrations applied, data seeded, accounts granted, settings altered or deployments performed during the audit. Build outputs were the only generated app artifacts refreshed. Audit documents are being written now at the owner's request.

## Missing or unverified inputs

- Connected development/staging/production database metadata and applied migration records.
- Database roles, grants, exposed schemas, RLS, backup and restore evidence.
- Configured Clerk/provider tenant and Stripe sandbox/live configuration.
- Deployment target, TLS/proxy behavior, monitoring and runtime secret provisioning.
- Approved sub-vertical records: neither reviewed taxonomy workbook supplies a dedicated sub-vertical dataset.
- Real researched launch content and verification evidence.
- Full visual/mobile/accessibility browser QA.
- Signed business approval history beyond the documents and conversation available here.

## Documentation drift

docs/PRODUCT_SCOPE.md still refers to taxonomy v1. docs/SECURITY_BASELINE.md says protected actions authenticate from Clerk despite active password mode. docs/DATABASE_SCHEMA_DRAFT.md describes 13 current tables and treats placements as later even though the second migration adds them. Several vendor/billing/route notes predate later additions. Update these after review; do not use them to overrule actual source.

