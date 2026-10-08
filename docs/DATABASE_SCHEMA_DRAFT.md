# Database schema draft

The system of record is PostgreSQL with versioned Drizzle migrations. The Stage 1 schema contains taxonomy, tools, users, saved_tools, stacks, stack_tools, tool_reviews, vendor_access, claim_requests, orders, billing_webhook_receipts, audit_logs, and rate_limits.

Taxonomy imports preserve source IDs. Subcategories reference their parent source ID. Tool category is a foreign key; published structured Tool data is held in a typed JSONB payload during Stage 1. The final normalized taxonomy/link/pricing/feature/ranking tables from v0.3 are still required before broader publishing work. JSONB is not an authorization boundary. Identity, ownership, payment state, claims and review constraints have dedicated relational fields.

Key constraints: one vendor owner per tool; one review per user/tool; rating 1–5; unique saved user/tool pair; unique stack/tool pair; unique order per claim; unique webhook ID. Migrations do not create an admin or seed real customer data. Demo tools are seeded only with explicit AIBEAN_DEMO_MODE=true.

Add later: Creator applications/profiles, Skills, Playbooks and ordered steps, resource assets/pages/campaigns, public events, follows/notifications, submissions/edit/verification records, verification evidence, subscriptions/entitlements, placements, tracked links, analytics_events, versioned score snapshots. Public `events` and `analytics_events` must remain different entities.
