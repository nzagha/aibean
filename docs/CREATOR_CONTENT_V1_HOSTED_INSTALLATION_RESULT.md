# Creator Content v1 hosted installation result — Authorization 9

**COMMITTED; separate independent verifier PASS; installer internal postflight FAIL — owner review required.** Exactly one frozen installer executed the approved SQL, acknowledged COMMIT and then reported failure at its internal independent-postflight stage. The original controlled wrapper stopped. The separately authorized frozen read-only verifier was subsequently invoked once after acknowledged COMMIT and passed. Additional bounded read-only catalog and runtime probes passed. No SQL retry, reset, rollback after COMMIT, repair or follow-on installation occurred. An unqualified overall PASS is not claimed while the original guard failure remains unresolved.

Repository nzagha/aibean; branch codex/supabase-foundation; execution source c847ee0855f17ac06dfd391009d965134815c440. Target yfknxidgphhepdtwazhn, database postgres, direct approved project hostname/5432, current/session postgres, strict trusted CA/hostname TLS. This is an actual hosted installation, not an offline inspection or synthetic test.

| Approved package | Exact SHA-256 |
|---|---|
| db/proposals/creator-content-v1/reviewed-installation.sql | ecdac0e6d3448456d16b71a274d29a62050264ba9d406d4077081c998541f78d |
| db/proposals/creator-content-v1-readiness/mechanism.json, 170 dependencies | 731a763b3afe78e4459514ad650702056cf71dc7f1de9c9141819e0cb3df8220 |
| Preserved Recovery v4b | 523b351d870e36efd9283b06b9a19b68bb2de2b31e0cd87bd200008f27861deb |

## Fresh preflight

The independent preflight-only invocation performed zero installer/verifier invocations and no hosted write. The controlled launch repeated every prerequisite immediately before the installer. Branch/revision, SQL/mechanism/all 170 dependencies, correct direct target/operator/TLS, exact 29-table/two-sequence inventory, 42 FKs/122 constraints/47 indexes/29 policies, original Drizzle/security and exact Review/Operations histories/catalogs/RLS/effective grants and restricted roles passed. Both historical TestUsers records matched protected original/v3/v4a/v4b integrity. Auth users/identities, application Users/mappings and all feature records were zero. All sixteen proposed relations and prior attempt/result evidence were absent.

Original/v3/v4a/v4b archive/metadata/receipt integrity and decryptability passed. Actual v4b version-5 receipt, exact manifest, ciphertext/metadata/plain archive hashes, bounded PGDMP header and native 239-entry list passed. Full decrypted 29-table metadata/counts/ledger/role/grant/sequence state and server-computed private record digests matched hosted predecessor state. Existing private operator configuration, CMS certificate/key permissions/binding, storage/ACLs and two failed plus successful v4a/v4b targets passed inspection; all four targets were stopped and preserved. No new recovery destination, namespace, backup, export or restore was created. Some reused prerequisite output retains historical “new target deferred” wording; no new target is required or created for this installation.

## Exactly one actual installer and acknowledged COMMIT

The execution control accepted the explicitly authorized operation. Private process-only bindings were used without editing private configuration. Actual command:

```powershell
npx --no-install tsx scripts/creator-content-v1/execute.ts --execute-approved=ecdac0e6d3448456d16b71a274d29a62050264ba9d406d4077081c998541f78d --mechanism-sha256=731a763b3afe78e4459514ad650702056cf71dc7f1de9c9141819e0cb3df8220
```

One invocation: 2026-10-14T01:26:25.869Z to 2026-10-14T01:36:45.141Z (UTC timestamps), process exit 1. SQL attempted true; COMMIT acknowledged true; rollback NOT_NEEDED. Exact SQL bytes, bounded BEGIN/COMMIT, advisory lock/timeouts, pinned verified operator socket and same-session aibean.content_install_sha256 were preserved. A create-new once marker remains present.

**Failure:** frozen installer receipt status FAIL, stage independent-postflight, sanitized code REDACTED, decision REVIEW_FORWARD_FIX_OR_RECOVERY. Its error handler withholds the underlying assertion/error. The original wrapper stopped on the failed result; its final stoppedAt label is the last preservation check, not the underlying failure stage. That check still passed for all frozen/private artifacts. Original accounting and failed installer receipt are preserved unchanged. The failed assertion/transport condition has not been established; no root cause, schema defect, transient error or managed-schema drift is invented.

## Separate independently invoked read-only verifier

The owner expressly authorized the separate verifier after acknowledged COMMIT. It was invoked once after the stopped installer, without another SQL installation:

```powershell
npx --no-install tsx scripts/creator-content-v1/verify.ts --verify-readonly --mechanism-sha256=731a763b3afe78e4459514ad650702056cf71dc7f1de9c9141819e0cb3df8220
```

2026-10-14T01:39:38.109Z to 2026-10-14T01:45:39.043Z (UTC timestamps), process exit 0, **PASS**. It collected fresh state and used three distinct read-only sessions including the actual restricted runtime login. It inspected live catalogs/history/grants and encrypted-checkpoint continuity instead of relying on the installer receipt. Both the failed installer and successful separate verifier remain visible; the latter does not erase or explain the former.

| Verified result | Observed outcome |
|---|---|
| Fifteen public tables/private content ledger | Present; all sixteen owned as reviewed and RLS enabled |
| New columns/FKs/constraints/indexes/policies | 146 / 39 / 79 / 28 / 16, exact catalog match |
| Complete scoped inventory | 45 tables/two original sequences; 81 FKs/201 constraints/75 indexes/45 policies |
| New catalog groups | Relations, columns, constraints, indexes, policies, ACLs, column ACLs and triggers all match; no differences |
| Creator installation ledger | One creator-content-v1 entry with exact approved SQL hash |
| PUBLIC/anon/authenticated/service_role | No unauthorized direct new-table/column access |
| Runtime | Approved SELECT/INSERT/UPDATE; exactly six permitted link/save/follow DELETE table grants; private ledger SELECT only; restricted TLS connection succeeds |
| Profiles/Skills/Playbooks/Events | Approved integrity constraints present; free Playbook and one-target report constraints included |
| All fifteen new feature tables | Zero records; no data seeding or real content created |
| Original foundation/Review/Operations | Frozen independent predecessor/catalog/history/grant and private continuity checks PASS |
| Historical TestUsers | Two records; private original/v3/v4a/v4b continuity PASS |
| Auth/application identities | Auth users/identities, application Users and mappings remain zero |
| Private retention/configuration | Final frozen verifier preservation and env-byte checks PASS; all four retained targets stopped/untouched |

Public tables: account_notifications, account_profiles, ai_playbooks, ai_skills, creator_follows, creator_resources, event_tools, playbook_skills, playbook_tools, public_events, saved_entities, skill_tools, stack_settings, content_reports, engagement_counters. Private ledger aibean_private.content_installations. Original two Drizzle entries and foundation/Review/Operations installation histories remain preserved. Counts refer only to the approved application/foundation scope, not all managed Supabase tables.

## Safety, limitations and next decision

Only the approved SQL objects/security and one installation entry were written. No other package, backup/export/restore, account/capability/feature creation, real publication, Auth/email/Stripe/Storage/scanner/affiliate activation, private credential/certificate change, DNS or deployment action occurred. All 170 dependencies, reviewed SQL, original migrations and historical recovery artifacts remain unchanged. Private values, personal records, record hashes and private paths are excluded from publication. Trusted runtime RLS policies still require server-side account/capability/ownership checks; direct Drizzle does not inherit visitor JWT identity.

**Review blocker:** the initial installer internal postflight failure remains unexplained even though the complete separate frozen verifier, exact catalog and actual runtime probe passed. Do not reinstall or treat this as a rolled-back database. This is not UNKNOWN COMMIT: COMMIT is explicitly acknowledged. A separately reviewed local diagnosis is recommended before accepting the initial failure as resolved or authorizing any forward fix/recovery. No automatic corrective action is justified by these observations.

The complete 45-table successor recovery design already exists. v4b protects the 29-table predecessor and excludes sixteen new relations/history; no 45-table recovery has been run. Keep real feature/account/provider writes and further hosted installations blocked. **Recovery v4c preparation is held for owner review of this anomaly; no v4c implementation/execution is automatically started.** Any later v4c executable needs separate local validation/review and new exact-hash owner recovery authorization. Preserve both old encrypted checkpoints and stopped recovered data. Free-plan logical scope/key-recovery/managed Auth-Vault-Storage exclusions and previously hosted 17.6 versus local 17.11/ICU versus libc limitations remain.

## Evidence and publication

[Initial fresh preflight](evidence/creator-content-v1-authorization-9-preflight.json), [original stopped controlled execution](evidence/creator-content-v1-authorization-9-execution.json), [failed frozen installer receipt](evidence/creator-content-v1-hosted-execute-result.json), [separate verification invocation](evidence/creator-content-v1-authorization-9-separate-verification.json), [successful frozen verifier receipt](evidence/creator-content-v1-hosted-verify-result.json), [catalog diagnosis](evidence/creator-content-v1-authorization-9-readonly-catalog-diagnostic.json), [runtime probe](evidence/creator-content-v1-authorization-9-runtime-diagnostic.json), [combined acceptance with review blocker](evidence/creator-content-v1-authorization-9-acceptance.json). CI publication status is recorded after the result commit. CI never performs hosted SQL/recovery and cannot resolve the withheld internal failure. Authorization 9's single installation authority is consumed; stop for owner review.
