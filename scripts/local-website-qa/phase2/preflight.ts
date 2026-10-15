// Read-only inspection of the existing, stopped local QA cluster only.
// Never initializes a database, installs SQL or accepts a supplied endpoint.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, realpathSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { createHash, X509Certificate } from "node:crypto";
import { spawnSync } from "node:child_process";
import { checkServerIdentity, type PeerCertificate } from "node:tls";
import postgres from "postgres";
import { qaCredentialPath } from "../guards";
assert.deepEqual(process.argv.slice(2), []);
assert.equal(process.platform, "win32");
const state = JSON.parse(
  readFileSync("test-results/local-website-qa-active.json", "utf8"),
);
assert.equal(state.authVersion, 2);
assert.equal(state.credentialsPath, qaCredentialPath(state.run));
const root = resolve("test-results", "product-acceptance-" + state.run);
assert.equal(state.root, root);
assert.equal(realpathSync(root), root);
const manifest = JSON.parse(readFileSync(join(root, "runtime.json"), "utf8"));
const url = new URL(manifest.connectionString);
assert.equal(manifest.run, state.run);
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.protocol, "postgresql:");
assert.equal(url.username, "aibean_app_login");
assert.equal(url.pathname, "/postgres");
assert(!url.search && !url.hash && /^[a-f0-9]{64}$/.test(url.password));
assert(
  Number(url.port) > 1024 &&
    Number(url.port) < 65536 &&
    ![5432, 6543].includes(Number(url.port)),
);
const sha = (body: string | Buffer) =>
  createHash("sha256").update(body).digest("hex");
const ca = readFileSync(join(root, "fixture-ca.crt"), "utf8");
assert.equal(sha(ca), manifest.caSha256);
const cert = new X509Certificate(ca);
assert(
  Date.parse(cert.validFrom) <= Date.now() &&
    Date.parse(cert.validTo) > Date.now(),
  "Local TLS trust expired; separate safe renewal is required",
);
const cluster = join(root, "cluster");
const config = readFileSync(join(cluster, "postgresql.conf"), "utf8");
assert(
  config.includes("listen_addresses='127.0.0.1'") &&
    config.includes("cluster_name='aibean-acceptance-" + state.run + "'") &&
    config.includes("port=" + url.port),
);
const ctl = resolve(
  "test-results/postgres-validation/portable/pgsql/bin/pg_ctl.exe",
);
const command = (args: string[]) =>
  spawnSync(ctl, args, { stdio: "ignore", windowsHide: true, timeout: 60_000 });
assert.equal(
  command(["-D", cluster, "status"]).status,
  3,
  "Only the already stopped current QA cluster may be inspected",
);
let started = false;
const pg = postgres({
  host: "127.0.0.1",
  port: Number(url.port),
  database: "postgres",
  username: "cluster_admin",
  password: url.password,
  max: 1,
  prepare: false,
  onnotice: () => {},
  ssl: {
    ca,
    rejectUnauthorized: true,
    servername: "localhost",
    checkServerIdentity: (_h: string, peer: PeerCertificate) =>
      checkServerIdentity("127.0.0.1", peer),
  },
});
async function main() {
  assert.equal(
    command([
      "-D",
      cluster,
      "-l",
      join(root, "postgres-phase2-preflight.log"),
      "-w",
      "start",
    ]).status,
    0,
  );
  started = true;
  await pg.begin("read only", async (tx) => {
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
    const inventory =
      await tx`select tablename from pg_tables where schemaname='local_qa_auth' order by tablename`;
    assert.deepEqual(
      inventory.map((t) => t.tablename),
      ["accounts", "mail", "rates", "sessions", "tokens", "version"],
      "Existing local QA schema required; no installation is allowed",
    );
    const [ledger] =
      await tx`select checksum from local_qa_auth.version where id=1`;
    assert.equal(
      ledger.checksum,
      sha(
        readFileSync("src/lib/local-qa-auth/schema.sql", "utf8").replaceAll(
          "\r\n",
          "\n",
        ),
      ),
    );
    const handoff = JSON.parse(readFileSync(state.credentialsPath, "utf8"));
    const accounts =
      await tx`select user_id,email,password_hash,confirmed from local_qa_auth.accounts order by user_id`;
    assert(accounts.length >= 5);
    for (const a of handoff.accounts)
      assert(accounts.some((u) => u.email === a.email && u.confirmed));
    // Only private integrity summaries are persisted. No record bodies are exported.
    const tables =
      await tx`select schemaname,tablename from pg_tables where schemaname in ('public','aibean_private','drizzle') order by schemaname,tablename`;
    const continuity = [];
    for (const table of tables) {
      const rows =
        await tx`select count(*)::int as count,md5(coalesce(string_agg(md5(row_to_json(t)::text),'' order by md5(row_to_json(t)::text)),'')) as digest from ${tx(table.schemaname + "." + table.tablename)} t`;
      continuity.push({
        schema: table.schemaname,
        table: table.tablename,
        ...rows[0],
      });
    }
    writeFileSync(
      join(dirname(state.credentialsPath), "phase2-before-resume.json"),
      JSON.stringify({
        accounts: sha(JSON.stringify(accounts)),
        credentials: sha(JSON.stringify(handoff.accounts)),
        continuity,
        privateEnvironment: sha(readFileSync(".env.local")),
      }),
    );
    writeFileSync(
      "docs/evidence/local-ui-phase2-preflight.json",
      JSON.stringify(
        {
          status: "PASS",
          existingLocalSchemaVerified: true,
          noSchemaInstalled: true,
          localTargetAndTlsVerified: true,
          originalIdentitiesAndPrivateCheckpointPreserved: true,
          registeredAccountsPresent: true,
          scopedApplicationRelations: tables.length,
          recordBodiesExported: false,
          hostedConnections: 0,
          capturedAt: new Date().toISOString(),
        },
        null,
        2,
      ) + "\n",
    );
    console.log(
      "PASS: existing local target, TLS, six-table QA ledger and preserved identities verified; no SQL installation or hosted connection.",
    );
  });
}
void main()
  .catch(() => {
    console.error(
      "Existing local QA preflight failed; no installer or replacement fixture may run. Private details withheld.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await pg.end({ timeout: 5 });
    if (
      started &&
      command(["-D", cluster, "-m", "fast", "-w", "stop"]).status !== 0
    ) {
      console.error("Owned preflight cluster shutdown could not be confirmed");
      process.exitCode = 1;
    }
  });
