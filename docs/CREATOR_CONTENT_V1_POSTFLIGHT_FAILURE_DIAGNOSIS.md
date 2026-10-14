# Creator Content v1 — Authorization 9 postflight forensic review

**C — original root cause unresolved. Local forensic validation PASS; hosted installation remains `COMMITTED_INDEPENDENT_VERIFIER_PASS_REVIEW_REQUIRED`.** This task performed no hosted connection, query, installation, export or recovery. It does not replace the original installation result or grant another execution authority.

## Preserved facts and execution history

Starting commit: `b66cf738f59e163326be3a66bc5d693fa86f21f0`, branch `codex/supabase-foundation`. The original installer ran once from `c847ee0855f17ac06dfd391009d965134815c440`. Its execution window was 2026-10-14 01:26:25.869–01:36:45.141 UTC (619.272 seconds). The original receipt records attempted SQL, acknowledged COMMIT, exit 1, `independent-postflight`, `sqlState: REDACTED`, `rollback: NOT_NEEDED` and no automatic retry.

The wrapper's `stoppedAt` text (“Frozen hashes and protected artifacts preserved after installer”) is its last completed check, not the failing installer sub-operation. The first orchestration receipt correctly has zero separate verifier invocations. The separately authorized verifier ran once later, 01:39:38.109–01:45:39.043 UTC, exit 0/PASS. Separate catalog and actual restricted-runtime diagnostics also passed. All these receipts remain unchanged.

The last hosted evidence verifies 45 application-scope tables, two sequences, 81 foreign keys, 201 constraints, 75 indexes and 45 policies; the new package contributes 15 public tables plus one private ledger, 39 foreign keys, 79 constraints, 28 indexes and 16 policies. It also verifies two original TestUsers records, no feature records/accounts/identity mappings, existing histories and preserved protected artifacts. These are **historical verified observations**, not a fresh hosted assertion from this task.

Preserved SQL SHA-256: `ecdac0e6d3448456d16b71a274d29a62050264ba9d406d4077081c998541f78d`.

Preserved installation mechanism SHA-256: `731a763b3afe78e4459514ad650702056cf71dc7f1de9c9141819e0cb3df8220`, with all **170** dependency byte hashes unchanged. Twelve original reports/receipts were also compared byte-for-byte against the starting Git commit. See [preservation evidence](evidence/creator-content-v1-postflight-preservation.json).

The new [local observer manifest](../scripts/creator-content-forensics/diagnostic-package-v1.json) pins eight diagnostic/test source files, SHA-256 `9ad0bdbe08a62190aab4cf12c0ee10ccb0a36d0d6c2b80230555c8c680d2194f`. It is a reproducibility manifest, not a hosted installation mechanism or execution approval.

## Exact code path and failure boundaries

| Sequence | Frozen source | What actually happens / what can fail |
|---|---|---|
| Offline gate and reservation | `scripts/creator-content-v1/operator.ts`, `operatorCommand` | Exact arguments, branch, SQL/mechanism/dependency checks. Create-once attempt marker and refusal when prior execution evidence exists. No retry authority. |
| Protected transport / recovery reference | `operator.ts:157–239`; `checkpoint.ts:183` | Fixed operator endpoint, private checkpoint verification and strict CA/hostname TLS. A repeatable-read/read-only transaction captures the **pre-install** baseline and verifies v4b scope/history/private continuity. |
| Fresh pinned preflight | `core.ts:357–376` | Reserve operator socket; explicitly BEGIN read-only repeatable-read; identity, absent successor inventory and exact baseline comparison; COMMIT preflight. Native reserved clients have `release`, not `begin`. |
| Exact bounded SQL | `core.ts:377–382` | Set approved checksum GUC, mark attempted and send unchanged SQL as one simple-query message. Its own BEGIN/COMMIT provides atomic installation. Completion of the awaited message sets `committed = true`. |
| Release | `core.ts:383–385` | Release reserved socket, then change stage to `independent-postflight`. A release exception here would retain `exact-transaction`; it does **not** match the original stage. |
| Independent clients and PID checks | `core.ts:312–320` | Construct two operator clients and a real runtime client; lazy connections open for three parallel PID probes, requiring three distinct backend sessions. Factory, TCP/TLS/authentication and PID failures can throw. Client construction is outside this function's try/finally. |
| Operator postflight | `core.ts:320–327` | A fresh read-only repeatable-read transaction checks operator/TLS identity, reconstructs baseline, compares it with the **pre-install reference**, verifies exact successor inventory/catalog/ledger, effective table/column grants, role restrictions and empty new content. Assertions and database/transport errors can throw. |
| Independent browser/service grants | `core.ts:328–334` | A second operator transaction independently checks effective grants for anon/authenticated/service_role. |
| Restricted runtime probes | `core.ts:335–350` | Actual login must be `aibean_app_login` over TLS. Read-only transaction checks runtime grants and empty SELECT probes on all new public relations and private ledger. Identity, permission or transport failures can throw. |
| Cleanup | `core.ts:353–355`; `operator.ts:362` | Native `postgres.end` is async. Cleanup promises use `Promise.allSettled`; an ordinary async rejection does not turn success into an installer failure. Factory errors occur before the inner cleanup try, but the outer transport also tracks/closes created clients. The native harness explicitly closes every tracked client. |
| Error classification / receipt | `core.ts:395–429`; `operator.ts:335–361` | InstallationFailure retains COMMIT/stage/decision but discards the original assertion/message/stack/cause. Only nine codes survive `safeCode`. The outer handler preserves this evidence and writes create-once failure receipt; it does not install again. |
| Final success preservation | `operator.ts:319–334` | Recheck mechanism/private artifacts/environment and persist success only after internal postflight returns. Errors here have a different outer stage; they cannot explain the original internal stage. |

All post-COMMIT failures stop for review. The installer rollback branch requires `attempted && !committed`; it cannot undo acknowledged committed SQL. Read-only verification transactions may issue their own ROLLBACK on errors; that is not an installation rollback.

`safeCode` permits only `42501`, `P0001`, `42P07`, `55P03`, `57014`, `40001`, `23505`, `08006`, `08001`. Assertion `ERR_ASSERTION`, native `CONNECT_TIMEOUT`/`CONNECTION_CLOSED`/`CONNECTION_DESTROYED`, uncoded factory errors and other SQLSTATEs collapse to `REDACTED`. No failing assertion identifier or component was persisted. This information loss is confirmed; the original underlying condition is not.

## Reference timing and session analysis

The standalone verifier calls `independentPostflight(ctx, await ctx.recovery())`, capturing a **post-install** reference. It still validates the frozen v4b checkpoint and exact successor catalog/grants; it does not simply accept any current database.

The installer baseline additionally includes `foundation.foundation.managed`: a digest of relation metadata outside public/drizzle/aibean_private (`admin-review-v1/core.ts:115–125`). This reads no managed row bodies or secrets. The scoped v4b checkpoint covers application catalogs, counts, sequences, ledgers, security/history and private application continuity; its verifier does not compare that managed-schema digest.

A controlled **empty synthetic managed-schema relation** created after COMMIT and before the first postflight snapshot changes only that managed component. The installer fails `BASELINE_COMPARISON`/`ERR_ASSERTION`, producing the same coarse frozen receipt pattern. The standalone fresh-reference path and the **actual frozen checkpoint continuity function** then pass. This establishes a reference-timing distinction, not evidence that Supabase metadata changed during Authorization 9.

Persistent synthetic TestUsers drift fails both the baseline and frozen private checkpoint continuity. Persistent successor index/grant drift fails the standalone verifier as well. These cases cannot be dismissed merely because the standalone reference is fresh. A transient condition removed before later verification could nevertheless remain historically undetectable.

Production operator/runtime clients use `max: 1`, `prepare: false`, validated endpoint and CA/hostname checks per connection. The TLS witness flag alone cannot bypass certificate validation on a later socket. Common configuration sets connect timeout **10 seconds**; operator statement/lock/idle-in-transaction limits are **60/5/60 seconds**, runtime statement limit **15 seconds**, and runtime defaults to read-only. No private configuration was read in this task. Lazy connection creation, transactions, query awaits and release/cleanup were exercised against the installed native driver.

The 619-second original installer duration and 361-second standalone duration do not prove a timeout: these limits apply to individual connection attempts, statements or idle gaps, not the entire verifier. A plain statement timeout is code `57014`, which would survive redaction; the synthetic control confirms it does **not** explain `REDACTED` without another error/masking condition. Connection loss, connection timeout or idle-session closure can match the redaction pattern, but there is no original per-operation timing or error evidence to select them.

## Reproduction and instrumentation

New, unsealed code lives only under `scripts/creator-content-forensics/` and `tests/creator-content-forensics.test.ts`. It imports unchanged frozen functions and observes the real native driver using proxies. It does not change query results, approved SQL, guards or transaction boundaries. Safe operation labels, bounded error categories/codes, assertion IDs, query counts, COMMIT acknowledgments, release/cleanup counts and component **names only** are recorded. `operation` identifies the last observed query boundary; the scenario name and assertion ID identify an injected failure or subsequent assertion. Injection-hook statements are not proxy-observed queries, so their last-operation label alone is not a failing-SQL attribution. Messages, stacks, row bodies, passwords, private paths and record digests are never serialized.

Local fixtures reproduce the baseline plus Admin Review and Admin Operations predecessors, the documented TestUsers shape and two synthetic records, native restricted runtime login and trusted loopback TLS. They install the exact Creator SQL on fresh local targets only. Synthetic checkpoint captures remain in memory and the **frozen `verifyCheckpointContinuity`** performs continuity checks; no historical encrypted backup, CMS profile or recovery target is accessed. This is not a new recovery execution or private-key/provider validation.

Reproduce locally with existing native tools (never run the hosted executor for this task):

```powershell
$env:PG_TEST_BIN = Join-Path (Get-Location) 'test-results\postgres-validation\portable\pgsql\bin'
$env:PG_TEST_OPENSSL = 'C:\Program Files\Git\usr\bin\openssl.exe'
npx --no-install tsx scripts/creator-content-forensics/native-test.ts
node scripts/creator-content-forensics/preservation.mjs
npm test
npm run lint
npm run typecheck
node scripts/creator-content-forensics/build-local.mjs
npm audit --omit=dev
```

The native harness accepts only hardcoded loopback connections to newly created PostgreSQL 17 instances; no `.env` or private profile is loaded. Tool paths select executables only. It stops and retains all new clusters/logs and records create-once sanitized failure artifacts in the task's ignored test namespace. Negative CA/hostname checks reject untrusted TLS. The hermetic build copies no environment files or provider configuration and leaves the existing website runtime alone.

## Native outcomes

PostgreSQL **17.11**: **16/16** final scenarios passed on **16 fresh targets**, all stopped and retained. “PASS” below means the injected fault was detected with the expected boundary; it is not a hosted installation PASS.

| Native case | Observed boundary | Fresh-reference standalone while fault remains |
|---|---|---|
| Clean actual SQL + immediate postflight | COMMIT acknowledged, exact catalog/grants/runtime PASS; negative TLS rejected | PASS |
| Managed reference drift after COMMIT | Baseline assertion; frozen receipt REDACTED; only managed metadata component differs | PASS, including frozen scoped checkpoint |
| TestUsers drift before SQL | Preflight baseline assertion; **zero SQL invocations** | Not installed |
| TestUsers drift after COMMIT | Baseline assertion; no installation rollback/retry; checkpoint rejects private continuity | FAIL |
| Lost postflight socket | CONNECTION_CLOSED/CONNECTION_DESTROYED; committed failure, no retry | PASS with fresh working connections |
| Operator connect timeout | CONNECT_TIMEOUT at PID/connection boundary | PASS with working endpoint |
| Runtime connect timeout | CONNECT_TIMEOUT at PID/connection boundary | PASS with actual working restricted login |
| Statement timeout control | SQLSTATE 57014 retained by frozen handler | PASS after injected timeout removed |
| Idle transaction timeout | Closed/destroyed socket; frozen receipt REDACTED | PASS with working session |
| Missing successor index | INSTALLED_STRUCTURE_ASSERTION | FAIL until local synthetic correction |
| Unexpected successor grant | Catalog ACL assertion | FAIL until local synthetic correction |
| Late installation DDL fault | P0001 before COMMIT; rollback VERIFIED; no successor install/retry | Not installed |
| Async cleanup rejection | Three cleanup calls; allSettled absorbs rejection; installer still PASS | PASS |
| Client factory exception | Committed independent-postflight FAIL/REDACTED; tracked clients closed by harness | PASS with working factory |
| Wrong actual runtime identity | RUNTIME_ROLE_TLS_ASSERTION; committed failure; no retry | PASS with correct restricted login |
| Concurrent explicit local attempts | Exactly one COMMIT; loser rollback VERIFIED; intentional third local call refused before SQL | Installed winner verified |

Each committed-failure test asserts no installation ROLLBACK and exactly one installation SQL invocation. Concurrent calls are explicit synthetic tests; the loser rolls back only its own uncommitted transaction. Failed evidence is retained and never replaced by another hosted attempt.

Earlier harness preparation failures are preserved in ignored local logs and summarized in [diagnostic evidence](evidence/creator-content-v1-postflight-diagnosis.json). They include initial module/TypeScript setup, a minimal TestUsers fixture missing the documented unique constraint, and an immediate socket-loss injection exposing the installed driver's `nextWrite` null-socket crash. That crash produced no frozen InstallationFailure receipt and therefore does **not** match the original caught failure. Only the new harness injection timing was adjusted to allow the close event to settle; no driver/frozen mechanism file changed. All five crash-run targets were stopped and retained. Together with the fixture-failure target and both successful 16-target runs, **38 task-owned targets** are stopped and retained. Historical targets were not accessed.

Validation: complete automated suite **154/154**, zero failures/skips; the final focused diagnostics tests **4/4**; full lint, Next route generation/TypeScript, hermetic production webpack build and runtime audit PASS, **zero runtime vulnerabilities**. Windows sandbox canonicalization blocked the first route-generation attempt; the permitted local run passed. Final native evidence, original-byte preservation and sanitized publication checks are separate files. GitHub publication/CI observation is recorded in [publication evidence](evidence/creator-content-v1-postflight-publication.json) after push; the original CI/report remains unchanged.

## Classification, correction and next gates

**C — unresolved.** Multiple distinguishable local conditions produce the original coarse receipt and a later successful fresh verifier. No original safe assertion ID, underlying error code, pre/post managed-catalog comparison or substage timestamp survived. Local reproduction cannot establish which happened in the hosted run. Current successful schema/grant/runtime checks do not retroactively prove pre-install baseline continuity for metadata outside the scoped checkpoint.

No installed SQL, RLS, grant or data defect is established, and no functional installation correction is justified from this evidence. A future separately reviewed mechanism should retain bounded substage/assertion IDs and safe driver/SQLSTATE classes, preserve the primary failure through cleanup, and close partially constructed clients reliably. The new forensic observer package supplies local examples/tests; it is **not** a replacement hosted installer, changes none of the 170 dependencies, and carries no hosted authority. Integrating observers, changing reference rules or upgrading the driver requires a new versioned proposal, hashes, regression qualification and owner approval. Do not weaken managed-baseline comparisons merely to produce PASS.

A separately authorized read-only diagnostic may be justified to establish current scoped continuity/security and retrieve only **already-existing**, safely redacted logs around the original time, if available. Do not enable new logging, retrieve Auth/Vault secrets, export rows or repeat the installer. Another ordinary fresh verifier alone cannot reconstruct the lost historical error. This task made no such connection.

The owner can explicitly review and accept the independently verified installed schema **with the unresolved historical anomaly documented**, then authorize **local-only recovery v4c preparation**. That is risk acceptance, not classification A or an unqualified installation PASS. Suggested decision wording:

> I have reviewed the Creator Content v1 postflight diagnosis and accept the documented committed installation and subsequent independent verifier PASS with the original internal postflight cause unresolved. I authorize local-only preparation and synthetic validation of recovery v4c for the documented 45-table/two-sequence scope. Preserve all historical evidence, checkpoints and stopped targets. No hosted connection, backup/export/recovery, migration, Package 4 installation, account creation or feature/provider activation is authorized.

No v4c preparation or execution occurred here. Before later hosted changes: separate current inventory authorization if needed; reviewed v4c proposal and exact-hash hosted execution approval; actual encrypted checkpoint/isolated restore PASS; then independent package-specific installation authorization. Keep accounts/capabilities, Auth, email, payments, affiliates, Storage, feature flags, deployment and DNS inactive unless separately authorized. The existing v4b checkpoint still covers only the 29-table predecessor; historical Free-plan scoped logical backups exclude managed secrets/files and are not whole-platform/PITR recovery. The current Creator scope requires new recovery coverage before another installation.
