# Evidence register and validation record

## How to use this register

D-identifiers refer to source requirements. E-identifiers refer to implementation or validation evidence. F-identifiers identify findings in Architecture Review. A-identifiers identify proposed remediation tasks.

Repository-relative paths resolve from the AIBean project root. Original reference documents were located outside that root in Downloads or among project attachments; names and fingerprints below help the owner provide the correct files. Original documents and application source are not bundled in this audit archive.

Line numbers were observed during the audit and may change. SOURCE_FILE_MANIFEST.json records report-packaging-time hashes of the allowlisted source files that still exist. A hash establishes a file identity, not correctness or proof that every line was audited.

## Requirement sources

### D01 — aiBean MVP Development Master Plan v0.3

Original supplied filename: aiBean _MVP_Development_Master_Plan_v0_3.docx.  
Also found: aiBean_MVP_Development_Master_Plan_v0_3 (1).docx.  
Both SHA-256: 681babdd70cbf6d969c3ef21803bb8c0588436de2d2a711397f4350c412c6989.  
Document date: 30 September 2026.

Key requirements used:
- §§10–12: additive capabilities, one owner, distinct product objects and relationships.
- §§13–20: Tool discovery, Skills, Playbooks, Creator resources, Events, search, engagement and reviews.
- §§21–23: paid supply/trust workflows, distinct verification concepts, monetization/subscriptions.
- §§24–25: explainable contextual ranking and durable analytics.
- §§26–31: stack direction, server permissions, security, payments, upload controls and rate limits.
- §32: required database families.
- §§33–36: routes, UI contracts and dashboard operations.
- §§37–41: vertical slices, prioritization, seed content and launch gates.

The document's minimum private-alpha direction includes a core Tool/User/Admin workflow and an end-to-end paid Vendor flow. Full MVP remains larger than the current staged implementation.

### D02 — MVP Product Scope v1.1

Filename: aiBean_MVP_Product_Scope_v1_1.pdf.  
17 pages; date 27 September 2026.  
Reviewed full extracted text.

Primary evidence includes locked navigation, User/Creator/Admin experiences with Vendor capability, paid approvals, separate trust concepts, Events, resources and gated pricing. Pages 8, 14, 15 and 17 exclude Playbooks, conflicting with D01. The owner explicitly resolved that conflict in favor of including Playbooks.

### D03 — Taxonomy v1.1

Filename: aiBean_Taxonomy_Package_v1_1.xlsx.  
SHA-256: cdf562820a74ff5001821ff91f39f4a53f4729b6a5096ff55f8828b573bd5f54.  
Workbook README generation date: 4 June 2026.

Compared normalized non-empty records with aiBean_Taxonomy_Package_v1 (1).xlsx:
- Categories: 25 data records, unchanged.
- Verticals: 18 data records, unchanged.
- Use Cases: 40 data records, unchanged.
- Listing Types: 21 data records versus 16 previously.
- Eight new architecture sheets: Product Object Map, Relationship Map, Page Inventory, Creator Profile Modules, Smart Link Rules, Visibility & Permissions, MVP Scope, Schema Readiness.
- Facets/notes also changed.
- The importer derives 202 subcategories from the unchanged category list.

The imported v1 JSON records source SHA-256 3adb157a616c8a4acecef8d0f9fce05b9f7e67982fce25314259ed52b5436cf6. Source fingerprints are provenance, not approval of all old product notes.

### D04 — Historical supporting material

Relevant sections/headings and ERD text were reviewed, rather than claiming an exhaustive read of every older paragraph:
- AI_Sites_Ranking_Reviews_Technical_Specifications_v1.4.docx (internal title/version references include v1.3).
- BestURL_Ranking_Methodology_v1.docx.
- BestURL_Screen_Specs_v1.docx.
- BestURL_ERD_Core_v1.pdf.
- BestURL_ERD_Monetization_Ops_v1.pdf.
- Update this page to have the Subcategory automatically updates.docx.
- aiBean _PRD_Private_MVP_v0_3.md: identified as an older working draft; reviewed relevant scope content.

The old PRD is dated June 7, 2026 and includes discussions and deferred payments; it does not override the later September scope. Old screen specs include Expo/mobile; native mobile remains excluded.

### D05 — Direct owner decisions

Conversation evidence:
- Preserve brand/layout and deliver a staged MVP.
- Featured placement price: $99 for five days.
- Admin approval before publication.
- Temporary email/password account; other login features later.
- Read-only audit, no application/database changes.
- During audit: “Include Playbooks, following Master Plan v0.3.”
- Subsequent request: provide the full audit in a form another AI can review.

Credential values are intentionally excluded.

## Implementation evidence

| ID | Files / observation | What it supports |
|---|---|---|
| E01 | package.json, package-lock.json, tsconfig.json, next.config.ts, AGENTS.md; Git command results | Stack, scripts, strict typing, framework instructions, no Git repository |
| E02 | src/app/globals.css, layout.tsx; components/header.tsx, footer.tsx, logo.tsx, exploration-provider.tsx, interactive-preview.tsx; hooks/use-local-storage.ts | Existing brand/shared layout, local fonts, nav, persistence and interactions |
| E03 | src/app route inventory and production build route output | Existing public/protected/API/compatibility route coverage |
| E04 | Presence-only configuration check; no values printed | Password mode present; database/Clerk/Stripe/Upstash settings absent |
| E05 | src/lib/db/schema.ts; db/migrations/*.sql and meta/*.json; src/lib/db/index.ts | Fourteen source tables, FKs/checks, server-only client, migration sequence; not live state |
| E06 | src/lib/auth.ts, password-auth.ts, password-crypto.ts, password-policy.ts; src/app/api/auth/*/route.ts; src/proxy.ts; scripts/grant-admin.ts | Sessions, capability checks, temporary-mode limits and admin mismatch |
| E07 | src/app/actions.ts, src/app/admin/page.tsx, src/lib/validation.ts | Ownership/auth guards, admin/review/claim actions, input validation and mutation limitations |
| E08 | src/app/featured/actions.ts; src/lib/featured/plan.ts, rules.ts, repository.ts; components/featured-tools.tsx | Price/window, sponsorship disclosure, eligibility, blocking requests and checkout logic |
| E09 | src/lib/billing.ts; src/app/claim/actions.ts; src/app/api/billing/webhook/route.ts | Test-only Stripe, claim-specific orders, signatures, reconciliation and editorial separation |
| E10 | src/lib/catalog/repository.ts and src/lib/featured/repository.ts | Unbounded reads, detail lookup, relational derivation versus JSON featured projection |
| E11 | src/data/taxonomy.json; src/lib/catalog/taxonomy.ts; scripts/import_taxonomy.py and seed.ts | Imported v1 source, source-version hardcoding, generated IDs, no-update seeding and excluded use case |
| E12 | src/lib/ranking.ts; src/lib/catalog/types.ts, filter.ts; src/app/compare/page.tsx | Pure scorer, absent integrated rank, trust fields, recency and compare unknowns |
| E13 | tests/*.test.ts; scripts/smoke-http.mjs; executed command results | Exact bounded validation described below |
| E14 | src/app/account, vendor, creator, admin, submit/tool, search, skills, playbooks, events, creators and pricing pages | Dashboard partial implementations and placeholders |
| E15 | Final npm audit and npm audit --omit=dev results; upstream advisory pages | Dependency findings and conditional applicability |
| E16 | versions/README.md, version-1.json, version-1.1.json | Documented version snapshots; not verified deployment or Git history |
| E17 | Dockerfile, docker-compose.yml, .dockerignore, .gitignore, .github/workflows/ci.yml, src/app/error.tsx and security.ts | Development infrastructure, declared CI, generic errors and DB rate counters |

## Selected source excerpts

These excerpts are small review aids, not a replacement for the complete files.

### Claim-only order model — E05

src/lib/db/schema.ts, around line 123:

~~~~typescript
export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  claimId: text("claim_id").notNull().references(() => claims.id).unique(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull().default("pending"),
  stripeSessionId: text("stripe_session_id").unique(),
});
~~~~

Formatting is condensed; field semantics match inspected source. Mandatory claimId is the reason for F06, not merely the name of the table.

### Admin bootstrap identity restriction — E06

scripts/grant-admin.ts, around line 5:

~~~~typescript
if (!id?.startsWith("user_") || !process.env.DATABASE_URL)
  throw new Error("Usage: npm run admin:grant -- user_<verified Clerk user ID>");
~~~~

The password identity function prefixes a hash-derived ID with password_. No credential value is involved in this observation.

### Global temporary limiter — E06

src/lib/password-auth.ts, around line 31:

~~~~typescript
const processState = globalThis as unknown as {
  passwordAttempts?: { count: number; expires: number };
};
// On expiry: { count: 0, expires: now + 15 * 60_000 }
const state = processState.passwordAttempts;
if (state.count >= 10) return false;
state.count++;
return true;
~~~~

This is an explanatory excerpt; initialization checks are omitted. The bucket is shared by all requests on that process.

### Catalog detail lookup — E10

src/lib/catalog/repository.ts, around line 36:

~~~~typescript
export async function getTool(slug: string) {
  return (await getTools()).find((t) => t.slug === slug);
}
~~~~

getTools also loads all approved reviews and vendor owners and repeatedly filters them for each Tool.

### Unpaid placement blocking — E08

src/app/featured/actions.ts, around line 49, includes this qualifying branch:

~~~~typescript
inArray(featuredPlacements.status, ["pending_review", "approved"])
~~~~

It is OR'ed with unexpired active/suspended placements. There is no age/expiry condition for the pending/approved branch; the request function rejects when an existing qualifying row is found.

### Source-version hardcoding — E11

scripts/import_taxonomy.py constructs the result with:

~~~~python
"sourceVersion": "v1 (provided workbook)"
~~~~

The seed uses onConflictDoNothing for imported records. Updating the source workbook alone does not update existing DB metadata.

## Safe validation performed

### Unit/DOM/isolated database suite

Command: npm test. Result: 20 pass, 0 fail.

The observed test behaviors:
1. Taxonomy counts, unique IDs and valid category references.
2. Combined category, pricing and search filters.
3. Industry discovery excludes general/suggested fits.
4. Unknown/future dates and missing reviews fail applicable trust filters.
5. Comparison cap, removal and deduplication.
6. Ranking ignores monetary/ownership fields.
7. Unsafe return paths/protocols and invalid reviews are rejected.
8. Migrations enforce ownership, review/rating constraints and billing deduplication.
9. Exploration starts at 20%, rewards distinct inspections and stops at 100%.
10. Stored exploration is sanitized and bounded.
11. Filter preferences exclude search text/arbitrary fields.
12. Featured checkout price validation accepts only the approved one-time test offer.
13. Placement duration is five days and end boundary is exclusive.
14. Payment matching rejects unpaid/mismatched/unrelated sessions.
15. Server-rendered header hydrates under reduced motion without attribute mismatch.
16. Persistence survives remount, syncs tabs and tolerates blocked/corrupt storage.
17. Password policy enforces length, uppercase, digit and special character.
18. Password hashing uses random salts and rejects incorrect/malformed inputs.
19. Sessions reject forgery, expiry, identity changes and rotated credentials.
20. Preview interaction stays in context and preserves expansion/progress.

The database test creates new PGlite(), applies SQL to that isolated instance and closes it. It does not use DATABASE_URL. DOM tests use jsdom; native dialog/focus/visual behavior is not fully established.

### TypeScript

Command: node node_modules/typescript/bin/tsc --noEmit --incremental false.  
Result: exit 0, no diagnostics. No incremental cache was requested by this command.

### Production build

Command: npm run build under a hash-comparison wrapper.  
Result: exit 0, Next.js 16.3.6, compiled/typechecked/generated route output successfully.  
All current application routes reported dynamic server rendering.

The wrapper hashed non-generated workspace files before and after. Output: NON_GENERATED_FILES_CHANGED []. It excluded node_modules, .next, .git and tsbuildinfo. Therefore this proves no non-generated content changes during that build, not a Git diff for the entire historic task.

The first build attempt was not executed because automatic approval review temporarily hit a usage limit. After the owner asked to continue, the retry executed and passed. There is no remaining build-approval blocker.

### HTTP smoke

Command: node scripts/smoke-http.mjs against the existing localhost development app.

Passed:
- Homepage and featured offer.
- Tool directory, combined filters, no-results and verification filters.
- Tool detail and industry discovery.
- Valid/invalid comparison.
- Skills/Playbooks/Events/Creators placeholder pages.
- Login page.
- Guest redirects for account/admin/pricing/vendor/creator/submission/claim/placement management.
- Unconfigured billing returns 503 before database access.
- Unknown Tool shows not-found content and noindex.

The script permits 200 or 404 for streamed not-found responses; this is not proof that every unknown route returns HTTP 404. It does not log in as multiple users or create a purchase.

### Docker

Actual command: docker compose --env-file .env.local config --quiet.  
Initial result: missing required POSTGRES_PASSWORD value.

A second validation supplied an ephemeral dummy value only in that command's process environment, then removed it. Syntax validation passed. No file was changed and no containers started. This is not a configured working development database.

### Migration metadata

Journal entries 0/1 and SQL files exist. Snapshot 0000 contains 13 tables; 0001 contains 14 and points to 0000's ID. PGlite replay passes. No actual Drizzle migration ledger was available.

### Dependency audit

Final npm audit: exit 1; one high and four moderate package findings.  
Final npm audit --omit=dev: exit 1; Next.js package finding classified high.  
Earlier audit output in the same session did not include Next.js; the latest scan supersedes it.

No npm audit fix, install, dependency edit or downgrade was performed.

### Not executed or unavailable

- Lint: absent configuration/script.
- Live PostgreSQL/Supabase metadata, RLS/grant tests and actual applied migrations: no connection.
- Clerk provider configuration/session tests: no keys.
- Stripe sandbox end-to-end/signed handler integration: no settings/database.
- Multi-account IDOR/action tests: absent suite/configuration.
- Production deployment, TLS, health, backups/restore and alerting: unverified.
- Real browser visual/mobile/full accessibility QA: not performed in this audit.
- Git commit/branch/remote history: no repository.

## Version snapshot metadata

Version 1 metadata records 118 files and SHA-256:
859598ab6cf5891e292f4d077e75b8cd90e2133ad5de4d4b61a05740585e7b45.

Version 1.1 metadata records 128 files and SHA-256:
a2637eecedd18e5ce60704fa35df3aee0aaaa425f6a7d3a66fcf4aa365288a30.

These values were read from version manifests; archive contents/checksums were not independently revalidated during this audit. Metadata describes exclusion of private environment files, databases, dependencies, generated output and original attachments.

## Review limitations

No live database data is asserted. No security exploit is claimed. No blanket statement that the site is secure or complete is justified. This artifact supplies source-based findings and bounded validation, not a penetration test, legal/compliance assessment or production approval.

