# aiBean expanded application recovery execution result

**Correction preparation — 10 October 2026: PASS locally; hosted recovery remains FAIL / awaiting new execution approval.** The owner-authorized v2 correction normalizes the PostgreSQL address and completes source metadata/history and new local-target readiness before application body capture. All 70 automated tests and the exact shared executor's native PostgreSQL/CMS rehearsal pass. New manifest SHA-256: `5249c408d2610ab30e8e691f2f8396b3b83fd2ffc05053aaafebc6cb952acfec`. [Correction review and exact execution authorization](SUPABASE_EXPANDED_RECOVERY_CORRECTION_REVIEW.md). The original v1 manifest/failure evidence remain historical; no hosted retry, Auth activation or original retained-target modification occurred.


**Recovery gate: FAIL — stopped before native hosted export.** Executed once on 10 October 2026 under the owner's explicit authorization, on branch `codex/supabase-foundation`, against project `yfknxidgphhepdtwazhn`, database `postgres`.

Exact executed manifest SHA-256: `a759d686d2a108f7d3c91e35d0db3ff014beae2d7992e2aa587a1dd32bfb1b30`. All eleven reviewed executable/dependency hashes passed before execution and remain unchanged afterwards. The executor was `scripts/execute-expanded-recovery.ts`; no reviewed executable, prerequisite SQL or manifest was modified or retried. The exact scope remains the eighteen tables and two sequences in the [reviewed proposal](SUPABASE_EXPANDED_APPLICATION_RECOVERY_PROPOSAL.md).

## Observed outcome

| Check                                         | Result and evidence boundary                                                                                                                                                              |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Manifest / dependency integrity               | PASS; exact approved bytes before and after the attempt                                                                                                                                   |
| Source prerequisite checks                    | PASS; strict CA/hostname TLS, correct project/database/operator, expected scope, installed histories, role restrictions and zero Auth accounts/mappings                                   |
| Original encrypted backup                     | PASS; retained, accessible, hash-verified and decryptable before and after the stopped attempt                                                                                            |
| Expanded hosted export                        | FAIL to complete; `pg_dump` was **not attempted**                                                                                                                                         |
| New encrypted archive integrity               | FAIL to establish; **no new archive or encrypted metadata was created**, rather than an observed corrupt archive                                                                          |
| Isolated local restoration                    | FAIL to reach restoration; the disposable cluster was prepared, then execution stopped before dump/restore or application prerequisites                                                   |
| Tables, sequences and ledgers restored        | NOT EXECUTED; no hosted data was restored locally                                                                                                                                         |
| Hosted data/history/RLS/grants continuity     | PASS; independent postflight verifies both unchanged TestUsers records, fourteen RLS application tables, eighteen FKs, original Drizzle/security history and runtime/browser restrictions |
| Failed target disposition                     | Stopped and retained privately; no postmaster PID, no completion witness, no bootstrap plaintext password; zero new encrypted expanded artifacts                                          |
| Website / private environment / Auth settings | No change; current password mode remains active and provider-test gate remains disabled                                                                                                   |

The executor returned exit code 1 with `stage=new-local-target-preparation`, `hostedExportAttempted=false`, `encryptedArchiveRetained=false`, `sourceWrites=false`, and `transientTargetRetainedOnFailure=true`. It did not automatically reset or retry. Its finalizer stopped the known disposable target. Independent `pg_ctl status` returned the stopped-server status; the target log existed and was empty.

**Record-body distinction:** after source preflight, this approved executor read selected application row bodies into its private process to calculate integrity values. Those in-memory reads preceded local-target readiness. No native dump, persisted expanded archive or restored hosted row was produced. No row values or personal-record digests are included in this report. The separate read-only preflight/postflight script computes TestUsers continuity inside PostgreSQL and publishes only equality evidence.

Preflight completed at **20:39:44 UTC**. Independent postflight completed at **20:42:41 UTC**. Both verified TestUsers count two, internal User/mapping/Auth-user/Auth-identity counts zero, unchanged definitions/policies/sequence state, denied browser TestUsers table/column access, original migration hashes/timestamps and the security ledger. Previously excluded TestUsers sequence access remains as before. Source checks used read-only transactions, and the executor made no hosted writes. [Postflight evidence](evidence/supabase-next-stage-readiness.json), [sanitized attempt evidence](evidence/supabase-expanded-application-recovery-result.json).

## Confirmed defect and diagnostic limits

The approved executor's local identity query uses `inet_server_addr()::text AS host`, then requires the literal string `127.0.0.1`. PostgreSQL renders a host `inet` value cast to text with its mask: **`127.0.0.1/32`**. An isolated in-memory PostgreSQL reproduction returned that value; `host(CAST('127.0.0.1' AS inet))` returned **`127.0.0.1`**. Consequently, the reviewed comparison rejects a valid loopback identity when reached.

This is a reproducible blocker in the failed stage. The executor intentionally redacts raw exceptions, and its retained server log is empty, so the precise failing assertion from this particular attempt is not independently recoverable. Other lifecycle/TLS issues cannot be excluded until a corrected, approved operation passes. No failed target was restarted for diagnosis.

The prior synthetic native recovery test exercised dump/restore, permissions and data comparisons but **did not exercise this exact executor local-identity comparison**. Its PASS and the 66 automated tests do not establish successful hosted recovery. This coverage gap is now explicitly recorded.

## Historical proposed correction — subsequently implemented in v2

The bounded local-address change is:

```diff
- inet_server_addr()::text AS host
+ host(inet_server_addr()) AS host
```

Keep the strict expected loopback address, database, role, version, TLS and certificate checks. Do not weaken them or accept a remote endpoint. Add a regression test of the exact local identity query/comparison under disposable native PostgreSQL, including a rejected non-loopback identity.

Also place all snapshot history/scope and local-target readiness checks before selected row-body capture. The current executor validates source history independently before the run, but its snapshot helper checks ledger contents after its private body loop, and local-target readiness follows that loop. Moving these gates before body capture better enforces the owner's explicit prerequisite boundary. Include tests proving a failed history or local-target check prevents body queries.

These changes would alter reviewed executable hashes. They have **not** been made. After separate correction authorization, prepare and validate the changed package, regenerate its manifest and present its exact new SHA-256 for a separate execution decision. Preserve the stopped failed target and original backup unless cleanup is explicitly approved; the current success-only cleanup condition has not been met.

## Historical retention, limitations and preparation authorization

The original pre-installation encrypted TestUsers archive remains the only verified hosted-data recovery point. It does not cover the installed application foundation. No new successful expanded backup exists. The failed disposable target and generated local secrets remain in the restricted, non-synchronized private directory; no backup material, private paths, certificates, credentials, personal records or row digests are published.

Even after a future successful expanded run, the proposed application archive will exclude managed Auth/password/session/Storage/Vault recovery and provider settings. NOLOGIN role surrogates and an empty local Auth FK scaffold cannot recreate the Supabase service. PostgreSQL patch version and Windows C-locale differences require a separate platform review for any future real hosted restore. Independent-device key recovery/off-device retention remain unverified.

The recovery gate does not permit proceeding to SMTP, password-policy, redirect changes or two-account hosted Auth tests. Their existing [configuration](SUPABASE_AUTH_EMAIL_READINESS.md) and [test/cutover plans](SUPABASE_HOSTED_AUTH_TEST_AND_CUTOVER_PLAN.md) remain proposals. The next bounded authorization is:

> I authorize preparation of a corrected expanded recovery package: normalize the local PostgreSQL address with host(inet_server_addr()), move all required history/scope/local-target readiness guards before row-body capture, and add regression coverage for those boundaries. Preserve the eighteen-table/two-sequence scope and every TLS, privacy, retention and hosted-write restriction. Validate using synthetic disposable local data and publish the exact changed files and new manifest SHA-256 for my review. Do not retry the hosted export/restore, restart or delete the retained failed target, change hosted data/settings, create accounts, send emails or activate Auth until I separately authorize the new package.

This new approval is required by the owner's instruction: **“Do not modify reviewed executable files or expand the authorized scope without stopping for another approval.”** No new operational approval is inferred from the failed attempt.

## Automated validation and GitHub

The unchanged implementation has 66 passing automated tests, a passing native synthetic rehearsal, lint/typecheck/build and zero reported runtime vulnerabilities. [GitHub Validate 38070884364](https://github.com/nzagha/aibean/actions/runs/38070884364) passed on implementation commit `3eab5d1989af99299fd79fdd1b5e90951aed71cc`; publication commit `66fed960adc8ce94fc135e6edd47c8540393038d` added evidence only. The frozen package still passes offline checksum inspection after this stopped attempt. The address-format mismatch was separately reproduced in an ephemeral local database; no executable repair was applied.

Only the failure report, sanitized aggregate evidence and active status updates are published for this attempt. [GitHub Validate 38084997727](https://github.com/nzagha/aibean/actions/runs/38084997727) passed lint, typecheck, all 66 tests, production build and runtime audit for result commit `3c85e50a52fa0651a3e53af45d86f47576f17a28`. All seven publication files passed the private-value scan with zero matches. This later evidence-only update records that result; no reviewed code changed. The earlier synthetic PASS remains historical evidence and is not relabeled as a successful hosted backup.
