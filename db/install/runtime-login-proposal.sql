-- Approval B only. Proposal; never part of Approval A installation.
-- Execute after A, as the verified postgres migration operator.
-- Fail if this role already exists; reconcile rather than altering it silently.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
CREATE ROLE aibean_app_login NOLOGIN INHERIT NOSUPERUSER NOCREATEDB
  NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT aibean_runtime TO aibean_app_login WITH ADMIN FALSE, INHERIT TRUE, SET FALSE;
-- Check inherited CONNECT; do not change database-wide ACLs as a non-owner.
DO $connect$
BEGIN
  IF NOT has_database_privilege('aibean_app_login',current_database(),'CONNECT')
  THEN RAISE EXCEPTION 'Runtime CONNECT requires separate database-owner grant'; END IF;
END
$connect$;
COMMIT;

-- Password provisioning is a separate private operator step:
-- 1. Generate a strong random credential in the owner's password manager.
-- 2. In an interactive psql session using verified TLS, use:
--      \password aibean_app_login
--    psql prompts without echoing the password or putting it in SQL history.
-- 3. After verifying role flags/memberships and storing the credential securely:
--      ALTER ROLE aibean_app_login LOGIN;
-- 4. Authenticate a NEW session as this login and run Approval B's smoke checks.
-- No password, hash, connection URI, or private path belongs in this file.
