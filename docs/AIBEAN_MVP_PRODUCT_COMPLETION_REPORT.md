# aiBean MVP implementation status — 10 October 2026

**Status: navigation milestone complete; four Control Panels partially implemented. The full MVP and hosted Auth are not complete or operationally verified.**

## Delivered navigation

See [navigation and onboarding result](NAVIGATION_AND_ONBOARDING_RESULT.md). Implementation commit `475e1447345bfdac1e8fed278f59a580176277be` was pushed to `codex/supabase-foundation`; [GitHub validation passed](https://github.com/nzagha/aibean/actions/runs/38090699328).

Guests have Sign up/Login; signed-in users have My Account. Authorized Admins have a direct desktop Admin Dashboard link. Creator/Vendor workspaces are additive desktop menu entries; mobile has equivalent account links. All six existing primary discovery links remain. Public rendering uses read-only canonical identity and ownership queries rather than provisioning accounts or using client metadata. `/register` accurately shows unavailable registration in password mode. `/creators/apply`, Vendor onboarding and homepage participation cards explain the actual stages without fake submissions or access grants.

## Subsequent Control Panel increment

| Panel | Implemented in this increment | Remaining MVP work |
| --- | --- | --- |
| User `/account` | Remove saved Tools even when archived; rename/delete owned stacks with explicit deletion confirmation; remove owned stack memberships; edit own eligible reviews with forced pending moderation; accessible pending/error/success feedback; capability-derived workspace links | Stack ordering/public visibility/detail pages, profile/security integration, persistent comparison, reports/notifications and complete billing history |
| Admin `/admin` | Database inventory counts; Tool name search, publication filters, stable pagination and empty states; shared workspace navigation. Existing draft/publication, review, paid-claim and featured moderation remain | Full Tool edit/taxonomy/trust/ranking interfaces, additional moderation queues, audited capability operations and commercial exception handling |
| Vendor `/vendor` | Owner-scoped canonical listing inventory including unpublished Tools, publication state, approved review counts, links to own claims and sponsored placements; shared navigation | Proposed listing edits/verification requests and review history, recorded analytics, disputes/revocation/transfer and sandbox commercial validation |
| Creator `/creator` | Approved-Creator server gate; additive workspace navigation; access to existing personal stacks and accurate publishing/profile/resource availability states | Creator application model/decisions, public profile, structured Skills/Playbooks, publishing review, resources and analytics |

This increment uses only existing installed tables and grants. No schema migration was prepared or applied, and no capabilities were granted. Controls needing absent data models remain unavailable. The new Creator route guard directs ordinary users to their account; the public application-information route remains open.

## Files and routes

Navigation: `src/components/header.tsx`, `workspace-navigation.tsx`, `registration-unavailable.tsx`, `participation-journeys.tsx`, `auth-page.tsx`, `module-preview.tsx`; `src/lib/account-navigation.ts`, `account-navigation-server.ts`, `auth.ts`; pages `/`, `/creators`, `/creators/apply`, `/for-vendors`, `/account` and root layout.

Control Panels: `src/app/account/actions.ts` and the `/account`, `/admin`, `/vendor`, `/creator` pages; `src/lib/db/account-workflows.ts`, `vendor-workspace.ts`, `src/lib/workspace-filters.ts`. The existing ActionForm supplies pending state and accessible feedback. Each mutation reauthorizes on the server, parses an allowlisted command, binds ownership in SQL and refreshes affected routes. Review status and ownership fields submitted by a client are ignored. Stack mutations lock the owned stack in a transaction; deletes cascade only its memberships.

Tests: `tests/account-navigation.test.ts`, `account-workflows.test.ts`, shared `tests/fixtures/account-workflow-contract.ts`, and the existing native `scripts/test-postgres-installation.ts` harness.

## Validation

- Lint, TypeScript and production build PASS.
- 76 automated tests PASS, including guest/ordinary/Admin/Creator/Vendor links, mobile drawer and reduced-motion hydration, ordinary registration/provisioning constraints, ownership and invalid-input denial.
- 19 native PostgreSQL 17.11 scenarios PASS. The new account/Vendor contract runs with the real restricted runtime login, generated verified TLS and synthetic records in newly created loopback-only disposable clusters. The same contract also runs against PGlite under the installed runtime grants. Both test users retain isolation; another user's stacks/reviews cannot be changed. Editing an approved review returns it to pending; a Tool owner cannot resubmit a review of that Tool. Unpublished owned Tools remain visible only in their owner's inventory.
- Native suite completed successfully and shut down its disposable instances. Sanitized results: [native validation evidence](evidence/control-panel-native-validation.json). Synthetic artifacts are ignored by Git. Original failed recovery target and private backups were untouched.
- Runtime dependency audit: zero vulnerabilities.
- New routes were compiled in the production build. Browser visual QA and authenticated end-to-end journeys remain **unverified**: browser-tool automatic approval review was unavailable because of an account usage limit. No alternative browser tool was used to bypass that review.

## External and product gates

Hosted Supabase Auth activation/provider testing, registration, SMTP/redirect configuration, real Admin/Creator/Vendor account journeys and Stripe sandbox flows remain separately gated. No hosted data/schema/auth settings, migrations, live payments, DNS or deployment were changed. No hosted expanded recovery was retried; its frozen corrected package is unchanged.

The next product milestones require the outstanding models and complete Admin/User/Vendor/Creator workflows above, forward-only migration preparation with isolated tests, followed by separately approved hosted installation and provider validation. Production also requires catalog/content readiness, reviewed recovery, accessibility/visual QA, uploads/observability and deployment gates. Existing branding, typography, hero and card grid composition are preserved; new content uses the existing design system.
