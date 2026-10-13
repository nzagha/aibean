# Application Recovery v4a hosted result — Authorization 6

**Recovery gate: PASS.** On 13 October 2026 the exact frozen v4a executor performed **one** hosted read-only scoped export, private Windows CMS encryption, independent decryption/archive verification and restoration only into a newly prepared isolated local PostgreSQL environment. Complete restored catalog/data/sequence/history/security comparisons, separate archive postflight and a separate fresh hosted read-only integrity comparison passed. No hosted writes, installations, provider activation or account creation followed.

Repository `nzagha/aibean`, branch `codex/supabase-foundation`, execution revision `50d59731de33bbbcdcf15ff6340a973a1778933e`; Supabase development project `yfknxidgphhepdtwazhn`, database `postgres`. This report supersedes the previous local-only status for **actual hosted v4a recovery**, without changing historical readiness or native-test evidence.

## Exact package and one-execution history

Manifest: `db/recovery/application-recovery-v4a.json`.

SHA-256: **`cafbf6932c2395cf1d9c5b889cac86ab67cef6b333e3fd8d12cb8c351bdaaa91`**. All **58/58 dependency byte hashes PASS** before protected access, immediately before launch and after completion. The frozen executor, original/v3 recovery files, approved SQL, migration files and installation mechanisms are unchanged.

Actual approved command:

`npx --no-install tsx scripts/recovery-v4a/execute.ts --execute-approved=cafbf6932c2395cf1d9c5b889cac86ab67cef6b333e3fd8d12cb8c351bdaaa91`

The controlled launcher invoked the same reviewed TypeScript executable through the locally installed tsx CLI with that exact flag. Mode was **execute-approved**, not inspection. Invocation count **one**; started **2026-10-13T18:10:16.509Z**, finished **2026-10-13T18:13:28.291Z**, exit **0**. Executor restoration/receipt verification completed **2026-10-13T18:13:26.222Z**; separate independent verification completed **2026-10-13T18:14:08.375Z**. No automatic retry, alternate executor or subsequent recovery occurred. Authorization 6 is consumed.

Automatic approval review initially rejected process creation because it did not accept the attachment alone as direct chat authorization. No process, hosted connection, protected-artifact mutation or executor invocation occurred on that rejection. The owner then directly confirmed the exact hash, scope, isolated restoration and retained decrypted target in chat; the approved launcher subsequently ran once. The rejection is not counted as an execution.

## Mandatory fresh preflight — all PASS

| Prerequisite | Actual verified outcome |
| --- | --- |
| Branch, revision, manifest and all 58 dependencies | Exact approved values; unchanged before/after |
| Source project/database/operator/trusted TLS | Exact direct project hostname/5432, postgres database, current/session postgres operator; CA and hostname verification; source transactions read-only |
| Source/native compatibility | Hosted PostgreSQL **17.6**; available native PostgreSQL **17.11** dump/restore/initdb/pg_ctl/psql/postgres plus OpenSSL |
| Exact inventory | 24 tables and two sequences; unexpected scope rejected |
| Catalog, RLS and grants | 34 FKs, 89 constraints, 36 indexes, 24 policies; all 14 original plus five Review public application tables have RLS; validated constraints and valid/ready indexes; exact Review catalog/effective role and column grants |
| Original history | Both original Drizzle entries and original foundation security entry match approved history |
| Review history | One exact admin-review-v1 entry, SHA-256 5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca; ledger/timestamp privately compared |
| Existing data | Both TestUsers records match private original integrity; Auth users/identities, application Users/mappings and public Review record counts zero |
| Original/v3 checkpoints | Ciphertext/metadata/receipt integrity and in-memory decryptability PASS; historical receipt namespace unchanged |
| Private recovery prerequisites | Existing certificate/key validity, strength and ACLs; protected non-synchronized NTFS storage and capacity; existing private operator connection |
| Historical failed targets | Exactly two historical failed targets stopped; top-level hashes and recursive size/modification witnesses unchanged before/after |
| V4a namespace/attempt absence | No existing v4a namespace, receipt or execution; a new isolated namespace was created only by this approved executor |
| New local target before row capture | Fresh PostgreSQL 17.11, pristine scoped schemas, loopback-only endpoint, expected recovery_operator/postgres identity, trusted local CA and hostname |

The separate preflight verifier read metadata/counts and server-computed private digests without transferring row bodies. The executor repeated frozen metadata/history/permission/account guards and prepared/verified the fresh local target before its first application row-body capture. Record bodies remained only in private process pipes/memory, encrypted artifacts and the isolated private restore target. They are absent from these reports.

## Exact recovered scope

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

This is the complete installed application/foundation scope at this checkpoint, not every Supabase-managed object. Original Drizzle migration and foundation security ledgers plus private Admin Review installation history are included. No Operations objects or managed Auth/Vault/Storage/Realtime record bodies are exported.

## Actual operation outcomes

| Operation | Outcome |
| --- | --- |
| `snapshot-export` | PASS |
| `native-dump` | PASS |
| `archive-bounds` | PASS |
| `archive-header` | PASS |
| `archive-toc` | PASS |
| `archive-schema` | PASS |
| `archive-allowlist` | PASS |
| `snapshot-integrity` | PASS |
| `archive-encrypt` | PASS |
| `metadata-bounds` | PASS |
| `metadata-encrypt` | PASS |
| `ciphertext-hashes` | PASS |
| `metadata-decrypt` | PASS |
| `archive-decrypt` | PASS |
| `archive-integrity` | PASS |
| `local-prerequisites` | PASS |
| `native-restore` | PASS |
| `permissions-replay` | PASS |
| `restore-integrity` | PASS |
| `restored-role-contract` | PASS |
| `fresh-source-continuity` | PASS |
| `retention-integrity` | PASS |
| `local-shutdown` | PASS |
| `receipt-persist` | PASS |

All **24 stages PASS**. The held read-only exported snapshot was shared with the scoped native custom-format dump. The archive passed its four-MiB size bound, PGDMP header, **195 TOC entries**, DDL/object allowlist, full multiword RLS policy names and same-snapshot private integrity validation. Native restore used error-stop/single-transaction exclusively against the verified local target.

Windows CMS encrypted the archive and scoped metadata with the existing protected certificate in **ApplicationRecoveryV4a**. Independent decryption checked ciphertext hashes, plaintext archive hash/header, metadata package/archive/capture binding and native pg_restore list count. No new certificate/private key was created or exported. A separate version-4/v4a PASS receipt exists only after complete restore/security/source/retention validation and shutdown; no v3-pattern receipt was added to the historical directory.

| Sanitized integrity artifact | SHA-256 |
| --- | --- |
| Archive | `8eabfec243bbb04c8cc6076a2a8dd6615a8188f24d75bdddd60f661d667e175d` |
| Encrypted archive | `7cc9d33a2709fb12f988985fef00e96048a7f892ed09eb9c1375473cfcf816b6` |
| Encrypted metadata | `78edc741edc03710999d81a143a3248d8dfec04e0f95c4b9f0d7fa957d6cb8aa` |

These are integrity identifiers only. No artifact contents, personal-record digests, credentials, certificate thumbprints or private paths are published.

## Independent restoration and source continuity

All 24 restored table definitions/columns/defaults, both sequences including last-value/called state, constraints/FKs/indexes/validation flags, RLS/policy definitions, owners and table/column/schema/default ACLs match the source capture. Private record integrity matches for every selected table; both original TestUsers records are restored correctly. Both Drizzle entries, original foundation security entry and complete Review ledger/history/timestamp are preserved. Restored role restrictions/inheritance and effective permissions match the approved contract, with the explicit password-free NOLOGIN surrogates described below. Restored browser roles remain denied TestUsers access; runtime role checks pass.

Fresh hosted continuity was verified by the executor and then by a **separate read-only verifier** using a new operator session and repeatable-read transaction. It compared current scoped metadata/counts/sequences/ledgers and server-computed digests with independently decrypted v4a metadata, plus the original TestUsers integrity evidence. All checks PASS. Auth users/identities, application Users/mappings and public Review records remain zero. No source data/schema/configuration write command was issued; scoped hosted state/history/data remain unchanged. This is bounded application/database continuity, not an audit of every unrelated managed provider setting.

## Retention and recovery limitations

- Original and successful v3 encrypted archives/metadata/receipts are unchanged and decryptable. Both historical failed targets retain identical witnesses and remain stopped. No historical target was restarted, modified or deleted.
- The successful new encrypted archive, metadata and distinct v4a receipt are preserved under the protected non-synchronized namespace. Its single new local PostgreSQL target is **stopped and retained**, with no bootstrap plaintext password file. Nothing was uploaded to GitHub, OneDrive or external storage except sanitized reports.
- The retained local target contains **decrypted scoped application data on private disk**. No target cleanup is authorized or performed. Later cleanup requires a separately reviewed target-bound operation; failure artifacts and backups must not be removed by an inferred cleanup step.
- Original preparation profile and `.env.local` byte hashes remain unchanged. Existing certificate binding/key configuration was reused, without rotation or export. Only the approved new namespace/profile, backup and local target were created.
- Hosted **17.6/ICU en-US** differs from local **17.11/libc C**. This successful selected-object/data recovery does not recreate the hosted database's collation/minor-version/platform environment; future nonempty text/uniqueness workloads require relevant compatibility review.
- Restored roles use explicitly approved **NOLOGIN password-free surrogates**; role restrictions, inheritance and effective grants are checked, but operational runtime credentials/LOGIN activation are not recovered. An empty local auth.users UUID fixture satisfies the identity-map FK; real hosted Auth is not restored.
- Managed Auth/Vault/Storage/Realtime records, private keys, passwords, provider/DNS/deployment/settings and platform-wide disaster recovery are outside scope. Supabase Free application recovery depends on retention of this manual archive plus privately accessible Windows CMS key and operator-managed recovery copies; the archive alone is insufficient after key loss.
- This checkpoint covers the current 24 tables/two sequences. After separately approved Operations v2 installation, future v4b must cover **29 tables/two sequences** before real feature writes/accounts/provider tests. V4a must not be silently expanded or rerun.

## Next independent decision and publication

**Admin Operations v2 may proceed to its separate owner installation authorization stage.** Its exact SQL remains `1d13ac175e967a2a9512f1ed1e0e2d6b5c34a3fa2c67692d9adcf70fef686d39`; the frozen 100-dependency mechanism remains `31ee1f91bc5be3dd6ef9c11abcbbe5809502beee1dbbee45609193e0659507e2`. No Operations installation, other migration, feature activation, identity/capability/account creation or provider action was performed here.

Before that future installation, independently recheck current scope/zero counts/history and this private v4a receipt/archive integrity. The frozen Operations executor itself still verifies original/v3 checkpoints; it does not automatically consume v4a. Its next owner authorization must explicitly incorporate independent current v4a recovery evidence. Do not infer permission from this PASS. [Existing package commands and separate authorization proposal](ADMIN_OPERATIONS_V2_HOSTED_INSTALLATION_READINESS.md) remain subject to that additional fresh checkpoint verification.

Publication checks and commit/CI evidence will be recorded after the sanitized result is pushed. Existing local package/native evidence remains PASS; no native synthetic or hosted recovery was repeated for publication.

- [Frozen executor outcome](evidence/application-recovery-v4a-hosted-result.json)
- [Single-invocation and separate preflight/postflight accounting](evidence/application-recovery-v4a-controlled-execution.json)
- [Sanitized combined acceptance](evidence/application-recovery-v4a-hosted-acceptance.json)
- [Frozen package readiness and scope](APPLICATION_RECOVERY_V4A_READINESS.md)
