# Admin Operations v2 hosted installation result — 13 October 2026

**PASS — Installed and independently verified.** Authorization 7 was consumed by exactly one installer invocation and one separately invoked read-only verifier. Hosted SQL was executed; COMMIT was acknowledged. No rollback, automatic retry or follow-on installation occurred.

Repository: nzagha/aibean. Branch: codex/supabase-foundation. Execution source: `558f863cb0001019a69287a7610fc5a7994de62b`. Target: Supabase development project `yfknxidgphhepdtwazhn`, database `postgres`, current/session operator `postgres`, direct project hostname/port 5432, strict trusted-CA TLS and hostname verification.

| Approved package | Verified SHA-256 |
| --- | --- |
| db/proposals/admin-operations-v2/0000_admin_operations.sql | `1d13ac175e967a2a9512f1ed1e0e2d6b5c34a3fa2c67692d9adcf70fef686d39` |
| db/proposals/admin-operations-v2-readiness/mechanism.json, 100 dependencies | `31ee1f91bc5be3dd6ef9c11abcbbe5809502beee1dbbee45609193e0659507e2` |
| Existing successful recovery v4a manifest, 58 dependencies | `cafbf6932c2395cf1d9c5b889cac86ab67cef6b333e3fd8d12cb8c351bdaaa91` |

All frozen SQL, mechanism, dependencies, migration and recovery bytes are unchanged. Historical manifest readiness labels describe preparation and cannot be interpreted as current hosted absence.

## Preflight and execution history

The initial automatic approval review rejected launch before process creation because installation consent was only in a pasted attachment. That rejection executed no installer and no SQL. The owner subsequently confirmed the exact one-installation authorization directly in chat; the unchanged controlled operation was then approved. A preflight-only invocation separately passed with zero installer/verifier invocations.

Fresh inspection before SQL verified the exact branch/source/hashes, target/operator/TLS, original foundation and Admin Review catalogs/history/permissions, two privately unchanged TestUsers records, zero Auth users/identities/application Users/mappings/public Review records, exactly 24 tables/two sequences and absence of all proposed Operations objects. Prior Operations execution receipts were absent. Unexpected drift would have stopped the operation.

The frozen installer checks original/v3 recovery; an additional independent check verified v4a ciphertext/metadata/version-4 receipt, private integrity binding, decryptability, PGDMP header and native 195-entry archive list. Its entire 24-table metadata and server-computed private integrity matched the fresh hosted state. Certificate/ACL/storage prerequisites passed; both failed historical targets and the successful v4a target were stopped, protected and preserved. Existing operator/runtime private environment and profiles were unchanged.

Actual frozen installer invocation: **one**, started **2026-10-13T18:38:43.807Z**, finished **2026-10-13T18:41:26.448Z**, exit **0**. The entrypoint was `scripts/admin-operations-v2/execute.ts` with only `--execute-approved=1d13ac175e967a2a9512f1ed1e0e2d6b5c34a3fa2c67692d9adcf70fef686d39` and `--mechanism-sha256=31ee1f91bc5be3dd6ef9c11abcbbe5809502beee1dbbee45609193e0659507e2`, invoked through the installed tsx runtime. The original SQL's bounded BEGIN/COMMIT, advisory lock/timeouts, same verified reserved socket and hash binding were preserved. **SQL attempted: true; COMMIT acknowledged: true; rollback: NOT_NEEDED.** The installer internal postflight and final preservation checks passed.

## Separate independent verifier

Actual separate invocation: `scripts/admin-operations-v2/verify.ts --verify-readonly --mechanism-sha256=31ee1f91bc5be3dd6ef9c11abcbbe5809502beee1dbbee45609193e0659507e2`. Started **2026-10-13T18:41:27.344Z**, finished **2026-10-13T18:43:40.265Z**, exit **0**, **PASS**. It used fresh read-only transactions and three distinct sessions, including the actual restricted TLS runtime login; it independently inspected live objects rather than accepting an installer receipt as proof.

| New relation | Verified result |
| --- | --- |
| public.billing_products | Exact reviewed catalog; owner postgres; RLS |
| public.billing_transactions | Exact reviewed catalog; owner postgres; RLS |
| public.tool_submissions | Exact reviewed catalog; owner postgres; RLS |
| public.commerce_subscriptions | Exact reviewed catalog; owner postgres; RLS |
| aibean_private.admin_operations_installations | RLS; exactly one admin-operations-v2 entry with the approved SQL hash |
| Columns / constraints / public FKs / indexes / policies | **41 / 33 / 8 / 11 / 5**, exact full catalog definitions and flags PASS |
| Effective table and column grants | PASS for PUBLIC/browser/service and restricted runtime contract |
| Browser/service access | anon, authenticated and service_role have no direct new table or column privileges |
| Runtime access | Public SELECT/INSERT/UPDATE; private ledger SELECT only; no DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN, DDL or elevated role flags |

Final scoped inventory is **29 tables and two original sequences**: the 24-table predecessor plus four public Operations tables and one private ledger. This is the reviewed application/foundation scope, not all Supabase-managed tables. Exact predecessor catalog and exact five-relation Operations catalog passed separately. Their verified aggregate is 42 FKs, 122 constraints, 47 indexes and 29 policies; 23 public application tables have RLS, plus the reviewed private RLS structures. These totals combine the preserved predecessor and independently checked new catalog.

## Preservation and recovery limits

An additional fresh read-only 29-table inventory and exact Operations verification passed, followed by private comparison of the original 24 tables against encrypted v4a metadata. Original catalogs, table counts, sequence state, ledgers, policies/grants and server-computed integrity remained unchanged. Both historical TestUsers records pass private continuity checks. Original Drizzle history has two entries, foundation security history one and Admin Review ledger one, unchanged; the new Operations ledger has one exact package entry. Auth users, Auth identities, application Users and identity mappings remain zero; no accounts, protected capabilities, products/prices or feature data were seeded.

Original/v3/v4a encrypted archives and metadata, CMS decryptability, private profiles/environment and all three stopped retained targets passed final preservation checks. The successful v4a target still contains recovered plaintext in protected private storage; it was not restarted, edited or removed. No new backup/export/restore ran. The only hosted writes were the authorized Operations SQL installation objects/security and ledger. No other package, real account, Auth/email, Stripe, Storage, affiliate, feature flag, DNS or deployment operation was performed. Verification covers the approved application/foundation and referenced managed metadata/aggregate counts; it is not a global audit of unrelated provider settings.

**Recovery limitation:** v4a protects the 24-table pre-installation database and excludes these five new relations/Operations installation history. Original/v3 backups retain their historical smaller coverage. A separately prepared, reviewed and authorized **v4b 29-table/two-sequence checkpoint** is required before feature writes, real identities or provider tests. Existing Free-plan manual recovery, protected CMS-key dependency, managed-platform exclusions and hosted PostgreSQL 17.6 versus local 17.11/collation differences remain documented in the v4a result. A future post-COMMIT defect requires a reviewed forward-fix or authorized recovery decision, never an automatic reset/reinstall.

## Validation, publication and next decision

Five relevant offline package regression tests pass; exact mechanism/100 dependencies and recovery/58 dependencies pass. Prior native synthetic installation/rollback/concurrency/permissions scenarios remain the separate preparation evidence; they were not rerun against hosted Supabase. Publication checks validate sanitized JSON, unchanged frozen Git bytes, whitespace and protected-value exclusion. Sanitized result commit [b961d612d83bf91e89a95b93255f741733e98b45](https://github.com/nzagha/aibean/commit/b961d612d83bf91e89a95b93255f741733e98b45) is pushed. [GitHub Validate 38449441275](https://github.com/nzagha/aibean/actions/runs/38449441275) **PASS (attempt 1)**: lint, TypeScript, **137/137 automated tests**, production build and runtime dependency audit. [Observed CI evidence](evidence/admin-operations-v2-publication-ci.json) records exact commit and step results. CI makes no hosted connection and is separate from the actual installation verification. No SQL/recovery retry or frozen-file modification occurred during publication.

**Next eligible stage: separate local recovery v4b implementation and synthetic validation.** V4b is not prepared or executed by Authorization 7. No subsequent installation, backup, feature write or provider activation is authorized here. Stop after publication; do not invoke this consumed installer again.

- [Frozen installer receipt](evidence/admin-operations-v2-hosted-execute-result.json)
- [Separate frozen verifier receipt](evidence/admin-operations-v2-hosted-verify-result.json)
- [Controlled execution times and preservation](evidence/admin-operations-v2-authorization-7-execution.json)
- [Preflight-only evidence](evidence/admin-operations-v2-authorization-7-preflight.json)
- [Sanitized combined acceptance](evidence/admin-operations-v2-authorization-7-acceptance.json)
- [Successful v4a recovery and limitations](APPLICATION_RECOVERY_V4A_HOSTED_RESULT.md)
