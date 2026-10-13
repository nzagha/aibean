# Application recovery v4b readiness — 13 October 2026

**Authorization 8 — Recovery v4b HOSTED PASS, 13 October 2026.** Exactly one real read-only hosted export, private Windows CMS encryption and isolated native PostgreSQL restoration recovered all 29 tables/two sequences. Manifest 523b351d870e36efd9283b06b9a19b68bb2de2b31e0cd87bd200008f27861deb, all 138 hashes, 24 stages, 42 FKs/122 constraints/47 indexes/29 policies, full grants/RLS/owners/private integrity/history, separate archive verification and fresh hosted continuity PASS. Both TestUsers records, zero identities/feature data, original/v3/v4a checkpoints, private configuration and three historical stopped targets remain preserved. New ciphertext/version-5 receipt and one stopped recovered local target are retained. No hosted write, installation, provider activation or retry occurred. [Actual result, limits and evidence](APPLICATION_RECOVERY_V4B_HOSTED_RESULT.md). Creator Content v1 may proceed only to separately authorized preparation/review; no next task is automatically authorized. Earlier readiness/absence entries are historical; Authorization 8 is consumed.

**LOCAL IMPLEMENTATION / NATIVE SYNTHETIC PASS. HOSTED RECOVERY NOT EXECUTED.** This milestone is local development and synthetic validation only. No hosted connection/read/export/restore/write, real private checkpoint/certificate access, account creation, provider activation or application behavior change occurred. Admin Review v1 and Admin Operations v2 remain hosted installed under their completed authorizations. The actual 29-table recovery gate remains pending a new owner authorization and fresh live/private preflight.

Repository nzagha/aibean; branch codex/supabase-foundation; starting verified commit 0c72d6a6ebc18f10a058c71c2a78843055ca1184.

## Exact independently versioned package

| Item | Value |
| --- | --- |
| Manifest | db/recovery/application-recovery-v4b.json |
| Manifest SHA-256 | **`523b351d870e36efd9283b06b9a19b68bb2de2b31e0cd87bd200008f27861deb`** |
| Sealed dependencies | **138**, exact path/SHA-256 pairs under manifest.files |
| Executor | scripts/recovery-v4b/execute.ts; offline inspection by default |
| Private namespace/profile | ApplicationRecoveryV4b/Backups, ApplicationRecoveryV4b/Targets and its own profile.json |
| Receipts / target names | Version **5**, namespace **v4b**; v4b-receipt-*.json and V4bRecovery-32hex |
| Scope | **29 tables + 2 original sequences**, exact v4b-operations-installed design |
| Bounds | Archive and plaintext metadata each <= **4 MiB**; total selected records <= **10,000** |
| Hosted data prerequisites | Exactly two TestUsers records; zero Auth users/identities, application Users/mappings and all public feature records |
| Retention | Every new success/failure target stopped and retained; partial ciphertext/init artifacts retained; no recursive deletion |

[Canonical manifest and every sealed dependency hash](../db/recovery/application-recovery-v4b.json) is the complete immutable checksum inventory. It includes all frozen Operations and v4a dependencies, original installation/recovery code, the actual predecessor PASS receipts, new executor/helpers/tests and local prerequisite SQL. Original v3 manifest `00943149054982c8b52f2ce6d38bae32c557960c37365ab447284010de8e7469`, v4a manifest `cafbf6932c2395cf1d9c5b889cac86ab67cef6b333e3fd8d12cb8c351bdaaa91` and Operations mechanism `31ee1f91bc5be3dd6ef9c11abcbbe5809502beee1dbbee45609193e0659507e2` are unchanged; no predecessor SQL, mechanism, ledger receipt, original migration or Auth source was modified.

## Frozen object inventory

- aibean_private.admin_operations_installations
- aibean_private.admin_review_installations
- aibean_private.installations
- aibean_private.user_identities
- drizzle.__drizzle_migrations
- drizzle.__drizzle_migrations_id_seq (sequence)
- public.TestUsers
- public.TestUsers_id_seq (sequence)
- public.audit_logs
- public.billing_products
- public.billing_transactions
- public.billing_webhook_receipts
- public.claim_disputes
- public.claim_requests
- public.commerce_subscriptions
- public.creator_applications
- public.creator_capability_requests
- public.featured_placements
- public.orders
- public.rate_limits
- public.saved_tools
- public.stack_tools
- public.stacks
- public.taxonomy
- public.tool_reviews
- public.tool_submissions
- public.tools
- public.users
- public.vendor_access
- public.vendor_edit_requests
- public.verification_requests

Exact combined catalog is **42 foreign keys, 122 constraints, 47 indexes and 29 RLS policies**. All 23 public application tables have RLS; reviewed private mapping/installation structures retain their own RLS. TestUsers and original sequence ownership/security remain as approved. Full column/default/type/nullability, constraint/index validity, complete multiword policy names/roles/qualifications, owners, schema/table/column/default grants and original/Review/Operations ledgers are compared. Count checks alone do not substitute for exact catalog and private predecessor comparisons.

## Implemented guards and operation

1. Offline inspection checks the new exact manifest and 138 dependencies, frozen v4a/Operations seals, project/database/scope. Unsupported/mixed CLI flags and a wrong hash stop before private setup. No startup, CI, route or default migration command invokes hosted execution.
2. Future production transport requires the approved branch, existing protected operator/runtime settings, direct project host/5432, current/session postgres, strict CA/hostname TLS and PostgreSQL 17. Existing private environment bytes are witnessed, never rewritten.
3. Original/v3 protected recovery checks remain mandatory. New read-only predecessor code independently verifies v4a archive/metadata/private receipt, decryptability, scope/integrity binding, its known native archive list and protected certificate/ACL prerequisites. Private archive/plaintext/metadata hashes must match the actual sealed hosted v4a PASS evidence; synthetic tests supply a separate newly generated local reference and verify mismatched references are rejected. The old frozen CMS bridge is used only for check/decrypt; it cannot create a new v4a artifact. Two failed historical targets and one successful v4a target must be stopped and protected. Profile/archive hashes and target file metadata witnesses are compared before/after; no historical target starts/restores/deletes occur.
4. All 29-table metadata/history/count/grant/role guards run before application row capture. Foundation and both package histories must be exact; original/v4a server-computed private integrity must match. Auth users/identities, mappings, Users and public feature records must be empty except the two original TestUsers records. Unknown objects/routines/triggers, history/grant/capability drift or missing key/storage/target conditions fail closed.
5. Protected new namespace/storage/CMS prerequisites and a fresh owned PostgreSQL 17.11 target are verified before record capture. The target is loopback-only postgres/recovery_operator, trusted local CA+hostname, pristine selected schemas and contained private paths. The corrected host(inet_server_addr()) check rejects CIDR-form text, non-loopback, wrong database/operator and invalid TLS.
6. The source is a bounded repeatable-read read-only snapshot kept open through native custom-format pg_dump. Strict 31-object selection, no large objects/managed records, isolated child environment and time/buffer limits are preserved. Native header/bounds/list/schema/complete allowlist checks run before encryption and restoration.
7. AES-256 Windows CMS archive and metadata are create-new artifacts, with ciphertext/plaintext hashes and independent decryptability/integrity comparisons. Decrypted Buffers are cleared where practical; strings/process memory and on-disk local PostgreSQL data are not guaranteed secure-erasure boundaries.
8. Native pg_restore uses error-stop and a single transaction exclusively on the fresh local target. Local prerequisites recreate only reviewed empty managed-FK structure and password-free NOLOGIN role surrogates. A separate database connection reads complete restored catalogs, records/integrity, histories/timestamps, sequences, permissions and role restrictions, rather than trusting native process success.
9. Fresh source continuity, old checkpoint/target preservation, private environment and new archive checks pass before shutdown. Shutdown and all fallible receipt observers happen before the create-new PASS receipt; a late observer failure leaves no PASS receipt. No cleanup/retention assertion runs after successful receipt publication. Failures stop/retain only the new owned target and partial artifacts, without retry/reset. Failure cleanup stops the new target before rechecking historical preservation, so a failed preservation witness cannot bypass shutdown; the native late-failure regression exercises both errors together.

The synthetic fixture adapter is code-only, never a CLI/environment switch. It additionally proves loopback/database/TLS before permitting bounded ordinary User and Operations records in disposable tests; production transport never supplies it. The final tests run both this populated fixture and the strict empty-feature hosted guard path. No synthetic override weakens the future hosted scope.

## Actual local evidence

The sealed offline regression implementation resides in `scripts/recovery-v4b/unit.test.ts`, where the new namespace's explicit LF attributes preserve its exact hash on Windows and Linux. `tests/application-recovery-v4b.test.ts` is only the standard suite loader; it is not an executor dependency. Frozen root and predecessor test attributes remain unchanged.

[Native evidence](evidence/application-recovery-v4b-native.json) binds the exact package checksum and tested code hashes. It covers original baseline, exact Review/Operations SQL rehearsals, ledgers/security, native custom archive, Windows CMS encryption/decryption, full restore/security/history/data comparison and source continuity. Populated fixtures include one ordinary User, two billing products and one row in each remaining Operations table; no managed Auth account or capability is created.

All **24 export-stage boundary failures**, archive/metadata corruption and private snapshot mismatch reject safely. Additional wrong history/Review/Operations hash, altered grants, unknown object, unavailable synthetic key, invalid TLS, wrong database/operator, insufficient native dump privileges and local preparation failure stop before body capture where applicable. A late receipt observer failure has no PASS receipt. Native snapshot visibility and exporting-connection lifetime pass, including expired-snapshot rejection. No failure deletes a retained target or modifies the source. Both populated and strict empty-feature complete recoveries pass; new local targets remain stopped/retained.

The test checkpoint/profile/certificate are newly generated synthetic fixtures; original/v3 sentinels and a native 24-table synthetic v4a archive exercise retention/integrity without accessing real production artifacts. Synthetic historical failed-target markers represent stopped predecessors. This is not a new verification of real private recovery prerequisites. The first rehearsal caught a synthetic SET ROLE/TLS-view mismatch; the harness now inspects its own appropriate TLS session. That failed synthetic root remains retained. Receipt finalization was subsequently strengthened and regression-tested before sealing.

[Repository validation](evidence/application-recovery-v4b-validation.json) records automated tests, lint, route types/TypeScript, isolated source-only production build and zero-vulnerability runtime audit. The hermetic local build uses webpack and excludes all .env/private artifacts; publication CI additionally runs the project's default build. Native Windows/CMS evidence is separate from Linux GitHub CI. Implementation commit `2bc1718f0e5824b5550b03b5e8abf3f5f0f1f759` is pushed to codex/supabase-foundation. [GitHub Validate 38463230269 PASS](https://github.com/nzagha/aibean/actions/runs/38463230269) passed all configured checks: lint, TypeScript, automated tests, default production build and runtime dependency audit. [Observed CI evidence](evidence/application-recovery-v4b-ci.json) records the exact tested implementation commit. This later documentation-only publication records the completed CI result; it performs no hosted operation.

An intermediate, unpublished candidate (`9a05f2149eab9e9cf1eea0c31ca238429c8452a1bbf54f2b4c5a3e49bc62e49b`) stopped during the synthetic full-workflow phase with a redacted validation failure. Aggregate inspection confirmed zero PASS receipts, 29 retained new targets and zero running target markers. Its exact assertion was not independently established from the available redacted output. That synthetic root remains stopped and retained. The final package adds bounded filename/line assertion diagnostics, strengthens failure-shutdown ordering, and passes the complete native suite; the intermediate failure was not reproduced in that final run. This is local test history, not a hosted recovery attempt or a previously approved frozen package.

## Limitations and independent next authorization

Latest **previously verified** hosted PostgreSQL is 17.6 (ICU en-US); native rehearsal is 17.11 with libc/C. This task makes no current hosted version/collation assertion. Recovery records both environments; logical schema/data/security comparison does not recreate the provider cluster, ICU environment or runtime credentials. Managed Auth/Vault/Storage/Realtime rows, provider secrets/settings and encryption private keys are excluded. Local Auth structure is an empty FK prerequisite only. Free-plan manual checkpoints require retained ciphertext, tested decryption and separately protected operator-controlled key recovery; they do not provide whole-platform or point-in-time recovery. See [official backup guidance](https://supabase.com/docs/guides/platform/backups) and [current changelog](https://supabase.com/changelog). No upgrade/provider setting was applied here.

Safe inspection: `npx --no-install tsx scripts/recovery-v4b/execute.ts --inspect`.

**Proposed future owner authorization — not granted or exercised by this local task:**

> I authorize exactly one controlled read-only hosted Recovery v4b execution on aiBean Supabase development project yfknxidgphhepdtwazhn, database postgres, branch codex/supabase-foundation. Use only db/recovery/application-recovery-v4b.json, SHA-256 523b351d870e36efd9283b06b9a19b68bb2de2b31e0cd87bd200008f27861deb, through unchanged scripts/recovery-v4b/execute.ts and all 138 sealed dependencies. Export only the approved 29 tables and two sequences, their definitions/data/constraints/indexes/RLS/owners/grants and original/Review/Operations histories, within the reviewed 4-MiB archive/metadata and 10,000-record bounds. Before body capture verify exact project/operator/strict TLS, frozen catalog/history/roles/grants, both original TestUsers records, zero Auth users/identities/Users/mappings/feature data, original/v3/v4a checkpoint integrity/decryptability, protected CMS/storage and a fresh isolated native PostgreSQL 17 target. Use only existing approved private credentials/certificate and a new ApplicationRecoveryV4b namespace. Encrypt privately, restore exclusively into the new isolated local target, independently verify full integrity/security/history/source continuity, and stop/retain every success/failure target and partial artifact. Preserve all historical backups, certificates/keys and stopped targets. No hosted writes/installations, real accounts, feature writes, Auth/email/payment/Storage/affiliate activation, DNS/deployment changes or automatic retry. Publish sanitized execution evidence and stop.

Exact future command, only after that separate owner consent and immediate fresh preflight:

`npx --no-install tsx scripts/recovery-v4b/execute.ts --execute-approved=523b351d870e36efd9283b06b9a19b68bb2de2b31e0cd87bd200008f27861deb`

Post-execution must report actual PASS/FAIL, exact dependency verification and invocation count, encrypted archive/metadata and receipt integrity/decryptability, separate restored catalog/history/count/private integrity/grants/RLS/role validation, fresh hosted continuity, original checkpoint/target/configuration preservation, new stopped-target retention and environment limitations. Publish sanitized docs/APPLICATION_RECOVERY_V4B_HOSTED_RESULT.md and docs/evidence/application-recovery-v4b-hosted-result.json only; never private backup material/paths/records/keys. Any uncertainty/failure stops without retry or installation. No 29-table hosted recovery gate is claimed until that operation passes. Later feature/package/provider decisions require their own authorization.
