# Discovery v1 — separate forward-only database proposal

Prepared 12 October 2026 on `codex/supabase-foundation`. **Locally validated; no hosted execution authorized or performed.** This package does not amend any previously reviewed SQL or either applied Drizzle migration.

## Exact package

`db/proposals/discovery-v1/reviewed-installation.sql`

SHA-256: `c29a3436daa54eee9f9ec1e9eb0e633da6d7cc14cb42fd9b05784db5a96de0b3`

The adjacent `manifest.json`, `0000_discovery.sql` and `meta/_journal.json` describe an isolated Drizzle proposal. The offline assembler is `scripts/prepare-discovery-proposal.ts`; it neither loads environment files nor connects to a database. Package-local Git attributes preserve LF bytes and checksum stability. Preparatory hashes were superseded before approval; only the checksum above identifies this final proposed executable.

## Objects and data impact

| Object | Purpose / impact |
| --- | --- |
| `public.saved_comparisons` | Account owner, private name, stable taxonomy context, positive CAS revision and timestamps. |
| `public.comparison_tools` | Ordered distinct members; positions 0–3, comparison cascade, Tool FK. |
| `public.account_follows` | Composite account/kind/target key, exactly one typed FK, no Creator self-follow. Copies existing Creator follows; preserves original `creator_follows` and its history. |
| `public.analytics_events` | Explicit 16-event vocabulary, public target/context, signed session digest, unique dedup digest, bounded selected-filter metadata, verified Resource campaign FK, timestamp. Public Events remain `public_events`. |
| `aibean_private.discovery_installations` | Exact separate package/checksum ledger; runtime read only. Does not append or rewrite the two baseline Drizzle entries. |
| `aibean_private.check_comparison_size()` and two deferred constraint triggers | Validate final 2–4 membership at commit, including both parents when moving a member. Parent locking serializes checks. Failed writes roll back. |

Four application tables, **11 foreign keys**, six explicit secondary indexes, primary/unique/check constraints, four runtime RLS policies and one private-ledger read policy. No sequence, login, elevated role, Auth account, taxonomy record or commercial privilege is created. No existing application data is deleted/replaced. Existing Creator subscriptions are the sole backfill. Existing account notification and security-budget tables support transactional delivery and throttling; unrelated budgets are preserved.

## Prerequisites and security

Target must independently be verified as project `yfknxidgphhepdtwazhn`, database `postgres`, privileged reviewed operator `postgres`, with trusted CA, hostname verification and intended development endpoint. SQL checks database/operator; project/TLS/actual file digest verification belongs to the external operator preflight, **not an unverified caller-supplied setting**. Do not execute merely because the SQL accepts a 64-character setting.

All four prior exact packages must already be separately approved and installed, with matching ledgers:

| Dependency | Frozen SQL SHA-256 |
| --- | --- |
| `admin-review-v1` | `5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca` |
| `admin-operations-v2` | `1d13ac175e967a2a9512f1ed1e0e2d6b5c34a3fa2c67692d9adcf70fef686d39` |
| `creator-content-v1` | `ecdac0e6d3448456d16b71a274d29a62050264ba9d406d4077081c998541f78d` |
| `creator-files-v1` | `88b5cc102a30097f7579f7dcd1da482e691522353439b5f688abcce2ad50b66b` |

SQL rejects missing/mismatched dependency history, either missing/altered baseline migration, unexpected discovery objects/ledger and unsafe runtime role. Native late-failure tests verify atomic rollback. Execution is one transaction, with advisory serialization, five-second lock timeout and sixty-second statement timeout. Initial installation is not an idempotent replacement/reset: existing new objects deliberately stop execution.

All four tables enable RLS; PUBLIC, anon, authenticated and service_role receive no direct table access. The existing NOLOGIN `aibean_runtime` receives DML (analytics has SELECT/INSERT/DELETE only), an explicit trusted-server RLS policy, function execution and read-only ledger access. The server enforces canonical capabilities and account/Tool ownership because a shared Drizzle connection does not inherit a visitor JWT. These policies do **not** provide per-visitor isolation by themselves. Independent role/column privilege denial and runtime service ownership are tested. No privileged keys are added to browsers.

## Enablement, validation and recovery

Application readiness requires `AIBEAN_DISCOVERY_WORKFLOWS=true`, content readiness, exact discovery ledger, all four RLS tables and safe effective grants. Hosted configuration was not changed. Behavioral recording additionally requires a private independently generated `AIBEAN_ANALYTICS_SECRET` of at least 32 characters; never commit it. No secret is requested in chat. DNT disables session creation/recording. Existing browser comparisons and legacy Creator follow behavior remain available while this package is disabled.

Before eventual execution: fresh source inventory/history/grants, existing TestUsers integrity, approved dependency installations, accessible verified encrypted recovery and separately approved backup expansion covering **all then-installed application objects**. The old 18-table/two-sequence recovery authorization does not cover the four prior proposals or these four new tables/private ledger. Its corrected hosted recovery remains unexecuted. No recovery retry is authorized here.

After separately authorized installation: verify exact objects, 11 FKs, final-size triggers, all RLS/policies/effective column grants, runtime privilege restrictions, discovery and dependency/baseline ledgers, Creator-follow copy equivalence, unchanged TestUsers and Auth/User identities; then test independent accounts, stale/concurrent actions, notification/audit rollback and aggregate isolation. Before website enablement, review the private secret, cleanup schedule/privacy notice and real identity/provider readiness. On precommit failure verify rollback; after commit stop for an approved forward fix/recovery, never reset.

Local evidence: [34 native PostgreSQL scenarios](evidence/mvp-discovery-native-postgres.json), [27 new HTTP checks](evidence/mvp-discovery-http.json), [frozen-file continuity](evidence/mvp-discovery-preservation.json), [implementation result and limits](MVP_DISCOVERY_COMPARISONS_FOLLOWS_ANALYTICS_RESULT.md). PostgreSQL 17.11, generated trusted loopback CA/SCRAM and synthetic identities only; no hosted continuity claim from these tests.

An eventual exact approval should authorize only this checksum on the verified development target, after the independent prerequisites/recovery above pass, with bounded atomic execution and postflight validation. It must explicitly exclude Auth activation, real accounts/mail, provider/DNS changes, live payments, resets and unrelated migrations. **This document is a proposal, not execution permission.**
