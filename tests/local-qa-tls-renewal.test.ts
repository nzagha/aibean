import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createPublicKey, X509Certificate } from "node:crypto";
import { createServer, connect } from "node:tls";
import { once } from "node:events";
import {
  approvedRun,
  installTrust,
  opensslPath,
  sha,
  target,
  validateCertificate,
  withPin,
} from "../scripts/local-website-qa/tls-renewal-v1/policy";
test("renewal rejects hosted/wrong identity, changed pin and unexpected destination", () => {
  const workspace = resolve("synthetic"),
    cp = join(workspace, "private", "credentials.json");
  const s = {
    run: approvedRun,
    root: join(workspace, "test-results", "product-acceptance-" + approvedRun),
    credentialsPath: cp,
    authVersion: 2,
    sourceGeneration: "synthetic",
  };
  const r = {
    run: approvedRun,
    database: "postgres",
    username: "aibean_app_login",
    connectionString:
      "postgresql://aibean_app_login:" +
      "a".repeat(64) +
      "@127.0.0.1:12345/postgres",
    expiresAt: 0,
    caSha256: sha("old"),
  };
  assert.equal(target(s, r, workspace, cp).hostname, "127.0.0.1");
  for (const change of [
    {
      connectionString: r.connectionString.replace(
        "127.0.0.1",
        "example.invalid",
      ),
    },
    { database: "other" },
    { username: "postgres" },
    {
      connectionString: r.connectionString.replace(
        "aibean_app_login:",
        "postgres:",
      ),
    },
    { connectionString: r.connectionString.replace("12345", "5432") },
  ])
    assert.throws(() => target(s, { ...r, ...change }, workspace, cp));
  assert.throws(() => target({ ...s, root: workspace }, r, workspace, cp));
  assert.throws(() => target({ ...s, run: "b".repeat(32) }, r, workspace, cp));
  assert.throws(() =>
    withPin(
      { ...r, caSha256: sha("drift") },
      Buffer.from("old"),
      Buffer.from("new"),
    ),
  );
  const next = withPin(r, Buffer.from("old"), Buffer.from("new"));
  assert.deepEqual({ ...next, caSha256: r.caSha256 }, r);
});
test("native synthetic certificate renewal retains key, verifies strict TLS and fails wrong host/expiry", async () => {
  const root = mkdtempSync(join(tmpdir(), "aibean-tls-renewal-test-"));
  const key = join(root, "synthetic.key"),
    old = join(root, "old.crt"),
    fresh = join(root, "new.crt"),
    extra = join(root, "extra.crt");
  const run = (args: string[]) =>
    execFileSync(opensslPath(), args, {
      stdio: "ignore",
      windowsHide: true,
      timeout: 30_000,
    });
  try {
    const common = [
      "-sha256",
      "-subj",
      "/CN=localhost",
      "-addext",
      "basicConstraints=critical,CA:TRUE",
    ];
    run([
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-days",
      "2",
      ...common,
      "-addext",
      "subjectAltName=DNS:localhost,IP:127.0.0.1",
      "-keyout",
      key,
      "-out",
      old,
    ]);
    const keyBefore = sha(readFileSync(key));
    run([
      "req",
      "-x509",
      "-key",
      key,
      "-days",
      "7",
      ...common,
      "-addext",
      "subjectAltName=DNS:localhost,IP:127.0.0.1",
      "-out",
      fresh,
    ]);
    assert.equal(sha(readFileSync(key)), keyBefore);
    const oldKey = new X509Certificate(readFileSync(old)).publicKey.export({
      type: "spki",
      format: "der",
    });
    const cert = validateCertificate(readFileSync(fresh), oldKey);
    assert.equal(cert.ca, true);
    assert.throws(() =>
      validateCertificate(
        readFileSync(fresh),
        oldKey,
        Date.now() + 8 * 86400_000,
      ),
    );
    assert.throws(() =>
      validateCertificate(readFileSync(fresh), Buffer.from("wrong-key")),
    );
    run([
      "req",
      "-x509",
      "-key",
      key,
      "-days",
      "7",
      ...common,
      "-addext",
      "subjectAltName=DNS:localhost,IP:127.0.0.1,DNS:example.invalid",
      "-out",
      extra,
    ]);
    assert.throws(() => validateCertificate(readFileSync(extra), oldKey));
    const server = createServer(
      { key: readFileSync(key), cert: readFileSync(fresh) },
      (s) => s.end(),
    );
    server.on("tlsClientError", () => {});
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const addr = server.address();
    assert(addr && typeof addr !== "string");
    const client = (host: string) =>
      new Promise<boolean>((ok) => {
        const s = connect({
          host: "127.0.0.1",
          port: addr.port,
          servername: host,
          ca: readFileSync(fresh),
          rejectUnauthorized: true,
        });
        s.setTimeout(5000);
        s.once("secureConnect", () => {
          const good = s.authorized;
          s.destroy();
          ok(good);
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
    try {
      assert.equal(await client("localhost"), true);
      assert.equal(await client("wrong.invalid"), false);
    } finally {
      await new Promise<void>((ok) => server.close(() => ok()));
    }
    assert.deepEqual(
      createPublicKey(readFileSync(key)).export({
        type: "spki",
        format: "der",
      }),
      oldKey,
    );
  } finally {
    assert(root.startsWith(join(tmpdir(), "aibean-tls-renewal-test-")));
    rmSync(root, { recursive: true, force: true });
  }
});
test("two-file failure retains original trust metadata and never changes key or database fixtures", () => {
  const root = mkdtempSync(join(tmpdir(), "aibean-tls-renewal-files-"));
  try {
    const cert = join(root, "cert"),
      runtime = join(root, "runtime"),
      journal = join(root, "journal");
    mkdirSync(journal);
    const original = Buffer.from("old-public-cert"),
      replacement = Buffer.from("new-public-cert"),
      metadata = Buffer.from(
        JSON.stringify({
          caSha256: sha(original),
          connectionString: "synthetic-only",
          run: "unchanged",
        }),
      );
    writeFileSync(cert, original);
    writeFileSync(runtime, metadata);
    writeFileSync(join(root, "synthetic-key"), "preserved");
    assert.throws(() =>
      installTrust(
        cert,
        runtime,
        original,
        metadata,
        replacement,
        journal,
        () => {
          throw Error("injected metadata failure");
        },
      ),
    );
    assert.deepEqual(
      readFileSync(join(journal, "expired-certificate.crt")),
      original,
    );
    assert.deepEqual(
      readFileSync(join(journal, "previous-runtime.json")),
      metadata,
    );
    assert.deepEqual(readFileSync(runtime), metadata);
    assert.equal(
      readFileSync(join(root, "synthetic-key"), "utf8"),
      "preserved",
    );
    assert.equal(
      JSON.parse(readFileSync(join(journal, "operation.json"), "utf8")).stage,
      "certificate-replaced-target-must-stay-stopped",
    );
    assert.throws(() =>
      installTrust(cert, runtime, original, metadata, replacement, journal),
    );
  } finally {
    assert(root.startsWith(join(tmpdir(), "aibean-tls-renewal-files-")));
    rmSync(root, { recursive: true, force: true });
  }
});
test("renewal CLI rejects unapproved arguments with bounded diagnostics before target access", () => {
  const root = mkdtempSync(join(tmpdir(), "aibean-tls-renewal-cli-"));
  try {
    mkdirSync(join(root, "docs", "evidence"), { recursive: true });
    const child = spawnSync(
      process.execPath,
      [
        resolve("node_modules/tsx/dist/cli.mjs"),
        resolve("scripts/local-website-qa/tls-renewal-v1/execute.ts"),
        "--not-authorized-private-sentinel",
      ],
      { cwd: root, encoding: "utf8", windowsHide: true, timeout: 15_000 },
    );
    assert.equal(child.status, 1);
    assert(!child.stderr.includes("private-sentinel"));
    assert(!child.stderr.includes(root));
    const report = JSON.parse(
      readFileSync(
        join(root, "docs/evidence/local-qa-tls-renewal-v1-result.json"),
        "utf8",
      ),
    );
    assert.equal(report.databaseStarted, false);
    assert.equal(report.stage, "bootstrap-preflight");
    assert.equal(report.privateValuesDisclosed, false);
  } finally {
    assert(root.startsWith(join(tmpdir(), "aibean-tls-renewal-cli-")));
    rmSync(root, { recursive: true, force: true });
  }
});
