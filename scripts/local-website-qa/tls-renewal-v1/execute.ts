// One guarded renewal of the existing LOCAL fixture. Never initializes SQL.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createPublicKey, X509Certificate } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  closeSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { join, dirname, resolve } from "node:path";
import { createServer, createConnection } from "node:net";
import { checkServerIdentity, type PeerCertificate } from "node:tls";
import postgres from "postgres";
import { qaCredentialPath } from "../guards";
import { passwordAccountId } from "../../../src/lib/password-crypto";
import {
  approvedRun,
  installTrust,
  opensslPath,
  sha,
  target,
  validateCertificate,
} from "./policy";
// Bootstrap assertions must not expose a private path or connection in Node's
// default assertion formatter. No target has been started at this stage.
process.once("uncaughtException", () => {
  const report = {
    status: "FAIL",
    stage: "bootstrap-preflight",
    privateValuesDisclosed: false,
    databaseStarted: false,
    automaticRetry: false,
    hostedConnections: 0,
  };
  try {
    writeFileSync(
      "docs/evidence/local-qa-tls-renewal-v1-result.json",
      JSON.stringify(report, null, 2) + "\n",
    );
  } catch {
    // Failure to write public evidence must never expose the private assertion.
  }
  console.error(
    "Local TLS renewal preflight failed; private diagnostics withheld. No automatic retry.",
  );
  process.exitCode = 1;
});
const packagePath = "db/proposals/local-qa-tls-renewal-v1.json";
assert.equal(process.platform, "win32");
assert(
  process.argv.length === 4 &&
    process.argv[2] === "--execute" &&
    /^--package-sha256=[a-f0-9]{64}$/.test(process.argv[3]),
  "Exact execution mode/hash required",
);
assert.equal(
  sha(readFileSync(packagePath)),
  process.argv[3].split("=")[1],
  "Renewal package seal mismatch",
);
const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
assert.equal(pkg.run, approvedRun);
for (const file of pkg.files)
  assert.equal(
    sha(readFileSync(file.path, "utf8").replaceAll("\r\n", "\n")),
    file.canonicalLfSha256,
    "Renewal dependency changed",
  );
for (const predecessor of pkg.predecessors) {
  assert.equal(
    sha(readFileSync(predecessor.path)),
    predecessor.sha256,
    "Historical manifest changed",
  );
  const m = JSON.parse(readFileSync(predecessor.path, "utf8"));
  for (const file of m.files)
    assert.equal(
      file.sha256
        ? sha(readFileSync(file.path))
        : sha(readFileSync(file.path, "utf8").replaceAll("\r\n", "\n")),
      file.sha256 || file.canonicalLfSha256,
      "Historical dependency changed",
    );
}
assert.equal(
  execFileSync("git", ["branch", "--show-current"], {
    encoding: "utf8",
  }).trim(),
  "codex/supabase-foundation",
);
const statePath = resolve("test-results/local-website-qa-active.json"),
  state = JSON.parse(readFileSync(statePath, "utf8"));
const runtimePath = join(state.root, "runtime.json"),
  runtimeBytes = readFileSync(runtimePath),
  runtime = JSON.parse(runtimeBytes.toString());
const url = target(
  state,
  runtime,
  process.cwd(),
  qaCredentialPath(approvedRun),
);
const root = state.root,
  cluster = join(root, "cluster"),
  certPath = join(root, "fixture-ca.crt"),
  keyPath = join(root, "fixture-server.key"),
  privateRoot = dirname(state.credentialsPath);
for (const path of [root, cluster, certPath, keyPath, runtimePath]) {
  assert(!lstatSync(path).isSymbolicLink());
  assert.equal(realpathSync(path), path, "Fixture path redirect");
}
assert(!lstatSync(privateRoot).isSymbolicLink());
assert(!lstatSync(state.credentialsPath).isSymbolicLink());
const oldCert = readFileSync(certPath),
  oldKeyHash = sha(readFileSync(keyPath));
assert.equal(sha(oldCert), runtime.caSha256);
assert.equal(
  runtime.caSha256,
  pkg.expectedOldCertificateSha256,
  "Old certificate not approved",
);
assert(
  Date.parse(new X509Certificate(oldCert).validTo) < Date.now(),
  "This package is only for the expired fixture certificate",
);
const config = readFileSync(join(cluster, "postgresql.conf"), "utf8");
for (const expected of [
  "listen_addresses='127.0.0.1'",
  "cluster_name='aibean-acceptance-" + approvedRun + "'",
  "port=" + url.port,
  "ssl=on",
]) {
  assert(config.includes(expected), "Owned PostgreSQL config drift");
}
assert(
  config.includes("ssl_cert_file='" + certPath.replaceAll("\\", "/") + "'"),
);
assert(config.includes("ssl_key_file='" + keyPath.replaceAll("\\", "/") + "'"));
const saved = JSON.parse(
  readFileSync(join(privateRoot, "phase2-before-restart.json"), "utf8"),
);
assert.equal(saved.continuity.length, 66);
assert(/^[a-f0-9]{64}$/.test(saved.accounts));
const handoff = JSON.parse(readFileSync(state.credentialsPath, "utf8"));
assert.equal(handoff.run, approvedRun);
assert.equal(handoff.accounts.length, 4);
assert.equal(sha(JSON.stringify(handoff.accounts)), saved.credentials);
const mailboxBefore = sha(JSON.stringify(handoff.mailbox));
const privateAuthPath = join(privateRoot, "qa-auth.json"),
  privateAuthBefore = sha(readFileSync(privateAuthPath));
assert.equal(sha(readFileSync(".env.local")), saved.privateEnvironment);
const bin = resolve("test-results/postgres-validation/portable/pgsql/bin"),
  ctl = join(bin, "pg_ctl.exe");
const control = (args: string[]) =>
  spawnSync(ctl, args, { stdio: "ignore", windowsHide: true, timeout: 60_000 })
    .status;
assert.equal(
  control(["status", "-D", cluster]),
  3,
  "Owned cluster must be stopped",
);
const psEnv = { ...process.env };
delete psEnv.PSModulePath;
const ps = (file: string, args: string[] = []) =>
  execFileSync("powershell.exe", ["-NoProfile", "-File", file, ...args], {
    env: psEnv,
    stdio: "ignore",
    windowsHide: true,
    timeout: 30_000,
  });
let stage = "preflight",
  started = false,
  pg: ReturnType<typeof postgres> | undefined,
  certificateReplaced = false,
  prerequisitesPassed = false;
const reportPath = "docs/evidence/local-qa-tls-renewal-v1-result.json";
async function noListeners() {
  for (const port of [3000, 3002, 3003, 3004]) {
    const s = createServer();
    await new Promise<void>((ok, fail) => {
      s.once("error", () => fail(Error("QA port occupied")));
      s.listen(port, "127.0.0.1", ok);
    });
    await new Promise<void>((ok) => s.close(() => ok()));
  }
}
async function listening(port: number) {
  return new Promise<boolean>((ok) => {
    const s = createConnection({ host: "127.0.0.1", port });
    s.setTimeout(1000);
    s.once("connect", () => {
      s.destroy();
      ok(true);
    });
    s.once("error", () => {
      s.destroy();
      ok(false);
    });
    s.once("timeout", () => {
      s.destroy();
      ok(false);
    });
  });
}
async function main() {
  await noListeners();
  ps("scripts/local-website-qa/protect-credentials.ps1", [
    "-Root",
    privateRoot,
  ]);
  const lock = join(privateRoot, "tls-renewal-v1.lock");
  assert(
    !existsSync(lock),
    "One-execution renewal lock already exists; operator review required",
  );
  closeSync(openSync(lock, "wx"));
  const journal = join(privateRoot, "tls-renewal-v1-" + Date.now());
  mkdirSync(journal);
  const fresh = join(journal, "renewed-certificate.crt");
  stage = "prepare-seven-day-certificate";
  execFileSync(
    opensslPath(),
    [
      "req",
      "-x509",
      "-key",
      keyPath,
      "-sha256",
      "-days",
      "7",
      "-subj",
      "/CN=localhost",
      "-addext",
      "subjectAltName=DNS:localhost,IP:127.0.0.1",
      "-addext",
      "basicConstraints=critical,CA:TRUE",
      "-out",
      fresh,
    ],
    { stdio: "ignore", windowsHide: true, timeout: 30_000 },
  );
  const nextCert = readFileSync(fresh),
    oldPublicKey = new X509Certificate(oldCert).publicKey.export({
      type: "spki",
      format: "der",
    });
  const cert = validateCertificate(nextCert, oldPublicKey);
  assert.deepEqual(
    createPublicKey(readFileSync(keyPath)).export({
      type: "spki",
      format: "der",
    }),
    oldPublicKey,
  );
  assert.equal(sha(readFileSync(keyPath)), oldKeyHash);
  assert.equal(control(["status", "-D", cluster]), 3);
  await noListeners();
  stage = "replace-only-certificate-and-pin";
  installTrust(certPath, runtimePath, oldCert, runtimeBytes, nextCert, journal);
  certificateReplaced = true;
  assert.equal(sha(readFileSync(privateAuthPath)), privateAuthBefore);
  stage = "strict-local-tls-continuity";
  assert.equal(
    control([
      "start",
      "-D",
      cluster,
      "-l",
      join(journal, "postgres-continuity.log"),
      "-w",
    ]),
    0,
  );
  started = true;
  pg = postgres({
    host: "127.0.0.1",
    port: Number(url.port),
    database: "postgres",
    username: "cluster_admin",
    password: url.password,
    max: 1,
    prepare: false,
    onnotice: () => {},
    ssl: {
      ca: nextCert.toString(),
      rejectUnauthorized: true,
      servername: "localhost",
      checkServerIdentity: (_host: string, peer: PeerCertificate) =>
        checkServerIdentity("127.0.0.1", peer),
    },
  });
  const snapshot = await pg.begin("read only", async (tx) => {
    const [identity] =
      await tx`select current_database() as db,current_user as actor,host(inet_server_addr()) as host,current_setting('cluster_name') as cluster,(select ssl from pg_stat_ssl where pid=pg_backend_pid()) as tls`;
    assert.deepEqual(
      { ...identity },
      {
        db: "postgres",
        actor: "cluster_admin",
        host: "127.0.0.1",
        cluster: "aibean-acceptance-" + approvedRun,
        tls: true,
      },
    );
    const tables =
      await tx`select tablename from pg_tables where schemaname='local_qa_auth' order by tablename`;
    assert.deepEqual(
      tables.map((t) => t.tablename),
      ["accounts", "mail", "rates", "sessions", "tokens", "version"],
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
    for (const a of handoff.accounts) {
      const id = passwordAccountId(a.email);
      const [account] =
        await tx`select user_id,confirmed from local_qa_auth.accounts where email=${a.email}`;
      assert.equal(account?.user_id, id);
      assert.equal(account.confirmed, true);
      const [u] =
        await tx`select is_admin,is_creator from public.users where id=${id}`;
      assert.equal(u.is_admin, a.role === "admin");
      assert.equal(u.is_creator, a.role === "creator");
    }
    const accounts =
      await tx`select user_id,email,password_hash,confirmed from local_qa_auth.accounts order by user_id`;
    const relations =
      await tx`select schemaname,tablename from pg_tables where schemaname in ('public','aibean_private','drizzle') order by schemaname,tablename`;
    const continuity = [];
    for (const t of relations) {
      const [row] =
        await tx`select count(*)::int as count,md5(coalesce(string_agg(md5(row_to_json(t)::text),'' order by md5(row_to_json(t)::text)),'')) as digest from ${tx(t.schemaname + "." + t.tablename)} t`;
      continuity.push({ schema: t.schemaname, table: t.tablename, ...row });
    }
    return {
      accounts: sha(JSON.stringify(accounts)),
      credentials: sha(JSON.stringify(handoff.accounts)),
      continuity,
      privateEnvironment: sha(readFileSync(".env.local")),
    };
  });
  assert.deepEqual(
    snapshot,
    saved,
    "Protected continuity evidence differs; no repair or launcher permitted",
  );
  await pg.end({ timeout: 5 });
  pg = undefined;
  assert.equal(control(["stop", "-D", cluster, "-m", "fast", "-w"]), 0);
  started = false;
  prerequisitesPassed = true;
  stage = "resume-reviewed-eight-hour-preview";
  ps("scripts/local-website-qa/start-account-testing.ps1", [
    "-LeaseHours",
    "8",
  ]);
  const deadline = Date.now() + 120_000;
  let current = state;
  while (
    current.sourceGeneration === state.sourceGeneration ||
    !(await Promise.all([3000, 3002, 3003, 3004].map(listening))).every(Boolean)
  ) {
    assert(
      Date.now() < deadline,
      "Preview did not become ready; do not retry automatically",
    );
    await new Promise((ok) => setTimeout(ok, 500));
    current = JSON.parse(readFileSync(statePath, "utf8"));
  }
  assert.equal(current.run, state.run);
  assert.equal(current.root, root);
  assert.equal(current.credentialsPath, state.credentialsPath);
  stage = "verify-four-unchanged-passwords-and-mailbox";
  const currentHandoff = JSON.parse(
    readFileSync(state.credentialsPath, "utf8"),
  );
  assert.equal(sha(JSON.stringify(currentHandoff.accounts)), saved.credentials);
  assert.equal(sha(JSON.stringify(currentHandoff.mailbox)), mailboxBefore);
  assert.equal(sha(readFileSync(keyPath)), oldKeyHash);
  for (const a of currentHandoff.accounts) {
    const origin = new URL(a.url).origin;
    assert(
      [
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3003",
        "http://127.0.0.1:3004",
      ].includes(origin),
    );
    const r = await fetch(origin + "/api/auth/login", {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        email: a.email,
        password: a.password,
        returnTo: "/account",
      }),
      redirect: "manual",
      signal: AbortSignal.timeout(90000),
    });
    assert.equal(r.status, 303);
    assert.equal(r.headers.get("location"), origin + "/account");
    assert((r.headers.get("set-cookie") || "").includes("HttpOnly"));
  }
  const mail = await fetch("http://127.0.0.1:3000/api/local-qa/mailbox", {
    method: "POST",
    headers: {
      Origin: "http://127.0.0.1:3000",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ password: currentHandoff.mailbox.password }),
    redirect: "manual",
    signal: AbortSignal.timeout(90000),
  });
  assert.equal(mail.status, 303);
  assert(
    (mail.headers.get("set-cookie") || "").startsWith(
      "aibean_local_qa_mailbox=",
    ),
  );
  const result = {
    status: "PASS",
    capturedAt: new Date().toISOString(),
    packageSha256: sha(readFileSync(packagePath)),
    newCertificateExpiresAt: new Date(cert.validTo).toISOString(),
    strictTlsAndHostname: true,
    samePrivateKey: true,
    certificateAndPinOnly: true,
    applicationRelationsPreserved: 66,
    registeredIdentitiesAndHashesPreserved: true,
    allFourOriginalPasswordsVerified: true,
    mailboxVerified: true,
    originalArtifactsRetained: true,
    runnerPid: current.runnerPid,
    leaseExpiresAt: new Date(current.expiresAt).toISOString(),
    databaseSchemasModified: false,
    hostedConnections: 0,
  };
  writeFileSync(reportPath, JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
}
void main().catch(async (error: unknown) => {
  if (pg) await pg.end({ timeout: 5 }).catch(() => {});
  if (started) {
    control(["stop", "-D", cluster, "-m", "fast", "-w"]);
    started = false;
  }
  // Once the reviewed preview has started it owns PostgreSQL. Graceful stop only.
  if (prerequisitesPassed && stage !== "strict-local-tls-continuity")
    try {
      ps("scripts/local-website-qa/stop.ps1");
    } catch {
      // Preserve the original bounded failure; never kill or recreate a target.
    }
  const err = error as { code?: string };
  const result = {
    status: "FAIL",
    capturedAt: new Date().toISOString(),
    stage,
    category: /^[A-Z0-9_]{1,30}$/.test(err.code || "")
      ? err.code
      : "ASSERTION_OR_LOCAL_SETUP",
    certificateReplaced,
    prerequisitesPassed,
    automaticRetry: false,
    originalArtifactsRetained: true,
    privateValuesDisclosed: false,
    hostedConnections: 0,
  };
  writeFileSync(reportPath, JSON.stringify(result, null, 2) + "\n");
  console.error(JSON.stringify(result));
  process.exitCode = 1;
});
