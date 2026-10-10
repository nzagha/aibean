# Supabase Auth email and provider readiness

**Read-only provider readiness checked for `yfknxidgphhepdtwazhn` on 9 October 2026.** The candidate implementation is authorized; hosted account creation, real mail, settings changes and website cutover are not. Supabase Auth is not claimed operational. Existing website authentication remains active. The sanitized [current evidence](evidence/supabase-auth-candidate-readiness-2026-10-09.json) contains no credentials or personal rows.

## Verified configuration and evidence limits

| Item | Current result | Evidence boundary |
|---|---|---|
| Approved project | Verified `yfknxidgphhepdtwazhn` | Validated saved project URL and public settings GET |
| Auth endpoint | Reachable | `GET /auth/v1/settings`, saved publishable key; no Auth mutation |
| Email authentication | Enabled | Public `external.email=true` |
| Email confirmation | Required | Public `mailer_autoconfirm=false` |
| Signup | Enabled | Public `disable_signup=false`; no signup attempted |
| Phone / passkeys | Disabled | Public flags false; no additional method enabled |
| SMTP enabled / default sender / sender identity | **Unverified** | Not exposed by the public settings response; no Management API read credential used |
| Provider minimum length / required password characters | **Unverified** | Public settings do not establish the configured server password policy |
| Site URL / redirect allowlist | **Unverified** | Not inspected through an authenticated management interface |
| Project template customization eligibility / current templates | **Unverified** | Project creation date, SMTP mode and grandfathering are not inferred from public flags |
| Real registration, confirmation, sign-in, recovery and email delivery | **Not tested** | No hosted accounts, tokens, mail sends or business records created |

No Supabase MCP tool was available in this session's tool catalog. Existing public settings and the established restricted PostgreSQL stack supplied safe read-only evidence; no connector or provider settings were changed to obtain additional access. Public configuration evidence is not a delivery or authentication test.

Fresh password-authenticated `aibean_app_login` connections passed trusted CA and hostname validation and a Drizzle **REPEATABLE READ, READ ONLY** transaction against database `postgres`, PostgreSQL 17.6. Catalogs contain all fourteen application tables with RLS, private identity mapping and both application ledgers. Aggregate application and mapping counts were zero. Runtime correctly lacks SELECT on TestUsers, Auth users and the ledgers; this read does not assert their private contents. Prior [Approval C](SUPABASE_APPROVAL_C_TESTUSERS_SECURITY_RESULT.md) verified both original TestUsers rows and zero Auth accounts. No A/B/C operation was repeated.

The application policy remains a minimum eight characters, an uppercase letter, a number and a special non-space character. Candidate registration/reset validate this policy; actual provider enforcement must be inspected before release. Supabase supports configurable length/character requirements, but its standard strongest preset also requires lowercase. Check the precise configured policy, document any difference, and obtain approval before changing it. Leaked-password protection is a Pro-and-above feature, so it is not assumed available on Free. [Current password security documentation](https://supabase.com/docs/guides/auth/password-security).

## Supabase Free mail constraints

The built-in SMTP service currently accepts recipients belonging to the project's organization team, allows **two messages per hour**, and offers best-effort delivery without an SLA. That restriction concerns recipients; signup being enabled does not prove any arbitrary address can receive confirmation or recovery. Custom SMTP is required for normal public-user delivery. Its initial Supabase mail limit is currently thirty messages per hour, subject to operator configuration and the external provider's own quotas. This project's SMTP mode and exact quotas remain unverified. [Current SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp), [password/email flow documentation](https://supabase.com/docs/guides/auth/passwords).

The **3 June 2026 Free-tier breaking change** prevents new Free projects using built-in SMTP from editing Auth email templates. Older projects retain their template arrangements; custom SMTP or an eligible paid plan permits customization. This project's age and eligibility are unverified, so branded mail and custom token-hash links must not be assumed configurable. Candidate PKCE code callbacks and token-hash handlers are code paths; their corresponding real provider/template delivery must be validated before release. [Official template policy change](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier).

## Redirects and template review before actual provider testing

The current candidate uses `NEXT_PUBLIC_APP_URL` for one approved **loopback** origin in a separate process. Selection requires `AIBEAN_AUTH_MODE=supabase`, `AIBEAN_SUPABASE_RELEASE=candidate` and `AIBEAN_AUTH_ISOLATED=true`; the active website keeps its transitional mode. Provider mutations additionally require `AIBEAN_SUPABASE_PROVIDER_TEST_APPROVED=true`, which remains unset under this authorization. Recovery proof needs a private `AIBEAN_RECOVERY_SECRET` of at least 64 characters. Never put that secret in public configuration or this report. Current candidate isolation does not accept a deployed production-domain cutover; that boundary needs a reviewed release change. Future deployed origins require HTTPS. Match the canonical origin and Supabase Site URL/redirect allowlist; never derive trust from an arbitrary request Host or return URL.

Registration/resend and recovery emit the same-origin `/auth/callback?state=<random>` PKCE destination. A signed HttpOnly intent ties its kind/state to the verifier; query parameters cannot declare a normal callback to be recovery. `/auth/confirm` supports only allowlisted signup/recovery token-hash verification for separately approved custom templates, and also requires that same initiating-browser intent/state/verifier and matching token kind. An unbound or cross-browser template link is rejected. Custom templates would need a separately reviewed way to preserve that state; this alternate path is not configured. Recovery proceeds only to `/reset-password`, with short-lived proof bound to the verified identity/session; an ordinary session alone cannot authorize a reset. Normal business access independently requires a server-issued signed access proof tied to verified UUID/session, so removing the recovery cookie does not grant account access.

Confirm the exact emitted callback path **and state query** survive the provider's redirect allowlist and delivered link. Do not assume a bare callback entry admits the full candidate URL. Prefer narrowly scoped allowlist patterns after private operator inspection, never broad production wildcards or guessed deployment domains. `localhost` and `127.0.0.1` are different origins. Callback parameters must remain out of logs, screenshots and reports. [Redirect URL documentation](https://supabase.com/docs/guides/auth/redirect-urls).

Check the actual confirmation and recovery templates privately. Preserve the correct token type and intended server-side flow; a confirmation link must not become recovery authorization. Default provider links must complete the SSR PKCE exchange in the originating browser, while approved customized token-hash links must target the candidate's supported verification path. Disable SMTP-provider click tracking that rewrites Auth links. Do not save real template samples containing recipient details or tokens to the repository. [Email template documentation](https://supabase.com/docs/guides/auth/auth-email-templates).

## Operator checklist and separate approval boundaries

1. Read the linked project's Auth settings privately and record only non-secret status: signup/confirmation, minimum length/characters, session/reauth rules, Site URL, exact allowed candidate redirects, SMTP enabled status, sender-domain verification and template eligibility. Do not paste SMTP passwords or management/service keys into chat.
2. Select a transactional SMTP provider and verified sending domain. Configure SPF, DKIM and DMARC; use an aiBean sender identity and keep authentication mail separate from newsletters. Disable link tracking. Prepare the exact SMTP/template/redirect/password-policy changes and their impact for owner approval before applying them.
3. Review confirmation and recovery link behavior against the installed handlers, approved origin and accessible candidate test deployment. Plan malformed/expired/replayed-link and recovery-session misuse checks. Do not bypass confirmation to solve delivery restrictions.
4. Complete separately approved expanded application backup and isolated restoration, preserving the original scoped archive. See [expanded recovery proposal](SUPABASE_EXPANDED_APPLICATION_RECOVERY_PROPOSAL.md); this document does not authorize its execution.
5. Obtain separate approval for **two named ordinary test accounts**, allowed confirmation/resend/recovery mail, any bounded business fixtures and their retention/cleanup. If built-in SMTP is used, the owner must establish recipient eligibility without broad organization membership changes being implied by this task.
6. Execute the authorized real hosted journey: registration, delivered confirmation, wrong-password handling, login, stable mapping, refresh/expiry/logout, delivered recovery, password update and two-account ownership isolation. Record sanitized outcomes and provider configuration separately from mock/isolated database results.
7. Replace the candidate's bounded single-process limiter/replay store with a shared atomic store before any multi-instance release. Present a coordinated cutover proposal only after provider/delivery/two-account tests, shared controls and reviewed deployment-origin changes pass. The current authorization does not activate Supabase for website users or retire transitional authentication.

The current [Supabase changelog](https://supabase.com/changelog) was fetched and relevant template/password/SMTP documentation reviewed. No live email or hosted Auth test was used to infer readiness.
