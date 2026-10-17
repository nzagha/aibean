# Local QA TLS expiry and proposed preserving renewal

Observed 17 October 2026. Branch: `codex/supabase-foundation`; inspected HEAD: `e8386c1632b4bf9823fd6fb9b961c1eeb11d489b`.

**LOCAL WEBSITE — BLOCKED.** No listener exists on ports 3000, 3002, 3003 or 3004. The exact retained local QA PostgreSQL cluster reports stopped (`pg_ctl status` exit 3). This explains the owner's report that localhost does not load; no new application defect is established.

## Verified without a database connection

| Prerequisite | Observation | Status |
| --- | --- | --- |
| Previous eight-hour lease | Expired 15 October at 21:03:06 EDT | EXPIRED |
| Local pinned certificate | Valid until 16 October at 11:52:10 UTC / 07:52:10 EDT | EXPIRED |
| Certificate integrity | Current certificate still matches the existing runtime CA SHA-256 pin | PASS |
| Local fixture directory | Present, not recreated | PASS |
| Protected credential file | Present; contents/passwords not inspected during this check | PASS for presence only |
| Four preview listeners | Zero | STOPPED |
| Exact owned PostgreSQL cluster | Stopped; no restart attempted | PASS |
| Current database contents | No connection made; last successful native continuity evidence remains historical | UNVERIFIED this run |
| Browser acceptance | No working preview available; no fresh browser actions | BLOCKED |

[Sanitized resumption evidence](evidence/local-ui-phase2-resume-20261017.json). The October 15 test and restart results remain valid historical observations, not claims that the website is running on October 17. No hosted Supabase connection, local database start, SQL query, certificate/key replacement, credential change or trust bypass occurred.

The owner's Phase 2 instruction says: “If the local TLS fixture certificate has expired, stop and report the required safe renewal process rather than disabling verification.” This is the reason for stopping. No skill or automatic approval rejection created this boundary.

## Proposed next operation — requires owner authorization

This is a concrete local-only renewal scope, not an executed renewal or a claim that renewal tooling has already been tested.

1. Prepare an additive, versioned renewal helper and synthetic certificate/configuration tests. Preserve all frozen source, SQL, manifests and historical evidence. Verify the existing 170-dependency Creator Content seal, 24-dependency local overlay proposal and desktop-access extension.
2. Bind the helper to the exact existing QA run and canonical fixture directory. Require all four ports free, the exact PostgreSQL cluster stopped, original certificate pin unchanged, expected existing database/role/loopback configuration, and readable protected continuity evidence. Reject links, arbitrary target arguments, hosted endpoints and unexpected drift.
3. Reuse the existing local QA private key, without displaying or copying it. Prepare a replacement self-signed local trust/server certificate with a seven-day validity, SHA-256 signing, the same public key, CA constraint and only `localhost` / `127.0.0.1` subject alternative names. Independently validate dates, key match, constraints and hostname before changing active files.
4. Retain the expired public certificate and prior private runtime metadata as local rollback material excluded from Git and reports. Replace only the current local certificate and the `caSha256` field in the existing root runtime manifest. Preserve the connection string, operator/runtime passwords, run ID, PostgreSQL directory, account handoff, mailbox secrets and all other configuration. Do not edit historical generation snapshots.
5. With the new certificate and explicit new pin, use strict certificate/hostname verification to inspect only the same local target. Require the existing six-table local Auth schema and its ledger, original application installation history and protected private continuity evidence before invoking a launcher that could initialize missing QA state. Stop on missing state or unexplained differences; never repair/reseed/reset to obtain a pass.
6. Run read-only continuity comparisons for preserved application records, identity IDs/password hashes and protected capability/ownership configuration. Do not publish record bodies, credentials, private paths or private integrity values. Do not disable verification to inspect the expired connection.
7. Only after validation, resume through the unchanged reviewed eight-hour launcher. Its normal lease metadata updates are allowed; no password rotation or account initialization is allowed. Confirm unchanged four-persona passwords, protected mailbox access, actual target/TLS identity, homepage and login URLs. Preserve both successful and failed diagnostic evidence.
8. Publish sanitized results and resume the already requested actual-browser acceptance journey. Changed/reset password entry and submission still follow the browser tool's human-entry rules.

If preparing this operation requires modifying a frozen dependency, stop for separate review. If file replacement or strict post-renewal verification fails, leave the fixture stopped and retain evidence; do not automatically recreate it or fall back to expired/unverified TLS. Certificate-file rollback would restore the stopped prior configuration only, not make the expired certificate usable.

No schema migration, database backup/recovery, hosted connection, provider activation, deployment, new privilege or account creation is included in renewal. The browser registration test remains a later explicitly requested synthetic product action.

## Exact proposed authorization

> I authorize a preserving local-only TLS renewal for the existing aiBean disposable QA fixture. Prepare and test additive guarded renewal tooling without changing frozen dependencies. Reuse its existing private key, issue a seven-day certificate limited to localhost and 127.0.0.1, and update only the corresponding local certificate pin. Preserve the existing database, all records, User IDs, passwords, mailbox secrets and historical artifacts. After strict TLS, target and read-only continuity verification, resume through the unchanged eight-hour launcher and continue local browser acceptance. Stop on unexplained drift. Do not connect to hosted Supabase, initialize or migrate a database, rotate passwords, activate providers or bypass TLS verification.

Until this is authorized, do not run the launcher against the expired trust fixture. Opening another browser tab cannot repair the missing listener or certificate expiry.
