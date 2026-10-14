// Resume only the owner's existing disposable QA target. No application package
// installation, hosted URL, recovery directory or arbitrary target arguments.
import assert from "node:assert/strict";
import {
  spawn,
  spawnSync,
  execFileSync,
  type ChildProcess,
} from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  cpSync,
  symlinkSync,
  createWriteStream,
  realpathSync,
} from "node:fs";
import { resolve, join, dirname } from "node:path";
import { randomBytes, createHash } from "node:crypto";
import { checkServerIdentity, type PeerCertificate } from "node:tls";
import { createServer } from "node:net";
import postgres from "postgres";
import {
  hashPassword,
  passwordAccountId,
  verifyPassword,
} from "../../../src/lib/password-crypto";
import { qaCredentialPath, privateChildEnvironment, qaPorts } from "../guards";
import { applyAccountOverlays } from "./overlays";
const args = process.argv.slice(2);
assert(
  args.length <= 1 &&
    (!args.length || /^--lease-hours=(?:[1-9]|1[0-2])$/.test(args[0])),
  "Only the explicit 1–12 hour lease argument is supported",
);
assert.equal(process.platform, "win32");
const hours = args.length ? Number(args[0].split("=")[1]) : 8;
const statePath = resolve("test-results/local-website-qa-active.json");
const state = JSON.parse(readFileSync(statePath, "utf8"));
assert(/^[a-f0-9]{32}$/.test(state.run));
const root = resolve("test-results", "product-acceptance-" + state.run);
assert.equal(state.root, root);
assert.equal(realpathSync(root), root);
const credentialsPath = qaCredentialPath(state.run);
assert.equal(state.credentialsPath, credentialsPath);
const credentials = JSON.parse(readFileSync(credentialsPath, "utf8"));
assert.equal(credentials.run, state.run);
assert.deepEqual(
  credentials.accounts.map((a: { role: string }) => a.role).sort(),
  ["admin", "creator", "user", "vendor"],
);
const runtime = JSON.parse(readFileSync(join(root, "runtime.json"), "utf8"));
const url = new URL(runtime.connectionString);
assert.equal(runtime.run, state.run);
assert.equal(url.protocol, "postgresql:");
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.username, "aibean_app_login");
assert.equal(url.pathname, "/postgres");
assert(/^[a-f0-9]{64}$/.test(url.password));
assert(
  !url.search &&
    !url.hash &&
    Number(url.port) > 1024 &&
    ![5432, 6543].includes(Number(url.port)),
);
const ca = join(root, "fixture-ca.crt"),
  directory = join(root, "cluster"),
  privateRoot = dirname(credentialsPath);
const sha = (body: Buffer | string) =>
  createHash("sha256").update(body).digest("hex");
assert.equal(sha(readFileSync(ca)), runtime.caSha256);
const pgConfig = readFileSync(join(directory, "postgresql.conf"), "utf8");
assert(
  pgConfig.includes("listen_addresses='127.0.0.1'") &&
    pgConfig.includes("cluster_name='aibean-acceptance-" + state.run + "'") &&
    pgConfig.includes("port=" + url.port),
);
const envFingerprint = sha(readFileSync(".env.local"));
const bin = resolve("test-results/postgres-validation/portable/pgsql/bin");
const exe = (name: string) => join(bin, name + ".exe");
const servers: ChildProcess[] = [];
const connections: ReturnType<typeof postgres>[] = [];
let startedPg = false;
const pgRun = (args: string[]) => {
  const r = spawnSync(exe("pg_ctl"), args, {
    stdio: "ignore",
    windowsHide: true,
    timeout: 60000,
  });
  assert.equal(r.status, 0, "Owned QA PostgreSQL command failed");
};
const expiresAt = Date.now() + hours * 3600_000;
function protect() {
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-File",
      "scripts/local-website-qa/protect-credentials.ps1",
      "-Root",
      privateRoot,
    ],
    { stdio: "pipe", windowsHide: true },
  );
}
async function main() {
  for (const port of Object.values(qaPorts)) {
    const listener = createServer();
    await new Promise<void>((ok, fail) => {
      listener.once("error", () =>
        fail(Error("QA port occupied; no process will be killed")),
      );
      listener.listen(port, "127.0.0.1", ok);
    });
    await new Promise<void>((ok) => listener.close(() => ok()));
  }
  protect();
  const status = spawnSync(exe("pg_ctl"), ["-D", directory, "status"], {
    stdio: "ignore",
    windowsHide: true,
  });
  assert.equal(
    status.status,
    3,
    "QA cluster must be stopped before its explicit restart",
  );
  pgRun([
    "-D",
    directory,
    "-l",
    join(root, "postgres-account-v2.log"),
    "-w",
    "start",
  ]);
  startedPg = true;
  const ssl = {
    ca: readFileSync(ca, "utf8"),
    rejectUnauthorized: true,
    servername: "localhost",
    checkServerIdentity: (_h: string, peer: PeerCertificate) =>
      checkServerIdentity("127.0.0.1", peer),
  };
  const connect = (username: string) => {
    const client = postgres({
      host: "127.0.0.1",
      port: Number(url.port),
      database: "postgres",
      username,
      password: url.password,
      ssl,
      max: 1,
      prepare: false,
      onnotice: () => {},
    });
    connections.push(client);
    return client;
  };
  const operator = connect("cluster_admin");
  const [identity] =
    await operator`SELECT current_database() AS db,current_user AS actor,host(inet_server_addr()) AS host,current_setting('cluster_name') AS cluster,(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls`;
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
  // Verify reviewed dependencies without invoking any historical installer.
  for (const f of JSON.parse(
    readFileSync(
      "db/proposals/creator-content-v1-readiness/mechanism.json",
      "utf8",
    ),
  ).files)
    assert.equal(
      sha(readFileSync(f.path)),
      f.sha256,
      "Frozen dependency drift: " + f.path,
    );
  const sql = readFileSync(
      "src/lib/local-qa-auth/schema.sql",
      "utf8",
    ).replaceAll("\r\n", "\n"),
    sqlHash = sha(sql);
  const inventory =
    await operator`SELECT tablename FROM pg_tables WHERE schemaname='local_qa_auth' ORDER BY tablename`;
  if (!inventory.length) {
    await operator.begin(async (tx) => {
      await tx.unsafe(sql);
      await tx`INSERT INTO local_qa_auth.version(id,checksum) VALUES(1,${sqlHash})`;
    });
  } else {
    assert.deepEqual(
      inventory.map((r) => r.tablename),
      ["accounts", "mail", "rates", "sessions", "tokens", "version"],
    );
    const [ledger] =
      await operator`SELECT checksum FROM local_qa_auth.version WHERE id=1`;
    assert.equal(
      ledger.checksum,
      sqlHash,
      "Existing QA schema differs; no schema repair/reinstall attempted",
    );
  }
  for (const account of credentials.accounts) {
    const id = passwordAccountId(account.email);
    const [user] =
      await operator`SELECT id,is_admin,is_creator FROM public.users WHERE id=${id}`;
    assert(user, "Existing fixture identity is required");
    assert.equal(user.is_admin, account.role === "admin");
    assert.equal(user.is_creator, account.role === "creator");
    const [existing] =
      await operator`SELECT user_id,password_hash FROM local_qa_auth.accounts WHERE email=${account.email}`;
    if (existing) {
      assert.equal(existing.user_id, id);
      if (!(await verifyPassword(account.password, existing.password_hash)))
        console.log(
          "Saved handoff no longer matches one fixture account; use open-test-access for status. No credential was rotated.",
        );
    } else
      await operator`INSERT INTO local_qa_auth.accounts(user_id,email,password_hash,confirmed) VALUES(${id},${account.email},${await hashPassword(account.password)},true)`;
  }
  const authConfigPath = join(privateRoot, "qa-auth.json");
  let authConfig;
  if (existsSync(authConfigPath)) {
    authConfig = JSON.parse(readFileSync(authConfigPath, "utf8"));
    assert.equal(authConfig.run, state.run);
    assert.equal(authConfig.connectionString, runtime.connectionString);
  } else {
    const mailboxPassword = "Qa9!" + randomBytes(32).toString("hex");
    authConfig = {
      run: state.run,
      connectionString: runtime.connectionString,
      dummyHash: await hashPassword("Qa9!" + randomBytes(32).toString("hex")),
      mailboxHash: await hashPassword(mailboxPassword),
    };
    credentials.mailbox = {
      url: "http://127.0.0.1:3000/local-mailbox",
      password: mailboxPassword,
    };
  }
  authConfig.expiresAt = expiresAt;
  writeFileSync(authConfigPath, JSON.stringify(authConfig));
  credentials.expiresAt = expiresAt;
  writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
  protect();
  runtime.expiresAt = expiresAt;
  writeFileSync(join(root, "runtime.json"), JSON.stringify(runtime));
  const marker = join(root, "STOP");
  // Historical STOP marker is retained. Each launch uses its own new stop marker.
  const generation = randomBytes(8).toString("hex"),
    stopPath = join(root, "STOP-account-v2-" + generation);
  void marker;
  const names = execFileSync("git", [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
  ])
    .toString()
    .split("\0")
    .filter(Boolean);
  const sourceFiles = [...new Set(names)].filter(
    (f) =>
      /^(src\/|public\/|db\/)/.test(f) ||
      [
        "package.json",
        "package-lock.json",
        "next.config.ts",
        "next-env.d.ts",
        "tsconfig.json",
        "postcss.config.mjs",
      ].includes(f),
  );
  const envKeys = [
    ".env",
    ".env.local",
    ".env.development",
    ".env.development.local",
  ].flatMap((f) =>
    existsSync(f)
      ? readFileSync(f, "utf8")
          .split(/\r?\n/)
          .map((s) => /^([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(s)?.[1])
          .filter((s): s is string => !!s)
      : [],
  );
  const environments = [];
  for (const [role, port] of Object.entries(qaPorts)) {
    const appRoot = join(root, "source-account-v2-" + generation + "-" + role);
    mkdirSync(appRoot);
    for (const path of sourceFiles) {
      const target = join(appRoot, path);
      mkdirSync(dirname(target), { recursive: true });
      cpSync(path, target);
    }
    symlinkSync(
      resolve("node_modules"),
      join(appRoot, "node_modules"),
      "junction",
    );
    const runtimeRoot = join(
      appRoot,
      "test-results",
      "product-acceptance-" + state.run,
    );
    mkdirSync(runtimeRoot, { recursive: true });
    cpSync(join(root, "runtime.json"), join(runtimeRoot, "runtime.json"));
    cpSync(ca, join(runtimeRoot, "fixture-ca.crt"));
    applyAccountOverlays(appRoot);
    writeFileSync(
      join(appRoot, "next.config.ts"),
      readFileSync("next.config.ts", "utf8").replace(
        "  devIndicators: false,",
        `  turbopack: { root: ${JSON.stringify(process.cwd())} },\n  devIndicators: false,`,
      ),
    );
    const env = privateChildEnvironment(process.env, envKeys);
    Object.assign(env, {
      NODE_ENV: "development",
      NEXT_TELEMETRY_DISABLED: "1",
      AIBEAN_LOCAL_ACCEPTANCE_RUN: state.run,
      AIBEAN_LOCAL_ACCEPTANCE_ROLE: role,
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:" + port,
      DATABASE_URL: runtime.connectionString,
      DATABASE_CA_CERT_PATH: ca,
      AIBEAN_AUTH_MODE: "password",
      AIBEAN_LOCAL_QA_AUTH: "1",
      AIBEAN_LOCAL_QA_AUTH_CONFIG: authConfigPath,
      AIBEAN_REVIEW_WORKFLOWS: "1",
      AIBEAN_COMMERCE_WORKFLOWS: "1",
      AIBEAN_CONTENT_WORKFLOWS: "1",
      AIBEAN_DISCOVERY_WORKFLOWS: "true",
      AIBEAN_PRICING_WORKFLOWS: "true",
      AIBEAN_AFFILIATE_CREATOR_WORKFLOWS: "true",
    });
    const child = spawn(
      process.execPath,
      [
        resolve("node_modules/next/dist/bin/next"),
        "dev",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      {
        cwd: appRoot,
        env,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    servers.push(child);
    const log = createWriteStream(join(privateRoot, role + "-account-v2.log"));
    child.stdout!.pipe(log);
    child.stderr!.pipe(log);
    await new Promise<void>((ok, fail) => {
      const timer = setTimeout(
        () => fail(Error("QA app readiness timeout")),
        60000,
      );
      child.once("error", fail);
      child.once("exit", () => fail(Error("QA app exited before readiness")));
      child.stdout!.on("data", (c) => {
        if (String(c).includes("Ready in")) {
          clearTimeout(timer);
          ok();
        }
      });
    });
    environments.push({
      role,
      url: "http://127.0.0.1:" + port,
      email: credentials.accounts.find((a: { role: string }) => a.role === role)
        .email,
    });
  }
  assert.equal(sha(readFileSync(".env.local")), envFingerprint);
  writeFileSync(
    statePath,
    JSON.stringify({
      ...state,
      authVersion: 2,
      stopPath,
      expiresAt,
      runnerPid: process.pid,
      serverPids: servers.map((c) => c.pid),
      environments,
      sourceGeneration: generation,
    }),
  );
  console.log(
    JSON.stringify({
      status: "LOCAL_AUTH_QA_RUNNING",
      expiresAt,
      environments,
      credentialsPreserved: true,
      hostedConnections: 0,
    }),
  );
  while (Date.now() < expiresAt && !existsSync(stopPath)) {
    if (
      servers.some(
        (child) => child.exitCode !== null || child.signalCode !== null,
      )
    )
      throw Error(
        "Owned local QA app exited; no unrelated process will be restarted or killed",
      );
    await new Promise((ok) => setTimeout(ok, 1000));
  }
}
void main()
  .catch((error) => {
    writeFileSync(
      join(privateRoot, "account-start-error.log"),
      String(error?.stack || error),
    );
    console.error(
      "Local account QA startup failed; private diagnostics withheld. Existing credentials and fixtures were preserved.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const child of servers)
      if (child.pid && child.exitCode === null && child.signalCode === null)
        spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
          stdio: "ignore",
          windowsHide: true,
        });
    for (const client of connections) await client.end({ timeout: 5 });
    if (startedPg) pgRun(["-D", directory, "-m", "fast", "-w", "stop"]);
    console.log(
      "Only this launch's local QA processes stopped; fixture and credentials retained.",
    );
  });
