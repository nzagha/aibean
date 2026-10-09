import { SUPABASE_PROJECT_REF } from "../supabase/config";
import { hostedDatabaseConfig } from "./connection-config";
import { verifiedDatabaseConfig } from "./tls-config";

// Application traffic must never fall back to the private migration operator.
export function assertRuntimeConnection(value: string | undefined) {
  const connection = hostedDatabaseConfig(value);
  const url = new URL(connection.connectionString);
  const expected =
    connection.mode === "direct"
      ? "aibean_app_login"
      : `aibean_app_login.${SUPABASE_PROJECT_REF}`;
  if (
    decodeURIComponent(url.username) !== expected ||
    !["5432", "6543"].includes(url.port || "5432") ||
    (connection.mode === "direct" && url.port && url.port !== "5432")
  ) {
    throw new Error(
      "Application database requires the approved restricted runtime login; connection redacted.",
    );
  }
}

export function runtimeDatabaseConfig(
  value = process.env.DATABASE_URL,
  caPath = process.env.DATABASE_CA_CERT_PATH,
) {
  assertRuntimeConnection(value);
  return verifiedDatabaseConfig(value, caPath);
}
