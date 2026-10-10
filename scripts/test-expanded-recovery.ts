// Native synthetic validation only. No dotenv, operator credential, CMS profile
// or configurable remote endpoint. Every connection is generated loopback PG17.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  rmSync,
  lstatSync,
  readdirSync,
} from "node:fs";
import { join, resolve, relative, isAbsolute } from "node:path";
import { checkServerIdentity, type PeerCertificate } from "node:tls";
import postgres from "postgres";
import {
  expandedPrivateSnapshot,
  compareExpandedSnapshots,
  expandedDumpArguments,
  validateExpandedToc,
  localPrerequisiteGrants,
  recoverySha,
  applicationRoleContract,
  recoveryDatabaseEnvironment,
  type RecoveryQuery,
} from "./expanded-recovery-scope";

const bin = process.env.PG_TEST_BIN,
  openssl = process.env.PG_TEST_OPENSSL;
assert(bin && openssl, "Native PostgreSQL/OpenSSL test paths required");
const testRoot = resolve(
  "test-results",
  `expanded-recovery-test-${Date.now()}-${randomBytes(6).toString("hex")}`,
);
mkdirSync(testRoot, { recursive: true });
writeFileSync(
  join(testRoot, "owned-synthetic-target"),
  "Synthetic expanded recovery validation only",
);
const secret = randomBytes(32).toString("hex"),
  certificate = join(testRoot, "local.crt"),
  key = join(testRoot, "local.key");
type Instance = { data: string; port: number };
const running: Instance[] = [],
  clients: ReturnType<typeof postgres>[] = [];
let passed = false;
let stage = "native-binary-check";
const envBase: NodeJS.ProcessEnv = { NODE_ENV: "test" };
for (const name of [
  "PATH",
  "Path",
  "SystemRoot",
  "WINDIR",
  "COMSPEC",
  "PATHEXT",
  "USERPROFILE",
  "APPDATA",
  "LOCALAPPDATA",
  "TEMP",
  "TMP",
  "ProgramData",
  "ProgramFiles",
  "HOMEDRIVE",
  "HOMEPATH",
])
  if (process.env[name]) envBase[name] = process.env[name];
const exe = (name: string) =>
  join(bin!, `${name}${process.platform === "win32" ? ".exe" : ""}`);
const run = (file: string, args: string[], env = envBase, input?: Buffer) => {
  const result = spawnSync(file, args, {
    env,
    input,
    windowsHide: true,
    timeout: 60000,
    maxBuffer: 16 * 1024 * 1024,
    stdio: file.includes("pg_ctl") ? "ignore" : "pipe",
  });
  assert.equal(
    result.status,
    0,
    "Synthetic native validation failed; raw diagnostics redacted",
  );
  assert(!result.error);
  return result.stdout || Buffer.alloc(0);
};
const environment = (instance: Instance, readOnly = false) => ({
  ...envBase,
  PGHOST: "127.0.0.1",
  PGPORT: String(instance.port),
  PGDATABASE: "postgres",
  PGUSER: "recovery_operator",
  PGPASSWORD: secret,
  PGSSLMODE: "verify-full",
  PGSSLROOTCERT: certificate,
  PGAPPNAME: "aibean-expanded-isolated-restore",
  PGOPTIONS: readOnly ? "-c default_transaction_read_only=on" : "",
});
async function port() {
  const server = createServer();
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  assert(address && typeof address !== "string");
  const value = address.port;
  await new Promise<void>((done, reject) =>
    server.close((error) => (error ? reject(error) : done())),
  );
  return value;
}
async function instance(name: string) {
  const directory = join(testRoot, name);
  assert(!existsSync(directory));
  mkdirSync(directory);
  const data = join(directory, "data"),
    passwordFile = join(directory, "bootstrap-password.tmp"),
    assignedPort = await port();
  writeFileSync(passwordFile, secret);
  try {
    run(exe("initdb"), [
      "-D",
      data,
      "-U",
      "recovery_operator",
      "--pwfile",
      passwordFile,
      "--auth-host=scram-sha-256",
      "--auth-local=scram-sha-256",
      "--encoding=UTF8",
      "--no-locale",
    ]);
  } finally {
    rmSync(passwordFile);
  }
  const pgPath = (file: string) =>
    file.replaceAll("\\", "/").replaceAll("'", "''");
  writeFileSync(
    join(data, "postgresql.conf"),
    `listen_addresses='127.0.0.1'\nport=${assignedPort}\nssl=on\nssl_cert_file='${pgPath(certificate)}'\nssl_key_file='${pgPath(key)}'\nlog_statement='none'\nlog_min_error_statement='panic'\nlog_min_messages='panic'\n`,
  );
  writeFileSync(
    join(data, "pg_hba.conf"),
    "hostssl all all 127.0.0.1/32 scram-sha-256\nhostnossl all all 127.0.0.1/32 reject\n",
  );
  run(exe("pg_ctl"), [
    "-D",
    data,
    "-l",
    join(directory, "server.log"),
    "-w",
    "-t",
    "15",
    "start",
  ]);
  const value = { data, port: assignedPort };
  running.push(value);
  return value;
}
function connect(instance: Instance) {
  const client = postgres({
    host: "127.0.0.1",
    port: instance.port,
    database: "postgres",
    username: "recovery_operator",
    password: secret,
    max: 1,
    prepare: false,
    ssl: {
      ca: readFileSync(certificate, "utf8"),
      rejectUnauthorized: true,
      servername: "localhost",
      checkServerIdentity: (_host: string, peer: PeerCertificate) =>
        checkServerIdentity("127.0.0.1", peer),
    },
    connection: {
      application_name: "aibean-expanded-isolated-restore",
      timezone: "UTC",
      statement_timeout: 60000,
      lock_timeout: 5000,
    },
    onnotice: () => {},
  });
  clients.push(client);
  return client;
}
const query = (client: { unsafe: (text: string) => PromiseLike<unknown> }) =>
  (async (text: string) =>
    JSON.parse(JSON.stringify(await client.unsafe(text)))) as RecoveryQuery;
async function main() {
  assert(run(exe("pg_dump"), ["--version"]).toString().includes("17.11"));
  stage = "synthetic-tls-generation";
  run(openssl!, [
    "req",
    "-x509",
    "-newkey",
    "rsa:3072",
    "-nodes",
    "-keyout",
    key,
    "-out",
    certificate,
    "-days",
    "1",
    "-subj",
    "/CN=localhost",
    "-addext",
    "subjectAltName=IP:127.0.0.1,DNS:localhost",
  ]);
  const sourceInstance = await instance("source"),
    restoredInstance = await instance("restored");
  const source = connect(sourceInstance),
    restored = connect(restoredInstance);
  stage = "source-synthetic-fixtures";
  await source
    .unsafe(
      `CREATE ROLE postgres NOLOGIN CREATEROLE; CREATE ROLE supabase_admin NOLOGIN; CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE dashboard_user NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS; ALTER DATABASE postgres OWNER TO postgres; CREATE SCHEMA auth AUTHORIZATION postgres; CREATE TABLE auth.users(id uuid PRIMARY KEY); ALTER TABLE auth.users OWNER TO postgres; SET ROLE postgres; CREATE TABLE public."TestUsers" (id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now(),email text UNIQUE,age bigint,name text); ALTER TABLE public."TestUsers" ENABLE ROW LEVEL SECURITY; CREATE POLICY synthetic_read ON public."TestUsers" FOR SELECT TO PUBLIC USING(true); CREATE POLICY synthetic_insert ON public."TestUsers" FOR INSERT TO authenticated,dashboard_user WITH CHECK(true); GRANT ALL ON public."TestUsers" TO anon,authenticated,service_role; GRANT ALL ON SEQUENCE public."TestUsers_id_seq" TO anon,authenticated,service_role; INSERT INTO public."TestUsers"(created_at,email,age,name) VALUES ('2026-01-01T00:00:00Z','synthetic-a@example.invalid',21,'Synthetic A'),('2026-01-01T00:00:00Z','synthetic-b@example.invalid',22,'Synthetic B'); ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role; RESET ROLE;`,
    )
    .simple();
  stage = "source-baseline-installation";
  await source
    .unsafe(
      "SET ROLE postgres; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres,anon,authenticated,service_role; RESET ROLE; SET ROLE supabase_admin; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres,anon,authenticated,service_role; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres,anon,authenticated,service_role; RESET ROLE",
    )
    .simple();
  await source.unsafe("SET ROLE postgres");
  await source
    .unsafe(readFileSync("db/install/reviewed-installation.sql", "utf8"))
    .simple();
  await source
    .unsafe(readFileSync("db/install/testusers-security-proposal.sql", "utf8"))
    .simple();
  await source.unsafe("RESET ROLE");
  await source.unsafe("REVOKE aibean_runtime FROM postgres");
  await source
    .unsafe(
      "CREATE ROLE aibean_app_login NOLOGIN; GRANT aibean_runtime TO aibean_app_login WITH ADMIN FALSE,INHERIT TRUE,SET FALSE",
    )
    .simple();
  let expected: Awaited<ReturnType<typeof expandedPrivateSnapshot>> | undefined,
    archive = Buffer.alloc(0),
    entries = 0;
  stage = "source-snapshot";
  await source.begin(
    "ISOLATION LEVEL REPEATABLE READ READ ONLY",
    async (tx) => {
      await tx
        .unsafe(
          "SET LOCAL timezone='UTC'; SET LOCAL search_path=public,pg_catalog",
        )
        .simple();
      expected = await expandedPrivateSnapshot(query(tx));
      stage = "synthetic-dump";
      const [snapshot] = await query(tx)(
        "SELECT pg_export_snapshot() AS snapshot",
      );
      archive = run(
        exe("pg_dump"),
        expandedDumpArguments(String(snapshot.snapshot)),
        environment(sourceInstance, true),
      );
      stage = "synthetic-toc-validation";
      entries = validateExpandedToc(
        run(exe("pg_restore"), ["--list"], envBase, archive).toString(),
        run(
          exe("pg_restore"),
          ["--schema-only", "--file=-"],
          envBase,
          archive,
        ).toString(),
        expected.catalog,
      );
      compareExpandedSnapshots(
        expected,
        await expandedPrivateSnapshot(query(tx)),
      );
    },
  );
  assert(expected);
  stage = "restore-local-prerequisites";
  await restored
    .unsafe(
      readFileSync(
        "db/recovery/expanded-recovery-local-prerequisites.sql",
        "utf8",
      ),
    )
    .simple();
  const sourceDatabaseEnvironment = await recoveryDatabaseEnvironment(
      query(source),
    ),
    localDatabaseEnvironment = await recoveryDatabaseEnvironment(
      query(restored),
    );
  assert.deepEqual(localDatabaseEnvironment, sourceDatabaseEnvironment);
  stage = "synthetic-restore";
  run(
    exe("pg_restore"),
    [
      "--no-password",
      "--exit-on-error",
      "--single-transaction",
      "--dbname=postgres",
    ],
    environment(restoredInstance),
    archive,
  );
  stage = "schema-default-acl-replay";
  await restored.begin(async (tx) => {
    for (const statement of localPrerequisiteGrants(expected!.catalog))
      await tx.unsafe(statement);
  });
  stage = "private-snapshot-comparison";
  await restored.begin(
    "ISOLATION LEVEL REPEATABLE READ READ ONLY",
    async (tx) => {
      await tx
        .unsafe(
          "SET LOCAL timezone='UTC'; SET LOCAL search_path=public,pg_catalog",
        )
        .simple();
      const observed = await expandedPrivateSnapshot(query(tx));
      compareExpandedSnapshots(expected!, observed);
    },
  );
  for (const role of ["anon", "authenticated"]) {
    await assert.rejects(
      restored.begin("READ ONLY", async (tx) => {
        await tx.unsafe(`SET LOCAL ROLE ${role}`);
        await tx.unsafe('SELECT 1 FROM public."TestUsers" LIMIT 0');
      }),
      (error) => (error as { code?: string }).code === "42501",
    );
  }
  await restored.begin("READ ONLY", async (tx) => {
    await tx.unsafe("SET LOCAL ROLE aibean_app_login");
    assert.equal(
      Number(
        (await query(tx)("SELECT count(*)::int AS count FROM public.users"))[0]
          .count,
      ),
      0,
    );
  });
  assert.deepEqual(
    await applicationRoleContract(query(source), true),
    await applicationRoleContract(query(restored), true),
  );
  await restored.unsafe("GRANT pg_read_all_data TO aibean_app_login");
  await assert.rejects(
    applicationRoleContract(query(restored), true),
    /Unexpected application role membership/,
  );
  await restored.unsafe("REVOKE pg_read_all_data FROM aibean_app_login");
  await restored.begin(async (tx) => {
    await tx.unsafe("SET LOCAL ROLE postgres");
    await tx
      .unsafe(
        "INSERT INTO auth.users(id) VALUES('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa');INSERT INTO public.users(id) VALUES('local-synthetic');INSERT INTO aibean_private.user_identities(auth_user_id,user_id) VALUES('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','local-synthetic')",
      )
      .simple();
  });
  let bodyQueriesBeforeRejection = 0;
  await assert.rejects(
    expandedPrivateSnapshot(async (text) => {
      if (/AS record|row_to_json\(t\)/.test(text)) bodyQueriesBeforeRejection++;
      return query(restored)(text);
    }),
    /Nonempty mappings/,
  );
  assert.equal(
    bodyQueriesBeforeRejection,
    0,
    "Nonempty mapping must stop before any record-body query",
  );
  await assert.rejects(
    restored
      .unsafe(
        readFileSync(
          "db/recovery/expanded-recovery-local-prerequisites.sql",
          "utf8",
        ),
      )
      .simple(),
    (error) => (error as { code?: string }).code === "P0001",
  );
  // Native snapshot/TOC/restore success is synthetic evidence only, never hosted recovery PASS.
  const result = {
    capturedAt: new Date().toISOString(),
    serverVersion: localDatabaseEnvironment.server_version,
    result: "PASS_SYNTHETIC_NATIVE_RECOVERY",
    hostedExpandedExport: "NOT EXECUTED",
    hostedRestoration: "NOT EXECUTED",
    selectedTables: 18,
    selectedSequences: 2,
    archiveEntries: entries,
    archiveBytes: archive.length,
    syntheticArchiveSha256: recoverySha(archive),
    allCatalogOwnersAclDefaultGrantsRlsPoliciesMatched: true,
    allSyntheticDataAndSequenceStateMatched: true,
    originalMigrationHistoryMatched: true,
    sourceReadOnlySnapshotUnchanged: true,
    browserRoleAccessDenied: true,
    runtimeFixtureReadVerified: true,
    runtimeGroupFlagsMembershipsAndRestrictionsMatched: true,
    elevatedMembershipDriftRejected: true,
    nonemptyIdentityMappingRejected: true,
    nonemptyIdentityMappingStoppedBeforeBodyQueries: true,
    nonemptyTargetPrerequisitesRejected: true,
    realHostedAuthRecovered: false,
    sourceDatabaseEnvironment,
    localDatabaseEnvironment,
    localDatabaseOwnerSemanticsMatched: true,
    managedEnvironmentRecreated: false,
  };
  writeFileSync(
    "docs/evidence/supabase-expanded-recovery-native-synthetic.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result));
  archive.fill(0);
  passed = true;
}
main()
  .catch((error) => {
    console.error(
      JSON.stringify({
        failed: true,
        stage,
        code: error?.code || error?.cause?.code || "REDACTED",
        comparison:
          /^Private [A-Za-z]+ comparison failed/.exec(
            String(error?.message),
          )?.[0] || "Unverified",
        diagnostics: "Private details redacted",
      }),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled(
      clients.map((client) => client.end({ timeout: 5 })),
    );
    for (const instance of running)
      run(exe("pg_ctl"), [
        "-D",
        instance.data,
        "-w",
        "-t",
        "15",
        "-m",
        "fast",
        "stop",
      ]);
    if (passed) {
      const workspaceTestRoot = resolve("test-results"),
        part = relative(workspaceTestRoot, testRoot);
      assert(
        part &&
          !part.startsWith("..") &&
          !isAbsolute(part) &&
          /^expanded-recovery-test-[0-9]+-[a-f0-9]{12}$/.test(part),
      );
      assert(existsSync(join(testRoot, "owned-synthetic-target")));
      const rejectLinks = (directory: string) => {
        assert(!lstatSync(directory).isSymbolicLink());
        for (const name of readdirSync(directory)) {
          const path = join(directory, name);
          assert(!lstatSync(path).isSymbolicLink());
          if (lstatSync(path).isDirectory()) rejectLinks(path);
        }
      };
      rejectLinks(testRoot);
      rmSync(testRoot, { recursive: true, force: false });
    }
  });
