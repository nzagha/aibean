# Active MVP remediation plan

Updated 8 October 2026. The owner's Supabase directive supersedes October 7 tasks A03/A17 where they proposed temporary-auth hardening or future Clerk configuration. Preserve the audit itself. Keep all nine stages explicit; Stage 1 is not an authentication or full-MVP completion claim.

| Stage | Dependency | Work / acceptance |
|---|---|---|
| 1. Repository baseline | Existing app/audit | Feature branch, patched Next, lint/typecheck/test/build/runtime-audit CI; active scope/architecture/provider/migration/security documents; preserved historical audit |
| 2. Database and identity architecture | Live read-only connection and isolated PostgreSQL | Confirm target/history; inspect existing Users/ownership without dumping PII; mapping/RLS design; reviewed additive migrations; empty/upgrade/continuity tests |
| 3. Core Supabase Auth | Stage 2 plus URL/key/mail/redirect configuration | Email registration/login/verification/recovery/change, Magic Link/OTP, SSR refresh/logout, stable profile mapping; real two-user tests |
| 4. Additional approved methods | Core identity; provider credentials/config | Phone/OTP, eligible social registry, approved custom OAuth/OIDC, experimental passkeys, MFA and identity linking; validate each configured method; hide blocked ones |
| 5. Authorization / legacy retirement | Stages 2–4 core validation | Central capabilities/ownership, recent step-up, Supabase-aware Admin bootstrap, verified data continuity; coordinated cutover then retire Clerk/custom auth |
| 6. Taxonomy/data foundation | Target/history and identity contracts | Stable-ID v1.1 reconciliation; categories/use cases/vertical joins; evidence/ranking and future content relations; tested forward migrations |
| 7. Essential Admin operations | Identity/permissions and canonical schema | Complete Tool/taxonomy create/edit/classify/validate/publish/archive/search/pagination; audit only real transitions; preserve visual layout |
| 8. First complete workflow | Stages 3/5/6/7 and sandbox Stripe | Admin Tool -> publication -> isolated User save/compare/review -> eligible paid claim -> independent Admin proof approval -> exactly one Tool owner |
| 9. Remaining MVP | Tested foundation and domain contracts | Complete User/Vendor panels, approved Creator workflows, Skills, Playbooks, resources, Events, remaining commerce/operations and launch QA |

Stage 3–5 implementation may be developed together behind a controlled release boundary; do not ship two competing active authentication systems. Do not switch production identity before mappings and recovery have been validated. Keep owner approval as the final step before any shared-database migration.

## First database milestone

Acceptance: the target is proven to be the intended development environment; actual schema/ledger/grants/RLS are recorded; historical identity/ownership existence is known; proposed mapping preserves all internal IDs; a disposable real PostgreSQL upgrade test proves continuity and rejects wrong-user access. No migration is applied to a shared target without a reviewed impact/recovery plan and owner approval.

Inputs still missing: callable Supabase MCP tools (the requested connection name is not registered), server database connectivity, and a running isolated PostgreSQL target. Existing local Docker engine is unavailable. Do not treat previous MCP OAuth success as database metadata evidence.

## First authentication milestone

Acceptance: confirmed email registration, valid/invalid login, recovery, Magic Link and OTP work; unsafe callback destinations/replayed or expired tokens fail; refresh/logout have tested semantics; two users retain their own saved Tools/Stacks/reviews; non-admins cannot invoke Admin actions; existing historical IDs stay connected; new users receive no privileges. Pass configured flows with real providers, not mocks alone.

## Admin readiness update

Current Admin source has draft creation, publication/archive, review moderation, paid-claim decisions, featured-placement review and audit display. It is configuration-blocked: no connected DB, no validated Supabase Admin, and the bootstrap still expects a Clerk user_ ID. Full Tool/taxonomy edit/classification, pagination/search, validated state transitions, Creator approval and trust/ranking evidence remain missing. The next Admin increment follows identity/database gates; a dashboard shell would not satisfy them.

## Deliverable index

- Architecture diagram and route specification: `SUPABASE_AUTH_ARCHITECTURE.md`.
- Provider matrix/configuration checklist: `SUPABASE_AUTH_PROVIDERS.md`.
- Identity continuity/database migration plan: `SUPABASE_AUTH_MIGRATION_PLAN.md`.
- Authorization/RLS matrix: `AUTH_AND_CAPABILITIES.md`.
- Account-security/MFA specification: `ACCOUNT_SECURITY_SPEC.md`.
- Security/dependency boundaries: `SECURITY_BASELINE.md`.
- Test evidence, stage status and remaining blockers: `FOUNDATION_PROGRESS.md`.

Historical product exclusions remain: Discussions, Replies, News, Courses, Social Videos, direct messaging, native mobile/video hosting and Creator payouts. Preserve approved branding and $99/five-day sponsored placements. No live billing activation is part of the foundation.
