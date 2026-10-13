# Admin Review v1 hosted installation result — Authorization 5

**PASS — Installed and independently verified on 13 October 2026.** One guarded hosted installation was executed under the owner's new Authorization 5. The exact approved atomic SQL transaction completed with COMMIT acknowledged. The installer postflight and the separately invoked frozen read-only verifier both passed. No retry or follow-on installation was performed.

Repository `nzagha/aibean`, branch `codex/supabase-foundation`, executing source `759d3bc653472da2f938bb3aa5f5b050a73d9b05`. The owner named verified result commit `87a2afe33714c097e912f6c9a59d8ddfa159482a`; the sole intervening commit records its passing CI in documentation. Approved executable/package bytes are unchanged. The earlier absence diagnostic is preserved verbatim in [the historical verification-only report](ADMIN_REVIEW_V1_VERIFICATION_ONLY_2026_10_13.md); its FAIL concerned the then-absent package, not this successful installation.

## Exact package and preflight

- SQL: `db/proposals/admin-review-v1.sql`, SHA-256 **`5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca`**.
- Mechanism: `db/proposals/admin-review-v1-readiness/mechanism.json`, SHA-256 **`96f727fde749cc8ab56a647b7f9ed3dc750fb73bc4864c603f3502fbef94030b`**, all **34 dependency byte hashes PASS**.
- Recovery v3 manifest: `00943149054982c8b52f2ce6d38bae32c557960c37365ab447284010de8e7469`, unchanged.

Immediately before the approved SQL, the dedicated executor passed its protected recovery and reserved-connection read-only preflight: exact project `yfknxidgphhepdtwazhn`, database `postgres`, privileged operator `postgres`, direct project hostname/port, CA trust and strict hostname verification; original eighteen-table/two-sequence inventory; original migration/security histories; foundation catalogs/RLS/grants/restricted roles; both TestUsers records by private integrity checks; zero Auth users/identities, application Users and private identity mappings; absence of all six review relations. Original and successful v3 encrypted archives and integrity metadata remained accessible, intact and decryptable through the existing protected Windows CMS configuration. No unexpected drift was detected. No credentials, private bindings or record values are included here.

## Actual execution and COMMIT

The existing private process-only environment was used without editing `.env.local`. Actual installer mode was **`--execute-approved`**, invocation count **one** (not an offline inspection):

`npx --no-install tsx scripts/admin-review-v1/execute.ts --execute-approved=5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca --mechanism-sha256=96f727fde749cc8ab56a647b7f9ed3dc750fb73bc4864c603f3502fbef94030b`

Invocation started **2026-10-13T15:05:45.149Z**, finished **2026-10-13T15:06:57.292Z**, exit **0**. The exact reviewed SQL was sent on the verified reserved operator socket as one simple-query message, retaining its bounded BEGIN/COMMIT, locks/timeouts and hash guard. **Hosted SQL attempted: yes. COMMIT acknowledged: yes. Rollback: NOT_NEEDED.** The installer returned PASS after its three-session independent postflight and final hash/recovery/environment preservation checks. No failure or uncertain commit occurred; Authorization 5 is consumed.

## Separate independent read-only verifier

After the successful installer returned, a distinct invocation ran:

`npx --no-install tsx scripts/admin-review-v1/verify.ts --verify-readonly --mechanism-sha256=96f727fde749cc8ab56a647b7f9ed3dc750fb73bc4864c603f3502fbef94030b`

Started **2026-10-13T15:07:19.263Z**, finished **2026-10-13T15:08:24.907Z**, exit **0**, **PASS**. This separate procedure used three distinct sessions (two operator and one restricted runtime), read-only transactions, exact catalog comparison and protected foundation/recovery continuity. Its PASS is saved separately from the installer receipt.

| Installed object/check | Independently verified outcome |
| --- | --- |
| `public.creator_applications` | Present, owner postgres, RLS enabled, exact reviewed catalog |
| `public.creator_capability_requests` | Present, owner postgres, RLS enabled, exact reviewed catalog |
| `public.vendor_edit_requests` | Present, owner postgres, RLS enabled, exact reviewed catalog |
| `public.verification_requests` | Present, owner postgres, RLS enabled, exact reviewed catalog |
| `public.claim_disputes` | Present, owner postgres, RLS enabled, exact reviewed catalog |
| `aibean_private.admin_review_installations` | Present, RLS enabled, one exact admin-review-v1 package/SQL-hash ledger entry |
| New foreign keys / constraints / indexes | **16 / 42 / 11**, exact definitions and catalog flags PASS |
| New RLS policies | **6**, exact definitions/roles PASS; all six relations have RLS |
| Effective role and column grants | PASS for anon, authenticated, service_role, aibean_runtime and aibean_app_login |
| Runtime/browser/service boundaries | Browser/service denied all direct new table/column privileges. Runtime has reviewed SELECT, public INSERT and limited UPDATE; no capability-request UPDATE, DELETE/TRUNCATE or elevated administration privileges |
| Restricted runtime session | Actual aibean_app_login TLS connection and empty metadata-only SELECT probes PASS |

Final inspected scoped inventory is **24 tables and two original sequences**: the original eighteen tables plus five public review tables and one private review ledger. This is the application/foundation scope, not a global count of all Supabase-managed schemas.

## Existing database and recovery preservation

Original foundation catalogs/counts/server-computed integrity, sequence state, role restrictions, managed relation metadata and migration/security history match their pre-installation baseline. Both original Drizzle entries and the original foundation security entry remain unchanged. Both historical TestUsers records match their protected integrity evidence; Auth users/identities, application Users and private identity mappings remain zero. No accounts, capabilities, seeds or unrelated data were created or changed.

Original/v3 encrypted archive and metadata integrity and CMS decryptability passed before and after installation and again in the separate verifier. Existing backups and stopped historical failed targets were not modified, restarted or removed. No backup/export/restore was run. Private environment bytes remain unchanged. The sole hosted changes are the authorized review relations, constraints/indexes/RLS/grants and installation entry; no Auth, provider, DNS, deployment or feature flag was activated.

**Recovery limitation:** v3 remains a verified recovery checkpoint for the original eighteen-table/two-sequence foundation. It does not contain these six newly installed relations. A new separately reviewed and authorized recovery coverage/checkpoint is required before allowing real feature writes or identities. This task neither expanded nor repeated recovery. Managed catalog continuity does not imply a global audit of every unrelated provider setting/record.

## Next-stage decision and publication

Admin Review v1 hosted installation is complete. **Admin Operations v2 is eligible for separate local preparation/review and its own exact package authorization stage.** No Admin Operations SQL, other package, provider activation or account/capability creation has been executed or authorized here. Do not rerun this installer or reuse Authorization 5. Stop after reporting this result.

Only sanitized reports and evidence are published. Existing reviewed SQL, mechanism, dependencies, recovery manifest and application behavior were not modified. Offline exact-hash, JSON, whitespace and protected-value publication checks pass. Existing [local-tooling CI](https://github.com/nzagha/aibean/actions/runs/38409932853) passed 126 automated tests, lint/TypeScript/build/runtime audit; native scenarios are the earlier separate synthetic evidence. New result publication commit/CI will be recorded after push; CI does not substitute for the actual hosted receipts below.

- [Exact frozen installer receipt](evidence/admin-review-v1-hosted-execute-result.json)
- [Separate frozen read-only verifier receipt](evidence/admin-review-v1-hosted-verify-result.json)
- [Installer invocation/time/mode evidence](evidence/admin-review-v1-authorization-5-execute-invocation.json)
- [Verifier invocation/time/mode evidence](evidence/admin-review-v1-authorization-5-verify-invocation.json)
- [Sanitized combined acceptance](evidence/admin-review-v1-authorization-5-summary.json)
- [Original successful recovery v3](SUPABASE_EXPANDED_RECOVERY_V3_EXECUTION_RESULT.md)
