## Latest actual browser acceptance — 17 October 2026

**LOCAL WEBSITE — RUNNING; acceptance PARTIAL.** 49 actual in-app-browser observations passed, including all four unchanged fixture logins, Admin Tool creation/edit/preview/audited publication, Creator content drafts and review submission, Vendor ownership denial, and fresh ordinary registration/confirmation/login. Password replacement status and remaining owner handoffs are recorded in [the current browser report](LOCAL_BROWSER_ACCEPTANCE_20261017.md) and [per-action evidence](evidence/local-ui-browser-20261017-result.json). Older blocked/no-browser entries below are historical. No hosted connection, provider activation, schema installation or frozen source change occurred.

## Current status after preserving TLS renewal — 17 October 2026

**LOCAL WEBSITE — RUNNING:** renewal and strict native continuity verification passed, all four original passwords and the protected mailbox work, and the homepage/login pages return HTTP 200. Current lease ends at 23:10:24 EDT on October 17; renewed certificate expires October 24 at 15:10:21 EDT. All 66 application/ledger continuity checks and original identity/password hashes matched. Full suite: 167 PASS, zero FAIL. Fresh real-browser acceptance still awaits an owner-opened HTTP page. See [the actual renewal result](LOCAL_QA_TLS_RENEWAL_RESULT.md). This supersedes the expired-state entry below; earlier entries remain historical. No hosted connection or schema/data repair occurred.

## Current resumption status — 17 October 2026

**LOCAL WEBSITE — BLOCKED:** the eight-hour lease and pinned local TLS certificate have expired. All four preview ports are closed and the exact retained QA PostgreSQL cluster is stopped. Fixture and credential files remain present. No database connection, restart, certificate replacement or hosted access was attempted. The owner explicitly required stopping on TLS expiry. See [the verified blocker and proposed preserving renewal](LOCAL_QA_TLS_RENEWAL_READINESS.md). Earlier PASS/running observations below are historical.

# aiBean local UI acceptance — Phase 2

15 October 2026; branch `codex/supabase-foundation`. **Local website running; acceptance PARTIAL because fresh actual-browser testing is blocked.** No hosted Supabase connection, schema installation, backup/recovery, deployment or provider activation occurred. No application source or frozen mechanism was changed.

## Owner access

| Persona | Login | Panel | Actual login status |
| --- | --- | --- | --- |
| User | http://127.0.0.1:3000/login | http://127.0.0.1:3000/account | PASS through real local HTTP endpoint |
| Admin | http://127.0.0.1:3002/login | http://127.0.0.1:3002/admin | PASS through real local HTTP endpoint |
| Creator | http://127.0.0.1:3003/login | http://127.0.0.1:3003/creator | PASS through real local HTTP endpoint |
| Vendor | http://127.0.0.1:3004/login | http://127.0.0.1:3004/vendor | PASS through real local HTTP endpoint |

Homepage: http://127.0.0.1:3000/. The same 3000 origin supports every persona with server-side capability checks. Ports on one hostname share browser cookies: ports are not independent browser profiles. Use genuinely separate browser profiles for simultaneous identities. The final owned runner is PID **65480**, with lease expiry **15 October 2026, 21:03:06 EDT**. This is observed local state, not a promise of persistence after a machine/app shutdown.

From the repository root, open existing credentials privately:

~~~powershell
powershell.exe -NoProfile -File scripts/local-website-qa/open-desktop-test-access.ps1
~~~

For the previously prepared browser journey add `-Kind BrowserJourney`. The helper resolves packaged Codex file virtualization; do not guess an AppData path, copy credentials into OneDrive, or paste values into chat. Its final native execution passed all four current-password probes and opened the existing protected handoff; owner-visible Notepad access remains unconfirmed. Mailbox: http://127.0.0.1:3000/local-mailbox — separate owner password in private handoff; synthetic local messages only.

## Authentication and browser gate

| Acceptance | Native HTTP/PostgreSQL | Fresh browser |
| --- | --- | --- |
| Registration / unconfirmed denial / ordinary identity / confirmation | PASS | BLOCKED |
| Confirmed login / account / security form | PASS | BLOCKED |
| Incorrect current password / change / old rejection / new acceptance | PASS | BLOCKED — owner entry/submission required |
| Forgot/reset / mailbox / single-use purpose/expiry/replay | PASS | BLOCKED — owner entry/submission required |
| Logout / all-session revocation / concurrent token exchange | PASS | BLOCKED |
| Privilege metadata rejection / protected caps / peer ownership | PASS | BLOCKED for distinct browser profiles |

[27 actual lifecycle/security checks](evidence/local-ui-phase2-auth-native.json) passed. These are genuine local endpoints and native PostgreSQL, not hosted Supabase Auth or browser automation. The previous day's registration/confirmation/login/security screenshots remain historical evidence and are not relabelled as current tests.

The browser tool rejected selection of a saved internal error page under its URL policy and explicitly prohibited alternate-path workarounds. The owner was asked to open http://127.0.0.1:3000/login and reply Opened; no fresh allowed tab was available during this run. **Fresh browser actions: zero; fresh screenshots: zero; console not observed.** [Browser blocker evidence](evidence/local-ui-phase2-browser.json). Password changes/resets require owner entry and submission under the current browser policy. Native success cannot complete this UI gate.

## Actual product workflows

| Panel | Executed native workflow evidence | Limits |
| --- | --- | --- |
| Admin | New Tool create/private preview/edit/publish/archive; invalid transition rejection; ordinary review moderation; Creator application creates pending operator request; independent Skill/Playbook publication; audit persistence | Claims/disputes/verification/reports/commerce queues rendered; complete adjudication not claimed |
| User | Private ordinary profile; save/remove; new Stack create/rename/Tool membership/order/notes/peer denial/delete; named comparison and private membership; Creator/Skill follow/unfollow; review pending until Admin approval | Billing/membership render only; no payment activation |
| Creator | Skill/Playbook/Event/resource drafts with real validation and Tool references; Skill edit/submit; ordered Playbook steps; independent Admin moderation; peer draft denial; analytics | Existing approved Creator profile editing not retested; live uploads/scanning unavailable |
| Vendor | Owned Tool/analytics/history; existing edit duplicate guard/payment-pending honesty; initial verification request without badge/settlement; peer Tool denial and initial forged request denial | Existing pending requests preserved; new duplicate proposals BLOCKED; no claim/payment completion |

[198 route/access and action checks](evidence/local-ui-phase2-http.json), [71 product workflow observations](evidence/local-ui-phase2-workflows.json) and [23 discovery observations](evidence/local-ui-phase2-discovery.json) passed with zero final failures. Counts include rendering and mutations: they are not counts of end-to-end browser journeys. Final workflow evidence separately retains two BLOCKED duplicate requests and one NOT TESTED repeat forged request; the initial evidence contains the executed forged request check.

The [full per-action matrix](evidence/local-ui-phase2-acceptance-matrix.json) specifies persona, route, action, expected/actual result, status, evidence, reproduction, severity and observation limits. Rendered pages alone do not prove their entire workflows.

## Continuity and safe test-data handling

Only new task-generated synthetic content was created. Repeated diagnostic drafts legitimately reached Free-plan quotas; a narrow author/time/slug/title allowlist retired only this task's records using genuine submission/rejection/archive/cancel actions. **No records deleted, plan quotas changed, payments simulated, or preexisting content overwritten.** Original pending Vendor proposals remain. [Retention](evidence/local-ui-phase2-test-content-retention.json), [Event slot retention](evidence/local-ui-phase2-event-retention.json). Successful new comparison/content examples remain for owner inspection.

[Independent restart continuity](evidence/local-ui-phase2-restart.json) passed all 66 application/ledger relation counts/private digests, registered identity/password hashes, four credential values, private environment and active source. No private row bodies/hashes were exported in reports. [Session/alias/mailbox restart evidence](evidence/local-ui-phase2-restart-sessions.json) records the final controller result, runner and eight-hour expiry. Historical controller failures are retained separately. The launcher snapshots source at start; use reviewed stop/start after changes. The finite local TLS certificate expires 16 October 2026 at 11:52:10 UTC; stop for reviewed renewal if expired, never disable verification.

## Confirmed corrections and remaining issues

No reproducible application-source defect was established in the executed native workflows. Corrections are additive QA tooling only:

- Read-only ledger observer used the local operator instead of expanding correctly denied runtime privileges (SQLSTATE 42501 preserved).
- HTTP form decoding now structurally assembles literal React streamed segments without evaluating page JavaScript. Two regression tests prove no script execution and cycle rejection. Button labels, Event required input and Stack ordering assertions were corrected to match actual contracts.
- Restart observer waits for the exact owned PostgreSQL shutdown; Windows PowerShell uses its own module discovery rather than inherited conflicting module paths, with original ACL checks intact.

| Priority | Remaining item | Status / next action |
| --- | --- | --- |
| P0 | Confirmed local critical application defect | None observed within tested scope; not an exhaustive security certification |
| P1 | Fresh browser authentication and four-role UX acceptance | BLOCKED; owner-opened HTTP tab, then human password-entry handoff |
| P1 | Local lease/TLS expiry | Finite safety limit; preserve target, review renewal after certificate expiry |
| P1 | Hosted Auth/SMTP, Stripe settlement, Storage/scanning | BLOCKED; independent provider/release approvals required; not configured here |
| P2 | Creator approved-profile edit; full claim/dispute adjudication | NOT TESTED; use new synthetic eligible records without overwriting pending fixtures |
| P2 | Vendor duplicate pending proposals | BLOCKED by preserved valid pending records; no fabricated completion |
| P2 | Browser focus/loading/responsiveness/accessibility and console | NOT TESTED; static label counters are triage signals, not an accessibility verdict |
| P2 | Historical Creator Content internal postflight failure | Existing forensic status unchanged; separate verifier evidence remains historical |
| P3 | Large datasets and exhaustive interaction permutations | NOT TESTED |

## Validation and publication

Full native Windows automated suite: **163 PASS, zero FAIL**. Initial sandbox run had three environment failures (junction/loopback restrictions); native rerun passed. Lint, TypeScript, isolated production build and runtime dependency audit passed, with zero runtime vulnerabilities. [Validation evidence](evidence/local-ui-phase2-validation.json). Native HTTP checks are separate from Linux CI and from actual browser tests. Original 170 Creator Content dependencies, 24 overlay dependencies and desktop-access extension remain exact. New additive observer inventory is versioned separately; it authorizes no hosted operation.

The additive [observer inventory](../db/proposals/local-ui-acceptance-phase2-v1.json) binds 16 new files with canonical-LF checksums; manifest SHA-256: `b2da295477ec341b93b67b3622e72b80a49da3f6baaa7a774da1668ab4fc4f15`. [Seal verification](evidence/local-ui-phase2-seals.json) independently checks the original 170 dependencies, 24 overlays and desktop-access extension.

Implementation commit `776dc43a4ddf42448af79a874c856258a50145cc` was pushed and independently matched against the remote branch. [Validate 38774920174](https://github.com/nzagha/aibean/actions/runs/38774920174) completed **SUCCESS**, including lint, TypeScript, automated tests, production build and runtime audit; [observed CI evidence](evidence/local-ui-phase2-ci.json). This is the exact implementation commit's Linux CI, separate from the native PostgreSQL checks and blocked real-browser gate. The documentation follow-up records that observation without representing it as CI for an unrelated commit.

[Final owner handoff check](evidence/local-ui-phase2-owner-handoff.json): homepage and all four login URLs returned HTTP 200 after restart; the existing credentials were not rotated. [Protected publication scan](evidence/local-ui-phase2-publication-scan.json) passed before the implementation commit; the follow-up is scanned separately.

## Safe owner continuation

1. Open the login page in the Codex in-app browser and reply Opened. Retrieve credentials privately with the helper; use separate profiles for simultaneous roles.
2. Register a new synthetic ordinary identity, confirm in the protected mailbox, then test login/security. Do not replace the four existing fixture passwords.
3. For password change/reset, owner enters and submits values privately; verify old credential/session denial and new login afterward.
4. Complete role-specific browser actions and record screenshots/console only after removing secrets from view. Preserve pending requests; no provider activation.
5. Use the live state manifest for lease/runner status. After expiry run the reviewed stop script, then start-account-testing.ps1 -LeaseHours 8 only while the original TLS fixture remains valid. Never recreate the database to recover access.

Next milestone is the blocked real-browser acceptance gate, followed by independently reviewed provider/hosted identity readiness; no hosted authority is inferred.
