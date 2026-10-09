import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

// Offline generator only. No database driver, environment loading or execution.
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const journal = JSON.parse(
  readFileSync("db/migrations/meta/_journal.json", "utf8"),
) as {
  entries: { tag: string; when: number }[];
};
if (journal.entries.length !== 2)
  throw new Error(
    "Review the installation generator for the new migration chain.",
  );
const migrations = journal.entries.map((entry) => {
  const path = `db/migrations/${entry.tag}.sql`;
  // Git's source SQL is LF. Keep ledger checksums stable across Windows/Linux;
  // reject a historical ledger with different bytes rather than rewriting it.
  const sql = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  return { ...entry, path, sql, hash: hash(sql) };
});
const security = readFileSync(
  "db/install/identity-and-security.sql",
  "utf8",
).replace(/\r\n/g, "\n");
const securityHash = hash(security);
const packageId = "aibean-foundation-v1";
const tableNames = [
  "taxonomy",
  "users",
  "tools",
  "saved_tools",
  "stacks",
  "stack_tools",
  "tool_reviews",
  "vendor_access",
  "claim_requests",
  "orders",
  "billing_webhook_receipts",
  "audit_logs",
  "rate_limits",
  "featured_placements",
];
const sql = `-- GENERATED OFFLINE. PROPOSAL ONLY; owner approval required for hosted execution.
-- Target: yfknxidgphhepdtwazhn / postgres. Review endpoint outside SQL as well.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = public, pg_catalog;
SELECT pg_advisory_xact_lock(621487190);
DO $preflight$
BEGIN
  IF current_database() <> 'postgres' THEN RAISE EXCEPTION 'Unexpected database'; END IF;
  IF to_regclass('auth.users') IS NULL THEN RAISE EXCEPTION 'Supabase Auth schema required'; END IF;
  IF to_regclass('drizzle.__drizzle_migrations') IS NULL AND EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename IN (${tableNames.map((x) => `'${x}'`).join(",")})
  ) THEN RAISE EXCEPTION 'Untracked application tables; reconcile before installation'; END IF;
END
$preflight$;
CREATE SCHEMA IF NOT EXISTS drizzle;
REVOKE ALL ON SCHEMA drizzle FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint);
REVOKE ALL ON drizzle.__drizzle_migrations FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA drizzle FROM PUBLIC, anon, authenticated, service_role;
DO $history$
BEGIN
  IF EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE ${migrations.map((m) => `(created_at IS DISTINCT FROM ${m.when} OR hash IS DISTINCT FROM '${m.hash}')`).join(" AND ")})
  OR EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations GROUP BY created_at HAVING count(*) > 1)
  THEN RAISE EXCEPTION 'Migration ledger mismatch'; END IF;
  IF EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at=${migrations[1].when})
  AND NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at=${migrations[0].when})
  THEN RAISE EXCEPTION 'Migration ledger is not a contiguous prefix'; END IF;
END
$history$;
${migrations
  .map(
    (m, index) => `DO $migration_${index}$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at=${m.when}) THEN
${m.sql}
    INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES ('${m.hash}',${m.when});
  END IF;
END
$migration_${index}$;`,
  )
  .join("\n")}
DO $supplement$
DECLARE installed_hash text;
BEGIN
  IF to_regclass('aibean_private.installations') IS NOT NULL THEN
    SELECT sql_sha256 INTO installed_hash FROM aibean_private.installations WHERE id='${packageId}';
    IF installed_hash IS DISTINCT FROM '${securityHash}' THEN RAISE EXCEPTION 'Security package ledger mismatch'; END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='aibean_runtime')
      OR EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='aibean_private')
    THEN RAISE EXCEPTION 'Untracked runtime role/private schema'; END IF;
${security}
    CREATE TABLE aibean_private.installations (id text PRIMARY KEY, sql_sha256 text NOT NULL, installed_at timestamptz NOT NULL DEFAULT now());
    REVOKE ALL ON aibean_private.installations FROM PUBLIC, anon, authenticated, service_role, aibean_runtime;
    ALTER TABLE aibean_private.installations ENABLE ROW LEVEL SECURITY;
    INSERT INTO aibean_private.installations(id,sql_sha256) VALUES ('${packageId}','${securityHash}');
  END IF;
END
$supplement$;
-- Repeated installation validates history and basic hardening; never repairs drift silently.
DO $postflight$
BEGIN
  IF (SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename IN (${tableNames.map((x) => `'${x}'`).join(",")}) AND rowsecurity) <> 14
  THEN RAISE EXCEPTION 'Application table/RLS drift'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.table_privileges WHERE table_schema='public' AND table_name IN (${tableNames.map((x) => `'${x}'`).join(",")}) AND grantee IN ('PUBLIC','anon','authenticated','service_role'))
  THEN RAISE EXCEPTION 'Unexpected client API grants'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='aibean_runtime' AND (rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolcanlogin OR rolreplication))
  THEN RAISE EXCEPTION 'Runtime role privilege drift'; END IF;
END
$postflight$;
COMMIT;
`;
writeFileSync("db/install/reviewed-installation.sql", sql);
writeFileSync(
  "db/install/manifest.json",
  JSON.stringify(
    {
      packageId,
      targetProject: "yfknxidgphhepdtwazhn",
      database: "postgres",
      encoding: "UTF-8, canonical Git LF",
      baselineMigrations: migrations.map(({ path, when, hash }) => ({
        path,
        createdAt: when,
        sha256: hash,
      })),
      securitySqlSha256: securityHash,
      installationSqlSha256: hash(sql),
      optionalTestUsersSqlSha256: hash(
        readFileSync(
          "db/install/testusers-security-proposal.sql",
          "utf8",
        ).replace(/\r\n/g, "\n"),
      ),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Prepared offline SQL and checksum manifest. No database connection was opened.",
);
