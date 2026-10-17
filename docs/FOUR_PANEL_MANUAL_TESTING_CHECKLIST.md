## Latest actual browser acceptance — 17 October 2026

**LOCAL WEBSITE — RUNNING; acceptance PARTIAL.** 78 actual in-app-browser observations passed, including all four unchanged fixture logins, Admin Tool creation/edit/preview/audited publication, Creator content drafts and review submission, Vendor ownership denial, and fresh ordinary registration/confirmation/login. Owner-operated password change/reset and subsequent logins passed; consumed recovery-token replay was rejected. Detailed remaining panel cases are recorded in [the current browser report](LOCAL_BROWSER_ACCEPTANCE_20261017.md) and [per-action evidence](evidence/local-ui-browser-20261017-result.json). Older blocked/no-browser entries below are historical. No hosted connection, provider activation, schema installation or frozen source change occurred.

## Current status after preserving TLS renewal — 17 October 2026

**LOCAL WEBSITE — RUNNING:** renewal and strict native continuity verification passed, all four original passwords and the protected mailbox work, and the homepage/login pages return HTTP 200. Current lease ends at 23:10:24 EDT on October 17; renewed certificate expires October 24 at 15:10:21 EDT. All 66 application/ledger continuity checks and original identity/password hashes matched. Full suite: 167 PASS, zero FAIL. Fresh real-browser acceptance still awaits an owner-opened HTTP page. See [the actual renewal result](LOCAL_QA_TLS_RENEWAL_RESULT.md). This supersedes the expired-state entry below; earlier entries remain historical. No hosted connection or schema/data repair occurred.

## Current resumption status — 17 October 2026

**LOCAL WEBSITE — BLOCKED:** the eight-hour lease and pinned local TLS certificate have expired. All four preview ports are closed and the exact retained QA PostgreSQL cluster is stopped. Fixture and credential files remain present. No database connection, restart, certificate replacement or hosted access was attempted. The owner explicitly required stopping on TLS expiry. See [the verified blocker and proposed preserving renewal](LOCAL_QA_TLS_RENEWAL_READINESS.md). Earlier PASS/running observations below are historical.

## Current acceptance — 15 October 2026

**PARTIAL: native workflows and restart continuity verified; fresh real-browser acceptance BLOCKED.** Read [the consolidated acceptance report](AIBEAN_LOCAL_UI_ACCEPTANCE_REPORT.md) and [per-action evidence](evidence/local-ui-phase2-acceptance-matrix.json). This supersedes earlier lease/rotation/cross-port statements. Original identities/passwords, source seals, fixtures, private environment and historical evidence are preserved. No hosted connection or provider action occurred.

# Four-panel manual testing

Use [private credential access](LOCAL_QA_CREDENTIAL_ACCESS.md) and the [account guide](LOCAL_AUTHENTICATION_AND_ACCOUNT_TESTING_GUIDE.md). Keep separate browser profiles when testing simultaneous identities. The common 3000 origin supports every persona with unchanged server-side authorization.

| Persona | Panel | Manual acceptance checks |
| --- | --- | --- |
| User | http://127.0.0.1:3000/account | Sign in/out, own saves/Stacks/comparisons/follows, register a fresh confirmed User, password change/reset, deny Admin and Creator workspace, deny peer private resources |
| Admin | http://127.0.0.1:3002/admin | Dashboard queues, Tool forms and preview, taxonomy, moderation reasons/transitions, audit, commercial views; do not infer Creator approval from Admin status |
| Creator | http://127.0.0.1:3003/creator | Approved workspace, own Skills/Playbooks/events/profile drafts, independent moderation, analytics, deny Admin and peer Creator draft |
| Vendor | http://127.0.0.1:3004/vendor | Approved owned Tool workspace, proposed edits/verification/claim history, analytics, deny peer Tool writes and Creator/Admin access |

For each role: verify panel headings/data rather than treating HTTP 200 as acceptance. Check visible loading/errors, required fields and responsive navigation. Inspect invalid transitions and capability boundaries before creating disposable content. Existing historical fixture feature data and ownership were preserved.

For the new User journey, manually confirm registration, current-password rejection, successful password change, old-password failure, new-password success, protected mailbox reset, single-use replay rejection and all-session revocation. On a second browser profile, an existing session must lose business access after password replacement. Synthetic HTTP/native checks automate these negative paths; see [actual results](LOCAL_AUTHENTICATION_TEST_RESULTS.md) for the separate browser record.

Payments, external email, private Storage/scanning and affiliate activation remain unavailable pending independent provider approval. A pending payment or editorial request is not a successful provider transaction. The checklist is a manual continuation aid, not a claim that every listed mutation was retested in this authentication increment.
