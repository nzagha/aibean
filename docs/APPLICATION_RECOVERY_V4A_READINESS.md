# Application Recovery v4a readiness

**LOCAL IMPLEMENTATION AND NATIVE RECOVERY PASS. HOSTED RECOVERY NOT EXECUTED.** Prepared on 13 October 2026 for `nzagha/aibean`, branch `codex/supabase-foundation`, based on `00b457aa6bd04d55c7d8b829b4421c1e413231d6`. This task used only fresh disposable native PostgreSQL 17.11 sources/targets, synthetic records and newly generated synthetic Windows CMS certificates. No hosted Supabase connection, backup/export/restore/migration, actual private operator profile/certificate/archive access, provider/account/email/feature activation or private environment modification occurred.

## Frozen executable package

Manifest: `db/recovery/application-recovery-v4a.json`.

SHA-256: **`cafbf6932c2395cf1d9c5b889cac86ab67cef6b333e3fd8d12cb8c351bdaaa91`**.

Executable: `scripts/recovery-v4a/execute.ts`. **58 independently checked dependency hashes.** The manifest freezes the new executor, scope, closed diagnostics, Windows helpers, synthetic native/automated tests and local-only SQL prerequisites, together with unchanged predecessor installation/recovery/provenance files. Both the original 34-file Review mechanism and immutable 17-file v3 mechanism are independently inspected before private setup. New source files are LF-bound; staged Git bytes must match every manifest hash.

Original v1/v2/v3 manifests, successful original/v3 encrypted material, both historical failed targets, certificate/key configuration, approved SQL/migrations and frozen Review/Operations installation mechanisms are unchanged. Operations mechanism remains `31ee1f91bc5be3dd6ef9c11abcbbe5809502beee1dbbee45609193e0659507e2`; v3 remains `00943149054982c8b52f2ce6d38bae32c557960c37365ab447284010de8e7469`.

## Exact scope: 24 tables and two sequences

This matches the v4a checkpoint of the unchanged [coverage design](../db/recovery/application-coverage-v4-design.json): the original eighteen foundation tables, five installed public Review tables and the private Review ledger; no Operations objects.

- `aibean_private.admin_review_installations`
- `aibean_private.installations`
- `aibean_private.user_identities`
- `drizzle.__drizzle_migrations`
- `drizzle.__drizzle_migrations_id_seq` — sequence
- `public.TestUsers`
- `public.TestUsers_id_seq` — sequence
- `public.audit_logs`
- `public.billing_webhook_receipts`
- `public.claim_disputes`
- `public.claim_requests`
- `public.creator_applications`
- `public.creator_capability_requests`
- `public.featured_placements`
- `public.orders`
- `public.rate_limits`
- `public.saved_tools`
- `public.stack_tools`
- `public.stacks`
- `public.taxonomy`
- `public.tool_reviews`
- `public.tools`
- `public.users`
- `public.vendor_access`
- `public.vendor_edit_requests`
- `public.verification_requests`

The export includes owned definitions, complete columns/defaults/positions, validated constraint/FK definitions, valid/ready indexes, RLS flags/full multiword policy names/roles/qualifications, owners, effective table/column/schema/default grants, both original migration rows, original security ledger and complete Review ledger/timestamp/data integrity. There are **34 FKs** and **19 public application RLS tables** (excluding TestUsers, whose original RLS/policies remain preserved). Both sequences and their last-value/called state are preserved.

No managed Auth/Vault/Storage/Realtime rows, passwords, role credential material, private keys or unrelated objects are exported. An empty, explicitly local `auth.users(id uuid)` fixture supports the existing empty identity-mapping FK during restore; it is not a copy of hosted Auth or a working Auth service.

## Working preflight and recovery sequence

1. Exact new hash/dependency inventory, unchanged Review/v3 seals and `codex/supabase-foundation` branch gate precede private setup. Offline inspection opens no connection or private profile. Existing execution evidence and an existing v4a namespace block a silent repeat.
2. The future protected terminal supplies only its existing private `AIBEAN_BACKUP_ROOT`, `AIBEAN_BACKUP_POWERSHELL`, `AIBEAN_BACKUP_OPENSSL` and configured CA/runtime connection. Existing DPAPI operator credentials stay in captured pipes and child environments; no credential is placed in argv/output/reports.
3. The executor verifies project `yfknxidgphhepdtwazhn`, direct project host/port 5432, database `postgres`, current and session operator `postgres`, PostgreSQL major 17, trusted CA/hostname TLS and read-only transactions/native dump connection. It verifies both original/v3 ciphertext and metadata hashes, decryptability, existing CMS private-key ACL/validity, private NTFS storage/capacity, native PostgreSQL 17.11/OpenSSL prerequisites, original history and protected foundation integrity.
4. Fresh inventory must be exactly 24 tables/two sequences. Exact Review SQL hash `5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca`, complete protected Review catalog/grants, original migration/security histories, two TestUsers records/private integrity and runtime role restrictions must pass. Auth users/identities, application Users/mappings and all public Review records must be zero. Unexpected objects/routines/triggers, unvalidated constraints, invalid/unready indexes, grants/data/history drift stop before capture.
5. A new owned loopback-only PostgreSQL 17.11 target must pass role/database/address (using `host(inet_server_addr())`), certificate/hostname, package-binding and pristine-schema checks before any row-body capture. The original foundation is compared privately against v3 metadata; no historical artifact or target is changed.
6. One held REPEATABLE READ READ ONLY source snapshot is shared with the scoped native custom-format pg_dump. Snapshot lifetime/visibility, binary PGDMP header, 4-MiB size bound, complete TOC/DDL object allowlist and snapshot integrity are checked before encryption. Selection is explicit; no database-wide dump or managed schema export exists.
7. The archive and application metadata are encrypted through the existing certificate under the new namespace using Windows CMS/AES-256. Separate decrypt calls verify metadata bytes and archive SHA/header/allowlist. No decrypted record content is logged. All tracked private byte buffers are wiped on exit; JavaScript strings/process memory are not a guaranteed secure-erasure boundary.
8. Restore runs only against the newly verified local target with native error-stop/single-transaction. Local prerequisites create restricted NOLOGIN role surrogates without passwords. Reviewed schema/default/relation ACL replay recreates exact scoped permissions; all catalogs/records/private integrity, ledgers/timestamps, RLS, owners, sequences and role restrictions are compared independently to the source capture.
9. A fresh source transaction checks post-restore continuity, both previous encrypted checkpoints remain hash-identical, and private environment bytes remain unchanged. The new target is shut down and retained. Only after every step passes is a distinct version-4 PASS receipt created with create-new semantics; incomplete recoveries receive no PASS receipt. Public execution evidence is separate and sanitized.

The protected helpers use ancestor reparse/ownership/ACL checks, synchronization/repository exclusion and generated target-name/path containment. They accept only `V4aRecovery-<32 hex>` targets inside the v4a Targets directory. They cannot select historical `ExpandedRecovery-*` targets. No recursive target deletion operation exists in v4a. Late failures stop and retain owned targets and partial ciphertext for private review, without retry/reset/rebuild.

## New namespace and retention

Under the already protected root, v4a uses **ApplicationRecoveryV4a/Backups**, **ApplicationRecoveryV4a/Targets** and a separate private **profile.json**, copying only the existing certificate binding. It does not rewrite original `preparation.json`, the certificate/private key or historical Backups. New names are `v4a-application-*.cms`, `v4a-metadata-*.cms` and `v4a-receipt-*.json`; receipts declare version 4 and namespace v4a. No v3-pattern receipt is added to the original directory, so its one-receipt discovery remains valid.

**All new targets are stopped and retained on success and failure.** A successful local cluster contains decrypted scoped data on disk within the protected non-synchronized root; retention permits independent private inspection. This package does not delete that cluster. Any later cleanup requires a separately reviewed target-bound operation; do not manually broaden a deletion path or infer deletion authority from this readiness task. Original/v3 encrypted archives and every historical/failed target remain preserved. Partial initialization directories are retained even when creation fails before a complete target descriptor is available.

## Synthetic acceptance evidence

The exact package **`cafbf6932c2395cf1d9c5b889cac86ab67cef6b333e3fd8d12cb8c351bdaaa91`** passed native PostgreSQL 17.11 export, Windows CMS encryption/decryption, archive validation and isolated restoration of all 24 tables/two sequences. The final run uses two source/identity clusters plus 29 freshly created recovery targets: one success and **28 retained failures** (24 boundaries, three natural corruption/mismatch cases and one local preparation failure). All owned test clusters stop; synthetic resources remain private for failure inspection.

**24 boundary failure injections PASS**, covering snapshot/dump/header/TOC/schema/allowlist/integrity, archive/metadata encryption/decryption, ciphertext/bounds, local prerequisites/native restore, permissions replay, restored catalog/role verification, fresh source/retention, shutdown and receipt persistence. **Three natural failures PASS:** archive bytes corrupt at header validation, decrypted metadata corrupt at integrity verification, and a private snapshot response mismatch. No failure changes the synthetic source or produces a successful receipt.

Real native wrong database/operator, untrusted TLS, missing/invalid history, unknown source objects, changed Review hash/grants, insufficient dump permissions and local preparation failure are rejected. Exact multiword policy restoration, snapshot connection lifetime/visibility, owner/column/default ACL replay, role restrictions, record/ledger/sequence equality and synthetic original/v3 ciphertext plus two historical stopped-target marker preservation pass. The initial local rehearsal found a v4a session-name mismatch at the local-only prerequisite guard; it was corrected only in new v4a code and its failed synthetic target remains retained. A later unused test import was removed before final sealing. No hosted authorization was reused.

137 automated tests, lint, TypeScript, production build and runtime dependency audit pass (zero vulnerabilities). Normal Windows execution is required for existing localhost/symlink tests and Next route-type generation. [Exact native evidence](evidence/application-recovery-v4a-native.json) and [repository validation](evidence/application-recovery-v4a-validation.json) distinguish synthetic validation from hosted readiness. Implementation [fc0891a48285d02f086dd22755ca3d3e938a237c](https://github.com/nzagha/aibean/commit/fc0891a48285d02f086dd22755ca3d3e938a237c) is pushed. [Validate 38442928290](https://github.com/nzagha/aibean/actions/runs/38442928290) completed successfully: dependency installation, lint, route type generation/TypeScript, automated tests, production build and runtime dependency audit. CI does not run the Windows/native CMS rehearsal; the separately captured native evidence above covers that environment.

## Protected future commands and exact authorization

Safe offline inspection:

`npx --no-install tsx scripts/recovery-v4a/execute.ts --inspect`

Only after **new explicit owner authorization**, in the existing protected operator terminal with private process-only bindings:

`npx --no-install tsx scripts/recovery-v4a/execute.ts --execute-approved=cafbf6932c2395cf1d9c5b889cac86ab67cef6b333e3fd8d12cb8c351bdaaa91`

Proposed authorization, not exercised by this task:

> I authorize one controlled read-only hosted Recovery v4a execution on aiBean Supabase development project `yfknxidgphhepdtwazhn`, database `postgres`, branch `codex/supabase-foundation`. Use only manifest `db/recovery/application-recovery-v4a.json`, SHA-256 `cafbf6932c2395cf1d9c5b889cac86ab67cef6b333e3fd8d12cb8c351bdaaa91`, through unchanged `scripts/recovery-v4a/execute.ts` and all 58 exact dependencies. Limit export to its exact 24 tables/two sequences, scoped definitions/constraints/indexes/RLS/owners/grants and original/Review installation histories, preserving both TestUsers records. Before record capture independently verify target/current-session operator/strict TLS, exact scope and Review predecessor/catalog/grants/hash, original migrations/security/history/private continuity, zero Auth/application User/mapping/public Review counts, original/v3 encrypted checkpoint integrity/decryptability, private certificate/key/storage/native prerequisites and a newly created pristine verified local target. Stop on any drift or failed prerequisite. Use the existing certificate without changing its key/configuration; create only the separate v4a namespace/profile, encrypted archive/metadata and version-4 receipt. Restore exclusively to the new isolated loopback PostgreSQL 17.11 environment; independently verify all catalog/records/sequences/ledgers/security/source continuity. Preserve original/v3 backups and both historical stopped failed targets. Stop and retain all new local targets and failure evidence, including the successful decrypted target for private inspection; no target deletion is included. Publish only sanitized real execution evidence and stop with PASS/FAIL. Never retry automatically or treat incomplete verification as success. This authorizes no hosted restore/write/migration, Package 2 installation, managed Auth/Vault/Storage/Realtime export, credential/private-key export, accounts/capabilities/flags, Auth/provider/payment/email/DNS/deployment change, or private material upload to GitHub/OneDrive/external services.

A checksum is a binding, not consent. Availability/decryptability of real operator credentials/certificate/archives, actual current hosted 24-table scope/history/zero counts and source-to-v3 continuity were **not rechecked during this local-only task**; each is a mandatory fresh preflight for future owner-authorized execution. Missing/changed prerequisites block that execution without export. A prior namespace/attempt requires operator review; no bypass or automatic replay is provided.

## After successful hosted v4a and v4b relationship

Only an actual hosted v4a export plus independent isolated restoration PASS opens the recovery gate for the next **separate Admin Operations v2 installation authorization**. Refresh inventory and independently inspect the private v4a receipt/archive integrity before Package 2; the frozen Operations executor still checks original/v3 recovery and cannot automatically consume or execute this new checkpoint. No Package 2 action follows v4a automatically.

After Package 2 is separately installed/verified, a new v4b scope includes its additional four public tables/private ledger: **29 tables/two sequences**. V4a is then a valid pre-Operations checkpoint, not full post-Operations coverage. Implement/native-test/freeze and separately authorize v4b before feature writes, real accounts or provider testing. Do not amend either v3 or frozen v4a to expand scope. Real Auth identities, managed services/platform settings, provider mail/payment configuration, native minor/collation differences and Windows private-key disaster recovery remain outside this application-only package. Native 17.11 versus last observed hosted 17.6 is a compatibility limit, not proof of a platform-wide recovery.

## Complete dependency inventory

| Dependency | SHA-256 |
| --- | --- |
| `.gitattributes` | `f7ee637d5254eb15109d79a07c7e07fababab5867bfde887d181987357339822` |
| `db/install/identity-and-security.sql` | `eea0e7309e13440224ca80030a367afc76bc99c08b2027fc722b8fa2b388277a` |
| `db/install/manifest.json` | `fa67cad272008510be34ada709740393107965d49836ca6e6de35e57a711d5f5` |
| `db/install/reviewed-installation.sql` | `72818e1233ab51ebbac861a822d89ee0d52d4c12ee32a193746c631bdf639b0c` |
| `db/proposals/admin-review-v1-readiness/.gitattributes` | `0fce5f7f295a8b04b2df5cafff233c572d84fd001954b0443ce589ac0168be51` |
| `db/proposals/admin-review-v1-readiness/catalog.json` | `2d30633345c18f1bccc016cd856e3ec02aea70715c6d2f6fe901d393b7915efc` |
| `db/proposals/admin-review-v1-readiness/mechanism.json` | `96f727fde749cc8ab56a647b7f9ed3dc750fb73bc4864c603f3502fbef94030b` |
| `db/proposals/admin-review-v1.manifest.json` | `33c50b4a2484d3f264f4cadd5e200fb977219f55e68a50303ce05a6c84971e30` |
| `db/proposals/admin-review-v1.sql` | `5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca` |
| `db/recovery/application-coverage-v4-design.json` | `b457d9f32eb46f46aade62aa4a6bcbe9a65f0872ae7b6c7255a17ac3a9e0fe8d` |
| `db/recovery/application-v4a-local-prerequisites.sql` | `4aac218f5721a50d74023f072708554455985c8fbcfcbd7c79d783c2dc540891` |
| `db/recovery/expanded-recovery-local-prerequisites.sql` | `7914f549bd40f19cebca2ee027287c6011e721dc24e08a23fba24892a056b4d8` |
| `db/recovery/expanded-recovery-package-v2.json` | `5249c408d2610ab30e8e691f2f8396b3b83fd2ffc05053aaafebc6cb952acfec` |
| `db/recovery/expanded-recovery-package-v3.json` | `00943149054982c8b52f2ce6d38bae32c557960c37365ab447284010de8e7469` |
| `docs/evidence/.gitattributes` | `a68491a71d01399be9902a1049f79e483585f29c6bfa4fc4b32b5563553e915f` |
| `docs/evidence/admin-review-v1-hosted-execute-result.json` | `b286aaa696e0d76270462102aaf348525901f76174403b1ee8b9eb944e40aaf8` |
| `docs/evidence/admin-review-v1-hosted-verify-result.json` | `08b7ed9eaa848412252877db19ff02a7a9568feb9ba61c558549dfd1cac6207b` |
| `docs/evidence/supabase-approval-a-installation-2026-10-09.json` | `8d3773e21cca5261ede3cc757a1e666663ae3410115ca182950ef987fdf49df2` |
| `docs/evidence/supabase-approval-b-runtime-login-2026-10-09.json` | `8198267013b639235876dac7c419a9284823defc5e61580dbc00fd8b90bf07b5` |
| `docs/evidence/supabase-approval-c-testusers-security-2026-10-09.json` | `333481456ddfc15202ba99db3157af55d0d8401c5b74eef49e89a563099a7509` |
| `docs/evidence/supabase-expanded-application-recovery-result.json` | `8ff51d8420fb5af968367b8700e57e1b337a39e45aa8b1a45137ad1128501f3c` |
| `docs/evidence/supabase-hosted-scoped-recovery-2026-10-09.json` | `a3bb66e3d421396d7e79f97194e6734fecfbfb9c27fa4933355219d48587d82d` |
| `scripts/.gitattributes` | `f9921dcc69b97025e25d11f5292b194089876b26909d78b4efc52b77de875f1d` |
| `scripts/admin-review-v1/.gitattributes` | `57eb830e05116c663f7e484b1b1f7545dab51c08eeb6aa10b6234b0b6c4a4270` |
| `scripts/admin-review-v1/core.ts` | `aba58f25964cf76312a7480199b7295167f44b73bc3e83716e4455fb88ffacfd` |
| `scripts/admin-review-v1/execute.ts` | `da9f4abf8a64487faa97b57feb87433bf1b999b5c2e6827727885bd247fb64e7` |
| `scripts/admin-review-v1/native-test.ts` | `6fa370bdfdea538ece0fc7ea0b4cb65e01d1628df3ce6addef8192b9e61b294c` |
| `scripts/admin-review-v1/operator.ts` | `e183cc5c50dc8dd62aada175cf043c3a406faec90cca05a467c2a585528c797c` |
| `scripts/admin-review-v1/prepare.ts` | `e64b03f1f4b445ae99cadac269f8941d2c5a2d51b1ee459889226b7ae4753230` |
| `scripts/admin-review-v1/verify.ts` | `8b124766f8dabab48ca3048b7350de646d25000de28d82baa4a897f4e2e32508` |
| `scripts/execute-approved-installation.ts` | `88cc9a91c72af0d3684762e63326137e91f55d8f506a1b329ccd5a7563de9a98` |
| `scripts/execute-expanded-recovery.ts` | `e595728d8e49020099095bdf395c4ff9b9ff8ae6cf49a1fadff23bc280157eae` |
| `scripts/execute-scoped-backup.ts` | `16076a68bf4b2fd37a5c48284726ebe2e0c4b456a5b65d3018ab27e7a1ff0a7a` |
| `scripts/expanded-recovery-scope.ts` | `7e78974824527378e7ebe910343fa9cfddc8707d6e53e396d7701bc28c534ac5` |
| `scripts/inspect-public-backup-scope.ts` | `23127da22b68327af8bf90d89cc71f627b1bb3d96db26d713875c0dbc9ac3ce6` |
| `scripts/prepare-synthetic-recovery-test.ps1` | `e7610478c5e90f9376391a6054ba45b11ccf8bb586812dc0c3c4eac589e934fd` |
| `scripts/private-backup-crypto.ps1` | `63bc4a5744c10f89d7f134aed7d4f70dc4e0557bebf335cc06ef9778d6e5745d` |
| `scripts/private-expanded-recovery.ps1` | `7fb2c1aff71cba8b06a929d4cb1cc3b700ce6df9a6bb796d9c00231261380b85` |
| `scripts/private-runtime-credential.ps1` | `fd76e2c0772402a3d1489e28c791b874b3da9adde8a1b695f582412ec76a0d99` |
| `scripts/recovery-diagnostics.ts` | `22c753a89592c39d706416ee1c5972fe94beb275c5ac3f5b49c1de4564b9fad8` |
| `scripts/recovery-v4a/.gitattributes` | `6f033382a363d2165168f315df842f4588a21792d72953b8f978137f2d2f82b8` |
| `scripts/recovery-v4a/diagnostics.ts` | `0c5d6e8b3feee872632fa48231a29cb7b449455e41cd958b6dc18ad20b490390` |
| `scripts/recovery-v4a/execute.ts` | `0287f00cbddcfbeca240a7e9b651d5e59deb5e62eb77a154f7ace333c239f45c` |
| `scripts/recovery-v4a/native-test.ts` | `3481beca1e6a425ee2ea49ce9f4e446ec22a6eb182b7b8fe27518ea1885398bd` |
| `scripts/recovery-v4a/prepare.ts` | `80459ffca1361489afc699a437789cf1134c035d11612aa86c845a9e8353b924` |
| `scripts/recovery-v4a/private-crypto.ps1` | `7bb85a40fcfa787b2b8d378a4d5e26e08c47fd0befa3ebeef7be3cc541fe0baf` |
| `scripts/recovery-v4a/private-lifecycle.ps1` | `4e554c3a0600bc8fe814db32ae2c49ce2afbd9095dfa83507719c840ca2a0993` |
| `scripts/recovery-v4a/scope.ts` | `4ad998f9384c825f17c2fef104fb10859014796bd79ff7bb70fd6732c7ad2a35` |
| `scripts/test-expanded-recovery-executor.ts` | `8c7a43cc20062277962f4973b53a2f243d5f846c9003b5beb14066056b13a494` |
| `src/lib/db/connection-config.ts` | `50558ff8ef221d893b4d63591dca749831c94ddfe60dc023fb2a1ada53d7946b` |
| `src/lib/db/runtime-config.ts` | `44acfd2b2e7c23dcec0c23a80362539244f9651465910e1d38b55026859c196e` |
| `src/lib/db/tls-config.ts` | `3c494248921f00c36f5b950cfda7208e4a3c6d077da6e8bede15d41d4c1c627f` |
| `src/lib/supabase/config.ts` | `efdf07a509152bafdebf4062eb5c1958164204b0bfdab349923b29a08bfb731b` |
| `tests/.gitattributes` | `105683f87921e3f0ea8b3b80388544582125c1a8b40a29f792764a6db45bab42` |
| `tests/admin-review-installation.test.ts` | `a963579dab382051a361949b2c3dcb2730a8eba9036714daed698da7af6907eb` |
| `tests/application-recovery-v4a.test.ts` | `3c6ccece3d9f3be37b19237b33db6e812e9bcb16f0a308e3025dbb0cee833cb7` |
| `tests/expanded-recovery.test.ts` | `4ed9cdb3bfebed1d9541f2448663d017307556527b665bc30a3fbbd45e4f3785` |
| `tests/recovery-diagnostics.test.ts` | `27afa971e86f21f26b741ce6a402ce429b68b5a30d2db1929f10caf4cc25d65f` |
