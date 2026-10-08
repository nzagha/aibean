# Proposed repository instructions

**Proposal only.** The actual root AGENTS.md remains unchanged. Review the following additions together with the audit before adopting them. Retain the existing generated Next.js agent-rules block and its instruction to consult installed documentation.

~~~~markdown
## aiBean project conventions

### Authority and scope
- Preserve the approved brand, typography, layout composition, grid and responsive behavior.
- Apply direct approved owner amendments and the documented Product Scope / Master Plan hierarchy.
- Master Plan v0.3 is the technical build reference. Playbooks are included by explicit owner confirmation.
- Discussions, Replies, News, Courses, Social Videos, native mobile, native video hosting,
  direct messaging and Creator payouts remain outside MVP.
- Treat taxonomy/workbook notes as reference data; do not activate excluded features from older notes.
- Record scope conflicts instead of silently choosing a different product.

### Existing architecture
- Use the existing Next.js App Router, TypeScript, Tailwind, Drizzle/Postgres and shared components.
- Read relevant installed Next.js documentation before coding.
- Extend tested services incrementally; do not replace the architecture or redesign the UI without approval.
- Keep source-code claims distinct from verified runtime/deployment behavior.

### Identity and permissions
- Resolve identity and capabilities on the server.
- Enforce ownership on every protected read/mutation; hiding UI is not authorization.
- Vendor is a Tool-scoped capability alongside User/Creator, with one approved owner per Tool.
- Creator publishing requires approval and object ownership.
- Temporary password mode is local preview infrastructure, not a shared public/admin account model.
- Explicitly audit grants, revocations and sensitive administrative actions.

### Data and workflows
- Use versioned Drizzle migrations and inspect actual applied history before altering shared targets.
- Never infer a live database's tables, grants or RLS from schema source alone.
- Preserve taxonomy IDs/provenance and require deterministic import diffs.
- Keep payment, editorial approval and entitlements as separate state machines.
- Never let payment, claim status or sponsorship purchase organic rank or trust.
- Keep Claimed, baseline verification, aiBean Verified, Last Verified and Last Checked distinct.
- Trust changes need authorized evidence and audit history.
- Keep public events separate from analytics_events.
- Preserve personal Stack privacy when adding public/Creator Stack variants.
- Treat localStorage as convenience state, never authoritative permissions or payments.

### Security and validation
- Keep secrets, sessions, service credentials and connection strings out of source, logs and client bundles.
- Use server-only boundaries for privileged services.
- Validate inputs and unsafe URL/file boundaries before new workflows accept data.
- Test with isolated databases; never reset, seed or run destructive tests on a shared target implicitly.
- Validate with relevant tests, typecheck, configured lint, build and bounded HTTP/browser checks.
- Report placeholders, missing configuration, partial modules and unverified results explicitly.
- Preserve version archives and avoid silently rewriting applied migrations.
~~~~

