## Latest actual browser acceptance — 17 October 2026

**LOCAL WEBSITE — RUNNING; acceptance PARTIAL.** 65 actual in-app-browser observations passed, including all four unchanged fixture logins, Admin Tool creation/edit/preview/audited publication, Creator content drafts and review submission, Vendor ownership denial, and fresh ordinary registration/confirmation/login. Owner-operated password change/reset and subsequent logins passed; consumed recovery-token replay was rejected. Detailed remaining panel cases are recorded in [the current browser report](LOCAL_BROWSER_ACCEPTANCE_20261017.md) and [per-action evidence](evidence/local-ui-browser-20261017-result.json). Older blocked/no-browser entries below are historical. No hosted connection, provider activation, schema installation or frozen source change occurred.

## Current status after preserving TLS renewal — 17 October 2026

**LOCAL WEBSITE — RUNNING:** renewal and strict native continuity verification passed, all four original passwords and the protected mailbox work, and the homepage/login pages return HTTP 200. Current lease ends at 23:10:24 EDT on October 17; renewed certificate expires October 24 at 15:10:21 EDT. All 66 application/ledger continuity checks and original identity/password hashes matched. Full suite: 167 PASS, zero FAIL. Fresh real-browser acceptance still awaits an owner-opened HTTP page. See [the actual renewal result](LOCAL_QA_TLS_RENEWAL_RESULT.md). This supersedes the expired-state entry below; earlier entries remain historical. No hosted connection or schema/data repair occurred.

## Current resumption status — 17 October 2026

**LOCAL WEBSITE — BLOCKED:** the eight-hour lease and pinned local TLS certificate have expired. All four preview ports are closed and the exact retained QA PostgreSQL cluster is stopped. Fixture and credential files remain present. No database connection, restart, certificate replacement or hosted access was attempted. The owner explicitly required stopping on TLS expiry. See [the verified blocker and proposed preserving renewal](LOCAL_QA_TLS_RENEWAL_READINESS.md). Earlier PASS/running observations below are historical.

## Current acceptance — 15 October 2026

**PARTIAL: native workflows and restart continuity verified; fresh real-browser acceptance BLOCKED.** Read [the consolidated acceptance report](AIBEAN_LOCAL_UI_ACCEPTANCE_REPORT.md) and [per-action evidence](evidence/local-ui-phase2-acceptance-matrix.json). This supersedes earlier lease/rotation/cross-port statements. Original identities/passwords, source seals, fixtures, private environment and historical evidence are preserved. No hosted connection or provider action occurred.

> Current local account testing: the eight-hour preserving launcher, registration, password management and protected mailbox supersede the previous preview restrictions. See [the current account guide](LOCAL_AUTHENTICATION_AND_ACCOUNT_TESTING_GUIDE.md). The observations below are the historical first preview results.

# Local website issues and blockers

October 14, 2026. Scope: synthetic local QA only. The website is available through the lease-bounded preview documented in `LOCAL_WEBSITE_RECOVERY_RESULT.md`.

| Priority | Finding | Classification / outcome | Next action |
| --- | --- | --- | --- |
| P0 | No expected native/Docker web listener existed | Resolved by starting the isolated preview; earlier process exit cause unverified | Use protected start/restart procedure after expiry/reboot |
| P2 | `/categories` and `/use-cases` returned 404 | Repaired using existing brand/grid and approved taxonomy | Both index routes now pass actual HTTP rendering |
| P1 | Shared webpack QA previews exhausted memory on cold Creator render | QA infrastructure corrected with Turbopack and separate snapshots | Close unrelated heavy apps if resources become constrained; do not kill them automatically |
| P1 | First source snapshots omitted reviewed database metadata | QA infrastructure corrected; failed evidence retained | Starter now copies the reviewed `db/` source inventory |
| P2 | Old test expectations for guest pricing, disabled registration, TLS statistics visibility and Server Action encoding | Test defects corrected without weakening app/security rules | Retained initial failure evidence documents each correction |
| P1 | Supabase Auth registration/confirmation, SMTP and hosted role operation | BLOCKED: not configured/activated or authorized here | Separate owner-reviewed recovery/provider/identity release sequence required |
| P1 | Stripe settlement, paid membership activation, refunds and real subscriptions | BLOCKED: provider disabled; pending requests remain honest | Separately configure and authorize sandbox end-to-end testing; no live payments |
| P1 | Private Storage, malware scanning, approved uploads/downloads | BLOCKED: provider/scanner prerequisites unavailable | Separate reviewed provider setup and authorization |
| P2 | External affiliate destinations/provider activation | BLOCKED: no outbound provider test authorized | Independent destination/disclosure verification before activation |
| P2 | Newsletter and testimonials are preview states | Deliberately disabled/empty, not fabricated failures | No emails sent/stored; add provider/approved content only under later scope |
| P2 | Exhaustive workflow mutations, concurrent UI sessions, refunds, large datasets and full WCAG audit | NOT TESTED in this task | Owner follow-up cases listed in matrix; do not infer acceptance from HTTP 200 |
| P2 | Preview expires after 110 minutes and fixed source snapshots need restart | Intentional local safety boundary | Restart from repository; obtain newly generated private credentials |
| P1 | Workspace ACL inheritance reappeared after fixture setup | Corrected for the active credential handoff by moving it outside OneDrive into protected LocalAppData | Independently recheck owner/SYSTEM ACL; keep all credential handoffs outside the workspace |

No remaining fatal rendering, missing critical environment dependency or login failure was observed in the final tested preview. Local authentication is the existing transitional password mode, not evidence of hosted Supabase Auth activation. Cross-port session rejection is expected with independent preview secrets.

The hosted database was not connected to during this task. Its previously verified 45-table/two-sequence status is historical evidence, not a fresh inventory. Creator Content's original internal postflight cause remains unresolved; no new schema defect is asserted. Recovery v4b covers the prior 29-table state and v4c remains pending. Those facts have not been changed or used to authorize hosted writes.

Frozen packages, 170 readiness dependency hashes, `.env.local`, historical forensic receipts, recovery checkpoints and stopped historical targets were preserved. Private fixture folders are retained and excluded from publication. New screenshots and reports contain synthetic UI data only.
