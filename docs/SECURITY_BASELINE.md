# Security baseline

Every protected server action authenticates from Clerk; identity and capability are read server-side. Client role fields are never accepted. Bootstrap admin capability only with `npm run admin:grant -- user_...` using a verified Clerk user ID. Saved-tool keys and stack queries include the signed-in owner. Vendor ownership is unique per tool in PostgreSQL. Paid claims need confirmed payment plus a separate admin decision.

Input schemas validate URLs, IDs, tool content, rating ranges and review length. React escapes user text; no arbitrary HTML editor is provided. External URLs must be http/https and cannot contain embedded credentials. Redirect targets reject absolute, protocol-relative and backslash forms. Server Actions retain Next.js Origin/Host protections. Mutations use atomic PostgreSQL rate counters; they fail closed if the database is unavailable. A production retention job must remove expired rate-limit buckets.

Stripe webhook signatures are verified against the raw body; event IDs deduplicate transactionally; amount, currency, order and session are reconciled. The browser return page grants no entitlement. Only Stripe test keys are accepted. Never treat test-mode completion as live billing readiness.

Remaining launch work: full authenticated IDOR/CSRF tests, CSP compatible with Clerk, production RLS configuration, review reports, upload controls, Redis/Upstash integration, bot protections, database counter cleanup, logging policy, production secret provisioning, backup/restore and security review. No file uploads exist in Stage 1. Do not expose the local Docker databases publicly.
