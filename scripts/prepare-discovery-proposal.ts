// Offline proposal assembly only. Never connects to any database or loads .env.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
const dir = "db/proposals/discovery-v1";
const digest = (text: string | Buffer) =>
  createHash("sha256").update(text).digest("hex");
const packages = [
  [
    "admin-review-v1",
    "db/proposals/admin-review-v1.sql",
    "db/proposals/admin-review-v1.manifest.json",
    "admin_review_installations",
  ],
  [
    "admin-operations-v2",
    "db/proposals/admin-operations-v2/0000_admin_operations.sql",
    "db/proposals/admin-operations-v2/manifest.json",
    "admin_operations_installations",
  ],
  [
    "creator-content-v1",
    "db/proposals/creator-content-v1/reviewed-installation.sql",
    "db/proposals/creator-content-v1/manifest.json",
    "content_installations",
  ],
  [
    "creator-files-v1",
    "db/proposals/creator-files-v1/reviewed-installation.sql",
    "db/proposals/creator-files-v1/manifest.json",
    "files_installations",
  ],
];
const dependencies = packages.map(([id, path, manifest, ledger]) => {
  const m = JSON.parse(readFileSync(manifest, "utf8"));
  const hash = digest(readFileSync(path));
  if (hash !== m.sqlSha256)
    throw Error("Existing reviewed package differs: " + id);
  return { id, path, sha256: hash, ledger };
});
const checks = dependencies
  .map(
    (d) =>
      ` IF to_regclass('aibean_private.${d.ledger}') IS NULL THEN RAISE EXCEPTION 'Missing prerequisite ${d.id}'; END IF;\n IF NOT EXISTS(SELECT 1 FROM aibean_private.${d.ledger} WHERE package_id='${d.id}' AND sql_sha256='${d.sha256}') THEN RAISE EXCEPTION 'History mismatch ${d.id}'; END IF;`,
  )
  .join("\n");
const tables = [
  "saved_comparisons",
  "comparison_tools",
  "account_follows",
  "analytics_events",
];
const prefix = `-- PROPOSAL ONLY: separate exact owner approval and verified TLS/operator preflight required.
BEGIN;
SET LOCAL search_path=public,pg_catalog;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
SELECT pg_advisory_xact_lock(hashtextextended('aibean-discovery-v1',0));
DO $preflight$
BEGIN
 IF current_database()<>'postgres' OR current_user<>'postgres' THEN RAISE EXCEPTION 'Unexpected target/operator'; END IF;
 IF coalesce(current_setting('aibean.discovery_install_sha256',true),'') !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Reviewed checksum required'; END IF;
${checks}
 IF (SELECT count(*) FROM drizzle.__drizzle_migrations)<>2 OR NOT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='b58134b31944656eda45a6ba929fcdb66a5ec4e66e01a8cfd3d8d9b16d4f4468' AND created_at=1791247215670) OR NOT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='168fd0b654a75e1174052fc444893a66362f89bb3d1cdaec3bbfe9fcbf4f4df1' AND created_at=1791249181547) THEN RAISE EXCEPTION 'Baseline history differs'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='aibean_runtime' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication) THEN RAISE EXCEPTION 'Unsafe runtime role'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ('saved_comparisons','comparison_tools','account_follows','analytics_events')) OR to_regclass('aibean_private.discovery_installations') IS NOT NULL THEN RAISE EXCEPTION 'Unexpected discovery objects'; END IF;
END $preflight$;
`;
const security = tables
  .map(
    (t) =>
      `ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public.${t} FROM PUBLIC,anon,authenticated,service_role;\nGRANT ${t === "analytics_events" ? "SELECT,INSERT,DELETE" : "SELECT,INSERT,UPDATE,DELETE"} ON public.${t} TO aibean_runtime;\nCREATE POLICY runtime_service ON public.${t} TO aibean_runtime USING(true) WITH CHECK(true);`,
  )
  .join("\n");
const suffix = `
${security}
CREATE TABLE aibean_private.discovery_installations(package_id text PRIMARY KEY,sql_sha256 text NOT NULL CHECK(sql_sha256 ~ '^[0-9a-f]{64}$'),installed_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE aibean_private.discovery_installations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON aibean_private.discovery_installations FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON aibean_private.discovery_installations TO aibean_runtime;
CREATE POLICY runtime_read_discovery_ledger ON aibean_private.discovery_installations FOR SELECT TO aibean_runtime USING(true);
INSERT INTO aibean_private.discovery_installations(package_id,sql_sha256) VALUES('discovery-v1',current_setting('aibean.discovery_install_sha256'));
COMMIT;
`;
const path = dir + "/reviewed-installation.sql";
const body = readFileSync(dir + "/0000_discovery.sql", "utf8").replace(/\r\n/g,"\n");
writeFileSync(dir+"/0000_discovery.sql",body);
writeFileSync(path, prefix + body + suffix);
mkdirSync(dir + "/meta", { recursive: true });
writeFileSync(
  dir + "/meta/_journal.json",
  JSON.stringify(
    {
      version: "7",
      dialect: "postgresql",
      entries: [
        {
          idx: 0,
          version: "7",
          when: 1791806400000,
          tag: "0000_discovery",
          breakpoints: false,
        },
      ],
    },
    null,
    2,
  ) + "\n",
);
writeFileSync(
  dir + "/manifest.json",
  JSON.stringify(
    {
      packageId: "discovery-v1",
      status: "local-proposal-not-hosted-installed",
      sqlPath: path,
      sqlSha256: digest(readFileSync(path)),
      migrationSha256: digest(body),
      tables,
      dependencies,
      backfill: "Copies existing Creator follows, preserving the legacy table.",
      runtimeFlag: "AIBEAN_DISCOVERY_WORKFLOWS=true",
      analyticsSecret:
        "Private independently generated AIBEAN_ANALYTICS_SECRET (minimum 32 characters); never commit.",
      recovery:
        "Four additional application tables and private discovery ledger must join the separately approved recovery scope. No previous recovery authorization covers them.",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Prepared offline discovery proposal " + digest(readFileSync(path)),
);
