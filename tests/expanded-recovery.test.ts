import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  expandedDumpArguments,
  localPrerequisiteGrants,
  recoveryRelations,
  recoveryTables,
  recoverySequences,
  validateExpandedToc,
  type expandedCatalog,
} from "../scripts/expanded-recovery-scope";

const catalog = {
  relations: recoveryRelations.map((name) => ({
    schema: name.split(".")[0],
    name: name.split(".")[1],
    kind: recoverySequences.includes(name) ? "S" : "r",
    owner: "postgres",
  })),
  columns: [
    {
      schema: "drizzle",
      relation: "__drizzle_migrations",
      name: "id",
      expression: "nextval('drizzle.__drizzle_migrations_id_seq'::regclass)",
    },
    { schema: "public", relation: "users", name: "id", expression: null },
  ],
  constraints: [],
  indexes: [],
  policies: [],
  schemas: [],
  acl: [],
  sequences: [],
} as Awaited<ReturnType<typeof expandedCatalog>>;
const toc = [
  ...recoveryTables.map(
    (table, i) => `${i + 1}; 1 1 TABLE ${table.replace(".", " ")} postgres`,
  ),
  ...recoveryTables.map(
    (table, i) =>
      `${i + 100}; 0 1 TABLE DATA ${table.replace(".", " ")} postgres`,
  ),
  ...recoverySequences.map(
    (table, i) =>
      `${i + 200}; 0 0 SEQUENCE SET ${table.replace(".", " ")} postgres`,
  ),
].join("\n");
test("expanded recovery selects exact eighteen tables and two sequences without managed schema expansion", () => {
  const args = expandedDumpArguments("00000001-00000001-1");
  assert.equal(recoveryTables.length, 18);
  assert.equal(recoverySequences.length, 2);
  assert.equal(args.filter((arg) => arg.startsWith("--table=")).length, 20);
  assert(
    !args.some((arg) =>
      /^--(schema|no-acl|no-owner|clean|create|large-objects|disable-triggers)/.test(
        arg,
      ),
    ),
  );
  assert(args.includes('--table="public"."TestUsers"'));
  assert(
    !recoveryRelations.some((name) =>
      /^(auth|vault|storage|realtime)\./.test(name),
    ),
  );
  assert.throws(() => expandedDumpArguments("x; DROP DATABASE postgres"));
});
test("expanded archive rejects unrelated rows, object namespaces and executable/global SQL", () => {
  assert.equal(validateExpandedToc(toc, "", catalog), 38);
  assert.equal(
    validateExpandedToc(
      `${toc}\n998; 1 1 DEFAULT drizzle __drizzle_migrations id postgres\n997; 1 1 ACL public TABLE "TestUsers" postgres\n996; 1 1 ACL public COLUMN users.id postgres`,
      "",
      catalog,
    ),
    41,
  );
  for (const entry of [
    "999; 1 1 TABLE DATA auth users postgres",
    "999; 1 1 TABLE DATA public unrelated postgres",
    "999; 1 1 ACL public TABLE unrelated postgres",
    "999; 1 1 INDEX public unrelated_idx postgres",
    "999; 1 1 FUNCTION public hidden() postgres",
    "999; 1 1 DEFAULT drizzle __drizzle_migrations unrelated postgres",
  ])
    assert.throws(() => validateExpandedToc(`${toc}\n${entry}`, "", catalog));
  for (const ddl of [
    "CREATE ROLE hidden PASSWORD 'secret'",
    "CREATE FUNCTION public.x() RETURNS void AS $$ $$ LANGUAGE sql",
    "ALTER SYSTEM SET x='x'",
    "ALTER TABLE public.users ADD FOREIGN KEY(id) REFERENCES vault.secrets(id)",
  ])
    assert.throws(() => validateExpandedToc(toc, ddl, catalog));
});
test("isolated recovery prerequisites are loopback-only NOLOGIN fixtures and preserve empty Auth structure", () => {
  const sql = readFileSync(
    "db/recovery/expanded-recovery-local-prerequisites.sql",
    "utf8",
  );
  assert.match(sql, /inet_server_addr\(\) <> '127\.0\.0\.1'::inet/);
  assert.match(sql, /current_user <> 'recovery_operator'/);
  assert.match(sql, /application_name.*'aibean-expanded-isolated-restore'/);
  assert.equal((sql.match(/CREATE ROLE .* NOLOGIN/g) || []).length, 8);
  assert.match(sql, /CREATE TABLE auth\.users \(id uuid PRIMARY KEY\)/);
  assert(!/INSERT INTO|DELETE FROM|DROP |PASSWORD|CREATE EXTENSION/i.test(sql));
});
test("encrypted metadata ACL replay rejects injection and permits only reviewed schema defaults", () => {
  const safe = {
    ...catalog,
    schemas: [{ schema: "public", owner: "pg_database_owner" }],
    acl: [
      {
        kind: "schema",
        schema: "public",
        grantee: "aibean_runtime",
        grantor: "pg_database_owner",
        privilege: "USAGE",
        grantable: false,
      },
    ],
  } as typeof catalog;
  assert(
    localPrerequisiteGrants(safe).some(
      (sql) => sql === 'GRANT USAGE ON SCHEMA "public" TO "aibean_runtime"',
    ),
  );
  assert.throws(() =>
    localPrerequisiteGrants({
      ...safe,
      schemas: [{ schema: "vault", owner: "postgres" }],
    }),
  );
  assert.throws(() =>
    localPrerequisiteGrants({
      ...safe,
      acl: [{ ...safe.acl[0], privilege: "USAGE; DROP DATABASE postgres" }],
    }),
  );
  assert.throws(() =>
    localPrerequisiteGrants({
      ...safe,
      acl: [{ ...safe.acl[0], grantee: "unreviewed_admin" }],
    }),
  );
});
