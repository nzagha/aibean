# Active MVP remediation plan

**Correction preparation — 10 October 2026: PASS locally; hosted recovery remains FAIL / awaiting new execution approval.** The owner-authorized v2 correction normalizes the PostgreSQL address and completes source metadata/history and new local-target readiness before application body capture. All 70 automated tests and the exact shared executor's native PostgreSQL/CMS rehearsal pass. New manifest SHA-256: `5249c408d2610ab30e8e691f2f8396b3b83fd2ffc05053aaafebc6cb952acfec`. [Correction review and exact execution authorization](SUPABASE_EXPANDED_RECOVERY_CORRECTION_REVIEW.md). The original v1 manifest/failure evidence remain historical; no hosted retry, Auth activation or original retained-target modification occurred.


**Expanded recovery attempt — 10 October 2026: FAIL / STOPPED.** The owner-authorized unchanged package passed checksum/source prerequisites but stopped during local-target preparation before native export or restoration. No new encrypted archive exists. Both TestUsers records, installed history/RLS/grants and the original encrypted backup pass independent postflight. The failed local target is stopped and retained. A reproducible inet-address comparison defect and missing prerequisite coverage are documented in the [execution result](SUPABASE_EXPANDED_APPLICATION_RECOVERY_RESULT.md). Reviewed executable files remain unchanged; correction preparation and any retry require new owner approval. SMTP/Auth/fixture/cutover gates remain blocked. Earlier preparation and synthetic PASS entries below are dated evidence, not hosted recovery success.

**Next-stage preparation — 10 October 2026:** Concrete expanded recovery, domain/deployment and hosted two-account plans are prepared; execution remains separately approved. [Fresh read-only evidence](evidence/supabase-next-stage-readiness.json) verifies installed history, both TestUsers records and zero application/Auth/mapping counts. The authenticated dashboard reveals required SMTP, password-policy and redirect corrections; see [email readiness](SUPABASE_AUTH_EMAIL_READINESS.md). `https://aibean.io` is the official production origin, Bluehost DNS authority verified, hosting unselected. The [hosted test plan](SUPABASE_HOSTED_AUTH_TEST_AND_CUTOVER_PLAN.md) identifies unsupported ordinary Order and positive Vendor mutation paths as explicit end-to-end blockers. Complete real recovery/configuration/provider tests before reviewing shared atomic controls, step-up, legacy continuity and exclusive production cutover. No website activation or hosted write occurred.

**Current Auth milestone:** The owner-authorized Phase 1 candidate is implemented and tested locally/with disposable PostgreSQL; the website retains its existing password provider. See [candidate result](SUPABASE_AUTH_PHASE_1_IMPLEMENTATION_RESULT.md). Remaining work is approved expanded recovery, exact email/redirect/provider configuration, authorized real two-account validation, shared release controls and coordinated identity cutover. No hosted Auth operational claim, production release, legacy removal or unrelated product/schema batch is authorized by this milestone.

**Latest state — A/B/C PASS (9 October 2026):** Explicitly authorized Approval C executed its exact TestUsers table REVOKE once. Both original records and definitions/indexes/constraints/sequence state/RLS/policies are preserved. Anonymous Data API HEAD now returns 401; anon/authenticated table SELECT and authenticated INSERT permissions are denied in hosted SQL role contexts. The fourteen application RLS tables, ledgers, restricted runtime/Drizzle/TLS, Auth public settings/accounts and private configuration remain unchanged. Sequence grants and service_role access remain explicitly outside C. Real authenticated-JWT Data API testing remains unverified; no Auth accounts were created. See [C result](SUPABASE_APPROVAL_C_TESTUSERS_SECURITY_RESULT.md) and [proposed Auth stage](SUPABASE_AUTH_IMPLEMENTATION_STAGE.md). Existing login flows remain active unchanged; the Auth stage is a plan only. Earlier sections below record historical observations.

**Latest state — Approval B PASS (9 October 2026):** The explicitly authorized exact runtime-login package was executed once. A new password-authenticated aibean_app_login session passed trusted TLS, Drizzle reads and reviewed restrictions. The ignored application DATABASE_URL now uses that login; the operator connection and runtime credential are separately protected with private Windows DPAPI. Both TestUsers records/permissions, A objects/history and zero Auth/User/mapping counts are preserved. Local lint/typecheck, 31 tests, production build, runtime audit and public/guest HTTP checks pass. C and Supabase website Auth remain separately unexecuted. See [Approval B runtime result](SUPABASE_APPROVAL_B_RUNTIME_LOGIN_RESULT.md). Earlier observations below are chronological evidence, not current runtime configuration.

**Latest state — Approval B PASS (9 October 2026):** The explicitly authorized exact runtime-login package was executed once. A new password-authenticated aibean_app_login session passed trusted TLS, Drizzle reads and reviewed restrictions. The ignored application DATABASE_URL now uses that login; the operator connection and runtime credential are separately protected with private Windows DPAPI. Both TestUsers records/permissions, A objects/history and zero Auth/User/mapping counts are preserved. Local lint/typecheck, 31 tests, production build, runtime audit and public/guest HTTP checks pass. C and Supabase website Auth remain separately unexecuted. See [Approval B runtime result](SUPABASE_APPROVAL_B_RUNTIME_LOGIN_RESULT.md). Earlier observations below are chronological evidence, not current runtime configuration.

Updated 9 October 2026. The owner's Supabase directive supersedes October 7 tasks A03/A17 where they proposed temporary-auth hardening or future Clerk configuration. Preserve the audit itself. Keep all nine stages explicit; Stage 1 is not an authentication or full-MVP completion claim.

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

Hosted Approval A now PASS: fourteen aiBean RLS tables, private mapping, two exact baseline ledger entries, matching security ledger and NOLOGIN runtime group are installed and independently verified. TestUsers has two preserved rows; all application/User/mapping/Auth counts are zero. Application URL/key/settings and strict-TLS server DATABASE_URL/Drizzle are verified. Sixteen isolated native PostgreSQL installation/security/recovery scenarios passed with synthetic data. The owner confirms Free; under explicit scoped export/restore authorization, actual hosted-data recovery now PASS. One privately encrypted archive/metadata pair is retained; both records and scoped metadata/permissions match, the source is unchanged and the transient target is disposed. B has now passed, including real hosted login/Drizzle/TLS and the private application connection switch. Remaining gates: C TestUsers browser-client impact approval and actual end-user provider/capability tests. Supabase website Auth/provider/cross-user behavior remains unverified. See [connection readiness](SUPABASE_CONNECTION_AND_ENVIRONMENT_READINESS.md) and [the Free recovery plan](SUPABASE_FREE_BACKUP_AND_RECOVERY_PLAN.md).

SSR client/refresh/cookie utilities and a read-only environment check are prepared. Active login/capability paths remain unchanged until the coordinated cutover. Do not apply 0000/0001 alone: observed default grants require atomic RLS/grant hardening. Do not treat TestUsers as legacy aiBean users or merge its records by email.

Current database result: [Approval A installation result](SUPABASE_APPROVAL_A_INSTALLATION_RESULT.md). A does not activate Supabase website login; B/C remain independent.

## First authentication milestone

Acceptance: confirmed email registration, valid/invalid login, recovery, Magic Link and OTP work; unsafe callback destinations/replayed or expired tokens fail; refresh/logout have tested semantics; two users retain their own saved Tools/Stacks/reviews; non-admins cannot invoke Admin actions; existing historical IDs stay connected; new users receive no privileges. Pass configured flows with real providers, not mocks alone.

## Admin readiness update

Current Admin source has draft creation, publication/archive, review moderation, paid-claim decisions, featured-placement review and audit display. It is foundation-blocked: operator PostgreSQL/Drizzle connectivity and actual scoped recovery are verified, the schema and NOLOGIN group are installed, but an authenticated restricted runtime login/connection is pending B, no Supabase Admin is validated, and the bootstrap still expects a Clerk user_ ID. Full Tool/taxonomy edit/classification, pagination/search, validated state transitions, Creator approval and trust/ranking evidence remain missing. The next Admin increment follows identity/database gates; a dashboard shell would not satisfy them.

## Deliverable index

- Architecture diagram and route specification: `SUPABASE_AUTH_ARCHITECTURE.md`.
- Verified connection, live inventory and runtime dependencies: `SUPABASE_CONNECTION_AND_ENVIRONMENT_READINESS.md`.
- Provider matrix/configuration checklist: `SUPABASE_AUTH_PROVIDERS.md`.
- Identity continuity/database migration plan: `SUPABASE_AUTH_MIGRATION_PLAN.md`.
- Authorization/RLS matrix: `AUTH_AND_CAPABILITIES.md`.
- Account-security/MFA specification: `ACCOUNT_SECURITY_SPEC.md`.
- Security/dependency boundaries: `SECURITY_BASELINE.md`.
- Test evidence, stage status and remaining blockers: `FOUNDATION_PROGRESS.md`.

Historical product exclusions remain: Discussions, Replies, News, Courses, Social Videos, direct messaging, native mobile/video hosting and Creator payouts. Preserve approved branding and $99/five-day sponsored placements. No live billing activation is part of the foundation.

## Navigation milestone — 10 October 2026

Entry points and capability-derived account navigation are implemented and locally tested (74 tests). Registration remains accurately unavailable in password mode; Creator application intake remains pending. Vendor onboarding links existing discovery/claim/submission routes. Next: continue server-enforced Control Panel operations against existing models, and separately review any new schema. No hosted migration or Auth activation is authorized by this milestone. Evidence: docs/NAVIGATION_AND_ONBOARDING_RESULT.md.
