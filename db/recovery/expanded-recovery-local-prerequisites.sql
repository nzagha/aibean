-- LOCAL DISPOSABLE RECOVERY ONLY. Never execute on hosted Supabase.
-- The caller independently verifies loopback TLS, a fresh owned PG17 cluster,
-- empty selected namespaces and the exact approved package hash first.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $guard$
BEGIN
  IF current_database() <> 'postgres' OR current_user <> 'recovery_operator'
     OR inet_server_addr() <> '127.0.0.1'::inet
     OR current_setting('application_name') <> 'aibean-expanded-isolated-restore'
  THEN RAISE EXCEPTION 'Not the owned local recovery endpoint'; END IF;
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname IN ('auth','drizzle','aibean_private'))
     OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relkind IN ('r','p','S','v','m','f'))
  THEN RAISE EXCEPTION 'Recovery prerequisite target is not empty'; END IF;
END
$guard$;
CREATE ROLE postgres NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
-- Preserve pg_database_owner's implicit public-schema owner semantics locally.
ALTER DATABASE postgres OWNER TO postgres;
CREATE ROLE supabase_admin NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE anon NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE dashboard_user NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE service_role NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS;
CREATE ROLE aibean_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE aibean_app_login NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT aibean_runtime TO aibean_app_login WITH ADMIN FALSE, INHERIT TRUE, SET FALSE;
CREATE SCHEMA auth AUTHORIZATION postgres;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
ALTER TABLE auth.users OWNER TO postgres;
REVOKE ALL ON SCHEMA auth FROM PUBLIC;
REVOKE ALL ON auth.users FROM PUBLIC;
CREATE SCHEMA drizzle AUTHORIZATION postgres;
CREATE SCHEMA aibean_private AUTHORIZATION postgres;
COMMIT;
