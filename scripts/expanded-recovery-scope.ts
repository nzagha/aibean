// Shared recovery verification; no connection, environment loading or execution on import.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export type RecoveryRow = Record<string, unknown>;
export type RecoveryQuery = (text: string) => Promise<RecoveryRow[]>;
export async function recoveryDatabaseEnvironment(q: RecoveryQuery) {
  const [database] = await q(
    "SELECT pg_get_userbyid(d.datdba) AS owner,pg_encoding_to_char(d.encoding) AS encoding,d.datlocprovider::text AS collation_provider,d.datcollate AS collation,d.datctype AS ctype,to_jsonb(d)->>'datlocale' AS locale,d.datcollversion AS collation_version,current_setting('server_version') AS server_version FROM pg_database d WHERE d.datname=current_database()",
  );
  assert.equal(
    database.owner,
    "postgres",
    "Unexpected source/local database owner",
  );
  assert.equal(database.encoding, "UTF8", "Unexpected database encoding");
  return database;
}
export const recoveryProject = "yfknxidgphhepdtwazhn";
export const recoverySchemas = ["aibean_private", "drizzle", "public"];
export const recoveryTables = [
  "public.audit_logs",
  "public.billing_webhook_receipts",
  "public.claim_requests",
  "public.featured_placements",
  "public.orders",
  "public.rate_limits",
  "public.saved_tools",
  "public.stack_tools",
  "public.stacks",
  "public.taxonomy",
  "public.tool_reviews",
  "public.tools",
  "public.users",
  "public.vendor_access",
  "public.TestUsers",
  "drizzle.__drizzle_migrations",
  "aibean_private.installations",
  "aibean_private.user_identities",
].sort();
export const recoverySequences = [
  "public.TestUsers_id_seq",
  "drizzle.__drizzle_migrations_id_seq",
].sort();
export const recoveryRelations = [
  ...recoveryTables,
  ...recoverySequences,
].sort();
export const recoveryRoles = [
  "postgres",
  "supabase_admin",
  "anon",
  "authenticated",
  "dashboard_user",
  "service_role",
  "aibean_runtime",
  "aibean_app_login",
  "pg_database_owner",
].sort();
export const maxArchiveBytes = 4 * 1024 * 1024;
export const maxRecordCount = 10000;
export const recoverySha = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
export const canonicalRows = (rows: RecoveryRow[]) =>
  rows.map((row) => JSON.stringify(row)).sort();
export const quoteIdentifier = (value: string) =>
  `"${value.replaceAll('"', '""')}"`;
export const qualifiedRelation = (name: string) => {
  assert(recoveryRelations.includes(name));
  return name.split(".").map(quoteIdentifier).join(".");
};
const schemaPredicate = "n.nspname IN ('public','drizzle','aibean_private')";
const allowedRelations = recoveryRelations.map((name) => `'${name}'`).join(",");
const relationPredicate = `${schemaPredicate} AND n.nspname||'.'||c.relname IN (${allowedRelations})`;

export function expandedDumpArguments(snapshot: string) {
  assert(
    /^[0-9A-F]{8}-[0-9A-F]{8}-[0-9]+$/.test(snapshot),
    "Unexpected private snapshot format",
  );
  return [
    "--no-password",
    "--format=custom",
    "--strict-names",
    "--no-large-objects",
    "--lock-wait-timeout=5s",
    `--snapshot=${snapshot}`,
    ...recoveryRelations.map((name) => `--table=${qualifiedRelation(name)}`),
  ];
}

export async function expandedCatalog(q: RecoveryQuery) {
  const relations = await q(
    `SELECT n.nspname AS schema,c.relname AS name,c.relkind AS kind,pg_get_userbyid(c.relowner) AS owner,c.relrowsecurity AS rls,c.relforcerowsecurity AS force_rls FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE ${schemaPredicate} AND c.relkind IN ('r','p','S','v','m','f') ORDER BY 1,2`,
  );
  assert.deepEqual(
    relations.map((row) => `${row.schema}.${row.name}`).sort(),
    recoveryRelations,
    "Unexpected recovery relation scope",
  );
  assert(
    relations.every(
      (row) =>
        row.kind ===
        (recoverySequences.includes(`${row.schema}.${row.name}`) ? "S" : "r"),
    ),
  );
  assert(relations.every((row) => recoveryRoles.includes(String(row.owner))));
  const columns = await q(
    `SELECT n.nspname AS schema,c.relname AS relation,a.attnum AS position,a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull AS not_null,a.attidentity AS identity,a.attgenerated AS generated,pg_get_expr(d.adbin,d.adrelid) AS expression,co.collname AS collation FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum LEFT JOIN pg_collation co ON co.oid=a.attcollation WHERE ${relationPredicate} AND a.attnum>0 AND NOT a.attisdropped ORDER BY 1,2,3`,
  );
  const constraints = await q(
    `SELECT n.nspname AS schema,c.relname AS relation,k.conname AS name,k.contype AS type,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE ${relationPredicate} ORDER BY 1,2,3`,
  );
  const indexes = await q(
    `SELECT n.nspname AS schema,c.relname AS relation,ic.relname AS name,pg_get_indexdef(i.indexrelid) AS definition FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_class ic ON ic.oid=i.indexrelid WHERE ${relationPredicate} ORDER BY 1,2,3`,
  );
  const policies = await q(
    `SELECT schemaname AS schema,tablename AS relation,policyname AS name,permissive,ARRAY(SELECT unnest(roles) ORDER BY 1)::text AS roles,cmd,qual,with_check FROM pg_policies WHERE schemaname IN ('public','drizzle','aibean_private') ORDER BY 1,2,3`,
  );
  const schemas = await q(
    `SELECT n.nspname AS schema,pg_get_userbyid(n.nspowner) AS owner FROM pg_namespace n WHERE ${schemaPredicate} ORDER BY 1`,
  );
  assert.deepEqual(
    schemas.map((row) => row.schema),
    recoverySchemas,
  );
  assert(schemas.every((row) => recoveryRoles.includes(String(row.owner))));
  const acl =
    await q(`SELECT 'schema' AS kind,n.nspname AS schema,'' AS object,'' AS column,'' AS default_kind,'' AS default_owner,CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,pg_get_userbyid(a.grantor) AS grantor,a.privilege_type AS privilege,a.is_grantable AS grantable FROM pg_namespace n CROSS JOIN LATERAL aclexplode(COALESCE(n.nspacl,acldefault('n',n.nspowner))) a WHERE ${schemaPredicate}
    UNION ALL SELECT CASE WHEN c.relkind='S' THEN 'sequence' ELSE 'table' END,n.nspname,c.relname,'','','',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,pg_get_userbyid(a.grantor),a.privilege_type,a.is_grantable FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault(CASE WHEN c.relkind='S' THEN 'S'::"char" ELSE 'r'::"char" END,c.relowner))) a WHERE ${relationPredicate}
    UNION ALL SELECT 'column',n.nspname,c.relname,t.attname,'','',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,pg_get_userbyid(a.grantor),a.privilege_type,a.is_grantable FROM pg_attribute t JOIN pg_class c ON c.oid=t.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(t.attacl) a WHERE ${relationPredicate} AND t.attnum>0 AND NOT t.attisdropped
    UNION ALL SELECT 'default',n.nspname,'','',d.defaclobjtype::text,pg_get_userbyid(d.defaclrole),CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,pg_get_userbyid(a.grantor),a.privilege_type,a.is_grantable FROM pg_default_acl d JOIN pg_namespace n ON n.oid=d.defaclnamespace CROSS JOIN LATERAL aclexplode(d.defaclacl) a WHERE ${schemaPredicate} ORDER BY 1,2,3,4,5,6,7,8,9,10`);
  assert(
    acl.every(
      (row) =>
        (row.grantee === "PUBLIC" ||
          recoveryRoles.includes(String(row.grantee))) &&
        recoveryRoles.includes(String(row.grantor)),
    ),
  );
  assert(
    !acl.some(
      (row) =>
        row.schema === "public" &&
        row.object === "TestUsers" &&
        ["table", "column"].includes(String(row.kind)) &&
        ["PUBLIC", "anon", "authenticated"].includes(String(row.grantee)),
    ),
    "Approval C direct table/column ACL drift",
  );
  const sequences = await q(
    `SELECT n.nspname AS schema,c.relname AS name,format_type(s.seqtypid,NULL) AS type,s.seqstart::text,s.seqincrement::text,s.seqmax::text,s.seqmin::text,s.seqcache::text,s.seqcycle,tn.nspname AS owning_schema,tc.relname AS owning_table,att.attname AS owning_column FROM pg_sequence s JOIN pg_class c ON c.oid=s.seqrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_depend d ON d.objid=c.oid AND d.classid='pg_class'::regclass AND d.deptype IN ('a','i') LEFT JOIN pg_class tc ON tc.oid=d.refobjid LEFT JOIN pg_namespace tn ON tn.oid=tc.relnamespace LEFT JOIN pg_attribute att ON att.attrelid=d.refobjid AND att.attnum=d.refobjsubid WHERE ${relationPredicate} ORDER BY 1,2`,
  );
  const unsafeDependencies = await q(
    `SELECT 'trigger' AS kind,n.nspname AS schema,c.relname AS object FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE ${relationPredicate} AND NOT t.tgisinternal UNION ALL SELECT 'routine',n.nspname,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE ${schemaPredicate}`,
  );
  assert.equal(
    unsafeDependencies.length,
    0,
    "Unexpected executable dependency requires separate review",
  );
  return {
    relations,
    columns,
    constraints,
    indexes,
    policies,
    schemas,
    acl,
    sequences,
  };
}

export async function applicationRoleContract(
  q: RecoveryQuery,
  localSurrogates = false,
) {
  const roles = await q(
    "SELECT rolname,rolcanlogin,rolinherit,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication FROM pg_roles WHERE rolname IN ('aibean_runtime','aibean_app_login') ORDER BY rolname",
  );
  assert.deepEqual(
    roles,
    [
      {
        rolname: "aibean_app_login",
        rolcanlogin: !localSurrogates,
        rolinherit: true,
        rolsuper: false,
        rolbypassrls: false,
        rolcreatedb: false,
        rolcreaterole: false,
        rolreplication: false,
      },
      {
        rolname: "aibean_runtime",
        rolcanlogin: false,
        rolinherit: true,
        rolsuper: false,
        rolbypassrls: false,
        rolcreatedb: false,
        rolcreaterole: false,
        rolreplication: false,
      },
    ],
    "Application runtime role privilege drift",
  );
  const memberships = await q(
    "SELECT parent.rolname AS parent,child.rolname AS child,m.admin_option,m.inherit_option,m.set_option FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid JOIN pg_roles child ON child.oid=m.member WHERE parent.rolname IN ('aibean_runtime','aibean_app_login') OR child.rolname IN ('aibean_runtime','aibean_app_login') ORDER BY 1,2",
  );
  const inherited = memberships.filter(
    (row) => row.child === "aibean_app_login" || row.child === "aibean_runtime",
  );
  assert.deepEqual(
    inherited,
    [
      {
        parent: "aibean_runtime",
        child: "aibean_app_login",
        admin_option: false,
        inherit_option: true,
        set_option: false,
      },
    ],
    "Unexpected application role membership",
  );
  const operatorAdministration = memberships.filter(
    (row) => row.child !== "aibean_app_login" && row.child !== "aibean_runtime",
  );
  assert(
    operatorAdministration.every(
      (row) =>
        row.child === "postgres" &&
        row.admin_option === true &&
        row.inherit_option === false &&
        row.set_option === false,
    ),
    "Unexpected application role administrator edge",
  );
  if (localSurrogates)
    assert.equal(
      operatorAdministration.length,
      0,
      "Local surrogates must not recreate operator credential lifecycle",
    );
  const [restrictions] = await q(
    "SELECT has_database_privilege('aibean_app_login',current_database(),'CREATE') AS database_create,has_schema_privilege('aibean_app_login','public','CREATE') AS public_create,has_schema_privilege('aibean_app_login','aibean_private','CREATE') AS private_create,has_column_privilege('aibean_app_login','public.users','is_admin','INSERT,UPDATE') AS admin_change,has_column_privilege('aibean_app_login','public.users','is_creator','INSERT,UPDATE') AS creator_change,has_table_privilege('aibean_app_login','aibean_private.user_identities','UPDATE,DELETE,TRUNCATE') AS mapping_change,has_table_privilege('aibean_app_login','drizzle.__drizzle_migrations','SELECT,INSERT,UPDATE,DELETE') AS ledger_access,has_table_privilege('aibean_app_login','aibean_private.installations','SELECT,INSERT,UPDATE,DELETE') AS security_ledger_access",
  );
  assert(
    Object.values(restrictions).every((value) => value === false),
    "Runtime effective privilege drift",
  );
  return { roles, inherited, operatorAdministration, restrictions };
}

export async function expandedPrivateSnapshot(q: RecoveryQuery) {
  const catalog = await expandedCatalog(q);
  const counts: Record<string, number> = {};
  const content: Record<string, string> = {};
  let totalRecords = 0;
  for (const table of recoveryTables) {
    const count = Number(
      (
        await q(
          `SELECT count(*)::int AS count FROM ${qualifiedRelation(table)}`,
        )
      )[0].count,
    );
    totalRecords += count;
    assert(
      totalRecords <= maxRecordCount,
      "Scoped backup exceeds reviewed record limit",
    );
    counts[table] = count;
  }
  // Stop on scope drift before reading any selected record body.
  assert.equal(
    counts["aibean_private.user_identities"],
    0,
    "Nonempty mappings need amended identity recovery approval",
  );
  assert.equal(counts["public.TestUsers"], 2);
  for (const table of recoveryTables) {
    const rows = await q(
      `SELECT to_jsonb(t)::text AS record FROM ${qualifiedRelation(table)} t ORDER BY to_jsonb(t)::text COLLATE "C"`,
    );
    const canonical = rows.map((row) => String(row.record)).join("\n");
    assert(
      Buffer.byteLength(canonical) <= maxArchiveBytes,
      "Private integrity input exceeds reviewed bound",
    );
    content[table] = recoverySha(canonical);
  }
  const originalRows = await q(
    'SELECT row_to_json(t)::text AS row FROM public."TestUsers" t ORDER BY id',
  );
  const originalTestUsersDigest = recoverySha(
    originalRows.map((row) => String(row.row)).join("\n"),
  );
  const sequenceState: RecoveryRow[] = [];
  for (const name of recoverySequences)
    sequenceState.push({
      name,
      ...(
        await q(
          `SELECT last_value::text,is_called FROM ${qualifiedRelation(name)}`,
        )
      )[0],
    });
  const ledgers = await q(
    "SELECT hash,created_at::text FROM drizzle.__drizzle_migrations ORDER BY created_at",
  );
  assert.deepEqual(ledgers, [
    {
      hash: "b58134b31944656eda45a6ba929fcdb66a5ec4e66e01a8cfd3d8d9b16d4f4468",
      created_at: "1791247215670",
    },
    {
      hash: "168fd0b654a75e1174052fc444893a66362f89bb3d1cdaec3bbfe9fcbf4f4df1",
      created_at: "1791249181547",
    },
  ]);
  const security = await q(
    "SELECT id,sql_sha256 FROM aibean_private.installations ORDER BY id",
  );
  assert.deepEqual(security, [
    {
      id: "aibean-foundation-v1",
      sql_sha256:
        "eea0e7309e13440224ca80030a367afc76bc99c08b2027fc722b8fa2b388277a",
    },
  ]);
  assert.equal(
    catalog.constraints.filter((row) => row.type === "f").length,
    18,
  );
  assert.equal(
    catalog.relations.filter(
      (row) =>
        row.schema === "public" &&
        row.name !== "TestUsers" &&
        row.kind === "r" &&
        row.rls === true,
    ).length,
    14,
  );
  return {
    catalog,
    counts,
    content,
    originalTestUsersDigest,
    sequenceState,
    ledgers,
    security,
  };
}

export function compareExpandedSnapshots(
  source: Awaited<ReturnType<typeof expandedPrivateSnapshot>>,
  restored: Awaited<ReturnType<typeof expandedPrivateSnapshot>>,
) {
  for (const key of Object.keys(
    source.catalog,
  ) as (keyof typeof source.catalog)[])
    assert.deepEqual(
      canonicalRows(restored.catalog[key]),
      canonicalRows(source.catalog[key]),
      `Private ${key} comparison failed`,
    );
  for (const key of [
    "counts",
    "content",
    "originalTestUsersDigest",
    "sequenceState",
    "ledgers",
    "security",
  ] as const)
    assert.deepEqual(
      restored[key],
      source[key],
      `Private ${key} comparison failed`,
    );
}

export function validateExpandedToc(
  toc: string,
  ddl: string,
  catalog: Awaited<ReturnType<typeof expandedCatalog>>,
) {
  const entries = toc.split(/\r?\n/).filter((line) => /^\d+;/.test(line));
  const knownKinds = new Set([
    "TABLE",
    "TABLE DATA",
    "SEQUENCE",
    "SEQUENCE SET",
    "SEQUENCE OWNED BY",
    "ACL",
    "CONSTRAINT",
    "FK CONSTRAINT",
    "INDEX",
    "POLICY",
    "ROW SECURITY",
    "COMMENT",
    "DEFAULT",
  ]);
  const parse = (line: string) => {
    const match =
      /^\d+; \d+ \d+ (.+?) (public|drizzle|aibean_private) (.+)$/.exec(line);
    assert(match, "Archive contains an unexpected namespace or global object");
    assert(
      knownKinds.has(match[1]),
      "Archive contains an unexpected object kind",
    );
    const words = match[3].split(" ");
    return { kind: match[1], schema: match[2], words };
  };
  const parsed = entries.map(parse);
  for (const row of parsed) {
    if (row.kind === "INDEX")
      assert(
        catalog.indexes.some(
          (index) => index.schema === row.schema && index.name === row.words[0],
        ),
        "Unexpected index archive entry",
      );
    else {
      let name =
        row.kind === "ACL" || row.kind === "COMMENT"
          ? row.words[1]
          : row.words[0];
      name = name.replace(/^"(.+)"$/, "$1");
      if (row.kind === "ACL" && row.words[0] === "COLUMN") {
        const [table, column] = name.split(".");
        assert(
          catalog.columns.some(
            (item) =>
              item.schema === row.schema &&
              item.relation === table &&
              item.name === column,
          ),
          "Unexpected column ACL archive entry",
        );
        name = table;
      }
      assert(
        recoveryRelations.includes(`${row.schema}.${name}`),
        "Unexpected related archive object",
      );
      if (row.kind === "CONSTRAINT" || row.kind === "FK CONSTRAINT")
        assert(
          catalog.constraints.some(
            (constraint) =>
              constraint.schema === row.schema &&
              constraint.relation === name &&
              constraint.name === row.words[1],
          ),
          "Unexpected constraint archive entry",
        );
      if (row.kind === "POLICY")
        assert(
          catalog.policies.some(
            (policy) =>
              policy.schema === row.schema &&
              policy.relation === name &&
              policy.name === row.words[1],
          ),
          "Unexpected policy archive entry",
        );
      if (row.kind === "DEFAULT")
        assert(
          catalog.columns.some(
            (column) =>
              column.schema === row.schema &&
              column.relation === name &&
              column.name === row.words[1] &&
              column.expression !== null,
          ),
          "Unexpected default archive entry",
        );
    }
  }
  assert.deepEqual(
    parsed
      .filter((row) => row.kind === "TABLE")
      .map((row) => `${row.schema}.${row.words[0]}`)
      .sort(),
    recoveryTables,
  );
  assert.deepEqual(
    parsed
      .filter((row) => row.kind === "TABLE DATA")
      .map((row) => `${row.schema}.${row.words[0]}`)
      .sort(),
    recoveryTables,
  );
  assert.deepEqual(
    parsed
      .filter((row) => row.kind === "SEQUENCE SET")
      .map((row) => `${row.schema}.${row.words[0]}`)
      .sort(),
    recoverySequences,
  );
  assert(
    !/CREATE\s+(FUNCTION|PROCEDURE|EXTENSION|EVENT\s+TRIGGER)|ALTER\s+SYSTEM|SECURITY\s+DEFINER|COPY[\s\S]*?PROGRAM|CREATE\s+ROLE|PASSWORD\s+/i.test(
      ddl,
    ),
    "Archive DDL contains unreviewed executable/global objects",
  );
  for (const match of ddl.matchAll(
    /REFERENCES\s+(?:"?([a-z_]+)"?\.)?"?([A-Za-z_][A-Za-z0-9_]*)"?\s*\(/g,
  ))
    assert(
      recoveryTables.includes(`${match[1] || "public"}.${match[2]}`) ||
        `${match[1]}.${match[2]}` === "auth.users",
      "Unexpected external FK dependency",
    );
  return entries.length;
}

export function localPrerequisiteGrants(
  catalog: Awaited<ReturnType<typeof expandedCatalog>>,
) {
  const names = recoveryRoles
    .filter((role) => role !== "pg_database_owner")
    .map(quoteIdentifier)
    .join(",");
  const recipients = `PUBLIC,${names}`;
  const statements: string[] = [];
  for (const schema of catalog.schemas) {
    assert(
      recoverySchemas.includes(String(schema.schema)) &&
        recoveryRoles.includes(String(schema.owner)),
    );
    statements.push(
      `ALTER SCHEMA ${quoteIdentifier(String(schema.schema))} OWNER TO ${quoteIdentifier(String(schema.owner))}`,
    );
    statements.push(
      `REVOKE ALL ON SCHEMA ${quoteIdentifier(String(schema.schema))} FROM ${recipients}`,
    );
  }
  const kinds: Record<string, string> = {
    r: "TABLES",
    S: "SEQUENCES",
    f: "FUNCTIONS",
    T: "TYPES",
  };
  const defaults = new Set(
    catalog.acl
      .filter((row) => row.kind === "default")
      .map((row) => `${row.schema}|${row.default_owner}|${row.default_kind}`),
  );
  for (const group of defaults) {
    const [schema, owner, kind] = group.split("|");
    assert(
      recoverySchemas.includes(schema) &&
        recoveryRoles.includes(owner) &&
        kinds[kind],
    );
    statements.push(`SET LOCAL ROLE ${quoteIdentifier(owner)}`);
    statements.push(
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteIdentifier(owner)} IN SCHEMA ${quoteIdentifier(schema)} REVOKE ALL ON ${kinds[kind]} FROM ${recipients}`,
    );
    statements.push("RESET ROLE");
  }
  for (const acl of catalog.acl.filter(
    (row) => row.kind === "schema" || row.kind === "default",
  )) {
    const schema = String(acl.schema),
      grantor = String(acl.grantor),
      grantee = String(acl.grantee),
      privilege = String(acl.privilege);
    assert(
      recoverySchemas.includes(schema) &&
        recoveryRoles.includes(grantor) &&
        (grantee === "PUBLIC" || recoveryRoles.includes(grantee)),
    );
    assert(
      [
        "USAGE",
        "CREATE",
        "SELECT",
        "INSERT",
        "UPDATE",
        "DELETE",
        "TRUNCATE",
        "REFERENCES",
        "TRIGGER",
        "MAINTAIN",
        "EXECUTE",
      ].includes(privilege),
    );
    const target = grantee === "PUBLIC" ? "PUBLIC" : quoteIdentifier(grantee);
    statements.push(`SET LOCAL ROLE ${quoteIdentifier(grantor)}`);
    const suffix = ` TO ${target}${acl.grantable ? " WITH GRANT OPTION" : ""}`;
    if (acl.kind === "schema")
      statements.push(
        `GRANT ${privilege} ON SCHEMA ${quoteIdentifier(schema)}${suffix}`,
      );
    else {
      assert(
        kinds[String(acl.default_kind)] &&
          recoveryRoles.includes(String(acl.default_owner)),
      );
      statements.push(
        `ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteIdentifier(String(acl.default_owner))} IN SCHEMA ${quoteIdentifier(schema)} GRANT ${privilege} ON ${kinds[String(acl.default_kind)]}${suffix}`,
      );
    }
    statements.push("RESET ROLE");
  }
  // pg_dump can omit an owner-default sequence ACL. Recreate selected relation
  // ACLs through normal owner GRANT/REVOKE, without touching system catalogs.
  for (const name of recoveryRelations) {
    const relation = catalog.relations.find(
      (row) => `${row.schema}.${row.name}` === name,
    );
    assert(relation);
    const objectType = relation.kind === "S" ? "SEQUENCE" : "TABLE";
    statements.push(
      `REVOKE ALL ON ${objectType} ${qualifiedRelation(name)} FROM ${recipients}`,
    );
    if (objectType === "TABLE")
      for (const column of catalog.columns.filter(
        (row) => `${row.schema}.${row.relation}` === name,
      ))
        statements.push(
          `REVOKE ALL (${quoteIdentifier(String(column.name))}) ON TABLE ${qualifiedRelation(name)} FROM ${recipients}`,
        );
  }
  for (const acl of catalog.acl.filter((row) =>
    ["table", "sequence", "column"].includes(String(row.kind)),
  )) {
    const name = `${acl.schema}.${acl.object}`,
      relation = catalog.relations.find(
        (row) => `${row.schema}.${row.name}` === name,
      ),
      privilege = String(acl.privilege),
      grantee = String(acl.grantee),
      grantor = String(acl.grantor);
    assert(
      relation &&
        recoveryRelations.includes(name) &&
        grantor === relation.owner,
      "Unreviewed relation ACL grantor",
    );
    assert(
      [
        "USAGE",
        "SELECT",
        "INSERT",
        "UPDATE",
        "DELETE",
        "TRUNCATE",
        "REFERENCES",
        "TRIGGER",
        "MAINTAIN",
      ].includes(privilege),
    );
    assert(grantee === "PUBLIC" || recoveryRoles.includes(grantee));
    const column =
      acl.kind === "column" ? ` (${quoteIdentifier(String(acl.column))})` : "";
    if (column)
      assert(
        catalog.columns.some(
          (row) =>
            `${row.schema}.${row.relation}` === name && row.name === acl.column,
        ),
      );
    statements.push(`SET LOCAL ROLE ${quoteIdentifier(grantor)}`);
    statements.push(
      `GRANT ${privilege}${column} ON ${acl.kind === "sequence" ? "SEQUENCE" : "TABLE"} ${qualifiedRelation(name)} TO ${grantee === "PUBLIC" ? "PUBLIC" : quoteIdentifier(grantee)}${acl.grantable ? " WITH GRANT OPTION" : ""}`,
    );
    statements.push("RESET ROLE");
  }
  return statements;
}
