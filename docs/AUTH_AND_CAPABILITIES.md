# Authentication and capabilities

Clerk is configured with NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY; the layout conditionally mounts ClerkProvider and proxy conditionally delegates to clerkMiddleware. No account is provisioned automatically. Enable Google, Apple and email in the Clerk dashboard when the owner creates an application; Apple requires provider-side credentials.

Clerk authenticates identity. Application PostgreSQL users store independent is_admin/is_creator capabilities; vendor_access grants access to one specific tool. Ordinary first sign-in creates a normal application user only. Nothing in public forms permits self-elevation.

Central helpers: requireUser, requireAdmin, requireVendor. Every mutation rechecks authorization. Admin bootstrap is an explicit local operator CLI command with audit history. Vendor cannot publish edits, award badges or change review status. Creator approval and organization membership remain later-stage workflows.

Clerk key changes require restarting development or rebuilding deployments. Account pages are request-time rendered and not publicly indexed.
