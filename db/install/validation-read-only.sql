-- Post-install operator validation; SELECT only. No personal record values.
-- Run only after Approval A on the independently verified target endpoint.
BEGIN READ ONLY;
SELECT current_database() AS database_name, current_user AS operator,
       current_setting('server_version') AS server_version,
       (SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls;
SELECT schemaname, tablename, rowsecurity
FROM pg_tables WHERE schemaname IN ('public','aibean_private','drizzle')
ORDER BY schemaname,tablename;
SELECT n.nspname AS schema_name,c.relname AS table_name,k.conname,
       pg_get_constraintdef(k.oid) AS definition
FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE k.contype='f' AND n.nspname IN ('public','aibean_private')
ORDER BY 1,2,3;
SELECT hash,created_at FROM drizzle.__drizzle_migrations ORDER BY created_at;
SELECT id,sql_sha256 FROM aibean_private.installations ORDER BY id;
SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check
FROM pg_policies WHERE schemaname IN ('public','aibean_private')
ORDER BY 1,2,3;
SELECT table_schema,table_name,grantee,privilege_type
FROM information_schema.table_privileges
WHERE table_schema IN ('public','aibean_private','drizzle')
ORDER BY 1,2,3,4;
SELECT table_schema,table_name,column_name,grantee,privilege_type
FROM information_schema.column_privileges
WHERE table_name='users' AND table_schema='public'
ORDER BY 1,2,3,4,5;
SELECT rolname,rolcanlogin,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication
FROM pg_roles WHERE rolname IN ('postgres','aibean_runtime','aibean_app_login');
SELECT parent.rolname AS parent,child.rolname AS child,
       m.admin_option,m.inherit_option,m.set_option
FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid
JOIN pg_roles child ON child.oid=m.member
WHERE child.rolname='aibean_app_login' OR parent.rolname='aibean_runtime';
SELECT (SELECT count(*) FROM public."TestUsers") AS testusers_count,
       (SELECT count(*) FROM auth.users) AS auth_users_count,
       (SELECT count(*) FROM public.users) AS app_users_count,
       (SELECT count(*) FROM aibean_private.user_identities) AS identity_count;
COMMIT;
