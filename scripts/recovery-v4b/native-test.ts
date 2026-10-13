// Native synthetic validation only. No dotenv, operator credential, existing CMS profile
// or configurable remote endpoint. Every connection is generated loopback PG17.
import assert from "node:assert/strict";
import { expandedPrivateSnapshot as originalFoundationSnapshot } from "../expanded-recovery-scope";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  existsSync,
  rmSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { checkServerIdentity, type PeerCertificate } from "node:tls";
import postgres from "postgres";
import {
  expandedPrivateSnapshot as captureSnapshot,
  recoverySha,
  expandedDumpArguments,
  compareExpandedSnapshots,
  type RecoveryQuery,
} from "./scope";
import {
  executePreparedRecovery,
  inspectRecoveryPackage,
  verifyLocalRecoveryTarget,
  assertLocalRecoveryIdentity,
  type PreparedRecoveryContext,
  native as productionNative,
  pgEnvironment,
} from "./execute";
import {
  exportOperations,
  safeRecoveryDiagnostic,
  type ExportOperation,
} from "./diagnostics";
import { expandedPrivateSnapshot as priorSnapshot } from "../recovery-v4a/scope";
import { inspectPriorCheckpoint } from "./predecessor";
let syntheticRecords = false;
const expandedPrivateSnapshot = (q: RecoveryQuery) =>
  captureSnapshot(q, syntheticRecords);

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
      `CREATE ROLE postgres NOLOGIN CREATEROLE; CREATE ROLE supabase_admin NOLOGIN; CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE dashboard_user NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS; ALTER DATABASE postgres OWNER TO postgres; CREATE SCHEMA auth AUTHORIZATION postgres; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE TABLE auth.identities(id uuid PRIMARY KEY); ALTER TABLE auth.users OWNER TO postgres; ALTER TABLE auth.identities OWNER TO postgres; SET ROLE postgres; CREATE TABLE public."TestUsers" (id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now(),email text UNIQUE,age bigint,name text); ALTER TABLE public."TestUsers" ENABLE ROW LEVEL SECURITY; CREATE POLICY "Enable read access for all users" ON public."TestUsers" FOR SELECT TO PUBLIC USING(true); CREATE POLICY "Enable insert for authenticated users only" ON public."TestUsers" FOR INSERT TO authenticated,dashboard_user WITH CHECK(true); GRANT ALL ON public."TestUsers" TO anon,authenticated,service_role; GRANT ALL ON SEQUENCE public."TestUsers_id_seq" TO anon,authenticated,service_role; INSERT INTO public."TestUsers"(created_at,email,age,name) VALUES ('2026-01-01T00:00:00Z','synthetic-a@example.invalid',21,'Synthetic A'),('2026-01-01T00:00:00Z','synthetic-b@example.invalid',22,'Synthetic B'); ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role; RESET ROLE;`,
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
  const historicalCrypto = (request: object) =>
    bridge("scripts/private-backup-crypto.ps1", request);
  const crypto = (request: object) =>
    bridge("scripts/recovery-v4b/private-crypto.ps1", request);
  const lifecycle = (request: object) =>
    bridge("scripts/recovery-v4b/private-lifecycle.ps1", request);
  const approvedSha = inspectRecoveryPackage().packageSha256;
  const namespace = JSON.parse(
    lifecycle({ mode: "prepare-namespace", approvedPackage: approvedSha }),
  );
  assert.equal(crypto({ mode: "check" }), "OK");
  assert.equal(lifecycle({ mode: "check" }), "OK");
  const profile = JSON.parse(
    readFileSync(join(testRoot, "preparation.json"), "utf8").replace(
      /^\uFEFF/,
      "",
    ),
  ) as PreparedRecoveryContext["profile"];
  profile.historicalBackups = profile.backups;
  profile.backups = namespace.backups;
  const originalPayload = Buffer.from(
    "Synthetic original backup sentinel only",
  );
  assert.equal(
    historicalCrypto({
      mode: "encrypt",
      name: "synthetic-original.cms",
      base64: originalPayload.toString("base64"),
    }),
    "OK",
  );
  const originalHash = recoverySha(
    readFileSync(join(profile.historicalBackups, "synthetic-original.cms")),
  );
  assert.equal(
    recoverySha(
      Buffer.from(
        historicalCrypto({ mode: "decrypt", name: "synthetic-original.cms" }),
        "base64",
      ),
    ),
    recoverySha(originalPayload),
  );
  originalPayload.fill(0);
  const v3Payload = Buffer.from("Synthetic v3 archive sentinel");
  assert.equal(
    historicalCrypto({
      mode: "encrypt",
      name: "synthetic-v3.cms",
      base64: v3Payload.toString("base64"),
    }),
    "OK",
  );
  v3Payload.fill(0);
  const historicalMarkers = [
    join(testRoot, "preparation.json"),
    join(profile.historicalBackups, "synthetic-v3.cms"),
  ];
  for (let i = 0; i < 2; i++) {
    const d = join(
      testRoot,
      "ExpandedRecovery-" + randomBytes(16).toString("hex"),
    );
    mkdirSync(d);
    const f = join(d, "target.json");
    const data = join(d, "data");
    mkdirSync(data);
    writeFileSync(
      f,
      JSON.stringify({
        synthetic: true,
        stopped: true,
        sourceProject: "yfknxidgphhepdtwazhn",
        host: "127.0.0.1",
        database: "postgres",
        role: "recovery_operator",
        data,
        ca: certificate,
      }),
    );
    historicalMarkers.push(f);
  }
  const historyHashes = historicalMarkers.map((path) => ({
    path,
    hash: recoverySha(readFileSync(path)),
  }));
  const envFile = join(testRoot, "synthetic-environment.txt");
  writeFileSync(envFile, "synthetic environment unchanged");
  const envHash = recoverySha(readFileSync(envFile));
  const foundationReference = await originalFoundationSnapshot(query(source));
  await source.unsafe("SET ROLE postgres");
  await source.unsafe(
    `SELECT set_config('aibean.review_install_sha256','5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca',false)`,
  );
  await source
    .unsafe(readFileSync("db/proposals/admin-review-v1.sql", "utf8"))
    .simple();
  await source.unsafe("RESET ROLE");
  const priorCapture = await priorSnapshot(query(source));
  const priorLifecycle = (r: object) =>
    bridge("scripts/recovery-v4a/private-lifecycle.ps1", r);
  const priorCrypto = (r: object) =>
    bridge("scripts/recovery-v4a/private-crypto.ps1", r);
  const priorSha =
    "cafbf6932c2395cf1d9c5b889cac86ab67cef6b333e3fd8d12cb8c351bdaaa91";
  const priorNamespace = JSON.parse(
    priorLifecycle({ mode: "prepare-namespace", approvedPackage: priorSha }),
  );
  priorLifecycle({
    mode: "prepare-target",
    approvedPackage: priorSha,
    openssl: openssl!,
  });
  // A native 24-table synthetic predecessor checkpoint, never the real private backup.
  const priorEnv = pgEnvironment(
    "127.0.0.1",
    sourceInstance.port,
    "recovery_operator",
    secret,
    certificate,
    true,
  );
  const priorArgs = [
    "--no-password",
    "--format=custom",
    "--no-large-objects",
    ...Object.keys(priorCapture.counts).map(
      (n) =>
        "--table=" +
        n
          .split(".")
          .map((p) => '"' + p + '"')
          .join("."),
    ),
    ...["public.TestUsers_id_seq", "drizzle.__drizzle_migrations_id_seq"].map(
      (n) =>
        "--table=" +
        n
          .split(".")
          .map((p) => '"' + p + '"')
          .join("."),
    ),
  ];
  const priorArchive = productionNative(
    profile,
    "pg_dump",
    priorArgs,
    priorEnv,
  );
  const priorArchiveHash = recoverySha(priorArchive);
  priorCrypto({
    mode: "encrypt",
    name: "v4a-application-synthetic.cms",
    base64: priorArchive.toString("base64"),
  });
  priorCrypto({
    mode: "encrypt",
    name: "v4a-metadata-synthetic.cms",
    base64: Buffer.from(
      JSON.stringify({
        version: 4,
        sourceProject: "yfknxidgphhepdtwazhn",
        sourceDatabase: "postgres",
        packageSha256: priorSha,
        archiveSha256: priorArchiveHash,
        capture: priorCapture,
      }),
    ).toString("base64"),
  });
  writeFileSync(
    join(priorNamespace.backups, "v4a-receipt-synthetic.json"),
    JSON.stringify({
      version: 4,
      namespace: "v4a",
      status: "PASS",
      sourceProject: "yfknxidgphhepdtwazhn",
      sourceDatabase: "postgres",
      packageSha256: priorSha,
      targetStoppedRetained: true,
      archiveName: "v4a-application-synthetic.cms",
      metadataName: "v4a-metadata-synthetic.cms",
      archiveSha256: priorArchiveHash,
      ciphertextSha256: recoverySha(
        readFileSync(
          join(priorNamespace.backups, "v4a-application-synthetic.cms"),
        ),
      ),
      metadataCiphertextSha256: recoverySha(
        readFileSync(
          join(priorNamespace.backups, "v4a-metadata-synthetic.cms"),
        ),
      ),
    }),
  );
  priorArchive.fill(0);
  const priorReference = {
    recoveryGate: "PASS",
    packageSha256: priorSha,
    selectedTables: 24,
    selectedSequences: 2,
    archiveEntries: 195,
    archiveSha256: priorArchiveHash,
    encryptedArchiveSha256: recoverySha(
      readFileSync(
        join(priorNamespace.backups, "v4a-application-synthetic.cms"),
      ),
    ),
    encryptedMetadataSha256: recoverySha(
      readFileSync(join(priorNamespace.backups, "v4a-metadata-synthetic.cms")),
    ),
  };
  const prior = inspectPriorCheckpoint(
    testRoot,
    bridge,
    (bytes) =>
      productionNative(
        profile,
        "pg_restore",
        ["--list"],
        envBase,
        bytes,
      ).toString("utf8"),
    priorReference,
  );
  assert.throws(() =>
    inspectPriorCheckpoint(
      testRoot,
      bridge,
      () => {
        throw Error("Archive inspection must not begin on reference drift");
      },
      { ...priorReference, encryptedArchiveSha256: "0".repeat(64) },
    ),
  );
  await source.unsafe("SET ROLE postgres");
  await source.unsafe(
    "SELECT set_config('aibean.operations_install_sha256','1d13ac175e967a2a9512f1ed1e0e2d6b5c34a3fa2c67692d9adcf70fef686d39',false)",
  );
  await source
    .unsafe(
      readFileSync(
        "db/proposals/admin-operations-v2/0000_admin_operations.sql",
        "utf8",
      ),
    )
    .simple();
  await source.unsafe("RESET ROLE");
  let expected = await expandedPrivateSnapshot(query(source));
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
    sourceEnv: pgEnvironment(
      "127.0.0.1",
      sourceInstance.port,
      "postgres",
      secret,
      certificate,
      true,
    ),
    sourceHostnameVerified: () => verifiedPeers.has(sourceInstance.port),
    profile,
    privateRoot: testRoot,
    openssl: openssl!,
    original: {
      dataDigest: expected.originalTestUsersDigest,
      preserved: [
        { name: "synthetic-original.cms", hash: originalHash },
        {
          name: "synthetic-v3.cms",
          hash: recoverySha(
            readFileSync(join(profile.historicalBackups, "synthetic-v3.cms")),
          ),
        },
      ],
      foundationReference,
    },
    priorCapture,
    historicalPreserved: prior.preserved,
    environmentUnchanged: () => recoverySha(readFileSync(envFile)) === envHash,
    lifecycle,
    crypto,
    native: productionNative,
    onSourceQuery: (text) => {
      if (/AS record|row_to_json\(t\)/.test(text)) bodyQueries++;
    },
  };
  const preserved = () => {
    for (const f of historyHashes)
      assert.equal(recoverySha(readFileSync(f.path)), f.hash);
    assert.equal(
      recoverySha(
        readFileSync(join(profile.historicalBackups, "synthetic-original.cms")),
      ),
      originalHash,
    );
  };
  stage = "native-snapshot-visibility-and-lifetime";
  let closedSnapshot = "";
  await operationSource.begin(
    "ISOLATION LEVEL REPEATABLE READ READ ONLY",
    async (tx) => {
      const [snap] = await query(tx)("SELECT pg_export_snapshot() AS snapshot");
      closedSnapshot = String(snap.snapshot);
      await source.unsafe(
        "UPDATE public.\"TestUsers\" SET name='Synthetic concurrent change' WHERE id=1",
      );
      try {
        const archive = productionNative(
          profile,
          "pg_dump",
          expandedDumpArguments(closedSnapshot),
          context.sourceEnv,
        );
        const data = productionNative(
          profile,
          "pg_restore",
          ["--data-only", "--file=-"],
          envBase,
          archive,
        );
        assert(data.includes(Buffer.from("Synthetic A")));
        assert(!data.includes(Buffer.from("Synthetic concurrent change")));
        archive.fill(0);
        data.fill(0);
      } finally {
        await source.unsafe(
          "UPDATE public.\"TestUsers\" SET name='Synthetic A' WHERE id=1",
        );
      }
    },
  );
  assert.throws(
    () =>
      productionNative(
        profile,
        "pg_dump",
        expandedDumpArguments(closedSnapshot),
        context.sourceEnv,
      ),
    (error) => safeRecoveryDiagnostic(error).category === "nonzero-exit",
  );
  await source.unsafe(
    `CREATE ROLE synthetic_denied_dump LOGIN PASSWORD '${secret}'`,
  );
  assert.throws(
    () =>
      productionNative(
        profile,
        "pg_dump",
        ["--no-password", "--format=custom", '--table="public"."TestUsers"'],
        { ...context.sourceEnv, PGUSER: "synthetic_denied_dump" },
      ),
    (error) => safeRecoveryDiagnostic(error).category === "nonzero-exit",
  );
  await source.unsafe("DROP ROLE synthetic_denied_dump");
  compareExpandedSnapshots(
    expected,
    await expandedPrivateSnapshot(query(source)),
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
          syntheticPreflightMismatch: true,
          diagnostic: safeRecoveryDiagnostic(e),
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
  stage = "review-grant-history-and-tls-negative-guards";
  for (const [change, undo] of [
    [
      "GRANT SELECT ON public.billing_products TO authenticated",
      "REVOKE SELECT ON public.billing_products FROM authenticated",
    ],
    [
      "UPDATE aibean_private.admin_operations_installations SET sql_sha256=repeat('0',64)",
      "UPDATE aibean_private.admin_operations_installations SET sql_sha256='1d13ac175e967a2a9512f1ed1e0e2d6b5c34a3fa2c67692d9adcf70fef686d39'",
    ],
    [
      "GRANT SELECT ON public.creator_applications TO authenticated",
      "REVOKE SELECT ON public.creator_applications FROM authenticated",
    ],
    [
      "UPDATE aibean_private.admin_review_installations SET sql_sha256=repeat('0',64)",
      "UPDATE aibean_private.admin_review_installations SET sql_sha256='5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca'",
    ],
  ]) {
    await source.unsafe(change);
    await assert.rejects(executePreparedRecovery(context));
    assert.equal(bodyQueries, 0);
    await source.unsafe(undo);
    preserved();
  }
  await assert.rejects(
    executePreparedRecovery({
      ...context,
      sourceHostnameVerified: () => false,
    }),
  );
  assert.equal(bodyQueries, 0);
  const badTls = postgres({
    host: "127.0.0.1",
    port: sourceInstance.port,
    database: "postgres",
    username: "postgres",
    password: secret,
    ssl: { ca: [], rejectUnauthorized: true },
    onnotice: () => {},
  });
  clients.push(badTls);
  await assert.rejects(badTls`SELECT 1`);
  await badTls.end({ timeout: 1 });
  stage = "unavailable-synthetic-key-before-capture";
  const namespaceProfile = join(
    testRoot,
    "ApplicationRecoveryV4b",
    "profile.json",
  );
  const namespaceBytes = readFileSync(namespaceProfile);
  const ns = JSON.parse(namespaceBytes.toString().replace(/^\uFEFF/, ""));
  try {
    writeFileSync(
      namespaceProfile,
      JSON.stringify({ ...ns, certificateThumbprint: "0".repeat(40) }),
    );
    await assert.rejects(executePreparedRecovery(context));
    assert.equal(bodyQueries, 0);
  } finally {
    writeFileSync(namespaceProfile, namespaceBytes);
  }
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
  const failedDirectory = join(
    testRoot,
    "ApplicationRecoveryV4b",
    "Targets",
    failedTarget,
  );
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
  stage = "bounded-synthetic-operations-fixtures";
  await source
    .unsafe(
      "INSERT INTO public.users(id) VALUES ('synthetic-ordinary-user'); INSERT INTO public.billing_products(id,name,amount,updated_by) VALUES ('submission','Synthetic submission',9900,'synthetic-ordinary-user'),('vendor_subscription','Synthetic subscription',9900,'synthetic-ordinary-user'); INSERT INTO public.tool_submissions(id,user_id,proposed) VALUES ('synthetic-submission','synthetic-ordinary-user','{}'); INSERT INTO public.billing_transactions(id,user_id,product_id,kind,subject_id,amount,currency) VALUES ('synthetic-transaction','synthetic-ordinary-user','submission','submission','synthetic-submission',9900,'usd'); INSERT INTO public.commerce_subscriptions(id,user_id,product_id,stripe_subscription_id,status) VALUES ('synthetic-subscription','synthetic-ordinary-user','vendor_subscription','synthetic-provider-reference','incomplete');",
    )
    .simple();
  await assert.rejects(
    captureSnapshot(query(source)),
    /Unexpected feature records/,
  );
  syntheticRecords = true;
  // Fixture inspection uses the original superuser backend, not SET ROLE's hidden TLS row.
  await source.unsafe("RESET ROLE");
  stage = "synthetic-record-reference-over-own-tls-session";
  expected = await expandedPrivateSnapshot(query(source));
  context.syntheticReference = expected;
  const naturalFailures: {
    name: string;
    operation: string;
    sourceUnchanged: boolean;
    targetRetained: boolean;
  }[] = [];
  for (const kind of [
    "archive-corruption",
    "metadata-corruption",
    "snapshot-mismatch",
  ]) {
    stage = "natural-negative:" + kind;
    let newTarget = "";
    let bodyReads = 0;
    const proxy = new Proxy(operationSource, {
      get(target, key) {
        if (key === "begin")
          return (options: string, work: (tx: unknown) => unknown) =>
            target.begin(
              options,
              async (tx) =>
                work(
                  new Proxy(tx, {
                    get(t, k) {
                      if (k === "unsafe")
                        return (s: string) => {
                          const result = t.unsafe(s);
                          if (
                            kind === "snapshot-mismatch" &&
                            s.includes("AS record") &&
                            s.includes('"TestUsers"') &&
                            ++bodyReads > 1
                          )
                            return Promise.resolve(result).then((rows) => [
                              {
                                record: JSON.stringify({
                                  synthetic: "changed-private-snapshot",
                                }),
                              },
                              ...rows.slice(1),
                            ]);
                          return result;
                        };
                      return Reflect.get(t, k);
                    },
                  }),
                ) as never,
            );
        return Reflect.get(target, key);
      },
    });
    await assert.rejects(
      executePreparedRecovery({
        ...context,
        source: proxy,
        lifecycle: (r) => {
          const out = lifecycle(r);
          if ((r as { mode: string }).mode === "prepare-target")
            newTarget = JSON.parse(out).name;
          return out;
        },
        native: (p, name, args, env, input) => {
          const out = productionNative(p, name, args, env, input);
          if (kind === "archive-corruption" && name === "pg_dump") out[0] = 0;
          return out;
        },
        crypto: (r) => {
          const out = crypto(r);
          const req = r as { mode: string; name?: string };
          if (
            kind === "metadata-corruption" &&
            req.mode === "decrypt" &&
            req.name?.startsWith("v4b-metadata-")
          ) {
            const bytes = Buffer.from(out, "base64");
            bytes[0] ^= 1;
            return bytes.toString("base64");
          }
          return out;
        },
      }),
      (err) => {
        const d = safeRecoveryDiagnostic(err);
        assert.equal(
          d.operation,
          kind === "archive-corruption"
            ? "archive-header"
            : kind === "metadata-corruption"
              ? "metadata-decrypt"
              : "snapshot-integrity",
        );
        naturalFailures.push({
          name: kind,
          operation: d.operation,
          sourceUnchanged: true,
          targetRetained: true,
        });
        return true;
      },
    );
    const dir = join(testRoot, "ApplicationRecoveryV4b", "Targets", newTarget);
    assert(existsSync(join(dir, "target.json")));
    assert(!existsSync(join(dir, "data", "postmaster.pid")));
    compareExpandedSnapshots(
      expected,
      await expandedPrivateSnapshot(query(source)),
    );
    preserved();
    assert(
      !readdirSync(profile.backups).some((n) => /^v4b-receipt-/.test(n)),
      "Incomplete recovery must never create PASS receipt",
    );
  }
  const boundaryFailures: {
    operation: ExportOperation;
    diagnostic: ReturnType<typeof safeRecoveryDiagnostic>;
    sourceUnchanged: boolean;
    targetRetained: boolean;
  }[] = [];
  for (const operation of exportOperations) {
    stage = `injected-export-boundary:${operation}`;
    let newTarget = "";
    await assert.rejects(
      executePreparedRecovery({
        ...context,
        lifecycle: (request) => {
          const response = lifecycle(request);
          if ((request as { mode: string }).mode === "prepare-target")
            newTarget = JSON.parse(response).name;
          return response;
        },
        onExportOperation: (current, state) => {
          if (current === operation && state === "start")
            throw new Error(
              "Synthetic private body/password/path sentinel must never appear in reports",
            );
        },
      }),
      (error) => {
        const diagnostic = safeRecoveryDiagnostic(error);
        assert.equal(diagnostic.operation, operation);
        assert.equal(diagnostic.assertionId, `${operation}.failed`);
        assert(!JSON.stringify(diagnostic).includes("sentinel"));
        boundaryFailures.push({
          operation,
          diagnostic,
          sourceUnchanged: true,
          targetRetained: true,
        });
        return true;
      },
    );
    assert(newTarget);
    const directory = join(
      testRoot,
      "ApplicationRecoveryV4b",
      "Targets",
      newTarget,
    );
    assert(existsSync(join(directory, "target.json")));
    assert(!existsSync(join(directory, "data", "postmaster.pid")));
    assert(!existsSync(join(directory, "completed.json")));
    compareExpandedSnapshots(
      expected,
      await expandedPrivateSnapshot(query(source)),
    );
    preserved();
    assert(
      !readdirSync(profile.backups).some((n) => /^v4b-receipt-/.test(n)),
      "Failed recovery must never create PASS receipt",
    );
    assert.equal(
      recoverySha(readFileSync(join(failedDirectory, "target.json"))),
      failedMetadataHash,
    );
    console.log(
      JSON.stringify({
        syntheticBoundary: operation,
        result: "PASS_FAILURE_CLOSED",
        sourceUnchanged: true,
        failedTargetRetained: true,
      }),
    );
  }
  stage = "exact-executor-synthetic-full-workflow";
  stage = "late-receipt-observer-failure";
  let lateFailedTarget = "";
  let latePreservationFailure = false;
  await assert.rejects(
    executePreparedRecovery({
      ...context,
      historicalPreserved: () => {
        if (latePreservationFailure)
          throw Error("Synthetic final preservation failure");
        context.historicalPreserved();
      },
      lifecycle: (r) => {
        const out = lifecycle(r);
        if ((r as { mode: string }).mode === "prepare-target")
          lateFailedTarget = JSON.parse(out).name;
        return out;
      },
      onExportOperation: (id, state) => {
        if (id === "receipt-persist" && state === "pass") {
          latePreservationFailure = true;
          throw Error("Synthetic late observer failure");
        }
      },
    }),
    (e) =>
      e instanceof Error &&
      e.message === "Synthetic final preservation failure",
  );
  assert(lateFailedTarget);
  assert(
    !existsSync(
      join(
        testRoot,
        "ApplicationRecoveryV4b",
        "Targets",
        lateFailedTarget,
        "data",
        "postmaster.pid",
      ),
    ),
  );
  assert(!readdirSync(profile.backups).some((n) => /^v4b-receipt-/.test(n)));
  preserved();
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
  // Separate complete success under the exact empty-feature hosted guards.
  await source
    .unsafe(
      "DELETE FROM public.commerce_subscriptions;DELETE FROM public.billing_transactions;DELETE FROM public.tool_submissions;DELETE FROM public.billing_products;DELETE FROM public.users WHERE id='synthetic-ordinary-user'",
    )
    .simple();
  syntheticRecords = false;
  context.syntheticReference = undefined;
  expected = await expandedPrivateSnapshot(query(source));
  stage = "strict-empty-feature-exact-executor-workflow";
  const strictResult = await executePreparedRecovery(context);
  assert.equal(strictResult.recoveryGate, "PASS");
  assert.deepEqual(expected, await expandedPrivateSnapshot(query(source)));
  preserved();
  const evidence = {
    capturedAt: new Date().toISOString(),
    result: "PASS_SYNTHETIC_EXACT_EXECUTOR",
    packageSha256: approvedSha,
    serverVersion: "17.11",
    selectedTables: 29,
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
    successfulSyntheticTargetStoppedRetained: true,
    nativeProcessAndEnvironment: "EXACT_PRODUCTION_IMPLEMENTATION",
    snapshotVisibilityAndLifetime: "PASS",
    insufficientNativeDumpPermissionsRejected: true,
    multiwordPolicyNamesRestoredExactly: true,
    allBoundaryFailureInjections: boundaryFailures,
    naturalFailures,
    reviewHashAndGrantDriftRejectedBeforeCapture: true,
    operationsHashAndGrantDriftRejectedBeforeCapture: true,
    unavailableSyntheticKeyRejectedBeforeCapture: true,
    populatedOperationsRoundtrip: {
      ordinaryUsers: 1,
      billingProducts: 2,
      billingTransactions: 1,
      toolSubmissions: 1,
      commerceSubscriptions: 1,
      hostedModeRejectsFeatureRecords: true,
      localTlsFixtureOnly: true,
    },
    priorV4aNativeCheckpointAndStoppedTargetPreserved: true,
    priorV4aSealedReferenceHashDriftRejected: true,
    strictEmptyFeatureExactExecutorRoundtripPassed: true,
    lateReceiptObserverFailureHasNoPassReceipt: true,
    failedTargetStoppedBeforeFinalPreservationError: true,
    realUntrustedTlsRejected: true,
    originalAndV3SyntheticArchivesAndHistoricalStoppedTargetsPreserved: true,
    codeHashes: [
      "scripts/recovery-v4b/execute.ts",
      "scripts/recovery-v4b/scope.ts",
      "scripts/recovery-v4b/diagnostics.ts",
      "scripts/recovery-v4b/private-crypto.ps1",
      "scripts/recovery-v4b/private-lifecycle.ps1",
      "scripts/recovery-v4b/native-test.ts",
      "scripts/recovery-v4b/prepare.ts",
      "scripts/recovery-v4b/predecessor.ts",
      "scripts/recovery-v4b/private-predecessor.ps1",
      "db/recovery/application-v4b-local-prerequisites.sql",
      "scripts/recovery-v4b/unit.test.ts",
    ].map((path) => ({ path, sha256: recoverySha(readFileSync(path)) })),
    exportOperationsPassed: result.completedExportOperations,
    scopedCatalog: {
      tables: 29,
      sequences: 2,
      foreignKeys: 42,
      constraints: 122,
      indexes: 47,
      policies: 29,
    },
    syntheticFailedTargetsRetained:
      boundaryFailures.length + naturalFailures.length + 2,
    successfulRecoveryTargetsRetained: 2,
    syntheticRootRetainedForFailureEvidence: true,
    hostedConnections: 0,
    hostedExport: "NOT EXECUTED",
    realRetainedTargetTouched: false,
  };
  writeFileSync(
    "docs/evidence/application-recovery-v4b-native.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(JSON.stringify(evidence));
}
main()
  .catch((error) => {
    console.error(
      JSON.stringify({
        failed: true,
        stage,
        diagnostic: safeRecoveryDiagnostic(error),
        assertionSource: [
          ...String(error?.stack ?? "").matchAll(
            /[\\/]([a-z-]+\.ts):(\d+):(\d+)/g,
          ),
        ]
          .slice(0, 5)
          .map((m) => ({
            file: m[1],
            line: Number(m[2]),
            column: Number(m[3]),
          })),
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
    // Deliberately retain this owned synthetic root/certificate and all failure
    // targets for inspection. Production success-only disposal is tested above;
    // neither fixture cleanup nor failure paths delete retained recovery targets.
  });
