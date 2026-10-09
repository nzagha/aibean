import { SUPABASE_PROJECT_REF } from "../supabase/config";

// Validate a supplied URL without reconstructing or logging credentials.
export function hostedDatabaseConfig(value: string | undefined) {
  if (!value) throw new Error("DATABASE_URL is not configured.");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DATABASE_URL is invalid; value redacted.");
  }
  const direct = url.hostname === `db.${SUPABASE_PROJECT_REF}.supabase.co`;
  const pooled = /^[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname);
  const username = decodeURIComponent(url.username);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.pathname !== "/postgres" ||
    !username ||
    !url.password ||
    !(direct || (pooled && username.endsWith(`.${SUPABASE_PROJECT_REF}`))) ||
    url.hash ||
    [...url.searchParams.keys()].some((key) => key !== "sslmode") ||
    (url.searchParams.has("sslmode") &&
      !["require", "verify-ca", "verify-full"].includes(
        url.searchParams.get("sslmode")!,
      ))
  ) {
    throw new Error(
      "Use this project's official PostgreSQL connection settings with TLS; value redacted.",
    );
  }
  return {
    connectionString: value,
    mode: direct
      ? "direct"
      : url.port === "6543"
        ? "transaction-pooler"
        : "session-pooler",
    // prepare:false also supports transaction pooling. Never disable TLS checks.
    options: {
      prepare: false as const,
      max: 1,
      connect_timeout: 10,
      ssl: { rejectUnauthorized: true },
    },
  };
}
