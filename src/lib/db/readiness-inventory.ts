import { sql, type SQL } from "drizzle-orm";

// Diagnostics must not require private Auth/TestUsers privileges from the
// restricted runtime. Catalog visibility is distinct from relation access.
export async function inspectReadinessCounts(
  execute: (statement: SQL) => Promise<Record<string, unknown>[]>,
) {
  const [permissions] = await execute(sql`
    SELECT
      has_schema_privilege(current_user,'auth','USAGE') AND
        COALESCE((SELECT has_table_privilege(current_user,c.oid,'SELECT')
          FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='auth' AND c.relname='users'),false) AS auth_read,
      COALESCE((SELECT has_schema_privilege(current_user,'public','USAGE') AND
        has_table_privilege(current_user,c.oid,'SELECT')
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relname='TestUsers'),false) AS testusers_read`);
  const authUsersCount =
    permissions.auth_read === true
      ? (await execute(sql`SELECT count(*) AS count FROM auth.users`))[0].count
      : null;
  const testUsersCount =
    permissions.testusers_read === true
      ? (
          await execute(sql`SELECT count(*) AS count FROM public."TestUsers"`)
        )[0].count
      : null;
  const [ledgers] = await execute(sql`
    SELECT
      (SELECT n.nspname||'.'||c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='drizzle' AND c.relname='__drizzle_migrations') AS drizzle,
      (SELECT n.nspname||'.'||c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='supabase_migrations' AND c.relname='schema_migrations') AS supabase`);
  return {
    authUsersCount,
    testUsersCount,
    ledgers,
    authUsersCountVerified: permissions.auth_read === true,
    testUsersCountVerified: permissions.testusers_read === true,
  };
}
