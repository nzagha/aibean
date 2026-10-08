# Staged delivery

## Stage 1 — Tool discovery and foundation

Implemented: revised menus; scoped search routing; tool directory/detail; taxonomy import; category/subcategory/industry/use-case/trust filters; industry pages; 2–4 tool comparison; legacy redirects; setup-aware sign-in; Clerk integration; Drizzle schema/migration and idempotent seed; server-side account/admin checks; saves; personal stacks; moderated reviews; basic admin draft/publication/review/claim operations; per-tool vendor access; test-only Stripe claim checkout/webhook; isolated database and domain tests.

Public directory is usable without service credentials using explicitly fictional development fixtures. Production with no database does not automatically show demo data. No fabricated reviews or real-world tool claims.

Not yet enabled/verified end to end: Clerk sign-in, connected PostgreSQL, Stripe test checkout and webhook, authenticated browser journeys. Service accounts do not exist yet. Docker Desktop was present but its engine did not respond during implementation. SQL migration was tested using isolated PGlite (PostgreSQL-compatible); this is not a substitute for a connected PostgreSQL smoke test.

## Stage 2 — Complete Tool/User/Vendor slice

Configure services and run authenticated journeys. Expand admin tool editing/taxonomy/trust operations, profile synchronization, persistent compare, review reporting, ranking inputs and contextual ranking display. Add paid tool submissions, edit and verification requests, vendor analytics, refund/dispute handling, claim dispute/revocation and notifications. Harden/test billing before accepting live keys. Current billing code deliberately refuses live Stripe keys.

## Stage 3 — Creator/Skill/Playbook

Creator application/approval; structured Skill and Playbook editors; moderation; resources/uploads; creator profiles, stacks, campaign resource pages and attribution. These public destinations currently explain planned functionality; they are not finished publishing systems.

## Stage 4 — Events/commercial expansion

Event submission, approval, discovery, external registration tracking and archive lifecycle. Creator/Vendor subscriptions, prices/entitlements, labeled placements, follows and in-app notifications.

## Stage 5 — Launch

Approved real catalog/content, full security tests, RLS decision, upload controls, production rate limits, observability, backup/restore drill, accessibility/performance/browser QA, and deployment. None of these gates is implicitly satisfied by a local build.
