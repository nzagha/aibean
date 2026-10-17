# Local browser acceptance — 17 October 2026

Status: **PARTIAL**. These are actual Codex in-app-browser actions against the preserved disposable PostgreSQL fixture. Earlier native checks and route rendering are reported separately. Source commit: `ecb2efddfb7c7484aa72e49dc14cd96f10912d45`. No app implementation or frozen package was edited during this browser run.

## Access

Homepage: http://127.0.0.1:3000/ . All four fixture passwords were used unchanged in the actual browser and worked.

| Persona | Login | Panel |
| --- | --- | --- |
| User | http://127.0.0.1:3000/login | /account |
| Admin | http://127.0.0.1:3002/login | /admin |
| Creator | http://127.0.0.1:3003/login | /creator |
| Vendor | http://127.0.0.1:3004/login | /vendor |

The 3000 origin also supports all roles. Ports share hostname cookies; they are not isolated browser profiles. Use distinct browser profiles for simultaneous role tests. Lease expiry is October 17, 23:10:24 EDT; current local certificate expires October 24, 15:10:21 EDT. Availability is finite, not guaranteed beyond lease/shutdown.

From the repository root, retrieve the four original passwords privately:

~~~powershell
powershell.exe -NoProfile -File scripts/local-website-qa/open-desktop-test-access.ps1
~~~

The new disposable browser account uses a separate existing owner-protected handoff, opened through the verified physical file handle. Credentials are not copied into this repository. Protected mailbox: http://127.0.0.1:3000/local-mailbox ; synthetic messages only, no external delivery.

## Actual cases

41 PASS observations currently recorded. This count includes navigation/access and mutations, not 41 complete product journeys. The [structured evidence](evidence/local-ui-browser-20261017-result.json) includes expected/actual outcomes and screenshot links. Non-public original workspace screenshots are retained privately.

| Case | Persona | Route | Action | Status | Observed result |
| --- | --- | --- | --- | --- | --- |
| 1 | User | /account | Sign in with unchanged fixture password | PASS | Your next moves, saved Tools, Stacks and User workspaces visible |
| 2 | User | /account | Create and rename a new disposable Stack | PASS | Stack created and Your changes are saved; original fixture headings still present |
| 3 | User | /account | Delete only the new disposable Stack | PASS | New Stack heading disappeared; original Stacks remain |
| 4 | User | /admin | Open Admin directly | PASS | Redirected to account?notice=admin-required with Admin access is required |
| 5 | User | /account | Sign out | PASS | Login page displays You have been signed out |
| 6 | Admin | /admin | Open operational dashboard | PASS | Content and trust dashboard rendered current counts and recent Stack activity |
| 7 | Admin | /admin/tools/new | Create new synthetic Tool draft | PASS | Draft created. Review its private preview before publication. |
| 8 | Admin | /admin/tools/[new-id]/preview | Inspect private draft preview | PASS | Private Admin preview · draft, Not awarded, Last Verified Never |
| 9 | Admin | /admin/tools/[new-id] | Edit Tool description with reviewer reason | PASS | Tool content saved. Trust and ownership remain subject to independent review. |
| 10 | Admin | /admin/tools/[new-id] | Request publication once | PASS | Owner confirmed the single existing dialog; browser now shows Current status published and Publication status updated and audited. |
| 11 | Admin | /admin/audit?entity=[new-id] | Inspect new Tool audit history | PASS | Three entries visible: tool.created, tool.edited and tool.published; reason and changed field recorded |
| 12 | Admin | /creator | Open Creator workspace as Admin | PASS | Redirected to account?notice=creator-required with Approved Creator access is required |
| 13 | Creator | /creator | Sign in and open approved Creator workspace | PASS | Creator workspace shows Skills, Playbooks, Events, resources and Proposed / Preview Free membership |
| 14 | Creator | /creator/content/skills/new | Create Skill with published Tool reference | PASS | Draft saved. Publication requires independent Admin review. |
| 15 | Creator | /creator/content/skills/[new-id] | Edit the new Skill draft | PASS | Draft saved. Publication requires independent Admin review. |
| 16 | Creator | /creator/content/skills/[new-id] | Submit Skill for review | PASS | Status changed to pending, No editorial decision yet; submit action removed |
| 17 | Creator | /creator/content/playbooks/new | Create Playbook with two steps and reorder controls | PASS | Move up/down changed visible step order; Draft saved with independent review requirement |
| 18 | Creator | /creator/content/playbooks/[new-id] | Reopen saved Playbook | PASS | Saved draft shows Inspect the synthetic Tool first and Record the synthetic outcome second; 30 minutes; free-to-read invariant |
| 19 | Creator | /creator/content/playbooks/[new-id] | Submit new Playbook | PASS | Status pending; Creator submission action removed |
| 20 | Creator | /creator/content/events/new | Create future virtual Event draft | PASS | Draft saved; independent Admin review required |
| 21 | Creator | /creator/content/resources/new | Create resource campaign draft | PASS | Draft saved; no publication or external payment |
| 22 | Creator | /creator/analytics | Read analytics | PASS | No requests or conversions shown; no false revenue |
| 23 | Creator | /admin | Direct Admin access | PASS | Redirected account with admin-required notice |
| 24 | Vendor | /vendor | Login and view ownership dashboard | PASS | One owned synthetic Tool; settlement disabled; sponsorship $99/five days |
| 25 | Vendor | /vendor/tools/:ownedTool | Inspect pending edit and verification | PASS | Both requests pending; payment required; duplicate forms unavailable |
| 26 | Vendor | /vendor/tools/:ownedTool/analytics | Read owned Tool analytics | PASS | No conversions/commissions falsely reported |
| 27 | Vendor | /vendor/tools/:unownedTool | Direct request access to new Admin-created Tool | PASS | Approved ownership required; request controls absent |
| 28 | Vendor | /admin | Direct Admin access | PASS | Admin required |
| 29 | Vendor | /creator | Direct Creator access | PASS | Approved Creator required |
| 30 | Fresh User | /register | Register ordinary synthetic identity | PASS | Eligible confirmation message notice shown |
| 31 | Fresh User | /login | Login before email confirmation | PASS | Verification-incomplete generic credential denial |
| 32 | Fresh User | /local-mailbox | Unlock protected mailbox | PASS | New synthetic confirmation message present; no external email |
| 33 | Fresh User | /login?status=verified | Confirm email through mailbox | PASS | Email confirmed. Sign in to continue |
| 34 | Fresh User | /account | Login after confirmation | PASS | Confirmed login succeeded; ordinary navigation only |
| 35 | Fresh User | /tools/:newTool | Save Tool | PASS | Tool saved to your account; Remove from saved available |
| 36 | Fresh User | /tools/:newTool | Follow Tool | PASS | Following saved; count one; Unfollow available |
| 37 | Fresh User | /tools/:newTool#reviews | Submit review | PASS | Your review pending; no approved review falsely shown |
| 38 | Fresh User | /tools/:newTool | Remove saved Tool | PASS | Removed from your saved tools; Save tool restored |
| 39 | Fresh User | /account/security | Open security form | PASS | Current/new/confirmation fields visible; no elevated capabilities |
| 40 | Fresh User | /account/security | Owner enters and submits password change | PASS | Password updated; signed out; sign in again |
| 41 | Fresh User | /login | Login with previous password after change | PASS | Credential denial shown after old password submission |

## Publication interruption

The Admin Tool publication action was submitted once. The native JavaScript confirmation blocked browser inspection and the documented dialog API returned no dialog. No repeat submission occurred. The owner confirmed the existing dialog. The browser then showed published status, publication success and three audit entries: created, edited and published. The earlier [interruption observation](evidence/local-ui-browser-20261017-publication-interruption.json) remains historical; it predates confirmation and is not the final publication state. This is a browser-control limitation, not a demonstrated application defect.

## Authentication gate

Fresh registration, denial before confirmation, local message receipt, confirmation, confirmed login and Account Security are PASS in the browser. The owner performed the password replacement. Its exact result and subsequent login/reset steps are in the structured evidence. Changed/reset credential entry must remain owner-operated under the browser confirmation policy. A successful native HTTP test is not a substitute. Do not mark unperformed owner steps PASS.

## Remaining detailed acceptance

| Work | Browser status / limitation |
| --- | --- |
| Incorrect-current-password negative on this new identity | NOT TESTED; prior native negative PASS retained |
| Password change/reset follow-up logins and reset submission | See current structured cases; owner entry required |
| Distinct simultaneous browser profiles and all-session UI invalidation | NOT TESTED; one shared browser cookie jar; native regression evidence retained |
| User Stack Tool ordering, saved named comparisons, Creator follow/unfollow | NOT TESTED in this browser run; native workflow coverage retained |
| User profile, activity, billing and membership mutation details | NOT TESTED in this browser run |
| Independent Admin moderation of new Skill, Playbook and User review | NOT TESTED until explicitly recorded; new content stays pending |
| Admin archive eligibility and claims/disputes/Creator applications/verification adjudication | NOT TESTED in this browser run; prior native checks are separate |
| Admin pricing/subscription/payment queue UI | NOT TESTED in this browser run; no provider success claim |
| Existing Creator profile changes, peer Creator draft isolation, unpublished content preview | NOT TESTED in this browser run; original profiles preserved |
| New Vendor edit/verification proposal submission | BLOCKED by existing pending requests; duplicates not created and previous requests preserved |
| Vendor Tool owned by a different Vendor | NOT TESTED as a separate browser case; tested unowned Admin-created Tool denial is narrower |
| Forged/concurrent Server Actions, invalid transitions, rollback | Native tests only, not browser mutation acceptance |
| External SMTP, hosted Supabase Auth, Stripe settlement, Storage scanning/downloads, affiliate activation | BLOCKED by intentionally unavailable provider prerequisites and separate owner approval |

## Validation and continuity

Same implementation validation on October 17: [167 automated tests, lint, TypeScript, isolated production build, zero runtime vulnerabilities](evidence/local-qa-tls-renewal-v1-validation.json); [CI 39061861880](https://github.com/nzagha/aibean/actions/runs/39061861880) SUCCESS for the source commit above. Earlier native auth27, access198, workflows71 and discovery23 PASS remain [separate October 15 observations](AIBEAN_LOCAL_UI_ACCEPTANCE_REPORT.md). No schema migrations or installations were rerun.

[Five frozen manifests and all 214 dependencies match](evidence/local-ui-browser-20261017-seals.json): Creator Content170, local Auth24, desktop helper1, Phase2 observers16, TLS renewal3. The preserving restart/TLS renewal already verified 66 relation continuity digests, identities/password hashes, private environment and mailbox before these new browser mutations. The records newly created today have not been claimed as independently verified across a later restart.

Only new task-specific synthetic Tool/Skill/Playbook/Event/resource/review data was created through ordinary UI workflows. Only the new disposable Stack was deleted. Existing content, pending Vendor requests, all four provisioned passwords, historical recovery targets and backups remain preserved. No hosted connection occurred.

## Priorities and handoff

- P0: no confirmed new application defect.
- P1 acceptance gate: finish owner-operated password change/reset logins and replay/session checks; complete independent moderation and remaining panel workflows.
- P1 provider readiness: hosted Auth/SMTP/payments/Storage remain intentionally unavailable; require separate reviewed approvals.
- P2 QA limitations: native modal control requires owner confirmation; separate real browser profiles and wider desktop/accessibility coverage remain unverified.
- P2 availability: eight-hour lease and finite local certificate require the reviewed preserving restart/renewal procedure; never disable TLS validation.

Screenshots are synthetic, visually reviewed before publication, and contain no password/token/private filesystem path. Current browser developer-console inspection is not claimed; no captured console error evidence is available. Keep historical failures and initial result files as historical evidence.

![Private Tool preview](evidence/local-ui-browser-20261017-admin-tool-preview.png)

![Pending User review](evidence/local-ui-browser-20261017-user-review-pending.png)
