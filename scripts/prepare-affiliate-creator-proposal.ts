// Offline only: never loads .env, connects to hosted data or alters reviewed packages.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import discovery from "../db/proposals/pricing-v1/manifest.json";
const dir = "db/proposals/affiliate-creator-v1",
  hash = (b: string | Buffer) => createHash("sha256").update(b).digest("hex");
const deps = [
  ...discovery.dependencies,
  {
    id: "pricing-v1",
    path: discovery.sqlPath,
    sha256: discovery.sqlSha256,
    ledger: "pricing_installations",
  },
];
for (const d of deps)
  if (hash(readFileSync(d.path)) !== d.sha256)
    throw Error("Reviewed dependency differs");
const tables = [
  "affiliate_programs",
  "affiliate_destinations",
  "affiliate_relationships",
  "affiliate_clicks",
  "affiliate_reconciliations",
  "creator_presentations",
  "campaign_blocks",
  "creator_revision_history",
];
const body = readFileSync(
  dir + "/0000_affiliate_creator.sql",
  "utf8",
).replaceAll("\r\n", "\n");
writeFileSync(dir + "/0000_affiliate_creator.sql", body);
const sql = `-- SEPARATE PROPOSAL: exact owner approval, trusted TLS/target/operator and expanded recovery preflight required.
BEGIN; SET LOCAL search_path=pg_catalog,public; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s';
SELECT pg_advisory_xact_lock(hashtextextended('aibean-affiliate-creator-v1',0));
DO $preflight$ BEGIN
 IF current_database()<>'postgres' OR current_user<>'postgres' THEN RAISE EXCEPTION 'Unexpected database/operator'; END IF;
 IF coalesce(current_setting('aibean.affiliate_creator_install_sha256',true),'') !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Reviewed checksum required'; END IF;
 ${deps.map((d) => `IF to_regclass('aibean_private.${d.ledger}') IS NULL THEN RAISE EXCEPTION 'Missing prerequisite'; END IF; IF NOT EXISTS(SELECT 1 FROM aibean_private.${d.ledger} WHERE package_id='${d.id}' AND sql_sha256='${d.sha256}') THEN RAISE EXCEPTION 'Dependency history differs'; END IF;`).join("\n")}
 IF (SELECT count(*) FROM drizzle.__drizzle_migrations)<>2 OR NOT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='b58134b31944656eda45a6ba929fcdb66a5ec4e66e01a8cfd3d8d9b16d4f4468' AND created_at=1791247215670) OR NOT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='168fd0b654a75e1174052fc444893a66362f89bb3d1cdaec3bbfe9fcbf4f4df1' AND created_at=1791249181547) THEN RAISE EXCEPTION 'Baseline history differs'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN (${tables.map((t) => "'" + t + "'").join(",")})) OR to_regclass('aibean_private.affiliate_creator_installations') IS NOT NULL THEN RAISE EXCEPTION 'Unexpected pricing objects'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='aibean_runtime' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication) THEN RAISE EXCEPTION 'Unsafe runtime'; END IF;
END $preflight$;
${body}
${tables.map((t) => `ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY; REVOKE ALL ON public.${t} FROM PUBLIC,anon,authenticated,service_role; GRANT ${['affiliate_clicks','affiliate_reconciliations','creator_revision_history'].includes(t)?'SELECT,INSERT':'SELECT,INSERT,UPDATE'} ON public.${t} TO aibean_runtime; CREATE POLICY runtime_service ON public.${t} TO aibean_runtime USING(true) WITH CHECK(true);`).join("\n")}
GRANT DELETE ON public.campaign_blocks TO aibean_runtime;
CREATE TABLE aibean_private.affiliate_creator_installations(package_id text PRIMARY KEY,sql_sha256 text NOT NULL CHECK(sql_sha256 ~ '^[a-f0-9]{64}$'),installed_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE aibean_private.affiliate_creator_installations ENABLE ROW LEVEL SECURITY; REVOKE ALL ON aibean_private.affiliate_creator_installations FROM PUBLIC,anon,authenticated,service_role; GRANT SELECT ON aibean_private.affiliate_creator_installations TO aibean_runtime;
CREATE POLICY runtime_read_affiliate_creator_history ON aibean_private.affiliate_creator_installations FOR SELECT TO aibean_runtime USING(true);
INSERT INTO aibean_private.affiliate_creator_installations VALUES('affiliate-creator-v1',current_setting('aibean.affiliate_creator_install_sha256'),now());
COMMIT;
`;
writeFileSync(dir + "/reviewed-installation.sql", sql);
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
          when: 1791828000000,
          tag: "0000_affiliate_creator",
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
      packageId: "affiliate-creator-v1",
      sqlPath: dir + "/reviewed-installation.sql",
      sqlSha256: hash(sql),
      migrationSha256: hash(body),
      tables,
      dependencies: deps,
      status: "proposal-not-hosted-installed",
      runtimeFlag: "AIBEAN_AFFILIATE_CREATOR_WORKFLOWS=true",
      activation:
        "Exact program digest approval + verified provider contract, independent of database enablement; no live activation",
      recovery:
        "Eight additional application tables/private ledger, no existing migration or records altered",
    },
    null,
    2,
  ) + "\n",
);
console.log("Offline affiliate/Creator proposal " + hash(sql));
