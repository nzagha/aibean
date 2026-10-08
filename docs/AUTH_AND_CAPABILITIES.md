# Authentication, capabilities and RLS contract

Updated 8 October 2026. Target: Supabase Auth alone. Current implementation still contains the temporary password/Clerk selection; replacement is gated by the identity migration plan. This is an authorization specification, not evidence of implemented or deployed policies.

## Identity and capability resolution

Verify Supabase claims on the server, resolve the stable internal User through the private mapping, then query authoritative database capabilities. Never trust client role fields, user_metadata, email-domain matching, login method, payment redirects or hidden navigation. Privileges do not follow from being authenticated.

Retain additive User/Creator/Admin capabilities; Vendor remains ownership of a specific Tool. Registration provisions a User with no privileged capabilities. Creator publishing requires approval; Vendor ownership requires approved proof plus applicable verified payment. The existing unique vendor_access.tool_id constraint continues to enforce one approved owner in MVP.

Target helpers: requireUser, requireAdmin, requireApprovedCreator, requireToolOwner(toolId), requireContentOwner(contentId), requireEntitlement(product) and requireRecentStepUp(operation). Existing requireVendor returns a scoped collection; an empty collection must never authorize arbitrary Tool access. All sensitive server actions recheck capability/ownership and transaction state at execution time.

## Authorization / RLS matrix

The proposed default is Drizzle-only access to application tables. Public browsing uses server-filtered projections of published content. Revoke direct anon/authenticated table privileges as appropriate and enable RLS on exposed application tables. Without explicit policies, API access stays denied. Actual grants/roles/policies must be inventoried first; do not claim that server-only imports enforce RLS.

| Domain | Application authorization | Proposed direct Data API boundary |
|---|---|---|
| User/profile/identity mapping | Own non-sensitive profile; server controls identity/capabilities | Mapping private; no client mapping/capability writes |
| Saves/personal Stacks | Owner on every read, write and membership operation | Deny by default; explicit mapped-owner policies only if later enabled |
| Reviews | Author drafts/edits; published projection for public; moderator for approval | Deny private data; approved public projection only if intentionally exposed |
| Tools/taxonomy | Public published projection; Admin canonical mutations | Deny direct canonical writes |
| Creator content/resources | Approved Creator plus ownership; moderation for publication | Private/draft access denied to others; Storage policies follow ownership |
| vendor_access/claims | Applicant's own claim; approved Tool owner; Admin review | No client ownership grants or reassignment |
| Orders/attempts/entitlements | Owner read, server settlement, step-up for critical administration | No client settlement/entitlement writes |
| Featured placements | Requester-owned request; Admin review; verified sandbox payment | No direct activation or schedule extension |
| Audit/rate counters | Restricted service operations; authorized Admin projections | No anonymous/authenticated direct mutation |
| Ranking/verification | Admin-authorized evidence and auditable transitions | No Vendor/Creator/client trust or rank writes |

Drizzle's database role is not automatically the visitor's Supabase JWT identity. Use a dedicated least-privilege runtime role, separate migration/operator credentials, and explicit owner predicates. If JWT-based SQL policies are introduced, pass identity only through a reviewed transaction-scoped mechanism; never assume a pooled connection retains the correct user. Test real anon/authenticated/runtime/admin roles, not only a superuser connection.

## Sensitive-operation step-up

Require verified AAL2 and recent successful reauthentication for Admin capability changes, Vendor ownership changes and critical billing administration. Account-security operations require recent proof and appropriate enrolled-factor verification. Initial MFA enrollment has to remain possible from AAL1; factor removal/replacement must not create a weaker bypass. Re-evaluate privileges after step-up and before the mutation.

Replace the Clerk-prefix bootstrap with an explicit audited operator command that resolves a verified Supabase identity to its internal User. This is a controlled bootstrap/recovery operation, not public signup and not an ordinary user self-service endpoint. Record actor, reason and outcome without credentials.

See `ACCOUNT_SECURITY_SPEC.md`, `SUPABASE_AUTH_MIGRATION_PLAN.md` and `SUPABASE_AUTH_ARCHITECTURE.md` for identity continuity and route contracts.
