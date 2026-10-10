# aiBean — Domain, Deployment and Transactional Email Readiness

Status: **prepared; deployment, DNS, SMTP and production Auth activation are not authorized or executed**.

Evidence date: 10 October 2026 UTC / 9 October 2026 America/New_York. Prices below were checked against current provider pages on that date; they are planning estimates in USD, before taxes and usage charges, not purchased services.

## Owner-confirmed identity and current boundaries

The project is **aiBean**, the official domain is `aibean.io`, and the intended primary production origin is `https://aibean.io`. Bluehost manages the domain. The application hosting provider remains undecided. The existing Next.js 16.3.8 / React 19 / Drizzle application and its branding, layout and active transitional authentication remain unchanged.

Supabase project `yfknxidgphhepdtwazhn` is the existing development backend, at `https://yfknxidgphhepdtwazhn.supabase.co`. A/B/C installation evidence and the candidate implementation remain distinct from production readiness. No production application deployment, delivered Auth email, hosted two-account validation, or Auth cutover has been verified.

This review queried public DNS and read source/configuration contracts. The root task also inspected the existing authenticated Supabase dashboard in read-only mode. No hosting account, paid service, DNS record, mailbox, SMTP credential, Supabase setting, hosted user or environment file was created or changed.

## Public DNS verified

Both authoritative servers, `ns1.bluehost.com` and `ns2.bluehost.com`, independently returned the following results. Google public DNS corroborated the principal records. Bluehost authority is observed from NS responses, rather than inferred from the domain provider's name.

| Name / type            | Observed value                                | TTL / interpretation                                                |
| ---------------------- | --------------------------------------------- | ------------------------------------------------------------------- |
| `aibean.io` NS         | `ns1.bluehost.com`, `ns2.bluehost.com`        | 7,200 seconds                                                       |
| `aibean.io` A          | `162.241.225.33`                              | 7,200 seconds; current destination, not a proposed application host |
| `aibean.io` AAAA       | No record returned                            | Authoritative NOERROR / no data                                     |
| `www.aibean.io` CNAME  | `aibean.io`                                   | 7,200 seconds                                                       |
| `aibean.io` MX         | Preference `0`, `mail.aibean.io`              | 3,600 seconds                                                       |
| `mail.aibean.io` A     | `162.241.225.33`                              | 7,200 seconds; independently configured A record                    |
| `mail.aibean.io` CNAME | No record returned                            | Authoritative no data; mail is not an alias of the apex             |
| `aibean.io` TXT / SPF  | `v=spf1 a mx include:websitewelcome.com ~all` | 3,600 seconds                                                       |
| `_dmarc.aibean.io` TXT | Name does not exist                           | Authoritative NXDOMAIN on both servers                              |
| `aibean.io` CAA        | No record returned                            | Authoritative ENODATA on both servers                               |

The public record inspection is not a complete private zone export. Existing DKIM selectors, DNS account permissions, mailbox availability, mail delivery and the current website's HTTPS/application contents remain unverified. No existing DKIM selector was invented or exhaustively enumerated.

Changing the apex A record would leave the independently configured mail A record pointing to its present address. Preserve that mail record and MX unless a separately reviewed mail migration requires otherwise. The current SPF `a` mechanism follows the apex: moving the website also changes which address that mechanism authorizes to send mail. Review existing sending sources before editing SPF; do not replace the current mail configuration blindly.

## Application hosting recommendation

Recommend **Vercel Pro** as the first option to evaluate for this commercial Next.js application. Its Next.js integration covers server rendering, route handlers and other framework server features. Pro starts at **$20/month**, with $20 included usage credit; additional developer seats and usage can increase the bill. Hobby is described for personal, non-commercial use and is unsuitable as the assumed production plan for monetized aiBean. This is a compatibility recommendation, not a claim that this repository has passed a Vercel deployment. [Vercel pricing](https://vercel.com/pricing), [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs).

| Option                            | Current planning cost                                            | Fit and outstanding checks                                                                                                                                                                                                               |
| --------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel Pro — preferred evaluation | $20/month base; seats/usage may add cost                         | Native Next.js integration. Verify exact Next.js 16.3.8 deployment, server-side CA access, restricted PostgreSQL connectivity, cookies/proxy behavior and approved shared security controls in staging.                                  |
| Netlify                           | Personal $9/month / 1,000 credits; Pro $20/month / 3,000 credits | Full Next.js through its OpenNext adapter. Credits cover metered deployment/runtime activity; actual bill depends on usage. Verify this precise Next.js version, proxy/runtime constraints and TLS/connection handling before selection. |
| Render paid Node web service      | Obtain a current quote for the chosen compute tier               | Supports a full Next.js Node service. Current numeric compute pricing was not independently confirmed from the retrievable pricing table; do not treat historical Starter pricing as a verified quote.                                   |

Netlify's documented adapter supports modern Next.js server features, with platform-specific behavior and middleware limitations that need an application deployment test. [Netlify pricing](https://www.netlify.com/pricing/), [Netlify Next.js support](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/). Render documents Next.js web services separately from static sites; aiBean needs the web-service option. [Render Next.js deployment](https://render.com/docs/deploy-nextjs-app), [Render compute plans](https://render.com/docs/compute-plans), [Render pricing](https://render.com/pricing).

The repository uses SSR, server authentication, route handlers, server-side Drizzle/PostgreSQL, Node crypto/filesystem/TLS and Next.js proxy behavior. A static export or a WordPress/static-only Bluehost plan is not sufficient. An existing Bluehost account's ability to run this full Node application has not been verified. Keeping DNS at Bluehost does not require hosting the application there.

The current `npm run start` binds `next start` to `127.0.0.1` for local use. A Render service would need a reviewed service start command binding `0.0.0.0` and its assigned `PORT`; using the local command unchanged would not expose the service correctly. A framework-managed Vercel deployment uses its platform integration rather than that local listener command. No script has been changed.

Current rate-limiting and proof-replay controls are bounded, single-process candidate stores. **A reviewed shared atomic implementation is required before live, multi-instance or serverless Auth cutover.** Choosing one hosting platform does not remove this gate.

## Intended production authentication URL contract

These are planned routes, not newly configured Supabase destinations:

| Purpose                         | Intended production URL             | Contract / allowlist relevance                                                                                                         |
| ------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Website                         | `https://aibean.io`                 | Intended canonical origin and future Site URL.                                                                                         |
| Login                           | `https://aibean.io/login`           | Application page; not inherently a provider redirect destination.                                                                      |
| Registration                    | `https://aibean.io/register`        | Application page; not inherently a provider redirect destination.                                                                      |
| PKCE Auth callback              | `https://aibean.io/auth/callback`   | Current provider flow emits this path with a random `state` query. The complete allowed redirect contract must be verified.            |
| Token-hash confirmation handler | `https://aibean.io/auth/confirm`    | Alternate, unconfigured template contract; requires approved token kind plus the same initiating-browser signed intent/state/verifier. |
| Confirmation status             | `https://aibean.io/confirm-email`   | In-app status page, distinct from the token verifier.                                                                                  |
| Forgot password                 | `https://aibean.io/forgot-password` | Request form; not inherently a provider redirect destination.                                                                          |
| Reset password                  | `https://aibean.io/reset-password`  | In-app destination only after a verified recovery callback and bound recovery proof.                                                   |

The candidate selects one loopback origin and emits `/auth/callback?state=<random>` for registration/resend and recovery. A signed HttpOnly intent binds the flow kind, state and PKCE verifier. The callback cannot obtain recovery privileges from arbitrary query flags. Valid recovery then issues short-lived identity/session-bound proof before the reset page; ordinary business access independently requires signed access proof. Cross-browser or unbound token-hash confirmation links are rejected by the current handler.

Do not paste a generic static token-hash email-template example into this application. `/auth/confirm` additionally needs the application intent/state contract preserved safely; that template propagation has not been configured or tested. Prefer validating the existing provider `ConfirmationURL` / PKCE path first. Delivered links, provider-added parameters and dynamic state matching require real provider tests before acceptance.

After separate configuration approval, inspect the exact current Supabase redirect matcher and approve a narrowly scoped destination matching the configured origin, callback path and required query parameters. A bare path must not be assumed to admit the emitted state query. Avoid broad production wildcard origins or unrestricted preview domains. Login, registration and the status/reset pages are not automatically allowlist entries. `localhost` and `127.0.0.1` are distinct origins. [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [email template variables and delivery considerations](https://supabase.com/docs/guides/auth/auth-email-templates).

## Verified hosted settings and remaining configuration gaps

Read-only authenticated dashboard inspection verified the Free plan, Site URL `http://localhost:3000`, **empty redirect allowlist**, custom SMTP disabled and built-in email limit **2/hour**. Email/password and signup are enabled; email confirmation is required. Anonymous identities, manual identity linking and other visible providers are disabled. The password minimum shown is **6**, which does not match aiBean's application minimum of 8; no complexity selection was shown. Confirmation and recovery editors show default `ConfirmationURL` usage and no aiBean branding. Their actual save eligibility was not exercised. Sender-domain verification and custom sender identity are not configured.

The authoritative setting-by-setting evidence, session details, Free-plan feature limitations and password-policy discrepancy are maintained in [SUPABASE_AUTH_EMAIL_READINESS.md](SUPABASE_AUTH_EMAIL_READINESS.md). A reachable Auth endpoint or editable-looking template screen does not prove delivered email, recipient eligibility, template-save entitlement or operational authentication.

The default Supabase email service restricts recipients to organization team addresses and is unsuitable as the assumed public transactional sender. Its low send limit must be considered separately from provider quotas. Supabase documents an initial 30/hour limit when enabling custom SMTP; the actual project setting must be inspected again after a separately approved configuration change. [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Transactional email proposal

Recommend evaluating **Resend** with a verified aiBean sending domain for the bounded hosted test. Free includes **3,000 emails/month and 100/day**; Pro is **$20/month for 50,000**, with no daily email quota and additional usage charges. A verified sender domain and private SMTP credential are required. Paid services are optional planning choices, not approved purchases. [Resend pricing](https://resend.com/pricing), [Resend SMTP requirements](https://resend.com/docs/send-with-smtp).

**Postmark** is an alternative: Basic starts at **$15/month for 10,000 emails**, with overage charges; its free Developer plan offers only 100/month. Assess account approval, sender-domain validation and delivery behavior before selection. [Postmark pricing](https://www.postmarkapp.com/pricing).

`no-reply@aibean.io` and `support@aibean.io` are proposed addresses only. Neither mailbox, reply handling nor support ownership has been verified. The owner should approve the From name/address and an operational reply/support address. A dedicated sending or return-path subdomain may reduce conflict with existing Bluehost mail; exact DNS names and values must come from the selected provider's dashboard. [Resend domain verification](https://resend.com/docs/dashboard/domains/introduction).

The provider proposal must include:

1. Sender-domain verification and provider-generated DKIM records, plus any required ownership TXT, return-path SPF or MX records. Copy exact reviewed values; do not invent DKIM selectors or replace existing mail MX records.
2. One valid SPF policy per applicable name, preserving legitimate Bluehost sending sources if they remain in use. Check provider-specific return-path/subdomain instructions and SPF lookup limits before adding records.
3. An approved DMARC policy. No apex DMARC record was found. Begin with reviewed monitoring (`p=none`) if appropriate, using only an owner-approved operational report destination; stronger enforcement requires observed alignment and delivery evidence.
4. **Disable click/link tracking for Auth messages.** Rewritten confirmation/recovery URLs can break their verification flow. Review open tracking separately for privacy; keep test messages focused on authentication. [Supabase Auth email guidance](https://supabase.com/docs/guides/auth/auth-email-templates).
5. Configure private SMTP credentials only in Supabase's approved private setting, after explicit authorization. Account for both Supabase throttling and provider quota, retry/rate behavior, sender approval and test recipient permission. Provider credentials and delivered link/token bodies must not enter repository evidence.

Bluehost can publish the approved zone records. Sender verification, transactional delivery, quotas and SMTP credential issuance belong to the selected mail provider; Supabase Auth uses that provider's SMTP configuration. No mail service has been bought or connected.

## Environment and runtime contract — planned, not activated

| Setting                                  | Contract / current boundary                                                                                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`                    | Future production origin `https://aibean.io`; current isolated candidate must retain its approved loopback origin.                                                                                |
| `NEXT_PUBLIC_SUPABASE_URL`               | Existing project URL `https://yfknxidgphhepdtwazhn.supabase.co`.                                                                                                                                  |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`   | Existing project's approved publishable key; no actual key value is included here. Never substitute a privileged service key.                                                                     |
| `DATABASE_URL`                           | Private server-only restricted `aibean_app_login` connection to the existing project/database. Do not use the operator connection at runtime.                                                     |
| `DATABASE_CA_CERT_PATH`                  | Server-readable approved CA file on the chosen host, with strict certificate and hostname verification. The Windows-local path is not a deployment path.                                          |
| `AIBEAN_AUTH_MODE`                       | Current website remains transitional. Candidate `supabase` mode is limited by the checks below.                                                                                                   |
| `AIBEAN_SUPABASE_RELEASE`                | Only `candidate` is currently supported for Supabase. **No production release mode has been implemented or approved.**                                                                            |
| `AIBEAN_AUTH_ISOLATED`                   | Candidate requires `true` and a validated loopback origin; do not place the production URL into this candidate configuration.                                                                     |
| `AIBEAN_SUPABASE_PROVIDER_TEST_APPROVED` | Separate hosted-test authorization gate; currently not activated. It is not production cutover permission.                                                                                        |
| `AIBEAN_RECOVERY_SECRET`                 | Private server-only proof secret, at least 64 characters; keep stable across approved instances and handle rotation through a reviewed session/recovery plan. Never expose it via `NEXT_PUBLIC_`. |
| Callback trust                           | Fixed reviewed origin/path plus bound state/intent; never arbitrary request Host, client `returnTo`, preview hostname or query-declared recovery.                                                 |

Next.js embeds `NEXT_PUBLIC_` values during build. Set the reviewed public origin/project/key in the correct deployment build environment; keep runtime secrets confined to server configuration. Vercel currently supports Node 24, 22 and 20; choose and test an explicitly supported version for the exact deployment rather than assuming the local runtime is available unchanged. [Vercel Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions). Installed Next.js deployment/self-hosting guides were reviewed under `node_modules/next/dist/docs/`.

The direct Supabase connection generally needs IPv6 reachability. If the chosen runtime needs an official project pooler, first review its project-specific host, restricted-login identity, strict TLS/CA behavior and transaction/prepared-statement compatibility. The repository permits approved official pooler formats but this does not prove platform connectivity. Do not silently substitute a new connection. [Supabase PostgreSQL connection options](https://supabase.com/docs/guides/database/connecting-to-postgres).

## Conditional deployment and DNS operation

This sequence becomes executable only after the owner selects a provider and approves the concrete deployment and record changes:

1. Prepare an isolated deployment with authentication activation gated. Verify full server behavior, the trusted restricted database connection and secret/CA handling. Record the exact provider build/runtime requirements and cost plan.
2. Add `aibean.io` and, if approved, `www.aibean.io` to the selected hosting project. Obtain its exact ownership verification and website DNS records. For Vercel, use the project-provided apex A and www CNAME values; do not assume historical generic Vercel targets. For Render/Netlify, use that service's supplied domain records. [Vercel domain setup](https://vercel.com/docs/domains/working-with-domains/add-a-domain), [Render custom domains](https://render.com/docs/custom-domains).
3. Re-read the authoritative zone and retain a private before/after record set. Approve the precise apex/www replacement and any verification records. Nameserver transfer is not required for the proposed deployment. Keep Bluehost MX, independent mail A and unrelated TXT/DKIM records intact.
4. Apply only the separately approved records in Bluehost DNS/Zone Editor. If reducing TTL in advance is useful, obtain approval for that change too; existing cached records persist through their current TTL. [Bluehost DNS management](https://www.bluehost.com/help/article/dns-management-add-edit-or-delete-dns-entries).
5. Verify authoritative and recursive answers, platform domain ownership and managed HTTPS certificates for both approved hostnames. No apex CAA currently restricts issuance; introducing CAA is a separate reviewed change using the selected platform's actual certificate authorities. Confirm `www` redirects to the owner-selected canonical **apex** origin and retains safe paths/query handling.
6. Apply separately approved email DNS records, verify sender alignment and mail continuity, then separately configure SMTP and Supabase Site URL/redirects/templates/password policy. DNS verification alone is not delivered-message evidence.
7. Execute the separately approved two-account hosted test against its designated isolated origin, after the expanded recovery gate passes. Preserve ordinary website behavior until all cutover gates pass and a reviewed production release is explicitly authorized.

Provider DNS targets, verification TXT values, DKIM selectors, return-path records and SMTP credentials are intentionally not specified before a real provider selection/account configuration makes them reviewable.

## Rollback and unresolved gates

Keep the current deployment and zone baseline until an approved replacement is validated. A DNS rollback would restore the reviewed previous website records; it does not roll back database or Supabase identity/settings changes, and cached answers may retain the new destination temporarily. Keep mail records unchanged throughout. Preserve the prior application release and separate environment configuration. After a future Auth cutover, do not automatically reactivate legacy sessions/providers or erase identity mappings: contain access and obtain a reviewed forward-fix/recovery decision.

Outstanding gates are:

- Hosting selection, account ownership, cost approval and exact deployment/DNS package.
- Expanded encrypted recovery execution and verified isolated restoration; preparation is not a new recovery PASS.
- Approved private provider-test environment and exact callback/query matching; the current hosted redirect list is empty.
- Sender provider/domain verification, actual support/reply mailbox, safe templates, approved SMTP configuration and delivered confirmation/recovery evidence.
- Hosted password-policy alignment; the observed minimum 6 differs from the application's minimum 8, uppercase, number and non-space special character requirement.
- Exact selected-host PostgreSQL/TLS/CA connectivity and full Next.js runtime validation.
- Shared atomic rate/replay controls, sensitive-action reauthentication, verified two-account ownership isolation, legacy identity continuity and explicit production cutover design/approval.

No production activation is recommended before these gates pass. The next actionable operation remains the independently reviewed expanded-backup authorization; deployment/provider changes and hosted Auth tests require their own approvals.
