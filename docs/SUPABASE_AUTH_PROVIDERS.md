# Supabase authentication providers and configuration

Assessment: 8 October 2026. Design specification, not a claim of implemented website authentication. No Supabase application method has been configured or exercised in aiBean yet. Latest package metadata observed: `@supabase/supabase-js` 2.117.3 and `@supabase/ssr` 0.12.7. Select exact compatible versions and inspect their installed types during the implementation stage; these packages are not installed by the repository-baseline stage.

## Registry contract

Each entry will contain: identifier, display name, method category, SDK/platform support and evidence URL/date, enabled flag, required configuration names, experimental flag, callback requirements, validation status, and last successful environment-specific validation. Never store secrets or user identities in the registry.

Keep implementation status separate from configuration and validation. States must include planned, implemented/configuration-blocked, implemented/configured/unverified, operational (real flow validated), experimental, unsupported and explicitly excluded. Visibility requires enabled + configured + validated in that environment. An operator-controlled configuration may expose unvalidated methods only in an isolated validation workspace. Compilation, mocks and flags alone never mean operational.

## Method matrix

| Method | Official platform support | aiBean status / prerequisite |
|---|---|---|
| Email/password | Supported | Planned; project URL/key, verification, email delivery, callback and password policy required |
| Email verification/recovery/change | Supported | Planned; safe confirmation/recovery routes and email templates required |
| Magic Link / email OTP | Supported | Planned; PKCE/confirmation flow, configured template, resend/expiration controls required |
| Phone/password | Documented | Planned; international-number validation, phone verification and configured delivery required |
| SMS / WhatsApp OTP | Documented with delivery-provider constraints | Planned; channels hidden until actual delivery works; E.164 parsing, cooldown and shared limits required |
| Social OAuth | Documented | Planned registry below; external clients and actual callbacks unverified |
| Custom OAuth/OIDC | Documented `custom:` identifiers | Planned, operator-managed, explicitly approved non-enterprise use only |
| Passkeys | Experimental, supabase-js >=2.105.0 | Planned/experimental; explicit opt-in, stable RP ID, configured allowed origins, HTTPS, supported browser and recovery method required |
| Authenticator TOTP MFA | Documented | Planned; enrollment/challenge/removal and server AAL enforcement required |
| Phone MFA | Documented | Planned; project MFA and delivery settings required; validate actual enabled channels |
| Manual identity linking | Documented as beta | Planned; project opt-in, fresh ownership proof, unlink safeguards required |
| Enterprise / SAML / directory federation | Excluded | Never enable or display |
| Anonymous / guest Auth identities | Excluded | Public browsing does not create an Auth identity |
| Web3 / wallet authentication | Excluded | No wallet SDK, challenge or identity-linking code |

## Social registry candidates

All entries below are **planned, disabled, configuration-unverified**. The common mechanism is `signInWithOAuth`, validated PKCE callback and verified Supabase identity; all require operator-owned provider configuration. The exact SDK types must also pass against the pinned installed release.

| Display | Supabase identifier | Notes |
|---|---|---|
| Google | `google` | Primary UI candidate |
| Apple | `apple` | Primary; provider key lifecycle must be documented |
| Microsoft | `azure` | Ordinary social login only; no domain SSO discovery |
| GitHub | `github` | Primary UI candidate |
| GitLab | `gitlab` | Additional configured methods |
| Facebook | `facebook` | Additional configured methods |
| Discord | `discord` | Additional configured methods |
| LinkedIn | `linkedin_oidc` | Prefer current OIDC integration; do not activate legacy `linkedin` blindly |
| X | `x` | OAuth 2.0; `twitter` is the separate legacy OAuth 1.0a identifier |
| Slack | `slack_oidc` | Prefer current OIDC integration; legacy `slack` is distinct |
| Notion | `notion` | Additional configured methods |
| Spotify | `spotify` | Additional configured methods |
| Twitch | `twitch` | Additional configured methods |
| Bitbucket | `bitbucket` | Additional configured methods |
| Figma | `figma` | Additional configured methods |
| Kakao | `kakao` | Additional configured methods |
| Zoom | `zoom` | Additional configured methods |
| Approved custom provider | `custom:<operator-identifier>` | Non-enterprise consumer sign-in only; never user-supplied issuer/endpoints |

Upstream types also contain `keycloak`, `workos` and `fly`; SDK presence does not establish approved product scope or operational configuration. Do not add them to the enabled aiBean registry without an eligible documented use case. The provider list must be an application allowlist, not the entire SDK union.

## Per-provider configuration checklist

- Confirm selected SDK/platform support and the intended non-enterprise use case.
- Configure actual client ID/secret in the provider/Supabase operator settings, with only necessary scopes.
- Copy the callback URL from the actual Supabase provider configuration. Configure the app's canonical Site URL and exact allowed development/staging callback origins; no production wildcard redirects.
- Configure verified email requirements and understand missing/private-email behavior. Do not map a provider email to historical application ownership.
- Validate success, denied consent, cancellation, provider outage, expired code, replay, unsafe return path and session refresh in that target environment.
- Validate linking to an existing canonical identity, wrong-account rejection and unlink recovery safeguards.
- Record date, environment, SDK version and evidence without tokens/credentials. Only then make the method operational/visible.

Email needs working delivery and templates; SMS/WhatsApp need configured provider/channel and actual delivery tests. Passkeys require registration, sign-in, listing/removal, lost-device fallback and explicit production validation. MFA needs two-account tests, failed/expired challenges and recovery without bypassing capability checks.

## Official references inspected

- [Social providers](https://supabase.com/docs/guides/auth/social-login) and [upstream SDK provider types](https://github.com/supabase/supabase-js/blob/master/packages/core/auth-js/src/lib/types.ts).
- [Password auth](https://supabase.com/docs/guides/auth/passwords), [email passwordless](https://supabase.com/docs/guides/auth/auth-email-passwordless), [phone](https://supabase.com/docs/guides/auth/phone-login).
- [Custom OAuth/OIDC](https://supabase.com/docs/guides/auth/custom-oauth-providers).
- [Passkeys](https://supabase.com/docs/guides/auth/passkeys): experimental API and project/browser requirements verified in documentation, not in the project.
- [MFA](https://supabase.com/docs/guides/auth/auth-mfa), [phone MFA](https://supabase.com/docs/guides/auth/auth-mfa/phone), [identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking).

Supabase performs its own documented verified-identity automatic linking. That behavior is distinct from migrating legacy aiBean records. aiBean must never infer historical ownership solely from equal emails. Confirm platform behavior with verified/unverified identity cases before enabling social methods.
