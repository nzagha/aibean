import { config } from "dotenv";
import postgres from "postgres";
import {
  publicSupabaseConfig,
  SUPABASE_PROJECT_REF,
} from "../src/lib/supabase/config";
import { hostedDatabaseConfig } from "../src/lib/db/connection-config";

config({ path: ".env.local", quiet: true });

async function main() {
  const { url, publishableKey } = publicSupabaseConfig();
  const auth = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: publishableKey },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!auth.ok) throw new Error("Supabase Auth settings request failed.");
  const settings = await auth.json();
  console.log(
    JSON.stringify({
      projectRef: SUPABASE_PROJECT_REF,
      authReachable: true,
      emailEnabled: settings.external?.email === true,
      emailConfirmationRequired: settings.mailer_autoconfirm === false,
      phoneEnabled: settings.external?.phone === true,
      passkeysEnabled: settings.passkeys_enabled === true,
      // Configuration flags do not establish provider delivery or login success.
      loginFlowVerified: false,
    }),
  );
  if (!process.env.DATABASE_URL) {
    console.log(
      JSON.stringify({
        databaseReachable: false,
        reason: "DATABASE_URL missing",
      }),
    );
    process.exitCode = 1;
    return;
  }
  const connection = hostedDatabaseConfig(process.env.DATABASE_URL);
  const sql = postgres(connection.connectionString, connection.options);
  try {
    const result = await sql.begin("read only", async (tx) => {
      const [identity] = await tx`
        SELECT current_database() AS database_name,
               current_user AS database_role,
               current_setting('transaction_read_only') AS read_only,
               (SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()) AS tls,
               (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS bypass_rls,
               (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS superuser`;
      const tables = await tx`
        SELECT c.relname AS name, c.relrowsecurity AS rls
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r','p') ORDER BY c.relname`;
      const [ledgers] = await tx`
        SELECT to_regclass('drizzle.__drizzle_migrations')::text AS drizzle,
               to_regclass('supabase_migrations.schema_migrations')::text AS supabase`;
      return { identity, tables, ledgers };
    });
    const transportVerified =
      result.identity.database_name === "postgres" &&
      result.identity.read_only === "on" &&
      result.identity.tls === true;
    const restrictedRole =
      result.identity.superuser === false &&
      result.identity.bypass_rls === false;
    console.log(
      JSON.stringify({
        databaseReachable: true,
        transportVerified,
        restrictedRole,
        connectionMode: connection.mode,
        ...result,
        applicationReady: false, // Migration/capability/provider gates remain separate.
      }),
    );
    if (!transportVerified || !restrictedRole) process.exitCode = 1;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch(() => {
  // Driver/network errors can embed a connection string. Never log raw errors.
  console.error(
    "Readiness check failed. Verify local configuration, TLS and permissions; credentials redacted.",
  );
  process.exitCode = 1;
});
