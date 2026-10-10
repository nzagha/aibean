// Native synthetic validation only. No dotenv, operator credential, existing CMS profile
// or configurable remote endpoint. Every connection is generated loopback PG17.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
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
  recoverySha,
  type RecoveryQuery,
} from "./expanded-recovery-scope";
import {
  executePreparedRecovery,
  inspectRecoveryPackage,
  verifyLocalRecoveryTarget,
  assertLocalRecoveryIdentity,
  type PreparedRecoveryContext,
} from "./execute-expanded-recovery";

const bin = process.env.PG_TEST_BIN,
  openssl = process.env.PG_TEST_OPENSSL;
assert(bin && openssl, "Native PostgreSQL/OpenSSL test paths required");
const testRoot = resolve(
  tmpdir(),
  "aibean-synthetic-recovery-" + randomBytes(16).toString("hex"),
);
const powershell = process.env.PG_TEST_POWERSHELL;
assert(
  powershell && process.platform === "win32",
  "Windows synthetic CMS test runtime required",
);
const secret = randomBytes(32).toString("hex"),
  certificate = join(testRoot, "local.crt"),
  key = join(testRoot, "local.key");
type Instance = { data: string; port: number };
const running: Instance[] = [],
  clients: ReturnType<typeof postgres>[] = [];
const verifiedPeers = new Set<number>();
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
  if (result.status !== 0) {
    const lifecycleStage =
      /Private expanded recovery lifecycle failed at ([a-z-]+);/.exec(
        result.stderr?.toString() || "",
      )?.[1];
    if (lifecycleStage)
      console.error(
        JSON.stringify({ syntheticLifecycleFailure: lifecycleStage }),
      );
  }
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
function connect(instance: Instance, username = "recovery_operator") {
  const client = postgres({
    host: "127.0.0.1",
    port: instance.port,
    database: "postgres",
    username,
    password: secret,
    max: 1,
    prepare: false,
    ssl: {
      ca: readFileSync(certificate, "utf8"),
      rejectUnauthorized: true,
      servername: "localhost",
      checkServerIdentity: (_host: string, peer: PeerCertificate) => {
        const error = checkServerIdentity("127.0.0.1", peer);
        if (!error) verifiedPeers.add(instance.port);
        return error;
      },
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
  stage = "synthetic-private-preparation";
  assert.equal(
    run(powershell!, [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-File",
      resolve("scripts/prepare-synthetic-recovery-test.ps1"),
      "-Root",
      testRoot,
      "-PostgresBin",
      bin!,
    ]).toString(),
    "OK",
  );
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
    identityInstance = await instance("identity");
  const source = connect(sourceInstance),
    identityClient = connect(identityInstance);
  stage = "source-synthetic-fixtures";
  await source
    .unsafe(
      `CREATE ROLE postgres NOLOGIN CREATEROLE; CREATE ROLE supabase_admin NOLOGIN; CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE dashboard_user NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS; ALTER DATABASE postgres OWNER TO postgres; CREATE SCHEMA auth AUTHORIZATION postgres; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE TABLE auth.identities(id uuid PRIMARY KEY); ALTER TABLE auth.users OWNER TO postgres; ALTER TABLE auth.identities OWNER TO postgres; SET ROLE postgres; CREATE TABLE public."TestUsers" (id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now(),email text UNIQUE,age bigint,name text); ALTER TABLE public."TestUsers" ENABLE ROW LEVEL SECURITY; CREATE POLICY synthetic_read ON public."TestUsers" FOR SELECT TO PUBLIC USING(true); CREATE POLICY synthetic_insert ON public."TestUsers" FOR INSERT TO authenticated,dashboard_user WITH CHECK(true); GRANT ALL ON public."TestUsers" TO anon,authenticated,service_role; GRANT ALL ON SEQUENCE public."TestUsers_id_seq" TO anon,authenticated,service_role; INSERT INTO public."TestUsers"(created_at,email,age,name) VALUES ('2026-01-01T00:00:00Z','synthetic-a@example.invalid',21,'Synthetic A'),('2026-01-01T00:00:00Z','synthetic-b@example.invalid',22,'Synthetic B'); ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role; RESET ROLE;`,
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
      "CREATE ROLE aibean_app_login LOGIN; GRANT aibean_runtime TO aibean_app_login WITH ADMIN FALSE,INHERIT TRUE,SET FALSE",
    )
    .simple();
  stage = "exact-executor-address-regression";
  const [address] = await query(identityClient)(
    "SELECT inet_server_addr()::text AS original,host(inet_server_addr()) AS normalized",
  );
  assert.deepEqual(address, {
    original: "127.0.0.1/32",
    normalized: "127.0.0.1",
  });
  await verifyLocalRecoveryTarget(query(identityClient), () => true);
  const valid = {
    role: "recovery_operator",
    database: "postgres",
    host: "127.0.0.1",
    version: "17.11",
    tls: true,
  };
  for (const mismatch of [
    { host: "192.0.2.1" },
    { database: "other" },
    { role: "postgres" },
    { tls: false },
  ])
    assert.throws(() =>
      assertLocalRecoveryIdentity({ ...valid, ...mismatch }, true),
    );
  await identityClient.unsafe("CREATE DATABASE incorrect_identity");
  await identityClient.unsafe("CREATE ROLE incorrect_operator LOGIN");
  const identityMismatch = connect(identityInstance);
  await identityMismatch.unsafe("SET ROLE incorrect_operator");
  await assert.rejects(
    verifyLocalRecoveryTarget(query(identityMismatch), () => true),
  );
  // Test a real incorrect database over verified TLS, using the generated fixture credentials.
  const wrongDatabase = postgres({
    host: "127.0.0.1",
    port: identityInstance.port,
    database: "incorrect_identity",
    username: "recovery_operator",
    password: secret,
    max: 1,
    ssl: {
      ca: readFileSync(certificate, "utf8"),
      rejectUnauthorized: true,
      servername: "localhost",
      checkServerIdentity: (_host: string, peer: PeerCertificate) =>
        checkServerIdentity("127.0.0.1", peer),
    },
    onnotice: () => {},
  });
  clients.push(wrongDatabase);
  await assert.rejects(
    verifyLocalRecoveryTarget(query(wrongDatabase), () => true),
  );

  stage = "synthetic-cms-guards";
  const bridge = (file: string, request: object) =>
    run(
      powershell!,
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-File",
        resolve(file),
        "-Root",
        testRoot,
      ],
      envBase,
      Buffer.from(JSON.stringify(request)),
    ).toString();
  const crypto = (request: object) =>
    bridge("scripts/private-backup-crypto.ps1", request);
  const lifecycle = (request: object) =>
    bridge("scripts/private-expanded-recovery.ps1", request);
  assert.equal(crypto({ mode: "check" }), "OK");
  assert.equal(lifecycle({ mode: "check" }), "OK");
  const profile = JSON.parse(
    readFileSync(join(testRoot, "preparation.json"), "utf8").replace(
      /^\uFEFF/,
      "",
    ),
  ) as PreparedRecoveryContext["profile"];
  const originalPayload = Buffer.from(
    "Synthetic original backup sentinel only",
  );
  assert.equal(
    crypto({
      mode: "encrypt",
      name: "synthetic-original.cms",
      base64: originalPayload.toString("base64"),
    }),
    "OK",
  );
  const originalHash = recoverySha(
    readFileSync(join(profile.backups, "synthetic-original.cms")),
  );
  assert.equal(
    recoverySha(
      Buffer.from(
        crypto({ mode: "decrypt", name: "synthetic-original.cms" }),
        "base64",
      ),
    ),
    recoverySha(originalPayload),
  );
  originalPayload.fill(0);
  const envFile = join(testRoot, "synthetic-environment.txt");
  writeFileSync(envFile, "synthetic environment unchanged");
  const envHash = recoverySha(readFileSync(envFile));
  const expected = await expandedPrivateSnapshot(query(source));
  const approvedSha = inspectRecoveryPackage().packageSha256;
  // Use a real synthetic postgres login, rather than SET ROLE from a different
  // backend owner (whose pg_stat_ssl row is hidden from a non-superuser role).
  await source.unsafe(`ALTER ROLE postgres LOGIN PASSWORD '${secret}'`);
  const operationSource = connect(sourceInstance, "postgres");
  await operationSource.unsafe("SELECT 1");
  await source.unsafe("SET ROLE postgres");
  let bodyQueries = 0;
  const context: PreparedRecoveryContext = {
    approvedSha,
    source: operationSource,
    sourceEnv: { ...environment(sourceInstance, true), PGUSER: "postgres" },
    sourceHostnameVerified: () => verifiedPeers.has(sourceInstance.port),
    profile,
    privateRoot: testRoot,
    openssl: openssl!,
    original: {
      dataDigest: expected.originalTestUsersDigest,
      preserved: [{ name: "synthetic-original.cms", hash: originalHash }],
    },
    environmentUnchanged: () => recoverySha(readFileSync(envFile)) === envHash,
    lifecycle,
    crypto,
    native: (_profile, name, args, env, input) =>
      run(exe(name), args, env, input),
    onSourceQuery: (text) => {
      if (/AS record|row_to_json\(t\)/.test(text)) bodyQueries++;
    },
  };
  const preserved = () =>
    assert.equal(
      recoverySha(
        readFileSync(join(profile.backups, "synthetic-original.cms")),
      ),
      originalHash,
    );
  stage = "exact-executor-history-guard";
  await source.unsafe(
    "UPDATE drizzle.__drizzle_migrations SET hash='synthetic-drift' WHERE created_at=1791247215670",
  );
  await assert.rejects(executePreparedRecovery(context), (error: unknown) => {
    const e = error as {
      message: string;
      code?: string;
      actual?: unknown;
      expected?: unknown;
    };
    if (!/Migration history drift/.test(e.message)) {
      console.error(
        JSON.stringify({
          syntheticPreflightMismatch: e.message.split("\n")[0],
          code: e.code,
          actual: e.actual,
          expected: e.expected,
        }),
      );
    }
    return /Migration history drift/.test(e.message);
  });
  assert.equal(bodyQueries, 0);
  preserved();
  await source.unsafe(
    "UPDATE drizzle.__drizzle_migrations SET hash='b58134b31944656eda45a6ba929fcdb66a5ec4e66e01a8cfd3d8d9b16d4f4468' WHERE created_at=1791247215670",
  );
  stage = "exact-executor-scope-guard";
  await source.unsafe(
    "CREATE TABLE public.unexpected_source_object(id integer)",
  );
  await assert.rejects(
    executePreparedRecovery(context),
    /Unexpected recovery relation scope/,
  );
  assert.equal(bodyQueries, 0);
  preserved();
  await source.unsafe("DROP TABLE public.unexpected_source_object");
  stage = "exact-executor-installation-history-guard";
  await source.unsafe(
    "UPDATE aibean_private.installations SET sql_sha256='synthetic-drift'",
  );
  await assert.rejects(
    executePreparedRecovery(context),
    /Installation history drift/,
  );
  assert.equal(bodyQueries, 0);
  preserved();
  await source.unsafe(
    "UPDATE aibean_private.installations SET sql_sha256='eea0e7309e13440224ca80030a367afc76bc99c08b2027fc722b8fa2b388277a'",
  );
  stage = "exact-executor-local-preparation-failure";
  let failedTarget = "";
  await assert.rejects(
    executePreparedRecovery({
      ...context,
      lifecycle: (request) => {
        const r = request as { mode: string; target?: string };
        const result = lifecycle(request);
        if (r.mode === "prepare-target") failedTarget = JSON.parse(result).name;
        if (r.mode === "start-target")
          throw new Error("Synthetic local preparation failure");
        return result;
      },
    }),
    /Synthetic local preparation failure/,
  );
  assert.equal(bodyQueries, 0);
  preserved();
  assert(
    failedTarget,
    "Synthetic negative test never reached target preparation",
  );
  const failedDirectory = join(testRoot, failedTarget);
  assert(existsSync(join(failedDirectory, "target.json")));
  assert(!existsSync(join(failedDirectory, "data", "postmaster.pid")));
  assert(!existsSync(join(failedDirectory, "completed.json")));
  const failedMetadataHash = recoverySha(
    readFileSync(join(failedDirectory, "target.json")),
  );
  assert.throws(() =>
    lifecycle({
      mode: "dispose-passed-target",
      target: failedTarget,
      approvedPackage: approvedSha,
      validationPassed: true,
    }),
  );
  assert.equal(
    recoverySha(readFileSync(join(failedDirectory, "target.json"))),
    failedMetadataHash,
  );
  stage = "exact-executor-synthetic-full-workflow";
  const result = await executePreparedRecovery(context);
  assert.equal(result.recoveryGate, "PASS");
  assert(bodyQueries > 0);
  preserved();
  assert.equal(
    recoverySha(readFileSync(join(failedDirectory, "target.json"))),
    failedMetadataHash,
  );
  assert(!existsSync(join(failedDirectory, "data", "postmaster.pid")));
  assert.deepEqual(expected, await expandedPrivateSnapshot(query(source)));
  const evidence = {
    capturedAt: new Date().toISOString(),
    result: "PASS_SYNTHETIC_EXACT_EXECUTOR",
    packageSha256: approvedSha,
    serverVersion: "17.11",
    selectedTables: 18,
    selectedSequences: 2,
    originalInetText: String(address.original),
    normalizedHost: String(address.normalized),
    exactExecutorIdentityQueryPassed: true,
    nonLoopbackRejected: true,
    realWrongDatabaseRejected: true,
    realWrongOperatorRejected: true,
    historyScopeInstallationAndLocalFailureBeforeBodyCapture: true,
    nativeDumpEncryptedCmsDecryptionAndRestorePassed: true,
    originalSyntheticBackupPreserved: true,
    failedSyntheticTargetStoppedAndPreserved: true,
    allCatalogOwnersAclRlsPoliciesDataSequencesAndLedgersMatched: true,
    sourceReadOnlyContinuityPassed: true,
    successfulSyntheticTargetDisposed: true,
    hostedConnections: 0,
    hostedExport: "NOT EXECUTED",
    realRetainedTargetTouched: false,
  };
  writeFileSync(
    "docs/evidence/supabase-expanded-recovery-correction-native.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(JSON.stringify(evidence));
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
      assert.equal(
        run(powershell!, [
          "-NoLogo",
          "-NoProfile",
          "-NonInteractive",
          "-File",
          resolve("scripts/prepare-synthetic-recovery-test.ps1"),
          "-Root",
          testRoot,
          "-Mode",
          "cleanup",
        ]).toString(),
        "OK",
      );
      const part = relative(resolve(tmpdir()), testRoot);
      assert(
        !part.startsWith("..") &&
          !isAbsolute(part) &&
          /^aibean-synthetic-recovery-[a-f0-9]{32}$/.test(part),
      );
      assert(existsSync(join(testRoot, "owned-synthetic-test.json")));
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
