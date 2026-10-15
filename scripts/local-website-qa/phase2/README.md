# Phase 2 local acceptance tooling

These observers exercise only the existing disposable Windows PostgreSQL QA
fixture. They do not load the hosted environment as a database target. Native
connections use the reviewed local configuration's run, loopback, database,
role, certificate, hostname and finite-lease guards. No schema package is
installed. The original account-v2 source and its seals remain unchanged.

Run from the repository root through `node node_modules/tsx/dist/cli.mjs`:

| Entry | Effect |
| --- | --- |
| `preflight.ts` | Starts only the known stopped fixture temporarily; read-only inventory and private continuity checkpoint; stops it afterward. Refuses a running target. |
| `continuity.ts --initial-resume` | Read-only comparison with the pre-resume private checkpoint. |
| `auth-native.ts` | Actual synthetic registration/confirmation/password/session/security endpoint checks. Four original role passwords remain unchanged. |
| `http-panels.ts` | Routes/access, genuine draft action and forged-action checks with separate in-memory sessions. |
| `workflows.ts` | Creates new synthetic ordinary accounts, Tools, Stacks, reviews, applications and Creator drafts; exercises real editorial transitions. Existing pending Vendor requests are preserved. |
| `discovery-workflows.ts` | Uses the privately retained browser journey account; verifies the current saved password without replacing it. New named comparison, follow/unfollow and commercial-state checks. |
| `admin-probe.ts` | Creates a new isolated diagnostic Tool through genuine Admin actions. |
| `retire-task-content.ts [--events-only]` | Retains all rows; archives/cancels only exact task-generated author/time/slug/title matches through genuine editorial actions. No fixture reset or quota change. |
| `restart-validation.ts` | Captures cookies only in memory, checkpoints all application/ledger relations privately, gracefully stops/resumes only the current fixture through the reviewed launcher, and verifies sessions, four passwords, mailbox and source continuity. |

Do not repeat mutation suites casually: they intentionally preserve synthetic
records and can reach real plan quotas. A duplicate pending request is BLOCKED,
not a successful fresh submission. A provider-pending state is not settlement.
The retirement helper requires the existing private preflight timestamp and
never removes records or changes plan limits.

`streamed-form.ts` structurally assembles literal React segment placement for
native HTTP form tests. It executes no page JavaScript, browser commands,
events or external resources. This does not provide actual browser acceptance.
`rendered-forms.ts` derives the real form/action contract from rendered output;
cookies, credentials and raw payloads are never written to public evidence.

`build.mjs` copies application sources into an isolated temporary production
build without copying private environment files. It does not touch the preview.

Historical failed evidence is retained next to final evidence. The final status
must cite the exact final file rather than infer success from an HTTP 200 or
overwrite a historical failed result. See the consolidated acceptance report
for the real-browser blocker and required owner password-entry handoff.

This inventory grants no hosted database, recovery, provider or deployment
authority. It never changes a frozen installation or recovery manifest.
