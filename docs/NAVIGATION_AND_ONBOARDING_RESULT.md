# Navigation and onboarding implementation — 10 October 2026

Implemented on `codex/supabase-foundation` without hosted mutations or Auth activation.

## Changes

- Header retains AI Tools, AI Skills, Events, Creators, Submit and For Vendors. Guests see Sign up/Login; authenticated accounts see My Account. Desktop shows Admin Dashboard directly for authorized Admins and offers Creator/Vendor links in the Workspaces menu. The mobile drawer exposes the same account links, including Sign up/Login for guests, without crowding the compact header. All workspace links come from verified application capabilities/ownership. Account navigation is additive.
- Server-only navigation reads canonical User and Tool ownership records. It ignores URL and client role flags, fails closed on errors and uses a read-only identity lookup that does not provision an account while browsing. Destination routes still authorize independently.
- `/register` displays a branded unavailable state in transitional password mode, with no signup or login form masquerading as registration. The existing inactive Supabase candidate still provisions ordinary accounts through the reviewed identity flow.
- `/creators` links to `/creators/apply` with the intended application/review journey and an explicit applications-unavailable state. No application is accepted and no privilege is granted.
- `/for-vendors` has an explicit onboarding CTA and links to registration status, discovery/claims and Tool submission. One-owner and payment/approval boundaries are explained.
- Homepage adds the three participation journeys using existing cards, typography and spacing. Existing hero and discovery grids remain in place.
- `/account` provides capability-derived workspace navigation and informational onboarding links.

## Verification

Lint, TypeScript, production build, all 74 automated tests and runtime dependency audit PASS (zero vulnerabilities). Tests render guest/ordinary/Admin/Creator/Vendor navigation and verify desktop/mobile links, wrong-owner rejection, failure fallback, unavailable registration, direct Admin guard wiring and retained menus. Existing database/provisioning tests verify ordinary defaults and inability to elevate capabilities. The reduced-motion hydration and mobile dialog opening/closing regression passes.

Built routes include `/`, `/register`, `/creators`, `/creators/apply`, `/for-vendors`, `/account`, `/admin`, `/creator` and `/vendor`. No authenticated hosted journey was performed. Visual browser QA was not executed: desktop browser-tool automatic approval review returned an account usage-limit error, not an unsafe-action determination.

## Remaining gates

Public signup is unavailable in the active password mode. Hosted Supabase Auth/provider testing, real account activation, Creator applications/content publishing, Vendor edit/verification submissions and live payments are not claimed operational. The four Control Panels remain incremental MVP work; this change fixes entry points without claiming product completion. No hosted schema/data/Auth/SMTP/DNS/deployment change or recovery retry occurred. Historical recovery manifests and reviewed dependencies remain untouched.
