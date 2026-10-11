# Full MVP product acceptance and UX corrections — 11 October 2026

Result: the available local workflows pass the bounded functional checks below. **The full MVP is not accepted for hosted release.** Required product models, identity release engineering and real provider verification remain incomplete. This acceptance stage made actual corrective code changes; it did not install hosted proposals or activate services.

Authority: verified Master Plan v0.3, current owner amendments, SOURCE_MANIFEST.json and existing approved stable taxonomy. Supabase supersedes the historical Clerk direction. Playbooks remain included and free to read. Existing aiBean typography, colors, assets, homepage composition and card grids were preserved. Historical audit/version snapshots were not rewritten.

## Defects reproduced and corrected

| Finding | Correction | Execution evidence |
| --- | --- | --- |
| Reduced-motion hydration could remove MotionLink's server-generated tabindex. | Explicit stable tabindex on preview links; accordion rotation respects reduced motion. | Server-render/hydration regression, browser console and keyboard preview checks. |
| Resource file forms were inside every parent content action form. | File section is a separate sibling, with one heading appropriate to its Admin/Creator context. | Code structure, HTTP/browser form inspection; actual provider-enabled upload browser flow remains gated. |
| Next 16 normalized 127.0.0.1 to localhost, breaking same-origin login/upload/outbound requests and redirects. | Derive origin from the actual Host, enforce configured canonical host when present, reject malformed/cross-origin requests and ignore forwarded-host spoofing. Secure cookies follow the canonical HTTPS origin. | NextRequest regression, synthetic browser login, HTTP 303 and cross-origin 403 tests. Candidate Supabase Auth origin guards remain separate and unchanged. |
| Creator @handle params retained percent encoding, making published profiles/campaigns unreachable. | Decode once and validate the entire handle; reject malformed, double-encoded or separator-containing paths. | Literal/encoded-path unit tests and actual published profile/resource HTTP/browser journeys. |
| Public Creator aggregation ordered Stacks by a nonexistent stacks.created_at column. | Use the existing stack_settings timestamp and stable ID tie-breaker. | Actual rendered profile, PGlite and native PostgreSQL aggregate query. |
| Save/Stack/review entry points lacked useful pending/error/success feedback; review edits could overwrite a newer decision. | Stateful branded action forms; shared transactional engagement service; canonical ownership, published Tool guard, Tool-first locking and xmin revision comparison. Account edits delegate to that service. Post-commit cache failures accurately report saved changes. | Browser save/create/add/review, two-user contracts, independent concurrent native sessions, stale rejection and audit rollback. |
| Context ranks and comparison lacked enough explanation. | Reviewed same-version peer positions, strengths/limitations/context rows and bounded verdict requiring current verification and comparable scores. Missing facts remain explicit. Sponsorship/payment cannot affect ranking. | Context/version/stale/invalid-date/demo/payment regression tests and responsive keyboard-scroll comparison. This is not the complete Master Plan comparison fit model. |
| Tool results had no bounded public pagination or cross-scope discovery. | Twenty results/page, preserved query filters and bounded pages; links to contextual Skills, Playbooks, Events and Creators. | Empty/invalid/final-page regression plus HTTP filters. Tool catalog filtering remains in memory and is not a scale benchmark. |
| Historical subcategory slugs were not globally unique. | Stable-ID resolution; duplicate knowledge-base-assistants requires explicit parent or returns 404. No taxonomy IDs/bytes changed. | Both historical duplicate identities, invalid parent, stable ID and actual HTTP resolution checks. |
| Existing relations were not fully exposed publicly. | Skill → eligible published Playbooks, Tool → eligible public Creator Stacks, Creator context matching from published content. Private drafts and suspended/unapproved authors are excluded. | Content contract in PGlite/native PostgreSQL; HTTP directories/details. |
| Several review and commercial decisions had no account notification. | Transactional in-app notices for review/claim/Creator/Vendor request/submission/placement/dispute decisions, verified sandbox payments and subscription states. Uses the already proposed account_notifications model. | Account isolation, stale/no-duplicate decision and failed-notification rollback of actual review/audit tested in both database engines. No email is sent. |
| Production tracing scanned retained fixture directories. | Limit realpath validation to the exact manifest/certificate files, which also rejects redirected parent paths; exclude test-results from output file traces. | Narrow-path regression and final production trace inspection; generated fixture credentials/logs are not deployment inputs. |

Notification writes are disabled while the content workflow flag is unset. Once enabled, reviewed storage validation and the notification insert must succeed in the same transaction as the decision. A SQL failure cannot leave an approved item without its audit/notification. Protected capabilities still require a separate operator decision.

## Final verification

| Check | Result and boundary |
| --- | --- |
| Lint / TypeScript | PASS; installed Next 16 guide and actual runtime behavior reviewed. Windows sandbox canonicalization blocked one typegen invocation; the permitted rerun passed without changing checks. |
| Complete automated suite | 104 PASS, zero skipped. Includes actual transactional database contracts plus React/JSDOM accessibility/interaction and synthetic scanner protocol tests. |
| Native PostgreSQL | 29 PASS in fresh isolated PostgreSQL 17.11 clusters, strict generated test CA/hostname TLS, SCRAM, nonsuperuser operator, restricted runtime and independent browser/service role sessions. Both instances stopped afterward. |
| Production build | PASS with installed Next 16.3.8. |
| Runtime dependency audit | Zero vulnerabilities. |
| HTTP | 119/119 PASS across 65 page patterns and additional denial/filter/outbound cases. Public and all four workspaces, queue variants, published/unavailable content, ownership/role and outbound boundaries. |
| Browser | Synthetic login, User saves/Stacks/review, Admin moderation, Creator resource publication, Vendor owned inventory, previews/comparison persistence, responsive navigation and form semantics. Actual desktop/tablet/mobile renders captured. |
| Preservation | Original source files, active taxonomy, baseline SQL/migrations and frozen recovery dependencies match recorded checksums. No hosted target was connected to during this acceptance stage. |

[Native evidence](evidence/mvp-product-native-acceptance.json), [HTTP evidence](evidence/mvp-product-http-acceptance.json), [browser observations](evidence/mvp-product-browser-acceptance.json), [invariant checks](evidence/mvp-product-preservation.json), [route coverage](MVP_ROUTE_FUNCTIONAL_COVERAGE.md), [requirement matrix](MVP_ACCEPTANCE_MATRIX.md).

HTTP PASS establishes routing/rendering/denial semantics and absence of a detected server-render failure, not every server action or WCAG compliance. Next loading boundaries can stream a redirect or not-found with transport status 200; evidence records the effective NEXT_REDIRECT/NEXT_HTTP_ERROR_FALLBACK outcome. Raw unhydrated form diagnostics can be affected by streaming; browser checks inspected hydrated controls. Native/service contracts provide mutation/concurrency/rollback coverage; representative browser journeys provide visual and interaction coverage.

Browser fixture used one synthetic Admin with additive Creator and Tool-owner capabilities and one ordinary User. Native contracts independently tested separate non-Admin Creators and Vendors, ordinary denial and cross-account ownership. The combined browser fixture alone is not proof of separate capability boundaries. All records and screenshots are synthetic; no real testimonial, analytics, account, review or catalog claim was fabricated.

## Responsive and accessibility review

Actual viewports: desktop 1280×900, tablet 768×1024 and mobile 390×844. Sampled document widths remained within these viewports. The wide comparison table scrolls inside its labelled focusable container; keyboard ArrowRight scrolling worked without page overflow. Mobile navigation uses showModal, focuses Close, restricts background interaction and restores focus to Open navigation after Escape. See [W3C dialog guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

Form controls on sampled hydrated editors/submission/account pages have labels; invalid input and success feedback use existing accessible forms; destructive actions use the existing confirmation mechanism. Reduced-motion browser session showed no hydration mismatch; Motion's informational reduced-motion warning was expected. Preview expansion and saved progress survive reload without moving the site composition.

This is bounded accessibility acceptance, not a full WCAG conformance certification: screen-reader matrix, automated full-site contrast checks, every keyboard sequence and production device/browser coverage remain unverified. Disabled-provider upload controls were inspected structurally, not passed as real upload/download journeys.

Screenshots: [Creator resource desktop](evidence/mvp-creator-resource-desktop.jpg), [Admin mobile](evidence/mvp-admin-mobile.jpg), [User tablet](evidence/mvp-user-tablet.jpg), [comparison mobile](evidence/mvp-compare-mobile.jpg).

## Genuine product gaps, prioritized

1. **Identity release foundation (P0).** Candidate exists, but hosted registration/confirmation/recovery, delivery, Google/Apple/provider configuration, real account-security behavior and exclusive cutover are not verified. Shared atomic Auth throttling/replay, reviewed recent-auth/session revocation guarantees and a production release mode remain engineering dependencies; approval alone cannot complete them. Preserve internal IDs, reject email-only merges and keep current transitional auth until validated exclusive cutover.
2. **Durable comparison and fit model (P1).** Browser comparison selection works. The Master Plan requires authenticated saved comparisons: a forward reviewed comparison/ordered-member persistence model and ownership/revision contracts are missing. Reviewed organic-context guidance is implemented; the full comparison recommendation model needs separately reviewed fact/fit inputs rather than invented ease/quality values. This requirement is not optional.
3. **Broader follows and behavioral attribution (P1).** creator_follows and generic in-app notices work. Tool/Skill/Playbook/Event/industry follow targets and their update fan-out need an explicit relationship model. engagement_counters supports daily outbound aggregates, not analytics_events for views/downloads/search/comparison, unique visitors, sessions, referrers or campaign conversion. Audits cannot substitute for analytics. Missing attribution/event models and privacy/retention rules block full Creator/Vendor analytics.
4. **Commercial plan entitlements and exceptions (P1).** Sandbox payment/subscription states, pricing, cancellation requests and paid editorial workflows are implemented. Plan quotas/discount entitlements, commercial exception resolution and controlled expired-checkout/refund/proration handling need reviewed persistence/contracts and owner-approved plan values. No payment may grant capabilities, editorial approval, verification or rank. Real Stripe test-mode reconciliation remains a provider gate.
5. **Affiliate/campaign and profile extensions (P2).** Validated official Tool CTAs, external Event registration and Creator resource pages work. aiBean-managed affiliate configuration/relationship disclosures/attribution need affiliate/link models. Campaigns currently link Skill/Playbook and an external destination; Tool/Stack/Event/media block relationships and supported avatar/cover/social-link metadata require additive reviewed storage. No fake affiliate tracking or media upload is represented as working.
6. **Taxonomy and launch content (P1 operational).** Approved v1.1 binary reconciliation is still unverified in the source manifest. Preserve current IDs/bytes; do not replace with historical v1 or invent sub-verticals. Real reviewed catalog/content, canonical Admin/Creator/Tool ownership, indexed production search/load, monitoring, screen-reader/device checks and deployment acceptance remain prerequisites. Synthetic fixtures are not launch seed content.

Excluded modules remain outside scope: Discussions/Replies/News/Courses/Social Videos, direct messaging, native video hosting, Creator payouts, Enterprise/SAML, anonymous identities and Web3. Public browsing remains unauthenticated. Newsletter/community marketing previews are not evidence of enabled delivery services.

## Exact external approvals and order

None of the following is executed or implicitly requested by this report. Approvals A/B/C are already historical completed operations and must not be repeated. Every new hosted step needs fresh inventory/history, continuity and recovery checks; stop on drift. A post-commit problem requires a reviewed forward fix/recovery decision, never an automatic reset.

1. **Recovery before hosted schema changes.** The separately corrected recovery-v2 manifest is still `5249c408d2610ab30e8e691f2f8396b3b83fd2ffc05053aaafebc6cb952acfec`. Its frozen 18-table/two-sequence scope does not cover the new proposals or Storage files. Exact existing retry authorization is in [correction review](SUPABASE_EXPANDED_RECOVERY_CORRECTION_REVIEW.md). Any newly expanded recovery scope needs a new immutable manifest and approval, not reuse of that hash. The failed retained target and private original backups were untouched; their current hosted continuity was not reverified in this local stage.
2. **Independent schema packages**, in the following dependency order, after that recovery gate. Authorize each separately using the wording below. These create only the application objects/private ledgers in the exact reviewed SQL, with RLS/effective grants and protected baseline history. They do not enable application flags, Auth, Storage or payments.

| Package | Exact SQL path | SHA-256 | Expected additive public scope |
| --- | --- | --- | --- |
| Review | db/proposals/admin-review-v1.sql | 5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca | Five review/request/dispute/capability-request tables |
| Commercial | db/proposals/admin-operations-v2/0000_admin_operations.sql | 1d13ac175e967a2a9512f1ed1e0e2d6b5c34a3fa2c67692d9adcf70fef686d39 | Four tables / eight FKs |
| Content | db/proposals/creator-content-v1/reviewed-installation.sql | ecdac0e6d3448456d16b71a274d29a62050264ba9d406d4077081c998541f78d | Fifteen tables / 39 FKs |
| File metadata | db/proposals/creator-files-v1/reviewed-installation.sql | 88b5cc102a30097f7579f7dcd1da482e691522353439b5f688abcce2ad50b66b | resource_files / five FKs |

For each row, exact independent wording (replace only the two bracketed fields with that row's literal path/hash):

> I authorize executing only `[SQL path]`, SHA-256 `[SHA-256]`, against Supabase project `yfknxidgphhepdtwazhn`, database `postgres`, after verifying current target/operator, trusted TLS, exact dependency hashes and ledgers, inventory, effective grants/RLS, preserved existing records and approved recovery evidence. Execute the reviewed bounded atomic transaction once. Validate its exact new objects, constraints, RLS, ledger, effective table/column grants and unchanged baseline migrations, TestUsers records, Auth accounts, identity mappings and ownership. Stop on drift or failed checks; after commit stop for a reviewed forward fix. No reset, seed, other package, protected capability change, Auth activation, Storage provisioning, provider setup, payment or backup/export is authorized.

These are reviewable current proposals, not approval for the missing models listed above. See [review impact](ADMIN_REVIEW_DATABASE_PROPOSAL.md), [commerce impact](ADMIN_OPERATIONS_DATABASE_PROPOSAL.md), [content/file impact](ADMIN_CONTENT_DATABASE_PROPOSAL.md).

3. **SMTP/password/isolated redirect readiness**, before real Auth tests. A concrete selected sender/provider, private credentials, exact DNS records and candidate run origin must be reviewed first. [Email readiness](SUPABASE_AUTH_EMAIL_READINESS.md) documents the observed six-character provider minimum and built-in mail constraints as dated evidence, not current reinspection. Application policy remains eight characters plus uppercase, number and non-space special character. A stronger lower/upper/digit/symbol preset needs owner agreement and synchronized validation; do not assume supported custom API semantics. Narrow callback state matching must be verified before approval. DNS changes require their own exact record plan. Provider credentials must be supplied privately, never in chat/GitHub.

> I authorize only the reviewed SMTP sender/provider configuration, password policy and isolated callback allowlist recorded in the final configuration manifest for project `yfknxidgphhepdtwazhn`, preserving email confirmation and disabled excluded methods. Keep the public website's identity unchanged. Stop on any value, supported-policy or callback mismatch. This does not authorize DNS changes, real mail/account creation, privileged flags or website cutover.

This wording is **not executable yet**: the final configuration manifest and exact privately selected values are outstanding. Separate Google/Apple provider setup similarly requires concrete provider/redirect credentials and review; do not activate all available methods automatically.

4. **Two ordinary hosted accounts and bounded mail tests**, only after schema/recovery/configuration prerequisites. Exact reviewed scope:

> I authorize hosted Auth testing on project `yfknxidgphhepdtwazhn` using exactly two ordinary accounts whose addresses I provide privately as A and B, through the isolated loopback candidate origin recorded in the private run manifest. I authorize at most five registration/resend/recovery email requests as enumerated in `docs/SUPABASE_HOSTED_AUTH_TEST_AND_CUTOVER_PLAN.md`, real confirmation/login/recovery/session/negative-callback checks, and normal atomic creation of exactly two ordinary application Users and their canonical mappings. Preserve current website authentication, existing records and histories; assign no Admin, Creator or Vendor privilege. Retain those accounts/Users/mappings. Stop at quota/budget, drift or failed prerequisites. No provider/SMTP/DNS changes, business fixtures, payments, additional accounts, account deletion or website cutover are authorized.

Positive hosted business fixtures and real Admin/Creator/Tool-owner activation remain independent approvals. A capability activation authorization must identify exact existing internal User ID, current approved request/revision, evidence and enabled/disabled state; no new operator activation procedure is claimed complete here.

5. **Stripe sandbox only.** Separately review exact test-mode product/price/session IDs, privately configured webhook signing secret, allowed fixtures/amounts and hosted workflow availability. Fixed sponsored offer remains $99/five days. No actual provider call was tested in this stage.

> I authorize only the reviewed test-mode Stripe configuration and bounded sandbox reconciliation tests in the final payment fixture manifest. Preserve $99/five-day sponsorship and independent editorial, verification, capability and organic-rank controls. No live mode, real charge, invented product/plan values, refunds or production deployment are authorized.

This approval also requires a concrete manifest before execution; pure synthetic payment adapters are not provider verification.

6. **Private Storage/scanner configuration and tests.** Separately review exact private bucket, scoped key permissions, bucket policies/limits/MIME, scanner engine/signatures and orphan handling. File metadata installation alone is insufficient. Existing signed URLs may remain valid for up to 60 seconds after file disablement.

> I authorize only the reviewed private Storage bucket/policy and scanner configuration plus synthetic clean/infected/oversize/unauthorized/provider-failure upload and signed-download tests described in the final resource-provider manifest. Preserve private storage and account/content ownership; report no keys, private object contents or personal data. No unrelated Storage change, hosted schema change, Auth activation or production release is authorized.

7. **Taxonomy/catalog and exclusive release.** Reconcile the independently approved v1.1 binary through a new source/provenance review; approve real editorial catalog imports separately. Finish shared Auth controls, real provider/cross-account verification and a concrete HTTPS hosting/DNS/security/recovery release plan before asking for exclusive Supabase cutover. Do not treat DNS/deployment/capability or identity activation as implied by schema or testing approvals.

## Reproduce the local acceptance environment

The harness creates a new test-results directory, generated synthetic credentials/CA, loopback PostgreSQL 17 and two Next dev instances. It never accepts a supplied hosted URL, loads private environment values into the fixture, reuses an old target or deletes retained artifacts. Existing .env.local key names are overridden with empty values for fixture child processes. The development-only database adapter rejects production/test modes, hosted endpoints, wrong roles/databases/ports, expired manifests and redirected/tampered certificate paths. Normal frozen hosted TLS/runtime validation remains the default.

```powershell
$env:PG_TEST_BIN = (Resolve-Path 'test-results/postgres-validation/portable/pgsql/bin').Path
$env:PG_TEST_OPENSSL = 'C:\Program Files\Git\usr\bin\openssl.exe'
npx tsx scripts/start-product-acceptance.ts
# In a second terminal, use the new public run ID printed by the harness:
npx tsx scripts/verify-product-acceptance-http.ts <run-id>
# Write STOP only inside that newly printed fixture directory.
```

Use existing installed PostgreSQL 17/OpenSSL paths where different. Generated private fixture credentials/logs remain Git-ignored. Child apps start sequentially to avoid Next declaration-write collisions; cleanup stops only their new process trees/cluster and restores exclusively generated declarations while preserving concurrent human changes. Successful startup, HTTP execution, stop and declaration restoration were exercised. The user's original browser tabs/dev process and all original recovery targets were preserved.

## Publication

Corrective implementation: [675c1ec](https://github.com/nzagha/aibean/commit/675c1ec65f5b512fc5cc17117db48da35d7e0320). Isolated acceptance harness: [3f4ff7c](https://github.com/nzagha/aibean/commit/3f4ff7cf3ee202cc0dc062ab0697b5b42cddde36). Both published to codex/supabase-foundation. [GitHub Validate](https://github.com/nzagha/aibean/actions/runs/38162615660) passed lint, TypeScript, all automated tests, production build and runtime audit on that exact code. Native/browser/HTTP evidence was executed locally and is not provider verification. Sanitized documents/screenshots are a separate publication; private fixture data, environment values, keys, original archives and unrelated untracked skills remain excluded.
