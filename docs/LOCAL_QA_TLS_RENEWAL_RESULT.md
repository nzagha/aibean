# Preserving local QA TLS renewal — result

17 October 2026, `codex/supabase-foundation`. **PASS — the existing local website is running again.** The owner's Continue response followed the published preserving-renewal approval request. No hosted authorization was inferred.

## Exact executed package

- Manifest: `db/proposals/local-qa-tls-renewal-v1.json`.
- SHA-256: `c088be8079d60ff6358587a3455eaa4742d07aa2304db2124ffa5cfc0c344937`.
- Executor: `scripts/local-website-qa/tls-renewal-v1/execute.ts`.
- Three new file checksums; four preserved predecessor manifests, covering the original 170 Creator Content dependencies, 24 local overlay dependencies, desktop-access extension and 16 Phase 2 observer files.
- One exact-hash execution. No automatic retry, expired-TLS connection or TLS bypass.

The old certificate and pinned runtime metadata were retained privately as rollback evidence. The original private key was reused and its bytes/public key were verified unchanged. Only the local certificate and its root runtime CA pin were replaced during renewal. The unchanged launcher subsequently performed its normal eight-hour lease metadata/source-snapshot updates; those are separate from the trust replacement. The global Windows trust store was not changed.

## Observed verification

| Check | Result |
| --- | --- |
| Approved branch/run, canonical local paths and stopped cluster | PASS |
| Existing pin and prior source-snapshot pin | PASS |
| Original frozen source and proposal inventories | PASS |
| New self-signed local certificate | PASS: same RSA key, seven-day validity, CA constraint, only localhost / 127.0.0.1 SANs |
| Native PostgreSQL target/operator/TLS/hostname | PASS: same loopback database and cluster; strict verification enabled |
| Existing local Auth schema and installation version | PASS: all six existing tables and exact version checksum; nothing installed |
| Application/ledger continuity | PASS: all 66 relation counts/private digests matched the retained October 15 checkpoint |
| Registered identities and password hashes | PASS: complete private account hash matched |
| Four existing credentials | PASS: private handoff values unchanged and genuine login succeeded on all four aliases |
| Protected capabilities | PASS: original User/Admin/Creator flags and saved identity/ownership data preserved |
| Private environment | PASS: original private environment digest unchanged |
| Mailbox | PASS: original mailbox handoff unchanged and genuine mailbox sign-in succeeded |
| Homepage and four login pages | PASS: HTTP 200 after restart |
| Schema/data repair, initialization, migration, seed or password rotation | NONE |
| Hosted connections, providers, deployment or DNS changes | NONE |

[Exact execution evidence](evidence/local-qa-tls-renewal-v1-result.json) and [public-page availability](evidence/local-qa-tls-renewal-v1-availability.json). Integrity values, record bodies, passwords, keys, private paths and connection strings are not published. Database validation used a read-only operator transaction. Ordinary post-launch authentication probes created only their normal local session/rate state; no business records were changed by those probes.

## Current owner access

Homepage: http://127.0.0.1:3000/.

| Persona | Login | Panel |
| --- | --- | --- |
| User | http://127.0.0.1:3000/login | http://127.0.0.1:3000/account |
| Admin | http://127.0.0.1:3002/login | http://127.0.0.1:3002/admin |
| Creator | http://127.0.0.1:3003/login | http://127.0.0.1:3003/creator |
| Vendor | http://127.0.0.1:3004/login | http://127.0.0.1:3004/vendor |

Owned runner PID: **56664**. Current lease expires **17 October 2026 at 23:10:24 EDT**. New certificate expires **24 October 2026 at 15:10:21 EDT**. A certificate's validity does not extend the preview lease. Existing sessions from October 15 naturally expired; that is not a password change or failed continuity check. Use separate browser profiles for simultaneous identities, since ports on the same hostname share cookies.

From the repository terminal, open the existing private handoff:

~~~powershell
powershell.exe -NoProfile -File scripts/local-website-qa/open-desktop-test-access.ps1
~~~

The desktop-aware helper passed all four unchanged-password probes and opened the existing protected file. Owner-visible Notepad confirmation remains separate. No credential was copied into the workspace or chat.

## Validation and limitations

- Four new synthetic regression tests pass: target/identity/pin restrictions, same-key certificate renewal with strict native TLS and wrong-host/expiry rejection, partial-file failure preservation, and bounded CLI rejection before target access.
- Complete automated suite: **167 PASS, zero FAIL**.
- Lint and TypeScript: PASS.
- Isolated production build: PASS; no private environment copied or hosted connection configured.
- Runtime dependency audit: PASS, zero runtime vulnerabilities.
- Original source mechanisms and historical evidence remain unchanged.

[Synthetic evidence](evidence/local-qa-tls-renewal-v1-synthetic.json), [build evidence](evidence/local-qa-tls-renewal-v1-build.json), [validation summary](evidence/local-qa-tls-renewal-v1-validation.json). Native TLS tests are not hosted recovery tests or proof of hosted Supabase Auth operation.

**Fresh real-browser acceptance remains pending.** The earlier internal error tab was rejected by the browser tool's URL policy. The owner has been asked to open the now-working normal localhost login page; no alternate surface was used to bypass that restriction. Password-change/reset entry and final submission must follow the current browser tool's human handoff rules. The October 15 panel/lifecycle results remain native/historical evidence and are not relabelled as a new browser journey.

Next: complete the previously requested browser registration, confirmation, change/reset, session and four-panel acceptance checks. Do not activate hosted Auth or providers. Any unexplained continuity drift requires review, not a reset or reseed. The original expired-state observations remain in [the readiness record](LOCAL_QA_TLS_RENEWAL_READINESS.md).

Implementation commit `846a635cde5c424c90326b04778704f67f900d2a` is pushed and independently matched against `origin/codex/supabase-foundation`. [Validate 39061622056](https://github.com/nzagha/aibean/actions/runs/39061622056) completed **SUCCESS**, including lint, TypeScript, automated tests, production build and runtime audit; [observed CI evidence](evidence/local-qa-tls-renewal-v1-ci.json). The documentation follow-up records that exact implementation commit's result. Local native tests, GitHub CI and pending actual-browser acceptance remain distinct gates.
