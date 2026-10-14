# Creator Content v1 installation readiness

**PASS — implemented and validated locally; no hosted installation performed.** Captured 2026-10-14T01:00:00.159Z. Branch codex/supabase-foundation. Publication/CI evidence is recorded separately after the source commit.

## What actually existed

Fresh Git fetch confirmed local HEAD and origin at 0c3970f464c2383db6938e9ac76034dfa8055df0, zero ahead commits and no modified tracked files. The three pre-existing untracked items were preserved. The frozen Creator Content proposal and prior generic integrated rehearsal existed; the dedicated installer, verifier, native evidence and readiness seal did not. Classification: partially prepared product/SQL, missing package-specific release mechanism. The available previous Codex run completed Authorization 8 Recovery v4b without a run error. No subsequent completed Creator readiness run was observed. This is evidence about this checkout and available run history, not proof that no database modification ever occurred elsewhere. The remaining requirements were subsequently supplied and checked; preparation follows the explicit local-only objective. No work was discarded.

## Exact package

| Item | Value |
|---|---|
| Frozen SQL | db/proposals/creator-content-v1/reviewed-installation.sql |
| SQL SHA-256 | ecdac0e6d3448456d16b71a274d29a62050264ba9d406d4077081c998541f78d |
| New seal | db/proposals/creator-content-v1-readiness/mechanism.json |
| Mechanism SHA-256 | 731a763b3afe78e4459514ad650702056cf71dc7f1de9c9141819e0cb3df8220 |
| Bound dependency files | 170 |
| Recovery prerequisite | v4b SHA-256 523b351d870e36efd9283b06b9a19b68bb2de2b31e0cd87bd200008f27861deb |
| Scope | 15 public tables and private aibean_private.content_installations ledger |
| Native catalog | 16 relations, 146 columns, 39 FKs, 79 constraints, 28 indexes, 16 RLS policies |
| New sequences | None |

Public tables: account_notifications, account_profiles, ai_playbooks, ai_skills, creator_follows, creator_resources, event_tools, playbook_skills, playbook_tools, public_events, saved_entities, skill_tools, stack_settings, content_reports, engagement_counters.

Expected combined post-install state: 45 selected application/history tables, two unchanged sequences, 81 FKs, 201 constraints, 75 indexes and 45 policies; 38 public application tables have RLS. TestUsers and private ledgers retain their prior semantics. Original two Drizzle migration entries remain untouched; this package records one separate private installation entry. All approved SQL, original migrations, prior mechanisms and Recovery v4b files remain unchanged.

## Implemented protections

Dedicated scripts/creator-content-v1/execute.ts defaults to offline inspection. A future write requires both exact SQL and mechanism hashes, correct branch, no prior attempt/result, protected operator credentials, exact project/database/session role, trusted CA and hostname, PostgreSQL 17, exact predecessor inventory/catalog/history/effective grants, safe application roles and unchanged private data continuity. A create-new attempt marker reserves a single execution before transport; an existing marker or result stops retry. No dotenv or connections occur on imports or inspection.

Read-only checkpoint inspection verifies the actual encrypted v4b receipt, cipher/metadata/plain archive hashes, CMS decryptability, bounded PGDMP archive and 239-entry list; checks stopped targets and witnesses retained artifacts without starting or altering them. Encrypted whole-29-table metadata and server-computed private digests must match before installation. Zero Auth users/identities, application Users/mappings and pre-activation feature records remain required. Checkpoint inspection is implemented but was not invoked against private artifacts during this local-only task.

The exact SQL bytes are sent once as a simple query on a pinned verified connection, within the SQL's bounded atomic transaction/advisory lock. Postflight uses three fresh distinct operator/browser-grant/runtime sessions and read-only transactions. It verifies full catalog equality, effective table/column grants including the six permitted join/save/follow DELETE grants, protected capabilities, exact ledger and no unexpected new content data. scripts/creator-content-v1/verify.ts is a separately invokable read-only verifier. Acknowledged COMMIT plus failed verification requires forward-fix/recovery review. Connection loss before COMMIT acknowledgement is UNKNOWN; it never triggers automatic retry/reset. Server-side ownership/capability tests cover the broad trusted runtime RLS policies; a direct Drizzle connection does not inherit visitor JWT ownership.

## Verification

- Native PostgreSQL 17.11: all 18 scenarios passed on five fresh synthetic TLS targets. Wrong CA/hostname/operator/database, changed TestUsers/history/predecessor grants, unexpected objects, late ledger DDL rollback, concurrent installers, repeat refusal, browser/service read denial, runtime capability/schema/ledger denial, payment/editorial separation, post-commit verifier failure, catalog drift and lost COMMIT response were tested. Real Creator workflows passed ordinary denial, ownership isolation, moderation, public publication boundaries and notification/audit rollback using the restricted runtime login. All fresh targets stopped and retained; historical recovery targets and backups were not accessed.
- Automated suite: 150/150 passed, zero failures/skips. Six new package tests cover hashes/endpoint, pre-connection refusal, sanitized diagnostics, CLI gates, seal inventory and encrypted-checkpoint receipt binding.
- Lint, Next type generation/TypeScript, isolated production webpack build and runtime dependency audit: PASS; audit reports zero vulnerabilities. Build copied no private environment or recovery artifacts.
- Initial native workflow runs failed because a required second synthetic Creator fixture was absent. Added that fixture; unchanged frozen SQL then passed the full contract. An offline scanner initially omitted JSON imports; corrected before seal creation. Default sandbox suite hit Windows filesystem/socket restrictions; the complete permitted local run passed. These are retained, documented local preparation outcomes, not hosted failures.
- Source catalog, native code hashes and final seal match. New scoped LF attributes preserve the signed new evidence without changing frozen ancestor attribute files. Publication checks verify staged Git bytes and exclude credentials, protected paths, record digests and private backup data.

Evidence: [initial inspection](evidence/creator-content-v1-local-state-inspection.json), [native scenarios](evidence/creator-content-v1-native-readiness.json), [validation](evidence/creator-content-v1-validation.json), [isolated build](evidence/creator-content-v1-build.json).

## Remaining gates and limitations

No hosted connection, read-only inventory, backup/export, schema write, account creation, mail, Auth/payment/Storage activation, feature flag, DNS or deployment change occurred in this task. Last hosted evidence remains Recovery v4b's verified 29-table state; it was not refreshed here. Historical checkpoints and stopped recovered targets were preserved without accessing them. Fresh operator/TLS/inventory/private-checkpoint verification is mandatory immediately before any separately authorized installation. The private checkpoint adapter is prepared, not claimed freshly provider-verified.

Local 17.11 versus previously hosted 17.6 and local libc/C versus hosted ICU/en-US remain recovery limitations. Free-plan scoped recovery is logical application recovery, excludes managed Auth/Vault/Storage secrets/files, is not whole-platform/PITR, and depends on the owner-controlled CMS key. v4b covers the 29-table predecessor only; newly installed Creator Content objects require a new independently approved recovery coverage package before later feature installations. No recovery rerun is implied.

## Exact next owner authorization (not granted or executed)

“I authorize exactly one Creator Content v1 hosted installation on Supabase development project yfknxidgphhepdtwazhn, database postgres, branch codex/supabase-foundation, using SQL db/proposals/creator-content-v1/reviewed-installation.sql with SHA-256 ecdac0e6d3448456d16b71a274d29a62050264ba9d406d4077081c998541f78d and frozen mechanism db/proposals/creator-content-v1-readiness/mechanism.json with SHA-256 731a763b3afe78e4459514ad650702056cf71dc7f1de9c9141819e0cb3df8220. Verify all 170 dependency hashes, fresh target/operator/TLS identity, complete 29-table/two-sequence predecessor inventory, original migration and installation histories, RLS/effective grants and role restrictions, zero identities/accounts/application feature records, both TestUsers records and the intact decryptable v4b checkpoint before any write. Stop on drift. Execute only these exact SQL bytes once in their bounded atomic transaction, creating only the 15 reviewed public tables and private content installation ledger with approved constraints, indexes, RLS and grants. Preserve all predecessor objects/data/history/private artifacts. After acknowledged COMMIT, run the independent read-only verifier; stop for review on failure or uncertain commit state. No retry/reset, other package, backup/export, account creation, capability grant, Auth/provider/feature activation, email, deployment or DNS changes are authorized.”

Future execution, after that separate approval only:

```powershell
npx --no-install tsx scripts/creator-content-v1/execute.ts --execute-approved=ecdac0e6d3448456d16b71a274d29a62050264ba9d406d4077081c998541f78d --mechanism-sha256=731a763b3afe78e4459514ad650702056cf71dc7f1de9c9141819e0cb3df8220
npx --no-install tsx scripts/creator-content-v1/verify.ts --verify-readonly --mechanism-sha256=731a763b3afe78e4459514ad650702056cf71dc7f1de9c9141819e0cb3df8220
```

Safe offline review now: npx --no-install tsx scripts/creator-content-v1/execute.ts --inspect. No startup/CI/npm migration hook invokes this installer. Stop here for owner review; no hosted installation authority was inferred.

## Complete successor recovery design

[Recovery coverage](../db/proposals/creator-content-v1-readiness/recovery-coverage.json), SHA-256 0930ee6475ee61760ea33c0e0c82c4abef7621c658de4ed17aae4d74c30477e4, enumerates all 45 tables/two sequences, predecessor/new catalogs, 81 FKs/201 constraints/75 indexes/45 policies, eight initial history/TestUsers records, empty identity/account requirements, effective grants/role restrictions, managed-schema exclusions, local prerequisites, archive bounds, private encryption, source continuity, retention, failure decisions and execution order. It is a separately checksummed design, not an executable recovery package; no old mechanism or recovery scope was expanded. A separately prepared/native-tested/frozen v4c executor and explicit recovery authorization remain required after any approved Creator installation.

The existing independent Recovery v4b verification is PASS in its controlled execution evidence. [Checkpoint evidence validation](evidence/creator-content-v1-checkpoint-evidence.json) checks historical public evidence consistency and records its hashes/observed independent results; it does not claim fresh private decryption. The future installer additionally checks the actual private checkpoint before a write. No hosted or private-artifact access was performed now.
