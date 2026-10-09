import { readFileSync } from "node:fs";
import { X509Certificate } from "node:crypto";
import { checkServerIdentity, type ConnectionOptions } from "node:tls";
import { hostedDatabaseConfig } from "./connection-config";

export function verifiedDatabaseConfig(
  value = process.env.DATABASE_URL,
  caPath = process.env.DATABASE_CA_CERT_PATH,
) {
  const connection = hostedDatabaseConfig(value);
  if (!caPath)
    throw new Error(
      "DATABASE_CA_CERT_PATH is required for verified database TLS.",
    );
  let ca: string;
  try {
    ca = readFileSync(caPath, "utf8");
    const certificate = new X509Certificate(ca);
    if (
      !certificate.ca ||
      Date.parse(certificate.validTo) <= Date.now() ||
      Date.parse(certificate.validFrom) > Date.now()
    ) {
      throw new Error("Invalid CA");
    }
  } catch {
    throw new Error(
      "Database CA certificate cannot be read or is invalid; private path redacted.",
    );
  }
  const parsed = new URL(connection.connectionString);
  // Explicit options take precedence; remove URL SSL options so driver-specific
  // interpretations of sslmode=require cannot weaken certificate verification.
  parsed.search = "";
  const ssl: ConnectionOptions & { rejectUnauthorized: true } = {
    ca,
    rejectUnauthorized: true,
    servername: parsed.hostname,
    checkServerIdentity: (_hostname, certificate) =>
      checkServerIdentity(parsed.hostname, certificate),
  };
  return {
    ...connection,
    connectionString: parsed.toString(),
    options: { ...connection.options, ssl },
    // Drizzle Kit's PostgreSQL driver accepts structured credentials plus TLS.
    kitCredentials: {
      host: parsed.hostname,
      port: Number(parsed.port || 5432),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: "postgres",
      ssl,
    },
  };
}
