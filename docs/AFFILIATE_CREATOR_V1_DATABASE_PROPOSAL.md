# Affiliate/Creator forward proposal v1 — separate approval required

12 October 2026. **Prepared and locally validated only.** Target for any later authorized execution: aiBean development project `yfknxidgphhepdtwazhn`, database `postgres`; no hosted access occurred in this milestone.

Reviewed SQL: `db/proposals/affiliate-creator-v1/reviewed-installation.sql`.
Exact SHA-256: **`0a06cae4801d6c8f4493694c9fe537c412d61b4d33c89d3a7926df45c701704a`**.
Offline assembler: `scripts/prepare-affiliate-creator-proposal.ts`; source migration/journal/manifest live in the same separate directory. Drizzle definitions: `src/lib/db/affiliate-creator-schema.ts`. Do not regenerate the original baseline or apply this through a generic hosted migration command.

| New table | Purpose |
| --- | --- |
| affiliate_programs | Partner/program host scope, proposed rate, dates, disabled/enabled state, complete config hash, revision/editor. |
| affiliate_destinations | Exact approved HTTPS URL/template/disclosure, enable switch and revision. |
| affiliate_relationships | Stable canonical Tool and optional campaign relationship, proposed Creator share, switch/revision. |
| affiliate_clicks | Separate minimized deduplicated eligible click evidence and disclosure snapshot. |
| affiliate_reconciliations | Append-only provider-confirmed conversion/commission/reversal evidence, unique program/event. |
| creator_presentations | Owned structured profile, social links and approved avatar/cover file references. |
| campaign_blocks | Ordered typed canonical references, descriptions/media, at most 40 positions; real FKs and exact kind/reference constraints. |
| creator_revision_history | Append-only owned/Admin profile, campaign and affiliate configuration snapshots. |

All eight tables enable RLS and revoke direct PUBLIC/anon/authenticated/service_role table privileges. Runtime grants are SELECT/INSERT/UPDATE for editable configuration/presentation/block tables, **SELECT/INSERT only** for click/receipt/history evidence, and DELETE only for owned block replacement. Explicit server-service RLS policies reflect shared Drizzle connections; visitor authorization is enforced canonically in services, not through assumed JWT inheritance. New private `aibean_private.affiliate_creator_installations` is runtime SELECT-only and browser-denied. There are **25 new FKs**, bounded checks and indexes for relationships/reporting/history; no existing table, column, role, Auth record, original ledger entry or proposal is replaced.

Preflight requires exact `postgres` database/operator, safe `aibean_runtime` NOLOGIN group, unchanged original two migration hashes/timestamps, all six prerequisite ledger/package checksums, absence of new conflicting objects and an explicit reviewed checksum setting. Transaction advisory locking plus five-second lock and 60-second statement timeouts bound the atomic installation. The new SQL does not seed commercial configurations, activate links, enable uploads or change authentication. Metadata/target/operator/trusted TLS and archive verification must still be independently performed by a separately approved executor before any hosted execution; SQL alone cannot establish hosted TLS/project identity.

Dependencies in the manifest are admin-review-v1, admin-operations-v2, creator-content-v1, creator-files-v1, discovery-v1 and pricing-v1. All are still separately unapproved for hosted installation. Historical 18-table/two-sequence recovery does **not** protect these dependencies or this expanded scope. Obtain a fresh inventory and separately authorized complete application backup/isolated restoration before presenting any hosted installation authorization. Do not retry the historical failed recovery or repeat Approvals A/B/C.

Native proof: eight RLS tables/25 FKs, forbidden browser/service reads, restricted installation ledger, append-only evidence, independent competing edits and transaction/audit rollback. Two original synthetic TestUsers records and two baseline migration rows remain intact. Failure injection before commit leaves no new tables; the isolated installation then passes. Successful native environments were stopped, retained artifacts are synthetic and ignored by Git. Hosted rollback/recovery and actual provider/media behavior remain unverified.

Runtime metadata gate: `AIBEAN_AFFILIATE_CREATOR_WORKFLOWS=true`, with all prerequisite feature/storage gates passing current hash/RLS/effective grants. This does not activate commercial routing. Routing separately requires an owner-approved **full configuration hash map** and verified provider-contract gate; reconciliation requires private HMAC adapter keys. Image delivery separately requires the existing verified private Storage/scanner gate. None of the owner's private settings were edited. Review [implementation, commercial proposals and limits](AFFILIATE_AND_CREATOR_ENHANCEMENTS_RESULT.md) before requesting independent execution/activation approvals.
