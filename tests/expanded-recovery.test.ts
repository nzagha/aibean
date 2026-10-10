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
  guardedExpandedCapture,
  expandedMetadataPreflight,
  type expandedCatalog,
} from "../scripts/expanded-recovery-scope";
import {
  assertLocalRecoveryIdentity,
  localRecoveryIdentitySql,
  inspectRecoveryPackage,
} from "../scripts/execute-expanded-recovery";

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

test("exact executor normalizes inet host and retains all local identity and TLS checks", () => {
  assert.match(
    localRecoveryIdentitySql,
    /host\(inet_server_addr\(\)\) AS host/,
  );
  assert(!localRecoveryIdentitySql.includes("inet_server_addr()::text"));
  const identity = {
    role: "recovery_operator",
    database: "postgres",
    host: "127.0.0.1",
    version: "17.11",
    tls: true,
  };
  assert.doesNotThrow(() => assertLocalRecoveryIdentity(identity, true));
  for (const change of [
    { host: "127.0.0.1/32" },
    { host: "192.0.2.1" },
    { host: "::1" },
    { host: null },
    { role: "postgres" },
    { database: "unapproved" },
    { tls: false },
    { version: "16.0" },
  ])
    assert.throws(() =>
      assertLocalRecoveryIdentity({ ...identity, ...change }, true),
    );
  assert.throws(() => assertLocalRecoveryIdentity(identity, false));
});

// Narrow synthetic query contract exercises the real preflight/capture helper.
function prerequisiteQuery(failure?: "history" | "scope") {
  let bodyQueries = 0;
  const query = async (text: string) => {
    if (/AS record|row_to_json\(t\)/.test(text)) {
      bodyQueries++;
      return [];
    }
    if (text.includes("c.relkind IN ('r','p','S','v','m','f')")) {
      return [
        ...catalog.relations.map((row) => ({
          ...row,
          rls: row.schema === "public" && row.name !== "TestUsers",
        })),
        ...(failure === "scope"
          ? [
              {
                schema: "public",
                name: "unexpected",
                kind: "r",
                owner: "postgres",
              },
            ]
          : []),
      ];
    }
    if (text.includes("pg_constraint"))
      return Array.from({ length: 18 }, () => ({ type: "f" }));
    if (text.includes("pg_get_userbyid(n.nspowner)"))
      return ["aibean_private", "drizzle", "public"].map((schema) => ({
        schema,
        owner: "postgres",
      }));
    if (text.includes("count(*)::int AS count"))
      return [{ count: text.includes('"TestUsers"') ? 2 : 0 }];
    if (text.includes("SELECT hash,created_at::text"))
      return failure === "history"
        ? []
        : [
            {
              hash: "b58134b31944656eda45a6ba929fcdb66a5ec4e66e01a8cfd3d8d9b16d4f4468",
              created_at: "1791247215670",
            },
            {
              hash: "168fd0b654a75e1174052fc444893a66362f89bb3d1cdaec3bbfe9fcbf4f4df1",
              created_at: "1791249181547",
            },
          ];
    if (text.includes("SELECT id,sql_sha256"))
      return [
        {
          id: "aibean-foundation-v1",
          sql_sha256:
            "eea0e7309e13440224ca80030a367afc76bc99c08b2027fc722b8fa2b388277a",
        },
      ];
    if (text.includes("last_value::text"))
      return [{ last_value: "2", is_called: true }];
    return [];
  };
  return { query, bodies: () => bodyQueries };
}
test("local target failure stops the actual capture boundary before body queries", async () => {
  const fixture = prerequisiteQuery();
  await assert.rejects(
    guardedExpandedCapture(fixture.query, async () => {
      throw new Error("local target failed");
    }),
    /local target failed/,
  );
  assert.equal(fixture.bodies(), 0);
});
test("ledger and object drift stop before local preparation or body queries", async () => {
  for (const failure of ["history", "scope"] as const) {
    const fixture = prerequisiteQuery(failure);
    let localCalled = false;
    await assert.rejects(
      guardedExpandedCapture(fixture.query, async () => {
        localCalled = true;
      }),
    );
    assert.equal(fixture.bodies(), 0);
    assert.equal(localCalled, false);
  }
});
test("metadata preflight cannot capture records and approved manifest remains exact", async () => {
  const fixture = prerequisiteQuery();
  await expandedMetadataPreflight(fixture.query);
  assert.equal(fixture.bodies(), 0);
  const review = inspectRecoveryPackage();
  assert.throws(() =>
    inspectRecoveryPackage(
      "a759d686d2a108f7d3c91e35d0db3ff014beae2d7992e2aa587a1dd32bfb1b30",
    ),
  );
  assert.equal(review.manifest.packageId, "aibean-expanded-recovery-v2");
});
