import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import postgres from "postgres";
import { qaDatabaseConfig } from "../../../src/lib/local-qa-auth/config";
import { qaCredentialPath } from "../guards";
const mode = process.argv[2];
assert(["--initial-resume", "--checkpoint", "--verify-restart"].includes(mode));
assert.equal(process.argv.length, 3);
const state = JSON.parse(
  readFileSync("test-results/local-website-qa-active.json", "utf8"),
);
assert.equal(state.authVersion, 2);
assert.equal(state.credentialsPath, qaCredentialPath(state.run));
const manifest = JSON.parse(
  readFileSync(join(state.root, "runtime.json"), "utf8"),
);
const config = qaDatabaseConfig({
  NODE_ENV: "development",
  AIBEAN_LOCAL_QA_AUTH: "1",
  AIBEAN_LOCAL_ACCEPTANCE_RUN: state.run,
  DATABASE_URL: manifest.connectionString,
})!;
// Ledger continuity is an operator observation, not an application query.
// The runtime correctly cannot read every private installation ledger.
const observerUrl = new URL(config.connectionString);
observerUrl.username = "cluster_admin";
const pg = postgres(observerUrl.toString(), {
  ...config.options,
  max: 1,
  onnotice: () => {},
});
const sha = (body: string | Buffer) =>
  createHash("sha256").update(body).digest("hex");
let stage = "snapshot";
async function main() {
  const handoff = JSON.parse(readFileSync(state.credentialsPath, "utf8"));
  const snapshot = await pg.begin("read only", async (tx) => {
    const [identity] =
      await tx`select current_database() as db,current_user as actor,host(inet_server_addr()) as host,current_setting('cluster_name') as cluster,(select ssl from pg_stat_ssl where pid=pg_backend_pid()) as tls`;
    assert.deepEqual(
      { ...identity },
      {
        db: "postgres",
        actor: "cluster_admin",
        host: "127.0.0.1",
        cluster: "aibean-acceptance-" + state.run,
        tls: true,
      },
    );
    const accounts =
      await tx`select user_id,email,password_hash,confirmed from local_qa_auth.accounts order by user_id`;
    const tables =
      await tx`select schemaname,tablename from pg_tables where schemaname in ('public','aibean_private','drizzle') order by schemaname,tablename`;
    const continuity = [];
    for (const table of tables) {
      stage = "read-scope-table:" + table.schemaname + "." + table.tablename;
      const [row] =
        await tx`select count(*)::int as count,md5(coalesce(string_agg(md5(row_to_json(t)::text),'' order by md5(row_to_json(t)::text)),'')) as digest from ${tx(table.schemaname + "." + table.tablename)} t`;
      continuity.push({
        schema: table.schemaname,
        table: table.tablename,
        ...row,
      });
    }
    return {
      accounts: sha(JSON.stringify(accounts)),
      credentials: sha(JSON.stringify(handoff.accounts)),
      continuity,
      privateEnvironment: sha(readFileSync(".env.local")),
    };
  });
  const privatePath = join(
    dirname(state.credentialsPath),
    mode === "--initial-resume"
      ? "phase2-before-resume.json"
      : "phase2-before-restart.json",
  );
  if (mode === "--checkpoint") {
    writeFileSync(privatePath, JSON.stringify(snapshot));
    console.log(
      "Private local continuity checkpoint saved; no records or hashes disclosed.",
    );
    return;
  }
  stage = "compare-private-checkpoint";
  assert.deepEqual(snapshot, JSON.parse(readFileSync(privatePath, "utf8")));
  const source = join(
    state.root,
    "source-account-v2-" + state.sourceGeneration + "-user",
  );
  assert.equal(
    sha(readFileSync(join(source, "src/lib/local-qa-auth/core.ts"))),
    sha(readFileSync("src/lib/local-qa-auth/core.ts")),
  );
  const report = {
    status: "PASS",
    capturedAt: new Date().toISOString(),
    registeredIdentitiesAndHashesPreserved: true,
    fourCredentialValuesPreserved: true,
    applicationRecordsAndLedgersPreserved: true,
    applicationRelationsChecked: snapshot.continuity.length,
    privateEnvironmentUnchanged: true,
    currentSourceLoaded: true,
    hostedConnections: 0,
  };
  const out =
    mode === "--initial-resume"
      ? "docs/evidence/local-ui-phase2-initial-resume.json"
      : "docs/evidence/local-ui-phase2-restart.json";
  writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
}
void main()
  .catch((error) => {
    const code = /^[0-9A-Z]{5}$/.test(error?.code || "")
      ? error.code
      : "ASSERTION_OR_LOCAL_SETUP";
    const report = {
      status: "FAIL",
      stage,
      code,
      privateValuesDisclosed: false,
      hostedConnections: 0,
    };
    writeFileSync(
      "docs/evidence/local-ui-phase2-observer-failure.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    console.error(JSON.stringify(report));
    process.exitCode = 1;
  })
  .finally(() => pg.end({ timeout: 5 }));
