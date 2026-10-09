// Read-only preparation: catalogs and counts only, never exports row bodies.
import { config } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { verifiedDatabaseConfig } from "../src/lib/db/tls-config";

config({ path: ".env.local", quiet: true });

async function main() {
  const target = verifiedDatabaseConfig();
  const client = postgres(target.connectionString, {
    ...target.options,
    max: 1,
    onnotice: () => {},
  });
  try {
    const db = drizzle(client);
    const inventory = await db.transaction(
      async (tx) => {
        const query = async (text: string) =>
          JSON.parse(JSON.stringify(await tx.execute(sql.raw(text))));
        return {
          identity: await query(
            "SELECT current_database() AS database, current_user AS role, current_setting('transaction_read_only') AS read_only, current_setting('server_version') AS server_version, (SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls",
          ),
          databaseAcl: await query(
            "SELECT pg_get_userbyid(datdba) AS owner,coalesce(datacl,acldefault('d',datdba))::text AS acl FROM pg_database WHERE datname=current_database()",
          ),
          tables: await query(
            "SELECT c.relname, c.relkind, c.relrowsecurity, pg_get_userbyid(c.relowner) AS owner FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f') ORDER BY 1",
          ),
          columns: await query(
            "SELECT table_name,column_name,data_type,is_nullable,column_default,is_identity,identity_generation FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position",
          ),
          constraints: await query(
            "SELECT c.relname AS table_name,k.conname,k.contype,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY 1,2",
          ),
          indexes: await query(
            "SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY 1,2",
          ),
          policies: await query(
            "SELECT tablename,policyname,roles::text,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' ORDER BY 1,2",
          ),
          schemaAcl: await query(
            "SELECT pg_get_userbyid(nspowner) AS owner,coalesce(nspacl,acldefault('n',nspowner))::text AS acl FROM pg_namespace WHERE nspname='public'",
          ),
          tableAcl: await query(
            "SELECT c.relname,coalesce(c.relacl,acldefault('r',c.relowner))::text AS acl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','S') ORDER BY 1",
          ),
          columnAcl: await query(
            "SELECT c.relname,a.attname,a.attacl::text AS acl FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND a.attnum>0 AND NOT a.attisdropped AND a.attacl IS NOT NULL ORDER BY 1,2",
          ),
          defaults: await query(
            "SELECT pg_get_userbyid(d.defaclrole) AS owner,d.defaclobjtype,d.defaclacl::text AS acl FROM pg_default_acl d JOIN pg_namespace n ON n.oid=d.defaclnamespace WHERE n.nspname='public' ORDER BY 1,2",
          ),
          // No rolpassword/pg_authid, role settings, connection URI or managed rows.
          necessaryRoles: await query(`WITH referenced AS (
          SELECT nspowner AS id FROM pg_namespace WHERE nspname='public'
          UNION SELECT c.relowner FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
          UNION SELECT p.polroles[i] FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL generate_subscripts(p.polroles,1) AS i WHERE n.nspname='public'
          UNION SELECT d.defaclrole FROM pg_default_acl d JOIN pg_namespace n ON n.oid=d.defaclnamespace WHERE n.nspname='public'
          UNION SELECT acl.grantee FROM pg_namespace n CROSS JOIN LATERAL aclexplode(n.nspacl) acl WHERE n.nspname='public'
          UNION SELECT acl.grantee FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(c.relacl) acl WHERE n.nspname='public'
          UNION SELECT acl.grantee FROM pg_default_acl d JOIN pg_namespace n ON n.oid=d.defaclnamespace CROSS JOIN LATERAL aclexplode(d.defaclacl) acl WHERE n.nspname='public'
          UNION SELECT acl.grantee FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(a.attacl) acl WHERE n.nspname='public'
        ) SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls FROM pg_roles WHERE oid IN (SELECT id FROM referenced) ORDER BY 1`),
          publicFunctionCount: await query(
            "SELECT count(*)::int AS count FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'",
          ),
          additionalPublicObjects: await query(`SELECT
            (SELECT count(*)::int FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace LEFT JOIN pg_class c ON c.oid=t.typrelid WHERE n.nspname='public' AND (t.typtype IN ('d','e','r','m') OR (t.typtype='c' AND c.relkind='c') OR (t.typtype='b' AND t.typelem=0))) AS custom_types,
            (SELECT count(*)::int FROM pg_operator o JOIN pg_namespace n ON n.oid=o.oprnamespace WHERE n.nspname='public') AS operators,
            (SELECT count(*)::int FROM pg_collation o JOIN pg_namespace n ON n.oid=o.collnamespace WHERE n.nspname='public') AS collations,
            (SELECT count(*)::int FROM pg_conversion o JOIN pg_namespace n ON n.oid=o.connamespace WHERE n.nspname='public') AS conversions,
            (SELECT count(*)::int FROM pg_opclass o JOIN pg_namespace n ON n.oid=o.opcnamespace WHERE n.nspname='public') AS operator_classes,
            (SELECT count(*)::int FROM pg_opfamily o JOIN pg_namespace n ON n.oid=o.opfnamespace WHERE n.nspname='public') AS operator_families,
            (SELECT count(*)::int FROM pg_ts_config o JOIN pg_namespace n ON n.oid=o.cfgnamespace WHERE n.nspname='public') AS text_search_configs,
            (SELECT count(*)::int FROM pg_ts_dict o JOIN pg_namespace n ON n.oid=o.dictnamespace WHERE n.nspname='public') AS text_search_dictionaries,
            (SELECT count(*)::int FROM pg_ts_parser o JOIN pg_namespace n ON n.oid=o.prsnamespace WHERE n.nspname='public') AS text_search_parsers,
            (SELECT count(*)::int FROM pg_ts_template o JOIN pg_namespace n ON n.oid=o.tmplnamespace WHERE n.nspname='public') AS text_search_templates,
            (SELECT count(*)::int FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal) AS user_triggers,
            (SELECT count(*)::int FROM pg_rewrite r JOIN pg_class c ON c.oid=r.ev_class JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public') AS rules,
            (SELECT count(*)::int FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE n.nspname='public') AS extensions,
            (SELECT count(*)::int FROM pg_depend d WHERE d.deptype='e' AND (
              (d.classid='pg_class'::regclass AND d.objid IN (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public')) OR
              (d.classid='pg_proc'::regclass AND d.objid IN (SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public')) OR
              (d.classid='pg_type'::regclass AND d.objid IN (SELECT t.oid FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public'))
            )) AS extension_members`),
          relevantMemberships: await query(
            "SELECT parent.rolname AS parent,child.rolname AS member,m.admin_option,m.inherit_option,m.set_option FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid JOIN pg_roles child ON child.oid=m.member WHERE parent.rolname IN ('anon','authenticated','dashboard_user','postgres','service_role','supabase_admin','pg_database_owner') OR child.rolname IN ('anon','authenticated','dashboard_user','postgres','service_role','supabase_admin','pg_database_owner') ORDER BY 1,2",
          ),
          testUsersCount: await query(
            'SELECT count(*)::int AS count FROM public."TestUsers"',
          ),
          authUsersCount: await query(
            "SELECT count(*)::int AS count FROM auth.users",
          ),
          ledgers: await query(
            "SELECT to_regclass('drizzle.__drizzle_migrations')::text AS drizzle,to_regclass('supabase_migrations.schema_migrations')::text AS supabase",
          ),
        };
      },
      { accessMode: "read only", isolationLevel: "repeatable read" },
    );
    const paths = [
      "db/install/reviewed-installation.sql",
      "db/install/runtime-login-proposal.sql",
      "db/install/testusers-security-proposal.sql",
      "db/migrations/0000_numerous_skullbuster.sql",
      "db/migrations/0001_hesitant_hardball.sql",
    ];
    console.log(
      JSON.stringify(
        {
          inspectedAt: new Date().toISOString(),
          sourceProject: "yfknxidgphhepdtwazhn",
          scope:
            "Catalog metadata and aggregate counts only; no hosted records exported",
          ...inventory,
          sqlChecksums: Object.fromEntries(
            paths.map((path) => [
              path,
              createHash("sha256").update(readFileSync(path)).digest("hex"),
            ]),
          ),
          hostedModified: false,
          hostedBackupExecuted: false,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end({ timeout: 2 });
  }
}
main().catch(() => {
  console.error(
    "Read-only backup scope inspection failed; credentials and driver details redacted.",
  );
  process.exitCode = 1;
});
