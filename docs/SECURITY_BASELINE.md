# Security baseline and open gates

Updated 8 October 2026. The October 7 audit is historical evidence; this document describes current boundaries and the approved Supabase target without claiming that planned protections are deployed.

## Observed implementation

Local auth currently uses a shared temporary password identity; Clerk is a conditional legacy path with absent keys. The password session is signed/expiring and logout clears its cookie, but this is not the approved long-term identity platform. Supabase website login is not yet implemented/configured. The agent's MCP authorization does not authenticate application users.

Existing actions resolve User/Admin identity server-side and scope several User/Vendor operations. Missing Creator/content/entitlement helpers and integrated cross-account tests prevent a complete authorization claim. Inputs validate URLs, IDs and content; redirects reject unsafe forms. Rate counters use PostgreSQL, but the temporary login limit is process-wide and is not a distributed abuse control.

Stripe code only accepts sandbox keys/events. Signature verification, order/session/amount reconciliation and transactional webhook deduplication exist; payment alone does not grant ownership or editorial approval. Preserve $99 for five days, Admin approval before publication, and separation from organic ranking. End-to-end Stripe configuration and recovery tests remain pending.

## Required Supabase boundary

- Supabase Auth alone after validated cutover; verified claims, fresh user state where needed, safe callback origins and no token-bearing logs.
- Stable private Auth-to-User mapping; no email-only legacy merge or client capability assignment.
- Separate browser/server clients. Publishable keys only in browser bundles; database and privileged secrets stay server-side.
- Request-scoped SSR cookies/refresh with private cache behavior. Reauthentication/AAL checks for sensitive changes and explicit revocation limitations.
- Least-privilege Drizzle runtime role and explicit authorization; direct SQL does not inherit a user's JWT context.
- Inventory and test exposed schemas, grants and RLS. Enable RLS on exposed application tables with deliberate policies or no direct API access. Existing SQL has no policies; live protection is unknown.
- Shared rate limits and delivery abuse controls; provider settings and actual email/SMS delivery must be validated before enabling methods.

## Dependency and CI policy

Pin changed dependencies and commit the lockfile. Next.js is patched from 16.3.6 to 16.3.8 in the foundation branch. CI adds lint, explicit typecheck and a high/critical runtime audit gate to tests/build. Lint uses JavaScript/TypeScript/React Hooks recommended rules; it is not a full accessibility or Next-specific lint audit.

The Next ESLint preset was not retained because its glob dependency chain introduced an unresolved high-severity development advisory during assessment. Four pre-existing moderate package entries remain in Drizzle Kit's deprecated esbuild-loader chain. Do not accept npm's suggested major downgrade merely to silence this chain. Assess a compatible replacement separately and validate migration generation. Do not run an exposed dev server using that vulnerable esbuild chain. A zero-runtime-advisory result is not security certification.

## Release gates still pending

Live database/migration/grant/RLS inspection; actual isolated PostgreSQL upgrade/isolation tests; provider login/verification/recovery/linking/MFA tests; secure session revocation and callback attack tests; full Admin/Creator/Vendor boundaries; authenticated browser regression checks; CSP/TLS/proxy verification; redacted monitoring; tested backups/restore; payment reconciliation; safe Storage upload/delivery before accepting assets. Enterprise, Anonymous and Web3 Auth remain excluded.

For any shared database change, owner approval must follow a concrete target/SQL/data-impact/validation/recovery review. No shared database modification is authorized merely because a migration file compiles.
