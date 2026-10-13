// Offline proposal only. Never loads dotenv or opens a database connection.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const sources = [
  "admin-review-v1.manifest.json",
  ...[
    "admin-operations-v2",
    "creator-content-v1",
    "creator-files-v1",
    "discovery-v1",
    "pricing-v1",
    "affiliate-creator-v1",
  ].map((id) => id + "/manifest.json"),
];
const ledgers = [
  "admin_review_installations",
  "admin_operations_installations",
  "content_installations",
  "files_installations",
  "discovery_installations",
  "pricing_installations",
  "affiliate_creator_installations",
];
const dependencies = sources.map((name, i) => {
  const m = JSON.parse(readFileSync("db/proposals/" + name, "utf8"));
  if (
    hash(readFileSync(m.sqlPath, "utf8").replaceAll("\r\n", "\n")) !==
    m.sqlSha256
  )
    throw new Error("Frozen SQL differs.");
  return {
    id: m.packageId,
    path: m.sqlPath,
    sha256: m.sqlSha256,
    ledger: ledgers[i],
  };
});
const sql = `-- Separate forward Auth release proposal. Not authorized for hosted execution.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
SELECT pg_advisory_xact_lock(hashtextextended('aibean-auth-release-install-v1',0));
DO $guard$
BEGIN
  IF current_database()<>'postgres' OR current_user<>'postgres' THEN RAISE EXCEPTION 'Unexpected installation target/operator'; END IF;
  IF current_setting('aibean.auth_release_install_sha256',true) !~ '^[0-9a-f]{64}$' OR current_setting('aibean.auth_release_install_sha256',true) IS NULL THEN RAISE EXCEPTION 'Bind independently verified checksum'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='aibean_runtime' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication) THEN RAISE EXCEPTION 'Unsafe runtime group'; END IF;
  IF to_regclass('aibean_private.auth_release_installations') IS NOT NULL OR to_regprocedure('aibean_private.auth_session_active(uuid,uuid)') IS NOT NULL THEN RAISE EXCEPTION 'Unexpected Auth release objects'; END IF;
  IF to_regclass('auth.sessions') IS NULL OR NOT has_table_privilege(current_user,'auth.sessions','SELECT') THEN RAISE EXCEPTION 'Managed session metadata/operator access needs independent verification'; END IF;
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema='auth' AND table_name='sessions' AND ((column_name IN ('id','user_id') AND data_type='uuid') OR (column_name='not_after' AND data_type='timestamp with time zone')))<>3 THEN RAISE EXCEPTION 'Unexpected managed session definition'; END IF;
  ${dependencies.map((d) => `IF NOT EXISTS(SELECT 1 FROM aibean_private.${d.ledger} WHERE package_id='${d.id}' AND sql_sha256='${d.sha256}') THEN RAISE EXCEPTION 'Reviewed dependency ${d.id} differs'; END IF;`).join("\n  ")}
END;
$guard$;
-- SECURITY DEFINER is required only to expose this fixed boolean predicate.
-- It reads managed sessions, never grants raw session access or writes Auth.
CREATE FUNCTION aibean_private.auth_session_active(account_id uuid, session_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog
AS $function$ SELECT EXISTS(SELECT 1 FROM auth.sessions AS s WHERE s.id=session_id AND s.user_id=account_id AND (s.not_after IS NULL OR s.not_after>statement_timestamp())) $function$;
REVOKE ALL ON FUNCTION aibean_private.auth_session_active(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION aibean_private.auth_session_active(uuid,uuid) TO aibean_runtime;
CREATE TABLE aibean_private.auth_release_installations(package_id text PRIMARY KEY,sql_sha256 text NOT NULL CHECK(sql_sha256 ~ '^[0-9a-f]{64}$'),installed_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE aibean_private.auth_release_installations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON aibean_private.auth_release_installations FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON aibean_private.auth_release_installations TO aibean_runtime;
CREATE POLICY runtime_read_auth_release_ledger ON aibean_private.auth_release_installations FOR SELECT TO aibean_runtime USING(true);
INSERT INTO aibean_private.auth_release_installations VALUES('auth-release-v1',current_setting('aibean.auth_release_install_sha256'),now());
COMMIT;
`;
mkdirSync("db/proposals/auth-release-v1", { recursive: true });
writeFileSync(
  "db/proposals/auth-release-v1/.gitattributes",
  "*.sql text eol=lf\n*.json text eol=lf\n",
);
writeFileSync("db/proposals/auth-release-v1/reviewed-installation.sql", sql);
writeFileSync(
  "db/proposals/auth-release-v1/manifest.json",
  JSON.stringify(
    {
      packageId: "auth-release-v1",
      sqlPath: "db/proposals/auth-release-v1/reviewed-installation.sql",
      sqlSha256: hash(sql),
      dependencies,
      tables: [],
      privateObjects: [
        "auth_session_active(uuid,uuid)",
        "auth_release_installations",
      ],
      status: "local-proposal-not-hosted-approved",
      impact:
        "Fixed read-only Auth session boolean function and private installation ledger; no managed writes, accounts or capability changes",
    },
    null,
    2,
  ) + "\n",
);
console.log("Prepared separate Auth release proposal:", hash(sql));
