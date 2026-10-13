# aiBean corrected expanded recovery v2 execution result

**Recovery v2 diagnosis / v3 local correction PASS — 13 October 2026:** Frozen v2 reproduces a full-policy-name allowlist defect after successful native dump/list/schema inspection. V3 matches complete catalog policy metadata and adds fifteen safe export diagnostic boundaries. All 121 tests, native synthetic TLS/CMS export/restore and all fifteen failure/retention checks pass; isolated production build, lint/typecheck and audit pass. Manifest SHA-256: `00943149054982c8b52f2ce6d38bae32c557960c37365ab447284010de8e7469` (seventeen dependencies). V2 manifest and historical failure evidence are preserved; no hosted connection/retry or historical backup/target operation occurred. [Diagnosis, evidence and exact new authorization](SUPABASE_EXPANDED_RECOVERY_V2_FAILURE_DIAGNOSIS.md). Actual expanded hosted recovery remains FAIL; v3 requires new independent consent. Earlier v2 retry wording is historical and cannot authorize v3.

**Recovery gate: FAIL.** Authorization 2 was consumed by one exact executor invocation on 12 October 2026 local / 13 October UTC. It stopped at `approved-scoped-export` before encryption or restoration. No second attempt, repair, installation or provider activation followed.

Target: project `yfknxidgphhepdtwazhn`, database `postgres`, branch `codex/supabase-foundation`. Authorized inventory commit: `bea2ca7ebd38d3c331f6e3e098138487ef7c0030`.

Exact unchanged v2 manifest SHA-256: **`5249c408d2610ab30e8e691f2f8396b3b83fd2ffc05053aaafebc6cb952acfec`**. The manifest and all fourteen dependency byte hashes passed before and after execution. Only `scripts/execute-expanded-recovery.ts --execute-approved=5249c408d2610ab30e8e691f2f8396b3b83fd2ffc05053aaafebc6cb952acfec` performed the recovery attempt. Its ignored local launcher supplied existing process-only private paths; it did not alter the reviewed executable or manifest, credentials, private profile or environment file.

## Observed results

| Check | Result |
| --- | --- |
| Branch, authorized revision, manifest and fourteen dependencies | PASS |
| Immediate independent hosted operator/project/database/CA/hostname/TLS | PASS |
| Exact eighteen-table/two-sequence inventory, RLS/grants/roles and original histories | PASS |
| Two historical TestUsers records and private digest/metadata/sequence continuity | PASS before capture and in independent postflight |
| Auth users/identities, application Users, identity mappings | PASS: all zero |
| Original encrypted archive/metadata, decryptability and protected CMS/key/storage prerequisites | PASS |
| New isolated PostgreSQL identity, normalized loopback address, TLS/hostname and pristine schema | PASS: executor advanced beyond these guards |
| Scoped hosted export | FAIL to complete; attempted, exception redacted |
| New encrypted archive, metadata or success receipt | NONE CREATED; zero expanded artifacts independently observed |
| Encrypted expanded archive integrity/decryptability | NOT ESTABLISHED; no archive exists |
| Isolated hosted-data restoration; restored schema/security/data/ledger validation | NOT EXECUTED |
| Hosted continuity, histories, definitions, policies, grants and original private backup | PASS in independent read-only postflight |
| Original failed v1 target | Unchanged, stopped and retained |
| Newly created failed v2 target | Stopped and retained; no completion witness or bootstrap plaintext password |
| Frozen package and private environment | Unchanged |

The attempt ran from **2026-10-13T03:40:14.613Z** through **2026-10-13T03:41:09.355Z**. Independent postflight was captured at **2026-10-13T03:42:05.775Z**. The exact executor returned exit code 1 with `hostedExportAttempted=true`, `encryptedArchiveRetained=false`, `sourceWrites=false` and `transientTargetRetainedOnFailure=true`.

The masked-address defect no longer blocks this attempt: the new local identity query uses `host(inet_server_addr())`, and the strict database/operator/version/TLS/loopback checks completed before capture. All source metadata/history and local target readiness guards completed before private application record-body capture. A separate immediate preflight additionally compared the server-computed TestUsers digest to the original encrypted metadata before launching the executor; no personal digest or record value was published.

## Failure boundary and diagnostic limits

The executor sets `approved-scoped-export` immediately before native pg_dump. That stage also includes archive bounds/header, TOC/schema allowlist validation, same-snapshot integrity comparison and encryption. The sanitized failure does **not** identify which assertion or native operation failed. Dump completion, a valid in-memory archive and an exact root cause are unverified; do not label this a confirmed pg_dump, TLS or schema defect. There is no retained encrypted expanded archive or metadata. Both retained target server logs contain zero bytes; neither target was restarted for diagnosis.

Selected application bodies were captured into private process memory after the guards for integrity comparison, and pg_dump was attempted. This is not a successful persisted backup. Supabase-managed Auth/Vault/Storage/Realtime bodies, passwords, platform secrets and private keys were outside the selectors; none was uploaded. Source operations used read-only transactions/connections. No hosted write or configuration-changing API was invoked. Fresh scoped comparisons confirm unchanged records/catalog/history/permissions; this is not a global proof of every unrelated managed service's state.

## Retention and recovery limitations

The original verified pre-install TestUsers encrypted archive/metadata/receipt are still accessible, byte-identical and decryptable. They remain the only verified hosted-data recovery point and do not cover the installed application foundation. Both failed targets are private, stopped and retained without modification or cleanup; the original target's top-level file hashes and stopped witness were compared before/after. No new target is eligible for success-only deletion.

Hosted PostgreSQL is **17.6**, local tools/server **17.11**. Source ICU/locale versus local Windows C-locale platform differences still require review for a future real hosted restore. This failed attempt establishes no cross-version restoration success. NOLOGIN role surrogates and empty local Auth scaffolding cannot reconstruct the Supabase platform, role passwords or real hosted identities. Storage object bytes, provider/settings/DNS/deployment recovery, independent-device key recovery and off-device retention remain outside this gate. No forensic erasure guarantee is claimed.

Supabase Free manual scoped backups do not provide managed daily-backup or PITR guarantees, and database backups exclude Storage object bytes. [Official backup limitations](https://supabase.com/docs/guides/platform/backups). No external private backup upload is authorized.

## Blocker and next decision

**All subsequent hosted schema installation approvals remain blocked by the failed expanded recovery gate.** Do not run any seven feature package, Auth release package, historical A/B/C operation, hosted Auth/provider test or account creation. The one-execution authorization is exhausted. Do not retry v2 merely because its preflight or synthetic tests pass.

If the owner wants engineering to investigate, the next bounded authorization is:

> I authorize local diagnosis of the corrected expanded recovery v2 failure at approved-scoped-export and preparation of a separately reviewed correction only if required. Use synthetic records in fresh disposable native PostgreSQL environments, exercise the exact executor/export/TOC/security validation path and add sanitized stage-specific diagnostics and regression coverage without exposing protected data. Preserve the eighteen-table/two-sequence scope, all existing TLS/history/privacy guards, the original encrypted backup, both stopped failed targets and all frozen package/history bytes. Publish exact changed-file checksums, local validation evidence and a new versioned manifest for my review. Do not rerun a hosted export or recovery, restart/modify/delete either retained target, change hosted data/settings, install any package, create accounts, send email or activate providers. A hosted retry requires a separate explicit authorization bound to the reviewed package hash.

No correction or local recovery rehearsal was automatically started. [Historical v1 result](SUPABASE_EXPANDED_APPLICATION_RECOVERY_V1_HISTORICAL_RESULT.md) and [v1 evidence](evidence/supabase-expanded-application-recovery-v1-historical.json) preserve the original failure rather than relabeling it. The v1 hash `a759d686d2a108f7d3c91e35d0db3ff014beae2d7992e2aa587a1dd32bfb1b30` remains historical only.

## Validation and publication

Eight existing recovery regression tests pass; they do not establish actual hosted export/restoration success. No production code, SQL, manifest or test was changed. Lint, TypeScript, all 116 automated tests, production build and zero-vulnerability runtime dependency audit pass. The initial restricted Windows context blocked path canonicalization/registry access and three loopback/symlink-dependent tests; checks rerun in the normal Windows context pass without source changes. Final offline manifest inspection verifies all fourteen unchanged hashes; its default NOT EXECUTED output describes that inspection invocation, not the actual attempt above. The result-commit CI has not yet been checked. Only sanitized documents/evidence are selected for GitHub; private launcher/preflight files stay ignored.

- [Sanitized active attempt evidence](evidence/supabase-expanded-application-recovery-result.json)
- [Executor invocation and preservation verification](evidence/supabase-expanded-recovery-v2-execution-verification.json)
- [Independent failure postflight](evidence/supabase-expanded-recovery-v2-failure-postflight.json)

All fourteen selected publication files pass the protected-value scan and staged whitespace validation. Private backups, certificate material, personal records/digests and operator launchers are excluded. The frozen discovery/pricing SQL index checks also pass. Publication is limited to this branch's sanitized documentation/evidence.
