## Imported Claude Cowork project instructions

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## aiBean implementation rules

- Preserve existing branding, typography, layout composition, grid, assets and working behavior. Extend this app; do not rebuild it.
- Follow owner amendments and Master Plan v0.3. Playbooks are included. Enterprise/SAML, anonymous identities and Web3 authentication are explicitly excluded. Public unauthenticated browsing remains allowed.
- Supabase Auth is the sole approved target identity platform. Current legacy auth is transitional; retire it through the validated identity plan, without parallel active auth or email-only account merges.
- Drizzle remains the primary server-side ORM. Preserve internal User IDs, ownership, transactions and applied migration history. Read `docs/SUPABASE_AUTH_MIGRATION_PLAN.md` before auth/schema changes.
- Inspect actual target metadata/history before migrations. Obtain owner approval for an exact migration, impact and validation/recovery plan before changing a non-disposable database. Never reset a shared target.
- Enforce server-side User/Admin/approved-Creator/Tool-scoped-Vendor capability and ownership checks. Registration, payment and user metadata cannot grant privileges.
- Explicitly test grants/RLS on exposed schemas. Drizzle connections do not automatically inherit the visitor's JWT. Keep privileged keys and personal records out of clients, logs and reports.
- Show only configured, validated auth methods. Keep experimental passkeys behind explicit flags. Report implemented/configured/verified separately.
- Preserve Stripe sandbox-only behavior, one approved owner per Tool, and $99/five-day sponsored placements. Payment never grants editorial approval, verification or organic rank.
- Preserve taxonomy IDs/provenance; reconcile the supplied v1.1 workbook before normalizing. Do not invent sub-vertical records or activate excluded product modules.
- Keep `docs/audit/` and version archives as historical snapshots. Maintain active plans/evidence in `docs/FOUNDATION_PROGRESS.md` and `docs/MVP_REMEDIATION_PLAN.md`.
- Work on a `codex/` feature branch with small reviewable commits. Run lint, typecheck, relevant tests, build and runtime dependency audit. Real provider and PostgreSQL tests are required before claiming the auth foundation operational.
