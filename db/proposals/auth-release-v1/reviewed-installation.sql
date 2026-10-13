-- Separate forward Auth release proposal. Not authorized for hosted execution.
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
  IF NOT EXISTS(SELECT 1 FROM aibean_private.admin_review_installations WHERE package_id='admin-review-v1' AND sql_sha256='5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca') THEN RAISE EXCEPTION 'Reviewed dependency admin-review-v1 differs'; END IF;
  IF NOT EXISTS(SELECT 1 FROM aibean_private.admin_operations_installations WHERE package_id='admin-operations-v2' AND sql_sha256='1d13ac175e967a2a9512f1ed1e0e2d6b5c34a3fa2c67692d9adcf70fef686d39') THEN RAISE EXCEPTION 'Reviewed dependency admin-operations-v2 differs'; END IF;
  IF NOT EXISTS(SELECT 1 FROM aibean_private.content_installations WHERE package_id='creator-content-v1' AND sql_sha256='ecdac0e6d3448456d16b71a274d29a62050264ba9d406d4077081c998541f78d') THEN RAISE EXCEPTION 'Reviewed dependency creator-content-v1 differs'; END IF;
  IF NOT EXISTS(SELECT 1 FROM aibean_private.files_installations WHERE package_id='creator-files-v1' AND sql_sha256='88b5cc102a30097f7579f7dcd1da482e691522353439b5f688abcce2ad50b66b') THEN RAISE EXCEPTION 'Reviewed dependency creator-files-v1 differs'; END IF;
  IF NOT EXISTS(SELECT 1 FROM aibean_private.discovery_installations WHERE package_id='discovery-v1' AND sql_sha256='c29a3436daa54eee9f9ec1e9eb0e633da6d7cc14cb42fd9b05784db5a96de0b3') THEN RAISE EXCEPTION 'Reviewed dependency discovery-v1 differs'; END IF;
  IF NOT EXISTS(SELECT 1 FROM aibean_private.pricing_installations WHERE package_id='pricing-v1' AND sql_sha256='80ad136519030266bbf03d7b6edab9a541d3548874f9c5f89a9b2a416821fcab') THEN RAISE EXCEPTION 'Reviewed dependency pricing-v1 differs'; END IF;
  IF NOT EXISTS(SELECT 1 FROM aibean_private.affiliate_creator_installations WHERE package_id='affiliate-creator-v1' AND sql_sha256='0a06cae4801d6c8f4493694c9fe537c412d61b4d33c89d3a7926df45c701704a') THEN RAISE EXCEPTION 'Reviewed dependency affiliate-creator-v1 differs'; END IF;
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
