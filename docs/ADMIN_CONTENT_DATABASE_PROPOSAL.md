# Content and resource-file database proposals — 11 October 2026

These are forward-only, atomic, isolated-tested proposals. No hosted installation or Storage configuration has been performed. Original Drizzle history and applied SQL are preserved; separate proposal journals and private package ledgers track the new packages.

## Dependency order and exact packages

1. `admin-review-v1`: existing reviewed queue proposal, SHA-256 `5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca`.
2. `admin-operations-v2`: existing commercial proposal, SHA-256 `1d13ac175e967a2a9512f1ed1e0e2d6b5c34a3fa2c67692d9adcf70fef686d39`.
3. `db/proposals/creator-content-v1/reviewed-installation.sql`: SHA-256 `ecdac0e6d3448456d16b71a274d29a62050264ba9d406d4077081c998541f78d`.
4. `db/proposals/creator-files-v1/reviewed-installation.sql`: SHA-256 `88b5cc102a30097f7579f7dcd1da482e691522353439b5f688abcce2ad50b66b`.

Each manifest includes the generated/custom migration inventory and byte checksums. SQL requires expected `postgres` target/operator, reviewed checksum setting, exact prerequisite ledger/hash, original two-entry baseline history, a restricted NOLOGIN runtime group and a bounded atomic transaction. Unexpected existing objects fail rather than overwrite. SQL pins its search path and creates only application-owned public/private-ledger objects.

Content: 15 public tables / 39 FKs: profiles, Skills, Playbooks, resource campaigns, Events; four Tool/content relationship tables; saved entities, follows, notifications, stack settings, reports and aggregate counters. No sequences or data seeds. Playbooks have a free-to-read constraint. Reports have exactly one target. Counters retain only kind/object/day/source/count.

Files: one public table / five FKs for owner, Skill/Playbook/campaign parent and reviewer. Exactly one parent, clean scan status, valid SHA-256 and maximum 5 MB are enforced. Reservation/failure records remain available for orphan review. Private object keys and file contents are never put in GitHub.

Each package creates an RLS private installation ledger. Browser `anon`/`authenticated`, `service_role` and PUBLIC receive no direct application-table access. Runtime gets the necessary SELECT/INSERT/UPDATE grants and broad service RLS; server ownership/capability checks remain mandatory. DELETE is limited to content link/save/follow rows; core content, counters, reports, file records and ledgers are not deletable by runtime. Protected User flags and existing ledgers stay untouched.

## Isolated evidence

28 native PostgreSQL 17.11 scenarios pass across the complete baseline plus proposals. New content tables: all 15 RLS / 39 FKs; file table: RLS / five FKs. Actual browser/service sessions cannot read them; column-grant drift makes readiness fail closed. Original two migration entries and two synthetic TestUsers rows remain unchanged. Concurrent edits/moderation/order preparation accept one revision; outbound increments retain both concurrent requests; audit failures roll back mutations. [Evidence](evidence/admin-content-native-validation.json).

Storage/scanner adapters are synthetic in the database tests. A loopback protocol fixture verifies command framing/clean/infected/error handling; it is not a real malware-engine test. Actual private bucket, secret scoping, bucket policies/size/MIME constraints, scanner signatures/limits and provider downloads require separate operational validation. The app creates no bucket, policy or scanner service.

## Impact, recovery and approval wording

First complete the separately authorized corrected hosted recovery gate. Refresh hosted target/operator/TLS/inventory/history/grants and TestUsers continuity. Establish reviewed recovery coverage before any new installation, including a separately scoped new backup/restore rehearsal after installation. The frozen approved recovery manifest does not cover these additional tables or Storage files and must not be silently expanded.

Use independent exact authorizations in dependency order. Each step requires a fresh prerequisite check and stops on drift. Example next wording, once the recovery and reviewed queue/commercial prerequisites have passed:

> I authorize installation only of `db/proposals/creator-content-v1/reviewed-installation.sql`, SHA-256 `ecdac0e6d3448456d16b71a274d29a62050264ba9d406d4077081c998541f78d`, in project `yfknxidgphhepdtwazhn`, database `postgres`, after independently verifying the reviewed dependency packages, target/operator, trusted TLS, inventory, baseline/package ledgers, grants and recovery evidence. Execute its existing atomic transaction, preserve all existing data/history, then verify the 15 RLS tables, 39 FKs, private ledger, effective role/column grants and unchanged TestUsers/Auth/mapping/ownership state. Stop on any discrepancy; no reset, seed, Auth activation, Storage change or other package is authorized.

After that package passes, the separate file-metadata wording is:

> I authorize installation only of `db/proposals/creator-files-v1/reviewed-installation.sql`, SHA-256 `88b5cc102a30097f7579f7dcd1da482e691522353439b5f688abcce2ad50b66b`, in project `yfknxidgphhepdtwazhn`, database `postgres`, after independently verifying content-package/history/grant and recovery prerequisites. Execute its existing atomic transaction; verify resource_files RLS, five FKs, private ledger, effective denied browser/service/column access and unchanged existing data/history. Stop on drift or failed checks. Storage provisioning, secrets, scanner installation, feature flags, Auth activation and real uploads are excluded.

Storage/scanner activation and real provider fixtures need a separate concrete reviewed configuration/validation authorization. Application flags remain blank in the example environment and unchanged privately. No approval is executed by this document.
