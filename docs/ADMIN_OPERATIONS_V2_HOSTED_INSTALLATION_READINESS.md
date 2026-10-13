# Admin Operations v2 hosted installation readiness

**LOCAL READINESS PASS. HOSTED INSTALLATION NOT EXECUTED.** Prepared 13 October 2026 on `nzagha/aibean`, branch `codex/supabase-foundation`, based on `07f7b7810d80f71a99c300370d09e71bc6eb0a2f`. This task implemented and tested the dedicated operator installer and separate read-only verifier; every database rehearsal used a fresh disposable loopback-only PostgreSQL 17.11 instance and synthetic data. No hosted connection/read/write, provider call, private environment change or historical backup/target operation occurred.

## Exact package and immutable predecessor

| Item | SHA-256 |
| --- | --- |
| Operations SQL `db/proposals/admin-operations-v2/0000_admin_operations.sql` | `1d13ac175e967a2a9512f1ed1e0e2d6b5c34a3fa2c67692d9adcf70fef686d39` |
| New mechanism `db/proposals/admin-operations-v2-readiness/mechanism.json` | **`31ee1f91bc5be3dd6ef9c11abcbbe5809502beee1dbbee45609193e0659507e2`** |
| Mandatory Admin Review SQL | `5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca` |
| Frozen Admin Review mechanism | `96f727fde749cc8ab56a647b7f9ed3dc750fb73bc4864c603f3502fbef94030b` |
| Frozen successful recovery v3 manifest | `00943149054982c8b52f2ce6d38bae32c557960c37365ab447284010de8e7469` |

The new mechanism seals **100 exact dependencies**, including all frozen predecessor dependencies, the separate new mechanism sources/tests/catalog, both actual predecessor hosted PASS receipts, package/lockfile and the transitive local import inventory. Nothing in the original Review SQL/mechanism, original migrations, Operations SQL or recovery v3 was regenerated or edited. New metadata was derived independently from the exact Operations SQL in a fresh native reference cluster and cross-checked against Drizzle columns and FK targets.

Admin Review hosted installation is the independently verified [Authorization 5 result](ADMIN_REVIEW_V1_HOSTED_INSTALLATION_RESULT.md), not a new connection in this task. Historical readiness wording in its preparation document remains a snapshot. Package 2 requires its exact live ledger, all five review tables, complete catalog/RLS/grants and protected runtime role contract on every future preflight. A saved installer receipt is not accepted as a substitute for live database verification.

## Working operator mechanism

- `scripts/admin-operations-v2/core.ts`: exact SQL/hash and target/identity checks, predecessor inspection, scoped private baseline, complete new catalog/effective grants, atomic execution, safe rollback/unknown-commit decisions, independent three-session postflight.
- `operator.ts`: exact new/predecessor seals and PASS receipts; existing protected Windows credential/CMS bridge; CA/hostname verification; private environment byte preservation; branch gate; create-new execution receipt boundary; sanitized results only.
- `execute.ts` and `verify.ts`: separate guarded CLI entrypoints. No action on import; no wiring into startup, CI, default Drizzle migrator or routes. Offline inspection loads no private configuration and opens no database connection.
- `prepare.ts`: offline generation of this new mechanism after matching native-tested source hashes; it does not connect to a database.
- `native-test.ts` and `tests/admin-operations-installation.test.ts`: synthetic native and offline/error/gate regression tests. Test-only context hooks are not exposed by CLI or environment.

The future protected operator terminal must already have its private process-only `AIBEAN_BACKUP_ROOT` / `AIBEAN_BACKUP_POWERSHELL` bindings, existing DPAPI operator credential, runtime connection and trusted CA; no values are provided or requested here. Both original and successful v3 archive checks/decryption are mandatory. Credentials stay in the existing protected bridge, not argv, output or reports.

Preflight verifies exact branch/checksums, fixed direct project host/port/database/operator, PostgreSQL 17 and strict trusted TLS; original foundation inventory/catalog/grants/RLS/history/data and both TestUsers records against encrypted v3 metadata; exact installed Review ledger/catalog/policies/grants and private within-operation record/ledger fingerprints; absence of all five Operations objects; zero Auth users/identities, application Users/mappings **and zero predecessor review records**. Unexpected data requires a newly reviewed recovery scope rather than weaker guards. The allowed pre-install inventory is 24 scoped tables/two sequences, growing to 29 scoped tables/two sequences only after installation. No unexpected objects are silently excluded.

The exact SQL hash is bound to `aibean.operations_install_sha256` on the same verified reserved operator socket. The approved file's original bounded atomic BEGIN/COMMIT, advisory transaction lock, five-second lock timeout and sixty-second statement timeout remain unchanged. The SQL is sent as one simple-query message; it stops at the first error. No price/product/customer rows are seeded.

## New objects and security contract

| New relation | Protection / impact |
| --- | --- |
| `public.billing_products` | RLS, owner postgres; five allowed product kinds, bounded USD amounts; active defaults false; no products/prices seeded |
| `public.billing_transactions` | RLS; unique provider session and kind/subject; exact kind/product matching; bounded USD amounts and created/paid/expired states |
| `public.tool_submissions` | RLS; structured draft, pending/approved/rejected, required independent decision fields and accepted Tool reference |
| `public.commerce_subscriptions` | RLS; unique provider subscription, allowed status and Creator/Vendor product references; no provider activation |
| `aibean_private.admin_operations_installations` | RLS; one exact package/hash entry; runtime SELECT only |

Exact native expected catalog: **5 relations, 41 columns, 33 constraints, 8 public FKs, 11 indexes, 5 policies**. Full columns/types/nullability/default expressions, constraint definitions/validation, indexes/readiness, owner/RLS flags, policy roles/qualifications, table/column ACLs and absence of unexpected user triggers are compared to `catalog.json`. Public runtime grants are SELECT/INSERT/UPDATE; no DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN or DDL. New private ledger is read-only to runtime. PUBLIC/browser/service roles receive no direct access, including column grants; service BYPASSRLS does not confer table privileges.

Server capability and owner checks remain mandatory: the trusted shared Drizzle runtime does not impersonate visitors' JWTs and its runtime-service policy does not provide per-visitor isolation by itself. Native actual service contracts verify cross-account denial, current Tool ownership, independent paid moderation, idempotent sandbox reconciliation and audit rollback. Payment/subscription changes cannot grant Admin/Creator capabilities, ownership, Tool trust or organic rank. Runtime cannot set protected User columns or alter the package ledger/schema. Revised pricing-v1 entitlements/refunds are a later separately reviewed package; proposed plan amounts/benefits are not activated or seeded by Operations v2. Existing $99/five-day sponsored review/ranking separation is unchanged.

## Guarded commands — future separate consent required

Safe offline inspection:

`npx --no-install tsx scripts/admin-operations-v2/execute.ts --inspect`

Only after separate exact-hash owner approval and complete fresh preflight:

`npx --no-install tsx scripts/admin-operations-v2/execute.ts --execute-approved=1d13ac175e967a2a9512f1ed1e0e2d6b5c34a3fa2c67692d9adcf70fef686d39 --mechanism-sha256=31ee1f91bc5be3dd6ef9c11abcbbe5809502beee1dbbee45609193e0659507e2`

After confirmed COMMIT, independent read-only verification:

`npx --no-install tsx scripts/admin-operations-v2/verify.ts --verify-readonly --mechanism-sha256=31ee1f91bc5be3dd6ef9c11abcbbe5809502beee1dbbee45609193e0659507e2`

Require both installer and separately invoked verifier PASS. The verifier uses fresh operator/runtime connections, three distinct backend sessions, read-only transactions, complete catalog/grants and original/predecessor continuity. It does not trust the installer receipt for schema correctness. It checks the same protected original/v3 recovery material again. Aggregate/safe evidence is saved under `docs/evidence/admin-operations-v2-hosted-{execute,verify}-result.json` only when future execution is independently approved. Neither receipt exists from this local task.

## Failure and stopping rules

Wrong hashes/branch/identity, missing/wrong predecessor, unexpected inventory/security/history/data or unavailable private prerequisites stop before SQL. A prior execution receipt (including failure) blocks another invocation. SQL transaction failures are rolled back only when safe SQLSTATE evidence allows, then original/predecessor catalogs/data and package absence are independently verified. Competing installations serialize: one COMMIT, the loser rolls back without removing the winner's objects. Reexecution is refused before SQL.

Connection-class failure around COMMIT means UNKNOWN, never automatic retry or assumed rollback. The native test deliberately loses the response after a real local COMMIT and proves the installed objects survive while the executor reports REVIEW_UNKNOWN_COMMIT_STATE. If post-COMMIT verification fails, preserve committed objects and stop for reviewed forward correction/recovery. Never drop/reset/rebuild or reuse an exhausted authorization. Publish sanitized actual outcomes and stop before any next package/provider/feature activation.

## Native and repository validation

**131/131 automated tests PASS. 18 native scenarios PASS in five fresh PostgreSQL 17.11 TLS clusters.** The actual sequence applies the exact original foundation and frozen Review installer/ledger/catalog, then the new Operations installer and independent verifier. Separate reference, competing installation, late-failure, uncertain-COMMIT and server-commerce fixtures are all local; synthetic artifacts are retained and only these known fresh targets were stopped. Historical stopped recovery targets and private backups were never used.

- Native trusted TLS and rejected untrusted CA/hostname: **PASS**
- Reference catalogs match Drizzle columns FK targets and exact five RLS relations: **PASS**
- Bad authorization fails before SQL: **PASS**
- Incorrect session operator and database identity fail before SQL: **PASS**
- Recovery history and TestUsers drift stop before installation: **PASS**
- Unexpected target object fails before SQL without repair: **PASS**
- Missing predecessor ledger table, wrong hash and predecessor grant drift fail before SQL: **PASS**
- Late native DDL failure rolls back exact SQL and all prior data/history: **PASS**
- Concurrent exact executors serialize: one commit and one verified rollback: **PASS**
- Independent postflight five catalogs FKs indexes constraints RLS effective grants: **PASS**
- Browser and BYPASSRLS service connections denied actual table reads: **PASS**
- Runtime cannot change capabilities requests ledger or schema: **PASS**
- Paid transactions and subscriptions never mutate capabilities ownership trust or ranking: **PASS**
- Re-execution refuses existing objects before transaction: **PASS**
- Post-commit verifier failure preserves installation and requires forward review: **PASS**
- Independent verifier rejects extra grants missing index disabled RLS and wrong ledger: **PASS**
- Lost COMMIT response is UNKNOWN, never retried or automatically rolled back: **PASS**
- Full native server commerce contract: account isolation payment/editorial separation and audit rollback: **PASS**

Lint, normal Windows Next/TypeScript validation, production build and runtime dependency audit PASS (zero vulnerabilities). Initial sandbox route generation and three existing localhost/symlink tests failed due to sandbox access restrictions; normal Windows reruns passed without altering those tests. Initial unavailable OpenSSL binding stopped before any native cluster startup; the installed verified binary was used for the passing run. New/frozen SQL/mechanism/recovery byte checks and staged protected-value/JSON/whitespace scans pass. [Native evidence](evidence/admin-operations-v2-native-readiness.json), [validation evidence](evidence/admin-operations-v2-installation-validation.json). Hosted installation, fresh hosted inventory/private recovery availability and actual provider behavior remain unverified by this local-only milestone; they are mandatory future execution/release gates.

## Recovery assessment and exact owner wording

Verified recovery v3 contains only eighteen foundation tables/two sequences. It excludes the six now-installed Review relations and all five proposed Operations relations. [Additive recovery design v4.0](ADMIN_OPERATIONS_V2_RECOVERY_COVERAGE_DESIGN.md) specifies a 24-table/two-sequence review checkpoint before Package 2, then a 29-table/two-sequence checkpoint after future Operations PASS and before feature writes/accounts/providers. It is a design, not a ready recovery executor or consent. Frozen v3 and all historical artifacts remain immutable. A separate implementation/native test/review/exact-hash authorization is needed for either new export. Within-operation private fingerprints prove preservation; they do not create a recoverable archive of the new predecessor ledger/timestamps.

**Recommendation:** complete a separately authorized v4a checkpoint first. The following narrower wording makes an owner's choice to install using the existing limited foundation recovery explicit; it does not silently claim full current recovery coverage. It is proposed text only and has not been exercised:

> I authorize one Admin Operations v2 installation on aiBean Supabase development project `yfknxidgphhepdtwazhn`, database `postgres`, branch `codex/supabase-foundation`. Execute only unchanged SQL `db/proposals/admin-operations-v2/0000_admin_operations.sql`, SHA-256 `1d13ac175e967a2a9512f1ed1e0e2d6b5c34a3fa2c67692d9adcf70fef686d39`, through `scripts/admin-operations-v2/execute.ts`, bound to mechanism `db/proposals/admin-operations-v2-readiness/mechanism.json`, SHA-256 `31ee1f91bc5be3dd6ef9c11abcbbe5809502beee1dbbee45609193e0659507e2` and all 100 exact dependencies. Immediately before SQL reverify project/operator/database/strict TLS, exact installed Admin Review v1 ledger and complete protected catalogs/grants with SQL hash `5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca`, original foundation/migration/security histories and both TestUsers records/private integrity, zero Auth/application User/mapping/review-record counts, original and successful v3 encrypted archive integrity/decryptability, and absence of all five Operations relations. I acknowledge v3 is a foundation-only backup excluding installed Review and proposed Operations; I explicitly accept that limited pre-activation recovery basis for this installation, with immutable predecessor SQL and bounded atomic rollback. Bind `aibean.operations_install_sha256` on the same verified reserved socket and execute the exact bounded atomic transaction once. Create only billing_products, billing_transactions, tool_submissions, commerce_subscriptions and the private Operations ledger with reviewed constraints/indexes/RLS/grants. Preserve existing identities/data/TestUsers, managed objects, Review and original histories/private configuration/backups/failed targets. After confirmed COMMIT run `scripts/admin-operations-v2/verify.ts --verify-readonly --mechanism-sha256=31ee1f91bc5be3dd6ef9c11abcbbe5809502beee1dbbee45609193e0659507e2` through the local pinned tsx command and require independent PASS. On failure verify safe rollback; on uncertain COMMIT or committed discrepancy stop for operator/forward-fix/recovery review without retry/reset/drop/reinstall. Publish sanitized actual receipts and stop. This excludes all other packages, backup/export/restore, Auth/accounts/capability activation, seeds, provider/email/payment/Storage/affiliate/feature-flag/DNS/deployment changes. A new approved complete-scope checkpoint remains required before any real feature writes or identities.

No hosted installation consent is inferred from this readiness task or from possessing a checksum. The next task must independently authorize exactly one execution; no operation has been scheduled or activated. Admin Review remains installed as previously verified. CI/implementation commit will be recorded after publication.

## Complete sealed dependency inventory

The machine-readable mechanism contains exactly the following 100 paths/hashes. Third-party modules are pinned by the sealed package/lockfile; relative executable/native/contract imports are enumerated in `dependency-inventory.ts`.

| Dependency | SHA-256 |
| --- | --- |
| `db/install/identity-and-security.sql` | `eea0e7309e13440224ca80030a367afc76bc99c08b2027fc722b8fa2b388277a` |
| `db/install/manifest.json` | `fa67cad272008510be34ada709740393107965d49836ca6e6de35e57a711d5f5` |
| `db/install/reviewed-installation.sql` | `72818e1233ab51ebbac861a822d89ee0d52d4c12ee32a193746c631bdf639b0c` |
| `db/install/runtime-login-proposal.sql` | `3c76ee6f5f203cbc3a140308a1360edb326ed5319fc3de9c3400c35b94e8b940` |
| `db/install/testusers-security-proposal.sql` | `0c53e6cb250512624d4a73135e8ea122eb8573b8be494b9dbe55ac9bb29985db` |
| `db/proposals/admin-operations-v2-readiness/.gitattributes` | `263ddcbd5aa582fa629913d4da11bcf59bb4e4a77c8d7b7dd58223738e1ffecb` |
| `db/proposals/admin-operations-v2-readiness/catalog.json` | `cbdc7fa218307a12ca2c13f4eb64a378abff12bfaf79b76269ecf1875813bc85` |
| `db/proposals/admin-operations-v2/0000_admin_operations.sql` | `1d13ac175e967a2a9512f1ed1e0e2d6b5c34a3fa2c67692d9adcf70fef686d39` |
| `db/proposals/admin-operations-v2/manifest.json` | `e62d14a8f480e57315a26ea410e102d9c046435def79f560d3bfc98067e71017` |
| `db/proposals/admin-review-v1-readiness/.gitattributes` | `0fce5f7f295a8b04b2df5cafff233c572d84fd001954b0443ce589ac0168be51` |
| `db/proposals/admin-review-v1-readiness/catalog.json` | `2d30633345c18f1bccc016cd856e3ec02aea70715c6d2f6fe901d393b7915efc` |
| `db/proposals/admin-review-v1-readiness/mechanism.json` | `96f727fde749cc8ab56a647b7f9ed3dc750fb73bc4864c603f3502fbef94030b` |
| `db/proposals/admin-review-v1.manifest.json` | `33c50b4a2484d3f264f4cadd5e200fb977219f55e68a50303ce05a6c84971e30` |
| `db/proposals/admin-review-v1.sql` | `5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca` |
| `db/proposals/creator-content-v1/manifest.json` | `0724c8fa4f3bd08c386abd0d201d248cfd849dbf6aa8d58a9b40ed87e9bdfb8c` |
| `db/proposals/discovery-v1/manifest.json` | `db51c8dd639e853da6b1577e0a7936f017e03c9d3f627d33e8c0d78ab243428b` |
| `db/proposals/pricing-v1/manifest.json` | `d44ccd975d12d629b656d12110bfe0dd38d354b6e030d616a4f35cef220e1b21` |
| `db/recovery/expanded-recovery-package-v3.json` | `00943149054982c8b52f2ce6d38bae32c557960c37365ab447284010de8e7469` |
| `docs/evidence/.gitattributes` | `a68491a71d01399be9902a1049f79e483585f29c6bfa4fc4b32b5563553e915f` |
| `docs/evidence/admin-review-v1-hosted-execute-result.json` | `b286aaa696e0d76270462102aaf348525901f76174403b1ee8b9eb944e40aaf8` |
| `docs/evidence/admin-review-v1-hosted-verify-result.json` | `08b7ed9eaa848412252877db19ff02a7a9568feb9ba61c558549dfd1cac6207b` |
| `docs/evidence/supabase-expanded-application-recovery-result.json` | `8ff51d8420fb5af968367b8700e57e1b337a39e45aa8b1a45137ad1128501f3c` |
| `docs/evidence/supabase-hosted-scoped-recovery-2026-10-09.json` | `a3bb66e3d421396d7e79f97194e6734fecfbfb9c27fa4933355219d48587d82d` |
| `package-lock.json` | `50e35d688d3318ae2ea899d4e5959cdc7655d34902d4c9c2d2a2a61e2f3e20f5` |
| `package.json` | `5d4688b6f117b194885372b92cdaf4999735277d6dec755541800d5b3bebf023` |
| `scripts/.gitattributes` | `f9921dcc69b97025e25d11f5292b194089876b26909d78b4efc52b77de875f1d` |
| `scripts/admin-operations-v2/.gitattributes` | `263ddcbd5aa582fa629913d4da11bcf59bb4e4a77c8d7b7dd58223738e1ffecb` |
| `scripts/admin-operations-v2/core.ts` | `2013e4bcf2db22fd96c47bcd32ff49976cdaae34d731a478064905fb7bcd71e5` |
| `scripts/admin-operations-v2/dependency-inventory.ts` | `cc603143db1dd56df4826d5404ba5e87b8bd009a0061b5eeb623a9eb5eaf36d0` |
| `scripts/admin-operations-v2/execute.ts` | `8bd4e4e0232dce98b39a0ea6861e43bf62ec449cc85b4da740354066c76e4b77` |
| `scripts/admin-operations-v2/native-test.ts` | `7ceb1236ec5daf5a74c28e20f96de60dba2500bb1cbae448a1d84ef0bfbcbeeb` |
| `scripts/admin-operations-v2/operator.ts` | `d44b2e44ed1e3e8e3ac517289f6577f0e7eb0e4a55d2b651fa9fc5e18c280797` |
| `scripts/admin-operations-v2/prepare.ts` | `6345145b19c35f612d3fdb079bcce2cd0d5dffab22c3fe2e470a5eac1b6c9a5e` |
| `scripts/admin-operations-v2/verify.ts` | `ad04d96542ead6cade95ac7308901a1af7a00291f326a9dde296a3f6b73e6bbb` |
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
| `scripts/private-backup-crypto.ps1` | `63bc4a5744c10f89d7f134aed7d4f70dc4e0557bebf335cc06ef9778d6e5745d` |
| `scripts/private-expanded-recovery.ps1` | `7fb2c1aff71cba8b06a929d4cb1cc3b700ce6df9a6bb796d9c00231261380b85` |
| `scripts/private-runtime-credential.ps1` | `fd76e2c0772402a3d1489e28c791b874b3da9adde8a1b695f582412ec76a0d99` |
| `scripts/recovery-diagnostics.ts` | `22c753a89592c39d706416ee1c5972fe94beb275c5ac3f5b49c1de4564b9fad8` |
| `src/lib/admin/catalog-controls.ts` | `8fa9ad6f7c2110e883842d52dde36a251698696f09d0ce07118726bf2eefbcd0` |
| `src/lib/admin/commerce-contracts.ts` | `8c5b84c799978e8eb073ea5338f7d95a79841c3b5c1da9dd44c502f469e125c6` |
| `src/lib/admin/commerce-queries.ts` | `dd19dca4a61b3e185f5d101d8dec4b0bc37792559b960380a66ed70887660434` |
| `src/lib/admin/commerce-storage.ts` | `05b586288d69cca01dc4e7e6db48b6bbe204000919c2279083dab81931a81df2` |
| `src/lib/admin/commerce-workflows.ts` | `faa96bd633abe5e1ae4acf4684c869fea046b0dd701c99d4e8fd269eb262d633` |
| `src/lib/admin/contracts.ts` | `1724975fca2e9e1ffabaad938d961f7db548ba0ed0c5fd93e460cf61764ec8b1` |
| `src/lib/admin/queries.ts` | `4e1914adb8ab0c7d5c54e3f0245108e6032d0c9cc18941db7df44d30852a5e9e` |
| `src/lib/admin/request-queries.ts` | `0febddb8472ef5b74a9d0c9912abd358447d8d4f146cbee5bd6572329883f228` |
| `src/lib/admin/review-contracts.ts` | `c9a0fe59c59062460e54f15b7b31e8addcc93253f60a82dff1ce82a91809b99f` |
| `src/lib/admin/review-storage.ts` | `a9ea58ee9d7a5ddea28ea12466826bfd3db86e9e6ace67834f1921d9236934f8` |
| `src/lib/admin/review-workflows.ts` | `a2a5493c53f195e39e674e3eb05d444b9a0d6111868c74ea2b619c091b73a20b` |
| `src/lib/admin/subscription-management.ts` | `a0a37c87394bcb613ff86b2e8667e033024a958284d6359ca4c860e25db58f5b` |
| `src/lib/admin/tool-workflows.ts` | `41f1a723adc994ea1986c47afa282fe2707708355ef40c9d9b662cc567ce845b` |
| `src/lib/catalog/comparison.ts` | `d4150a55bc46faf2f8c4430cf47fa06a78b46fbf0595f5a88d570b24879fd5c8` |
| `src/lib/catalog/filter.ts` | `5ef43fcc5989399637be6a702493c4f4bda93bb221f9b9a1be856751c4d34994` |
| `src/lib/catalog/logos.ts` | `a0fd4b0cece3b10652fc0d99756c69e4385b77286eb287c4009077e4e51b34d9` |
| `src/lib/catalog/taxonomy-display.ts` | `0261b0d9ea9063feb76562b634b1b30df47d69a5690e61f48ca87afb7f85c2d7` |
| `src/lib/catalog/taxonomy.ts` | `81893c58a884fab50e4dc0e203d500b896eb9911edfe3ab70cece6e510a4c49a` |
| `src/lib/catalog/types.ts` | `06109ce8b38aec84778c5901b6ea231704137a5551951504bc64a0de29fbb709` |
| `src/lib/content/contracts.ts` | `fd30e2a6e9c0ad8fb777fd78cda7c282d74fa4941f55054b41525709383d1b0b` |
| `src/lib/content/decision-notifications.ts` | `4459f7cb49d2dd0f85fdf0f36978cea833883a8a612b1d7dc27f41b6b97260cd` |
| `src/lib/content/queries.ts` | `2ac73f8e20b9d9ad5e4073a7fac23c973855f64b28e8011ad405b3458d54836f` |
| `src/lib/content/storage.ts` | `22b82d5bde954ea62b079e1f93dc39a3f47c0c8ea6a9996f988bc523d2023db6` |
| `src/lib/content/workflows.ts` | `6b29a8506f074074bbbebf2d91399f4b29f096054c0ae8627cf055576227c5d5` |
| `src/lib/db/admin-commerce-schema.ts` | `fd10ccf6083fd24361320177d54fd35771e73344185ff67166ea79e9c426a953` |
| `src/lib/db/connection-config.ts` | `50558ff8ef221d893b4d63591dca749831c94ddfe60dc023fb2a1ada53d7946b` |
| `src/lib/db/runtime-config.ts` | `44acfd2b2e7c23dcec0c23a80362539244f9651465910e1d38b55026859c196e` |
| `src/lib/db/schema.ts` | `ae149cf1a9cfe3893fc27350a524376f540edaa24b710e897879fd1f224bfae3` |
| `src/lib/db/tls-config.ts` | `3c494248921f00c36f5b950cfda7208e4a3c6d077da6e8bede15d41d4c1c627f` |
| `src/lib/discovery/analytics-contracts.ts` | `211093a3a5a18b2a03df0cabdc577ceb2d8cadec577d53c1681779c30d488188` |
| `src/lib/discovery/analytics.ts` | `7e117651c51410a55ca8413976522d92c0b7c14f980bb6b7cbfe121b73443f03` |
| `src/lib/discovery/comparisons.ts` | `566af28b8b0ca077437b02c75f5c84957bee973afed201caa84796c6d20b5f1b` |
| `src/lib/discovery/follows.ts` | `337d97a3cdd7223585c5acd8956d6024db7198119f580b587654f98076d97a57` |
| `src/lib/discovery/storage.ts` | `80be24d26af86878339cd8a88234a7e14a47e7eb38eb657ed386a3f5a0265777` |
| `src/lib/discovery/targets.ts` | `519c094bba80f830aa9d899020e8144c60321d3f6099a9581b51da09bf91a731` |
| `src/lib/pricing/config.ts` | `2acb6b7a8b68e9a88f31100ffd4808c92c4f91ef989dd9643fde636bb110c755` |
| `src/lib/pricing/entitlements.ts` | `82e9f6080635911bbcac1c920d477f871c93a5d7a52ff265a25b9e6114ef4f13` |
| `src/lib/pricing/payments.ts` | `f03ff57ac04993653077f6470453d9d373a11ff0c389d501e67e8ce5c39dbab1` |
| `src/lib/pricing/releases.ts` | `76438026051b5bde81e01faf6683e5ca12cddc825efc58ddd86f64342ec2a5c9` |
| `src/lib/pricing/storage.ts` | `77d5ae2e3e05843c302d760f610c52ac5743e2cbd1c2e8b09e3968ebad3439dc` |
| `src/lib/ranking.ts` | `b7586c4ea0653271e722ae05b5d0ee519dea38fe0055064643e5a9f6ee80f6fb` |
| `src/lib/supabase/config.ts` | `efdf07a509152bafdebf4062eb5c1958164204b0bfdab349923b29a08bfb731b` |
| `src/lib/supabase/identity.ts` | `8ad5444522219fef669572484b3d8e8e9bd5e179c5737151b0fc74ec9ceda647` |
| `src/lib/validation.ts` | `4735cd8687fd27e8d6b51db4e1fc090a9e3d5149aefbf58b07d228bee214c4e7` |
| `src/lib/workspace-filters.ts` | `65c59fca7b81be69e342d972a3d8573fb14a920d18faca8b7addee879b2f7da3` |
| `tests/.gitattributes` | `105683f87921e3f0ea8b3b80388544582125c1a8b40a29f792764a6db45bab42` |
| `tests/admin-operations-installation.test.ts` | `84d34258efcad012802597571fe9409c5f6c76f3c7a8a9a65c8d649f55c84784` |
| `tests/admin-review-installation.test.ts` | `a963579dab382051a361949b2c3dcb2730a8eba9036714daed698da7af6907eb` |
| `tests/fixtures/admin-operations-contract.ts` | `23096515d941fbc15e85e53c7be4ad731bade5f804e2b670a32841c64f4ecfa0` |
| `tests/fixtures/admin-workflow-contract.ts` | `ba59eb94217d937e14869ae7312fb690dfb0e9146d76d00ff8c50b63bc6c8a66` |
