import { readFileSync, realpathSync } from "node:fs";
import { createHash, X509Certificate } from "node:crypto";
import { resolve, join } from "node:path";
import { checkServerIdentity, type PeerCertificate } from "node:tls";

// Explicit, short-lived development-only fixture. Never accepts an arbitrary
// connection, certificate path, production mode or hosted endpoint. The
// hosted runtime validator stays unchanged and remains the default path.
export function localAcceptanceConfig(
  env: Record<string, string | undefined> = process.env,
  workspace = process.cwd(),
  now = Date.now(),
) {
  if (!env.AIBEAN_LOCAL_ACCEPTANCE_RUN) return null;
  const run = env.AIBEAN_LOCAL_ACCEPTANCE_RUN;
  if (env.NODE_ENV !== "development" || !/^[a-f0-9]{32}$/.test(run))
    throw Error("Local acceptance requires an isolated development fixture.");
  const root = resolve(workspace, "test-results", "product-acceptance-" + run);
  const manifestPath = join(root, "runtime.json");
  const certPath = join(root, "fixture-ca.crt");
  if (
    realpathSync(certPath) !== certPath ||
    realpathSync(manifestPath) !== manifestPath
  )
    throw Error("Fixture paths cannot redirect outside their test directory.");
  const fixture = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (
    fixture.run !== run ||
    fixture.database !== "postgres" ||
    fixture.username !== "aibean_app_login" ||
    !Number.isInteger(fixture.expiresAt) ||
    fixture.expiresAt <= now ||
    fixture.expiresAt > now + 2 * 3600_000 ||
    fixture.connectionString !== env.DATABASE_URL
  )
    throw Error("Local acceptance manifest is unavailable or mismatched.");
  const url = new URL(fixture.connectionString);
  if (
    url.protocol !== "postgresql:" ||
    url.hostname !== "127.0.0.1" ||
    url.pathname !== "/postgres" ||
    url.username !== "aibean_app_login" ||
    !/^[a-f0-9]{64}$/.test(url.password) ||
    url.search ||
    url.hash ||
    Number(url.port) < 1024 ||
    Number(url.port) > 65535 ||
    [5432, 6543].includes(Number(url.port))
  )
    throw Error("Only the new loopback fixture runtime is permitted.");
  const ca = readFileSync(certPath, "utf8");
  if (createHash("sha256").update(ca).digest("hex") !== fixture.caSha256)
    throw Error("Fixture certificate integrity failed.");
  const cert = new X509Certificate(ca);
  if (
    !cert.ca ||
    Date.parse(cert.validTo) <= now ||
    Date.parse(cert.validFrom) > now
  )
    throw Error("Fixture trust certificate is invalid.");
  return {
    connectionString: fixture.connectionString as string,
    options: {
      prepare: false,
      ssl: {
        ca,
        rejectUnauthorized: true,
        servername: "localhost",
        checkServerIdentity: (_hostname: string, peer: PeerCertificate) =>
          checkServerIdentity("127.0.0.1", peer),
      },
      connection: { application_name: "aibean-local-acceptance-" + run },
    },
  };
}
