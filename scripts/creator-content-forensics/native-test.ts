// Fresh loopback-only native instances. No dotenv/private profiles or hosted endpoints.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  unlinkSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { createServer } from "node:net";
import { checkServerIdentity, type PeerCertificate } from "node:tls";
import postgres from "postgres";
import {
  diagnostic,
  queryOperation,
  changedComponents,
  type SafeDiagnostic,
} from "./safe-diagnostics";

import {
  reviewedSql,
  sqlSha256,
  query,
  baseline,
  compareBaseline,
  withoutContent,
  hash,
  installContent,
  independentPostflight,
  InstallationFailure,
  type Client,
  type Context,
} from "../creator-content-v1/core";
import { expandedPrivateSnapshot } from "../recovery-v4b/scope";
import { verifyCheckpointContinuity } from "../creator-content-v1/checkpoint";
import {
  installAdminReview,
  baseline as reviewBaseline,
  sqlSha256 as reviewSqlSha256,
} from "../admin-review-v1/core";

import {
  installOperations,
  baseline as operationsBaseline,
  sqlSha256 as operationsSha,
} from "../admin-operations-v2/core";
const bin = process.env.PG_TEST_BIN;
assert(bin, "Native PostgreSQL binaries required");
const root = resolve(
  "test-results",
  `creator-postflight-forensics-native-${Date.now()}-${randomBytes(4).toString("hex")}`,
);
mkdirSync(root, { recursive: true });
const clients: Client[] = [],
  running: string[] = [],
  outcomes: Record<string, unknown>[] = [];
const pw = new Map<string, string>();
const password = (r: string) => {
  if (!pw.has(r)) pw.set(r, randomBytes(32).toString("hex"));
  return pw.get(r)!;
};
const exe = (n: string) =>
  join(bin!, n + (process.platform === "win32" ? ".exe" : ""));
const cert = join(root, "ca.crt"),
  key = join(root, "server.key");
let stage = "native-tools";
function native(program: string, args: string[]) {
  const ctl = program.includes("pg_ctl");
  const r = spawnSync(program, args, {
    windowsHide: true,
    timeout: 60000,
    encoding: "utf8",
    stdio: ctl ? "ignore" : "pipe",
    maxBuffer: 1024 * 1024,
  });
  assert.equal(
    r.status,
    0,
    "Native process failed; protected details withheld",
  );
  assert(!r.error);
  return r.stdout;
}
async function port() {
  const s = createServer();
  await new Promise<void>((r) => s.listen(0, "127.0.0.1", r));
  const a = s.address();
  assert(a && typeof a !== "string");
  const p = a.port;
  await new Promise<void>((r) => s.close(() => r()));
  return p;
}
type Instance = { directory: string; port: number; verified: boolean };
function connect(
  i: Instance,
  role = "postgres",
  application = role,
  sslOverride?: object,
) {
  assert(i.port > 1024);
  const c = postgres({
    host: "127.0.0.1",
    port: i.port,
    database: "postgres",
    username: role,
    password: password(role),
    max: 1,
    prepare: false,
    connect_timeout: 5,
    ssl: sslOverride ?? {
      ca: readFileSync(cert, "utf8"),
      rejectUnauthorized: true,
      servername: "localhost",
      checkServerIdentity: (_h: string, p: PeerCertificate) => {
        const e = checkServerIdentity("127.0.0.1", p);
        if (!e) i.verified = true;
        return e;
      },
    },
    onnotice: () => {},
    connection: {
      application_name: `operations-native-${application}`,
      timezone: "UTC",
      statement_timeout: 60000,
    },
  });
  clients.push(c);
  return c;
}
async function instance(name: string) {
  const directory = join(root, name);
  assert(!existsSync(directory));
  const p = await port();
  const bootstrap = join(root, `${name}-bootstrap`);
  writeFileSync(bootstrap, password("cluster_admin"));
  try {
    native(exe("initdb"), [
      "-D",
      directory,
      "-U",
      "cluster_admin",
      "--pwfile",
      bootstrap,
      "--auth-host=scram-sha-256",
      "--auth-local=scram-sha-256",
      "--encoding=UTF8",
      "--no-locale",
    ]);
  } finally {
    unlinkSync(bootstrap);
  }
  const pg = (s: string) => s.replaceAll("\\", "/").replaceAll("'", "''");
  writeFileSync(
    join(directory, "postgresql.conf"),
    `listen_addresses='127.0.0.1'\nport=${p}\nssl=on\nssl_cert_file='${pg(cert)}'\nssl_key_file='${pg(key)}'\nlog_statement='none'\nlog_min_error_statement='panic'\nlog_min_messages='panic'\n`,
  );
  writeFileSync(
    join(directory, "pg_hba.conf"),
    "hostssl all all 127.0.0.1/32 scram-sha-256\nhostnossl all all 127.0.0.1/32 reject\n",
  );
  native(exe("pg_ctl"), [
    "-D",
    directory,
    "-l",
    join(root, `${name}.log`),
    "-w",
    "start",
  ]);
  running.push(directory);
  return { directory, port: p, verified: false };
}
async function fixture(i: Instance) {
  const admin = connect(i, "cluster_admin");
  for (const [role, flags] of [
    ["postgres", "NOSUPERUSER BYPASSRLS CREATEDB CREATEROLE REPLICATION"],
    ["anon", "NOSUPERUSER NOBYPASSRLS"],
    ["authenticated", "NOSUPERUSER NOBYPASSRLS"],
    ["service_role", "NOSUPERUSER BYPASSRLS"],
    ["supabase_admin", "NOSUPERUSER BYPASSRLS"],
    ["dashboard_user", "NOSUPERUSER NOBYPASSRLS"],
  ])
    await admin.unsafe(
      `CREATE ROLE ${role} LOGIN ${flags} PASSWORD '${password(role)}'`,
    );
  await admin.unsafe(
    `ALTER DATABASE postgres OWNER TO postgres;ALTER SCHEMA public OWNER TO pg_database_owner;REVOKE CREATE ON SCHEMA public FROM PUBLIC;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE TABLE auth.identities(id uuid PRIMARY KEY);GRANT USAGE ON SCHEMA auth TO postgres;GRANT SELECT,REFERENCES ON auth.users TO postgres;GRANT SELECT ON auth.identities TO postgres;CREATE TABLE public."TestUsers"(id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now(),email text UNIQUE,age bigint,name text);ALTER TABLE public."TestUsers" OWNER TO postgres;INSERT INTO public."TestUsers"(email) VALUES ('synthetic-one@example.invalid'),('synthetic-two@example.invalid');ALTER TABLE public."TestUsers" ENABLE ROW LEVEL SECURITY;CREATE POLICY "Enable read access for all users" ON public."TestUsers" FOR SELECT USING (true);CREATE POLICY "Enable insert for authenticated users only" ON public."TestUsers" FOR INSERT TO authenticated WITH CHECK (true);GRANT ALL ON public."TestUsers" TO anon,authenticated,service_role;GRANT ALL ON SEQUENCE public."TestUsers_id_seq" TO anon,authenticated,service_role;ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;`,
  );
  const operator = connect(i, "postgres");
  const bytes = readFileSync("db/install/reviewed-installation.sql");
  assert.equal(
    hash(bytes),
    "72818e1233ab51ebbac861a822d89ee0d52d4c12ee32a193746c631bdf639b0c",
  );
  await operator.unsafe(bytes.toString("utf8")).simple();
  await operator
    .unsafe(readFileSync("db/install/runtime-login-proposal.sql", "utf8"))
    .simple();
  await operator.unsafe(
    `ALTER ROLE aibean_app_login LOGIN PASSWORD '${password("aibean_app_login")}'`,
  );
  await operator
    .unsafe(readFileSync("db/install/testusers-security-proposal.sql", "utf8"))
    .simple();
  const original = await reviewBaseline(query(operator));
  await installAdminReview(
    {
      operator,
      hostnameVerified: () => i.verified,
      recovery: async () => original,
      independent: () => connect(i, "postgres"),
      runtime: () => connect(i, "aibean_app_login"),
    },
    reviewSqlSha256,
  );
  const prior = await operationsBaseline(query(operator));
  await installOperations(
    {
      operator,
      hostnameVerified: () => i.verified,
      recovery: async () => prior,
      independent: () => connect(i, "postgres"),
      runtime: () => connect(i, "aibean_app_login"),
    },
    operationsSha,
  );
  return { admin, operator };
}

type Observation = {
  sqlInvocations: number;
  commitAcknowledgments: number;
  reservedReleases: number;
  installationRollbackAfterCommit: number;
  cleanupCalls: number;
  operations: Record<string, number>;
  diagnostics: SafeDiagnostic[];
};
const observations = (): Observation => ({
  sqlInvocations: 0,
  commitAcknowledgments: 0,
  reservedReleases: 0,
  installationRollbackAfterCommit: 0,
  cleanupCalls: 0,
  operations: {},
  diagnostics: [],
});
// Proxies observe the existing native driver. They never change results, SQL,
// transaction boundaries, baseline comparisons or frozen error handling.
function observe(
  client: Client,
  state: Observation,
  beforeWork?: (tx: Client) => Promise<void>,
  rejectCleanup = false,
): Client {
  let last = "CLIENT_CREATION";
  const capture = (error: unknown) => {
    if (state.diagnostics.length < 20)
      state.diagnostics.push(diagnostic(last, error));
  };
  const pending = (value: object, exact = false): object =>
    new Proxy(value, {
      get(target, key) {
        if (key === "then")
          return (
            accept: (r: unknown) => unknown,
            reject: (e: unknown) => unknown,
          ) =>
            Reflect.apply(Reflect.get(target, key), target, [
              (r: unknown) => {
                if (exact) state.commitAcknowledgments++;
                return accept(r);
              },
              (e: unknown) => {
                capture(e);
                return reject(e);
              },
            ]);
        const v = Reflect.get(target, key);
        if (typeof v === "function")
          return (...args: unknown[]) => {
            const next = Reflect.apply(v, target, args);
            return next === target ? pending(target, exact) : next;
          };
        return v;
      },
    });
  const instrument = (value: object): object =>
    new Proxy(value, {
      apply(target, thisArg, args) {
        const text = Array.isArray(args[0]) ? args[0].join("?") : "";
        last = queryOperation(text);
        state.operations[last] = (state.operations[last] ?? 0) + 1;
        return pending(
          Reflect.apply(target as (...a: unknown[]) => object, thisArg, args),
        );
      },
      get(target, key) {
        if (key === "unsafe")
          return (sql: string, ...args: unknown[]) => {
            const exact = sql === reviewedSql(sqlSha256);
            last = exact ? "EXACT_REVIEWED_SQL" : queryOperation(sql);
            state.operations[last] = (state.operations[last] ?? 0) + 1;
            if (exact) state.sqlInvocations++;
            if (sql === "ROLLBACK" && state.commitAcknowledgments > 0)
              state.installationRollbackAfterCommit++;
            return pending(
              Reflect.apply(Reflect.get(target, key), target, [sql, ...args]),
              exact,
            );
          };
        if (key === "reserve")
          return async () =>
            instrument(
              await Reflect.apply(Reflect.get(target, key), target, []),
            );
        if (key === "release")
          return () => {
            state.reservedReleases++;
            return Reflect.apply(Reflect.get(target, key), target, []);
          };
        if (key === "begin")
          return async (
            options: string,
            work: (tx: Client) => Promise<unknown>,
          ) => {
            try {
              return await Reflect.apply(Reflect.get(target, key), target, [
                options,
                async (tx: Client) => {
                  if (beforeWork) await beforeWork(tx);
                  return work(instrument(tx) as Client);
                },
              ]);
            } catch (e) {
              capture(e);
              throw e;
            }
          };
        if (key === "end")
          return (...args: unknown[]) => {
            state.cleanupCalls++;
            if (rejectCleanup)
              return Promise.reject(
                Object.assign(new Error("Synthetic cleanup rejection"), {
                  code: "ECONNRESET",
                }),
              );
            return Reflect.apply(Reflect.get(target, key), target, args);
          };
        const v = Reflect.get(target, key);
        return typeof v === "function" ? v.bind(target) : v;
      },
    });
  return instrument(client) as Client;
}

function immutableState() {
  const mechanismPath =
    "db/proposals/creator-content-v1-readiness/mechanism.json";
  assert.equal(
    hash(readFileSync(mechanismPath)),
    "731a763b3afe78e4459514ad650702056cf71dc7f1de9c9141819e0cb3df8220",
  );
  const m = JSON.parse(readFileSync(mechanismPath, "utf8"));
  assert.equal(m.files.length, 170);
  for (const f of m.files) assert.equal(hash(readFileSync(f.path)), f.sha256);
  const evidence = [
    "docs/CREATOR_CONTENT_V1_HOSTED_INSTALLATION_RESULT.md",
    "docs/CREATOR_CONTENT_V1_HOSTED_INSTALLATION_READINESS.md",
    "docs/evidence/creator-content-v1-authorization-9-acceptance.json",
    "docs/evidence/creator-content-v1-authorization-9-execution.json",
    "docs/evidence/creator-content-v1-hosted-execute-result.json",
    "docs/evidence/creator-content-v1-hosted-verify-result.json",
    "docs/evidence/creator-content-v1-authorization-9-readonly-catalog-diagnostic.json",
    "docs/evidence/creator-content-v1-authorization-9-runtime-diagnostic.json",
    "docs/evidence/creator-content-v1-hosted-attempt.json",
    "docs/evidence/creator-content-v1-authorization-9-preflight.json",
    "docs/evidence/creator-content-v1-authorization-9-separate-verification.json",
    "docs/evidence/creator-content-v1-hosted-ci.json",
  ];
  return Object.fromEntries(
    [
      ...m.files.map((f: { path: string }) => f.path),
      mechanismPath,
      ...evidence,
    ].map((p) => [p, hash(readFileSync(p))]),
  );
}

type Fault =
  | "clean"
  | "managed-reference-drift"
  | "baseline-before"
  | "baseline-after"
  | "connection-loss"
  | "operator-timeout"
  | "runtime-timeout"
  | "statement-timeout"
  | "idle-timeout"
  | "catalog-mismatch"
  | "grant-mismatch"
  | "rollback"
  | "cleanup-rejection"
  | "factory-error"
  | "runtime-identity";
async function scenario(name: Fault) {
  stage = name;
  const i = await instance(name),
    f = await fixture(i);
  const state = observations();
  const prior = await baseline(query(f.operator));
  const checkpointCapture = await expandedPrivateSnapshot(query(f.operator));
  let independentNumber = 0,
    faultApplied = false;
  const applyFault = async (tx: Client) => {
    if (faultApplied) return;
    faultApplied = true;
    if (name === "managed-reference-drift")
      await f.admin.unsafe(
        "CREATE TABLE auth.synthetic_reference_timing(id int)",
      );
    if (name === "baseline-after")
      await f.admin.unsafe(
        `UPDATE public."TestUsers" SET email='synthetic-changed@example.invalid' WHERE id=1`,
      );
    if (name === "connection-loss") {
      const [{ pid }] = await tx`SELECT pg_backend_pid() AS pid`;
      await f.admin`SELECT pg_terminate_backend(${pid})`;
      // Let the socket-close event settle before the next native probe. An
      // immediate enqueue exposed a separate driver crash in a retained run.
      await new Promise((r) => setTimeout(r, 175));
    }
    if (name === "statement-timeout") await tx`SELECT pg_sleep(0.25)`;
    if (name === "idle-timeout") await new Promise((r) => setTimeout(r, 175));
    if (name === "catalog-mismatch")
      await f.admin.unsafe("DROP INDEX public.skill_queue");
    if (name === "grant-mismatch")
      await f.admin.unsafe("GRANT SELECT ON public.ai_skills TO authenticated");
  };
  // A new inert TCP listener models a TLS handshake that never completes. Native
  // source connections still use trusted TLS; no non-loopback address is possible.
  const sockets = new Set<import("node:net").Socket>();
  const stall = createServer((s) => {
    sockets.add(s);
    s.on("close", () => sockets.delete(s));
  });
  if (
    name.includes("timeout") &&
    ["operator-timeout", "runtime-timeout"].includes(name)
  )
    await new Promise<void>((r) => stall.listen(0, "127.0.0.1", r));
  const stalledClient = () => {
    const address = stall.address();
    assert(address && typeof address !== "string");
    const c = postgres({
      host: "127.0.0.1",
      port: address.port,
      database: "postgres",
      username: name === "runtime-timeout" ? "aibean_app_login" : "postgres",
      password: password("postgres"),
      ssl: {
        ca: readFileSync(cert, "utf8"),
        rejectUnauthorized: true,
        servername: "localhost",
      },
      max: 1,
      prepare: false,
      connect_timeout: 1,
      onnotice: () => {},
    });
    clients.push(c);
    return c;
  };
  if (name === "baseline-before")
    await f.admin.unsafe(
      `UPDATE public."TestUsers" SET email='synthetic-changed@example.invalid' WHERE id=1`,
    );
  if (name === "baseline-before") {
    try {
      compareBaseline(await baseline(query(f.operator)), prior);
    } catch (e) {
      state.diagnostics.push(diagnostic("PREFLIGHT_BASELINE", e));
    }
  }
  if (name === "clean") {
    for (const ssl of [
      { ca: [], rejectUnauthorized: true },
      {
        ca: readFileSync(cert, "utf8"),
        rejectUnauthorized: true,
        servername: "untrusted.invalid",
      },
    ])
      await assert.rejects(
        connect(i, "postgres", "negative-tls", ssl)`SELECT 1`,
      );
  }
  if (name === "rollback")
    await f.admin.unsafe(
      `CREATE SCHEMA synthetic_fault;CREATE FUNCTION synthetic_fault.reject_ledger() RETURNS event_trigger LANGUAGE plpgsql AS $$BEGIN IF EXISTS(SELECT 1 FROM pg_event_trigger_ddl_commands() WHERE object_identity='aibean_private.content_installations') THEN RAISE EXCEPTION 'Synthetic fault' USING ERRCODE='P0001';END IF;END$$;CREATE EVENT TRIGGER synthetic_reject ON ddl_command_end EXECUTE FUNCTION synthetic_fault.reject_ledger();`,
    );
  const ctx: Context = {
    operator: observe(f.operator, state),
    hostnameVerified: () => i.verified,
    recovery: async () => prior,
    independent: () => {
      const n = independentNumber++;
      if (n === 0 && name === "operator-timeout")
        return observe(stalledClient(), state);
      const c = connect(i);
      if (n === 0 && name === "statement-timeout")
        c.options.connection.statement_timeout = 50;
      if (n === 0 && name === "idle-timeout")
        c.options.connection.idle_in_transaction_session_timeout = 50;
      return observe(
        c,
        state,
        n === 0 ? applyFault : undefined,
        name === "cleanup-rejection",
      );
    },
    runtime: () => {
      if (name === "factory-error") {
        state.diagnostics.push(
          diagnostic(
            "CLIENT_FACTORY",
            new Error("Synthetic client factory error"),
          ),
        );
        throw new Error("Synthetic client factory error");
      }
      return observe(
        name === "runtime-timeout"
          ? stalledClient()
          : connect(
              i,
              name === "runtime-identity" ? "anon" : "aibean_app_login",
            ),
        state,
        undefined,
        name === "cleanup-rejection",
      );
    },
  };
  let receipt: Record<string, unknown>;
  try {
    receipt = await installContent(ctx, sqlSha256);
  } catch (e) {
    assert(e instanceof InstallationFailure);
    receipt = e.evidence;
  }
  assert.equal(receipt.automaticRetry, false);
  assert.equal(state.installationRollbackAfterCommit, 0);
  assert.equal(state.sqlInvocations, name === "baseline-before" ? 0 : 1);
  const successes = ["clean", "cleanup-rejection"].includes(name);
  assert.equal(receipt.status, successes ? "PASS" : "FAIL");
  assert.equal(
    receipt.commitAcknowledged,
    !["baseline-before", "rollback"].includes(name),
  );
  if (name === "rollback") assert.equal(receipt.rollback, "VERIFIED");
  if (!successes && !["baseline-before", "rollback"].includes(name)) {
    assert.equal(receipt.stage, "independent-postflight");
    assert.equal(receipt.rollback, "NOT_NEEDED");
    assert.equal(
      receipt.sqlState,
      name === "statement-timeout" ? "57014" : "REDACTED",
    );
  }
  const actual = await baseline(query(f.operator));
  const differences = changedComponents(prior, actual);
  let checkpoint = "PASS";
  try {
    await verifyCheckpointContinuity(
      withoutContent(query(f.operator)),
      checkpointCapture,
    );
  } catch {
    checkpoint = "FAIL";
  }
  if (name === "managed-reference-drift")
    assert.deepEqual(differences, ["foundation.foundation.managed"]);
  if (name === "baseline-after" || name === "baseline-before")
    assert.equal(checkpoint, "FAIL");
  else assert.equal(checkpoint, "PASS");
  let persistentVerifier = "NOT_APPLICABLE";
  const normal: Context = {
    operator: f.operator,
    hostnameVerified: () => i.verified,
    recovery: async () => {
      const reference = await baseline(query(f.operator));
      await verifyCheckpointContinuity(
        withoutContent(query(f.operator)),
        checkpointCapture,
      );
      return reference;
    },
    independent: () => connect(i),
    runtime: () => connect(i, "aibean_app_login"),
  };
  if (!["baseline-before", "rollback"].includes(name)) {
    try {
      await independentPostflight(normal, await normal.recovery());
      persistentVerifier = "PASS";
    } catch {
      persistentVerifier = "FAIL";
    }
    assert.equal(
      persistentVerifier,
      ["baseline-after", "catalog-mismatch", "grant-mismatch"].includes(name)
        ? "FAIL"
        : "PASS",
    );
  }
  // Local fault reversal is confined to this newly created synthetic instance.
  if (name === "baseline-after" || name === "baseline-before")
    await f.admin.unsafe(
      `UPDATE public."TestUsers" SET email='synthetic-one@example.invalid' WHERE id=1`,
    );
  if (name === "catalog-mismatch")
    await f.admin.unsafe(
      "CREATE INDEX skill_queue ON public.ai_skills USING btree (status, created_at)",
    );
  if (name === "grant-mismatch")
    await f.admin.unsafe(
      "REVOKE SELECT ON public.ai_skills FROM authenticated",
    );
  if (name === "rollback")
    await f.admin.unsafe("DROP EVENT TRIGGER synthetic_reject");
  if (["baseline-after", "catalog-mismatch", "grant-mismatch"].includes(name))
    await independentPostflight(normal, await normal.recovery());
  const retention = join(root, `${name}-sanitized-receipt.json`);
  const bytes = JSON.stringify(receipt);
  writeFileSync(retention, bytes, { flag: "wx" });
  assert.equal(readFileSync(retention, "utf8"), bytes);
  for (const s of sockets) s.destroy();
  if (stall.listening) await new Promise<void>((r) => stall.close(() => r()));
  const result = {
    name,
    status: "PASS",
    installerReceipt: receipt,
    observations: state,
    baselineChangedComponents: differences,
    syntheticCheckpoint: checkpoint,
    standaloneWhileFaultPresent: persistentVerifier,
    failedEvidenceRetained: receipt.status === "FAIL",
    cleanupRejectionInjected: name === "cleanup-rejection",
    nativeTlsVerified: i.verified,
    hostedConnections: 0,
  };
  outcomes.push(result);
  console.log(
    JSON.stringify({
      name,
      status: "PASS",
      stage: receipt.stage ?? "complete",
      diagnostics: state.diagnostics,
    }),
  );
}

async function concurrent() {
  stage = "concurrent";
  const i = await instance("concurrent"),
    f = await fixture(i);
  const prior = await baseline(query(f.operator)),
    state = observations();
  let arrivals = 0,
    release!: () => void;
  const barrier = new Promise<void>((r) => (release = r));
  const ctx = (operator: Client): Context => ({
    operator: observe(operator, state),
    hostnameVerified: () => i.verified,
    recovery: async () => prior,
    independent: () => observe(connect(i), state),
    runtime: () => observe(connect(i, "aibean_app_login"), state),
    beforeSql: async () => {
      if (++arrivals === 2) release();
      await barrier;
    },
  });
  const receipts = await Promise.all(
    [f.operator, connect(i)].map(async (c) => {
      try {
        return await installContent(ctx(c), sqlSha256);
      } catch (e) {
        assert(e instanceof InstallationFailure);
        return e.evidence;
      }
    }),
  );
  assert.equal(receipts.filter((r) => r.status === "PASS").length, 1);
  assert.equal(receipts.filter((r) => r.rollback === "VERIFIED").length, 1);
  assert.equal(state.sqlInvocations, 2);
  assert.equal(state.commitAcknowledgments, 1);
  // An intentional third synthetic call refuses existing inventory before SQL.
  const fresh = await baseline(query(f.operator));
  const denied = {
    ...ctx(f.operator),
    recovery: async () => fresh,
    beforeSql: undefined,
  };
  await assert.rejects(
    installContent(denied, sqlSha256),
    (e) => e instanceof InstallationFailure && e.evidence.attempted === false,
  );
  assert.equal(state.sqlInvocations, 2);
  outcomes.push({
    name: "concurrent",
    status: "PASS",
    explicitSyntheticCalls: 3,
    sqlInvocations: 2,
    acknowledgedCommits: 1,
    loserRollback: "VERIFIED",
    repeatRefusedBeforeSql: true,
    automaticRetry: false,
  });
  console.log(JSON.stringify({ name: "concurrent", status: "PASS" }));
}

async function main() {
  const original = immutableState();
  assert(native(exe("postgres"), ["--version"]).includes("17.11"));
  native(process.env.PG_TEST_OPENSSL || "openssl", [
    "req",
    "-x509",
    "-newkey",
    "rsa:3072",
    "-nodes",
    "-keyout",
    key,
    "-out",
    cert,
    "-days",
    "1",
    "-subj",
    "/CN=localhost",
    "-addext",
    "subjectAltName=IP:127.0.0.1,DNS:localhost",
    "-addext",
    "basicConstraints=critical,CA:TRUE",
  ]);
  for (const name of [
    "clean",
    "managed-reference-drift",
    "baseline-before",
    "baseline-after",
    "connection-loss",
    "operator-timeout",
    "runtime-timeout",
    "statement-timeout",
    "idle-timeout",
    "catalog-mismatch",
    "grant-mismatch",
    "rollback",
    "cleanup-rejection",
    "factory-error",
    "runtime-identity",
  ] as Fault[])
    await scenario(name);
  await concurrent();
  assert.deepEqual(immutableState(), original);
}
async function run() {
  let failure: SafeDiagnostic | undefined;
  try {
    await main();
  } catch (e) {
    failure = diagnostic(stage, e);
    console.error(JSON.stringify({ status: "FAIL", diagnostic: failure }));
    process.exitCode = 1;
  } finally {
    await Promise.allSettled(clients.map((c) => c.end({ timeout: 2 })));
    let stopped = 0;
    for (const directory of running) {
      try {
        native(exe("pg_ctl"), ["-D", directory, "-m", "fast", "-w", "stop"]);
        stopped++;
      } catch {
        process.exitCode = 1;
      }
    }
    writeFileSync(
      "docs/evidence/creator-content-v1-postflight-native.json",
      JSON.stringify(
        {
          status: process.exitCode ? "FAIL" : "PASS",
          capturedAt: new Date().toISOString(),
          postgresVersion: "17.11",
          scope: "FRESH_SYNTHETIC_LOOPBACK_TLS_ONLY",
          hostedConnections: 0,
          originalFrozenDependencies: 170,
          originalReceiptsUnchanged: !process.exitCode,
          scenarios: outcomes,
          newTargets: running.length,
          stoppedTargets: stopped,
          targetsRetained: true,
          historicalArtifactsAccessed: false,
          failure,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(
      JSON.stringify({
        status: process.exitCode ? "FAIL" : "PASS",
        scenarios: outcomes.length,
        newTargets: running.length,
        stoppedTargets: stopped,
      }),
    );
  }
}
void run();
