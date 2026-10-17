import assert from "node:assert/strict";
import {
  createHash,
  createPublicKey,
  X509Certificate,
  type KeyObject,
} from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
export const sha = (v: string | Buffer) =>
  createHash("sha256").update(v).digest("hex");
export const approvedRun = "a30dde3c772abd9240b16ddfb358c12d";
export function opensslPath() {
  if (process.platform !== "win32") return "openssl";
  const exe = "C:/Program Files/Git/mingw64/bin/openssl.exe";
  assert(existsSync(exe), "Required native OpenSSL unavailable");
  return exe;
}
export type State = {
  run: string;
  root: string;
  credentialsPath: string;
  authVersion: number;
  sourceGeneration: string;
};
export type Runtime = {
  run: string;
  database: string;
  username: string;
  connectionString: string;
  caSha256: string;
  expiresAt: number;
};
export function target(
  state: State,
  runtime: Runtime,
  workspace: string,
  credentialsPath: string,
) {
  assert.equal(state.run, approvedRun);
  assert.equal(runtime.run, state.run);
  assert.equal(state.authVersion, 2);
  assert.equal(
    state.root,
    resolve(workspace, "test-results", "product-acceptance-" + state.run),
  );
  assert.equal(state.credentialsPath, credentialsPath);
  assert.equal(runtime.database, "postgres");
  assert.equal(runtime.username, "aibean_app_login");
  const u = new URL(runtime.connectionString);
  assert.equal(u.protocol, "postgresql:");
  assert.equal(u.hostname, "127.0.0.1");
  assert.equal(u.pathname, "/postgres");
  assert.equal(u.username, "aibean_app_login");
  assert(/^[a-f0-9]{64}$/.test(u.password));
  assert(!u.search && !u.hash);
  assert(
    Number(u.port) > 1024 &&
      Number(u.port) < 65536 &&
      ![5432, 6543].includes(Number(u.port)),
  );
  return u;
}
export function publicKey(key: string | Buffer | KeyObject) {
  return createPublicKey(key).export({ type: "spki", format: "der" });
}
export function validateCertificate(
  pem: string | Buffer,
  expectedPublicKey: Buffer,
  now = Date.now(),
) {
  const c = new X509Certificate(pem),
    from = Date.parse(c.validFrom),
    to = Date.parse(c.validTo);
  assert(c.ca && c.verify(c.publicKey), "Self-signed local CA required");
  assert.equal(c.subject, "CN=localhost");
  assert.equal(c.issuer, c.subject);
  assert.deepEqual(
    c.subjectAltName?.split(", ").sort(),
    ["DNS:localhost", "IP Address:127.0.0.1"].sort(),
  );
  assert.equal(c.checkHost("localhost"), "localhost");
  assert.equal(c.checkIP("127.0.0.1"), "127.0.0.1");
  assert(
    from <= now &&
      to > now &&
      to - from === 7 * 86400_000 &&
      to - now >= 7 * 86400_000 - 600_000,
    "Fresh seven-day validity required",
  );
  assert.equal(c.publicKey.asymmetricKeyType, "rsa");
  assert((c.publicKey.asymmetricKeyDetails?.modulusLength || 0) >= 2048);
  assert.deepEqual(
    c.publicKey.export({ type: "spki", format: "der" }),
    expectedPublicKey,
    "Existing private key must be preserved",
  );
  return c;
}
export function withPin(
  runtime: Runtime,
  oldCertificate: Buffer,
  newCertificate: Buffer,
) {
  assert.equal(sha(oldCertificate), runtime.caSha256, "Original pin drift");
  return { ...runtime, caSha256: sha(newCertificate) };
}
// The cluster must remain stopped across this two-file operation. The retained
// owner-only journal makes partial failure explicit; no automatic rollback/start.
export function installTrust(
  certPath: string,
  runtimePath: string,
  oldCert: Buffer,
  oldRuntime: Buffer,
  newCert: Buffer,
  journalRoot: string,
  beforeMetadataWrite?: () => void,
) {
  assert.equal(
    sha(readFileSync(certPath)),
    sha(oldCert),
    "Certificate changed before replacement",
  );
  assert.equal(
    sha(readFileSync(runtimePath)),
    sha(oldRuntime),
    "Runtime changed before replacement",
  );
  writeFileSync(join(journalRoot, "expired-certificate.crt"), oldCert, {
    flag: "wx",
  });
  writeFileSync(join(journalRoot, "previous-runtime.json"), oldRuntime, {
    flag: "wx",
    mode: 0o600,
  });
  const next = withPin(JSON.parse(oldRuntime.toString()), oldCert, newCert);
  writeFileSync(
    join(journalRoot, "operation.json"),
    JSON.stringify({ stage: "retained-originals" }),
  );
  writeFileSync(certPath, newCert);
  writeFileSync(
    join(journalRoot, "operation.json"),
    JSON.stringify({ stage: "certificate-replaced-target-must-stay-stopped" }),
  );
  beforeMetadataWrite?.();
  writeFileSync(runtimePath, JSON.stringify(next));
  assert.equal(sha(readFileSync(certPath)), next.caSha256);
  assert.deepEqual(JSON.parse(readFileSync(runtimePath, "utf8")), next);
  writeFileSync(
    join(journalRoot, "operation.json"),
    JSON.stringify({ stage: "certificate-and-pin-replaced" }),
  );
  return next;
}
