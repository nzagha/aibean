// Local fixture only: permission denial and deliberate transaction rollback.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { localAcceptanceConfig } from "../../src/lib/db/local-acceptance-config";

const state = JSON.parse(
  readFileSync("test-results/local-website-qa-active.json", "utf8"),
);
assert(/^[a-f0-9]{32}$/.test(state.run));
const manifest = JSON.parse(
  readFileSync(join(state.root, "runtime.json"), "utf8"),
);
const cfg = localAcceptanceConfig({
  NODE_ENV: "development",
  AIBEAN_LOCAL_ACCEPTANCE_RUN: state.run,
  DATABASE_URL: manifest.connectionString,
});
assert(cfg);
const pg = postgres(cfg.connectionString, {
  ...cfg.options,
  onnotice: () => {},
});
const checks: { check: string; status: string }[] = [];
async function main() {
  const [identity] =
    await pg`select current_user as role, current_database() as database, host(inet_server_addr()) as host, current_setting('cluster_name') as cluster`;
  assert.equal(identity.role, "aibean_runtime");
  assert.equal(identity.database, "postgres");
  assert.equal(identity.host, "127.0.0.1");
  assert.equal(identity.cluster, "aibean-acceptance-" + state.run);
  checks.push({
    check: "Exact newly created restricted local runtime target",
    status: "PASS",
  });
  const before =
    await pg`select id, is_admin, is_creator from public.users order by id`;
  assert.equal(before.length, 6);
  for (const column of ["is_admin", "is_creator"]) {
    await assert.rejects(
      pg.begin(async (tx) => {
        await tx.unsafe(`update public.users set ${column} = true`);
      }),
      (e: unknown) => (e as { code?: string }).code === "42501",
    );
    checks.push({
      check: "Restricted runtime cannot assign protected " + column,
      status: "PASS",
    });
  }
  assert.deepEqual(
    await pg`select id, is_admin, is_creator from public.users order by id`,
    before,
  );
  checks.push({
    check: "Protected capability values unchanged after denied writes",
    status: "PASS",
  });
  const original =
    await pg`select id, name, status from public.tools where slug = 'acceptance-tool-1'`;
  assert.equal(original.length, 1);
  await assert.rejects(
    pg.begin(async (tx) => {
      await tx`update public.tools set name = 'Deliberate synthetic rollback marker' where id = ${original[0].id}`;
      throw Error("LOCAL_SYNTHETIC_ROLLBACK");
    }),
    /LOCAL_SYNTHETIC_ROLLBACK/,
  );
  assert.deepEqual(
    await pg`select id, name, status from public.tools where slug = 'acceptance-tool-1'`,
    original,
  );
  checks.push({
    check: "Native failed transaction rolls back Tool mutation completely",
    status: "PASS",
  });
}
void main()
  .catch(() => {
    checks.push({
      check: "Native local verification failed; private details withheld",
      status: "FAIL",
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await pg.end({ timeout: 5 });
    const report = {
      capturedAt: new Date().toISOString(),
      target: "ISOLATED_NATIVE_POSTGRESQL_17_ONLY",
      hostedConnections: 0,
      checks,
    };
    writeFileSync(
      "docs/evidence/local-website-native-qa.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report));
  });
