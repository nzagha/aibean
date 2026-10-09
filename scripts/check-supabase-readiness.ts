import { config } from "dotenv";
import postgres from "postgres";
import {
  publicSupabaseConfig,
  SUPABASE_PROJECT_REF,
} from "../src/lib/supabase/config";
import { verifiedDatabaseConfig } from "../src/lib/db/tls-config";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql as query } from "drizzle-orm";

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
  const connection = verifiedDatabaseConfig();
  let hostnameVerified = false;
  const verifyHostname = connection.options.ssl.checkServerIdentity!;
  connection.options.ssl.checkServerIdentity = (hostname, certificate) => {
    const error = verifyHostname(hostname, certificate);
    if (!error) hostnameVerified = true;
    return error;
  };
  const sql = postgres(connection.connectionString, connection.options);
  try {
    const orm = drizzle(sql);
    const result = await orm.transaction(
      async (tx) => {
        const [identity] = await tx.execute(query`
        SELECT current_database() AS database_name,
               current_user AS database_role,
               current_setting('transaction_read_only') AS read_only,
               (SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()) AS tls,
               (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS bypass_rls,
               current_schema() AS selected_schema,
               current_setting('server_version') AS server_version,
               (SELECT rolcreatedb FROM pg_roles WHERE rolname = current_user) AS create_database,
               (SELECT rolcreaterole FROM pg_roles WHERE rolname = current_user) AS create_role,
               (SELECT rolreplication FROM pg_roles WHERE rolname = current_user) AS replication,
               (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS superuser`);
        const tables = await tx.execute(query`
        SELECT c.relname AS name, c.relrowsecurity AS rls
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r','p') ORDER BY c.relname`);
        const [ledgers] = await tx.execute(query`
        SELECT to_regclass('drizzle.__drizzle_migrations')::text AS drizzle,
               to_regclass('supabase_migrations.schema_migrations')::text AS supabase`);
        const [metadata] = await tx.execute(query`
          SELECT
            (SELECT jsonb_agg(nspname ORDER BY nspname) FROM pg_namespace
             WHERE nspname NOT LIKE 'pg_%' AND nspname <> 'information_schema') AS schemas,
            (SELECT count(*) FROM auth.users) AS auth_users_count,
            (SELECT jsonb_agg(jsonb_build_object('table',tablename,'command',cmd,'roles',roles,'using',qual,'check',with_check))
             FROM pg_policies WHERE schemaname='public') AS public_policies,
            (SELECT count(*) FROM information_schema.table_privileges
             WHERE table_schema='public' AND grantee IN ('anon','authenticated')) AS browser_table_grant_count,
            (SELECT jsonb_agg(jsonb_build_object('owner',pg_get_userbyid(defaclrole),'acl',defaclacl::text))
             FROM pg_default_acl d JOIN pg_namespace n ON n.oid=d.defaclnamespace
             WHERE n.nspname='public' AND defaclobjtype='r') AS public_default_table_grants`);
        const testUsersCount = tables.some(
          (table) => table.name === "TestUsers",
        )
          ? (
              await tx.execute(
                query`SELECT count(*) AS count FROM public."TestUsers"`,
              )
            )[0].count
          : null;
        return { identity, tables, ledgers, metadata, testUsersCount };
      },
      { accessMode: "read only" },
    );
    const transportVerified =
      result.identity.database_name === "postgres" &&
      result.identity.read_only === "on" &&
      result.identity.tls === true;
    const restrictedRole =
      result.identity.superuser === false &&
      result.identity.bypass_rls === false &&
      result.identity.create_database === false &&
      result.identity.create_role === false &&
      result.identity.replication === false;
    console.log(
      JSON.stringify({
        databaseReachable: true,
        drizzleSelectVerified: true,
        hostnameVerified,
        transportVerified,
        restrictedRole,
        connectionMode: connection.mode,
        ...result,
        applicationReady: false, // Migration/capability/provider gates remain separate.
      }),
    );
    if (!transportVerified || !hostnameVerified || !restrictedRole)
      process.exitCode = 1;
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
