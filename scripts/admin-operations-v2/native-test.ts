// Fresh loopback-only native instances. No dotenv/private profiles or hosted endpoints.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  unlinkSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { createServer } from "node:net";
import { checkServerIdentity, type PeerCertificate } from "node:tls";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { setupAdminFixtures } from "../../tests/fixtures/admin-workflow-contract";
import { commerceContract } from "../../tests/fixtures/admin-operations-contract";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  billingProducts,
  billingTransactions,
  toolSubmissions,
  commerceSubscriptions,
} from "../../src/lib/db/admin-commerce-schema";
import {
  reviewedSql,
  sqlSha256,
  sqlPath,
  catalogPath,
  query,
  baseline,
  operationsCatalog,
  operationsTables,
  operationsRelations,
  hash,
  installOperations,
  independentPostflight,
  InstallationFailure,
  safeCode,
  type Client,
  type Context,
} from "./core";
import {
  installAdminReview,
  baseline as reviewBaseline,
  sqlSha256 as reviewSqlSha256,
} from "../admin-review-v1/core";

const bin = process.env.PG_TEST_BIN;
assert(bin, "Native PostgreSQL binaries required");
const root = resolve(
  "test-results",
  `admin-operations-native-${Date.now()}-${randomBytes(4).toString("hex")}`,
);
mkdirSync(root, { recursive: true });
const clients: Client[] = [],
  running: string[] = [],
  outcomes: { name: string; status: string }[] = [];
const pw = new Map<string, string>();
const password = (r: string) => {
  if (!pw.has(r)) pw.set(r, randomBytes(32).toString("hex"));
  return pw.get(r)!;
};
const exe = (n: string) =>
  join(bin!, n + (process.platform === "win32" ? ".exe" : ""));
const cert = join(root, "ca.crt"),
  key = join(root, "server.key");
let stage = "native-tools";
function native(program: string, args: string[]) {
  const ctl = program.includes("pg_ctl");
  const r = spawnSync(program, args, {
    windowsHide: true,
    timeout: 60000,
    encoding: "utf8",
    stdio: ctl ? "ignore" : "pipe",
    maxBuffer: 1024 * 1024,
  });
  assert.equal(
    r.status,
    0,
    "Native process failed; protected details withheld",
  );
  assert(!r.error);
  return r.stdout;
}
async function port() {
  const s = createServer();
  await new Promise<void>((r) => s.listen(0, "127.0.0.1", r));
  const a = s.address();
  assert(a && typeof a !== "string");
  const p = a.port;
  await new Promise<void>((r) => s.close(() => r()));
  return p;
}
type Instance = { directory: string; port: number; verified: boolean };
function connect(
  i: Instance,
  role = "postgres",
  application = role,
  sslOverride?: object,
) {
  assert(i.port > 1024);
  const c = postgres({
    host: "127.0.0.1",
    port: i.port,
    database: "postgres",
    username: role,
    password: password(role),
    max: 1,
    prepare: false,
    connect_timeout: 5,
    ssl: sslOverride ?? {
      ca: readFileSync(cert, "utf8"),
      rejectUnauthorized: true,
      servername: "localhost",
      checkServerIdentity: (_h: string, p: PeerCertificate) => {
        const e = checkServerIdentity("127.0.0.1", p);
        if (!e) i.verified = true;
        return e;
      },
    },
    onnotice: () => {},
    connection: {
      application_name: `operations-native-${application}`,
      timezone: "UTC",
      statement_timeout: 60000,
    },
  });
  clients.push(c);
  return c;
}
async function instance(name: string) {
  const directory = join(root, name);
  assert(!existsSync(directory));
  const p = await port();
  const bootstrap = join(root, `${name}-bootstrap`);
  writeFileSync(bootstrap, password("cluster_admin"));
  try {
    native(exe("initdb"), [
      "-D",
      directory,
      "-U",
      "cluster_admin",
      "--pwfile",
      bootstrap,
      "--auth-host=scram-sha-256",
      "--auth-local=scram-sha-256",
      "--encoding=UTF8",
      "--no-locale",
    ]);
  } finally {
    unlinkSync(bootstrap);
  }
  const pg = (s: string) => s.replaceAll("\\", "/").replaceAll("'", "''");
  writeFileSync(
    join(directory, "postgresql.conf"),
    `listen_addresses='127.0.0.1'\nport=${p}\nssl=on\nssl_cert_file='${pg(cert)}'\nssl_key_file='${pg(key)}'\nlog_statement='none'\nlog_min_error_statement='panic'\nlog_min_messages='panic'\n`,
  );
  writeFileSync(
    join(directory, "pg_hba.conf"),
    "hostssl all all 127.0.0.1/32 scram-sha-256\nhostnossl all all 127.0.0.1/32 reject\n",
  );
  native(exe("pg_ctl"), [
    "-D",
    directory,
    "-l",
    join(root, `${name}.log`),
    "-w",
    "start",
  ]);
  running.push(directory);
  return { directory, port: p, verified: false };
}
async function fixture(i: Instance) {
  const admin = connect(i, "cluster_admin");
  for (const [role, flags] of [
    ["postgres", "NOSUPERUSER BYPASSRLS CREATEDB CREATEROLE REPLICATION"],
    ["anon", "NOSUPERUSER NOBYPASSRLS"],
    ["authenticated", "NOSUPERUSER NOBYPASSRLS"],
    ["service_role", "NOSUPERUSER BYPASSRLS"],
    ["supabase_admin", "NOSUPERUSER BYPASSRLS"],
    ["dashboard_user", "NOSUPERUSER NOBYPASSRLS"],
  ])
    await admin.unsafe(
      `CREATE ROLE ${role} LOGIN ${flags} PASSWORD '${password(role)}'`,
    );
  await admin.unsafe(
    `ALTER DATABASE postgres OWNER TO postgres;ALTER SCHEMA public OWNER TO pg_database_owner;REVOKE CREATE ON SCHEMA public FROM PUBLIC;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE TABLE auth.identities(id uuid PRIMARY KEY);GRANT USAGE ON SCHEMA auth TO postgres;GRANT SELECT,REFERENCES ON auth.users TO postgres;GRANT SELECT ON auth.identities TO postgres;CREATE TABLE public."TestUsers"(id bigserial PRIMARY KEY,email text NOT NULL);ALTER TABLE public."TestUsers" OWNER TO postgres;ALTER SEQUENCE public."TestUsers_id_seq" OWNER TO postgres;INSERT INTO public."TestUsers"(email) VALUES ('synthetic-one@example.invalid'),('synthetic-two@example.invalid');ALTER TABLE public."TestUsers" ENABLE ROW LEVEL SECURITY;CREATE POLICY "Enable read access for all users" ON public."TestUsers" FOR SELECT USING (true);CREATE POLICY "Enable insert for authenticated users only" ON public."TestUsers" FOR INSERT TO authenticated WITH CHECK (true);GRANT ALL ON public."TestUsers" TO anon,authenticated,service_role;GRANT ALL ON SEQUENCE public."TestUsers_id_seq" TO anon,authenticated,service_role;ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;`,
  );
  const operator = connect(i, "postgres");
  const bytes = readFileSync("db/install/reviewed-installation.sql");
  assert.equal(
    hash(bytes),
    "72818e1233ab51ebbac861a822d89ee0d52d4c12ee32a193746c631bdf639b0c",
  );
  await operator.unsafe(bytes.toString("utf8")).simple();
  await operator
    .unsafe(readFileSync("db/install/runtime-login-proposal.sql", "utf8"))
    .simple();
  await operator.unsafe(
    `ALTER ROLE aibean_app_login LOGIN PASSWORD '${password("aibean_app_login")}'`,
  );
  await operator
    .unsafe(readFileSync("db/install/testusers-security-proposal.sql", "utf8"))
    .simple();
  const original = await reviewBaseline(query(operator));
  await installAdminReview(
    {
      operator,
      hostnameVerified: () => i.verified,
      recovery: async () => original,
      independent: () => connect(i, "postgres"),
      runtime: () => connect(i, "aibean_app_login"),
    },
    reviewSqlSha256,
  );
  return { admin, operator };
}
async function check(name: string, fn: () => Promise<void>) {
  stage = name;
  await fn();
  outcomes.push({ name, status: "PASS" });
  console.log(JSON.stringify({ name, status: "PASS" }));
}
async function denied(c: Client, sql: string) {
  await assert.rejects(
    c.unsafe(sql).simple(),
    (e: { code?: string }) => e.code === "42501",
  );
}
async function main() {
  assert(native(exe("postgres"), ["--version"]).includes("17.11"));
  native(process.env.PG_TEST_OPENSSL || "openssl", [
    "req",
    "-x509",
    "-newkey",
    "rsa:3072",
    "-nodes",
    "-keyout",
    key,
    "-out",
    cert,
    "-days",
    "1",
    "-subj",
    "/CN=localhost",
    "-addext",
    "subjectAltName=IP:127.0.0.1,DNS:localhost",
    "-addext",
    "basicConstraints=critical,CA:TRUE",
  ]);
  const frozen = reviewedSql(sqlSha256);
  assert.equal(hash(frozen), sqlSha256);
  const reference = await instance("reference"),
    target = await instance("target");
  const ref = await fixture(reference),
    test = await fixture(target);
  await check(
    "Native trusted TLS and rejected untrusted CA/hostname",
    async () => {
      for (const ssl of [
        { ca: [], rejectUnauthorized: true },
        {
          ca: readFileSync(cert, "utf8"),
          rejectUnauthorized: true,
          servername: "wrong.example.invalid",
        },
      ]) {
        const c = connect(target, "postgres", "invalid", ssl);
        await assert.rejects(c`SELECT 1`);
        await c.end({ timeout: 1 });
      }
    },
  );
  // Independent catalog reference from the unchanged SQL; cross-check Drizzle column/FK contracts.
  await ref.operator`SELECT set_config('aibean.operations_install_sha256',${sqlSha256},false)`;
  await ref.operator.unsafe(frozen).simple();
  const expected = await operationsCatalog(query(ref.operator));
  await check(
    "Reference catalogs match Drizzle columns FK targets and exact five RLS relations",
    async () => {
      for (const table of [
        billingProducts,
        billingTransactions,
        toolSubmissions,
        commerceSubscriptions,
      ]) {
        const t = getTableConfig(table);
        const cols = expected.columns.filter((r) => r.relation === t.name);
        assert.deepEqual(
          cols.map((r) => r.name).sort(),
          t.columns.map((c) => c.name).sort(),
        );
        for (const c of t.columns) {
          const row = cols.find((r) => r.name === c.name)!;
          assert.equal(row.not_null, c.notNull);
          assert.equal(row.type, c.getSQLType());
        }
        const fks = expected.constraints.filter(
          (r) => r.relation === t.name && r.type === "f",
        );
        assert.equal(fks.length, t.foreignKeys.length);
        for (const fk of t.foreignKeys) {
          const f = fk.reference();
          assert(
            fks.some((k) =>
              String(k.definition).includes(
                `FOREIGN KEY (${f.columns.map((c) => c.name).join(", ")}) REFERENCES ${getTableConfig(f.foreignTable).name}(${f.foreignColumns.map((c) => c.name).join(", ")})`,
              ),
            ),
          );
        }
      }
      assert.equal(expected.relations.length, 5);
      assert(
        expected.relations.every(
          (r) => r.rls === true && r.owner === "postgres",
        ),
      );
      assert.equal(expected.columnAcl.length, 0);
      assert.equal(expected.triggers.length, 0);
    },
  );
  mkdirSync(resolve("db/proposals/admin-operations-v2-readiness"), {
    recursive: true,
  });
  if (existsSync(catalogPath))
    assert.deepEqual(JSON.parse(readFileSync(catalogPath, "utf8")), expected);
  else
    writeFileSync(catalogPath, JSON.stringify(expected, null, 2) + "\n", {
      flag: "wx",
    });
  const before = await baseline(query(test.operator));
  const context = (op = test.operator): Context => ({
    operator: op,
    hostnameVerified: () => target.verified,
    recovery: async () => before,
    independent: () => connect(target, "postgres", "independent"),
    runtime: () => connect(target, "aibean_app_login", "runtime"),
  });
  await check("Bad authorization fails before SQL", async () => {
    await assert.rejects(
      installOperations(context(), "0".repeat(64)),
      (e: unknown) =>
        e instanceof InstallationFailure && e.evidence.attempted === false,
    );
    assert.deepEqual(await baseline(query(test.operator)), before);
  });
  await check(
    "Incorrect session operator and database identity fail before SQL",
    async () => {
      const bad = connect(target, "cluster_admin");
      await assert.rejects(
        installOperations(context(bad), sqlSha256),
        (e: unknown) =>
          e instanceof InstallationFailure && e.evidence.attempted === false,
      );
      await test.admin.unsafe("CREATE DATABASE wrong_database");
      const wrong = postgres({
        host: "127.0.0.1",
        port: target.port,
        database: "wrong_database",
        username: "postgres",
        password: password("postgres"),
        max: 1,
        ssl: {
          ca: readFileSync(cert, "utf8"),
          rejectUnauthorized: true,
          checkServerIdentity: (_h: string, p: PeerCertificate) =>
            checkServerIdentity("127.0.0.1", p),
        },
      });
      clients.push(wrong);
      await assert.rejects(
        installOperations(context(wrong), sqlSha256),
        (e: unknown) =>
          e instanceof InstallationFailure && !e.evidence.attempted,
      );
    },
  );
  await check(
    "Recovery history and TestUsers drift stop before installation",
    async () => {
      await test.operator.unsafe(
        "UPDATE public.\"TestUsers\" SET email='synthetic-changed@example.invalid' WHERE id=1",
      );
      await assert.rejects(
        installOperations(context(), sqlSha256),
        (e: unknown) =>
          e instanceof InstallationFailure && !e.evidence.attempted,
      );
      await test.operator.unsafe(
        "UPDATE public.\"TestUsers\" SET email='synthetic-one@example.invalid' WHERE id=1",
      );
      await test.operator.unsafe(
        "UPDATE drizzle.__drizzle_migrations SET created_at=created_at+1 WHERE id=(SELECT min(id) FROM drizzle.__drizzle_migrations)",
      );
      await assert.rejects(
        installOperations(context(), sqlSha256),
        (e: unknown) =>
          e instanceof InstallationFailure && !e.evidence.attempted,
      );
      await test.operator.unsafe(
        "UPDATE drizzle.__drizzle_migrations SET created_at=created_at-1 WHERE id=(SELECT min(id) FROM drizzle.__drizzle_migrations)",
      );
    },
  );
  await check(
    "Unexpected target object fails before SQL without repair",
    async () => {
      await test.operator.unsafe(
        "CREATE TABLE public.billing_products(id text)",
      );
      await assert.rejects(
        installOperations(context(), sqlSha256),
        (e: unknown) =>
          e instanceof InstallationFailure && !e.evidence.attempted,
      );
      await test.operator.unsafe("DROP TABLE public.billing_products");
    },
  );
  await check(
    "Missing predecessor ledger table, wrong hash and predecessor grant drift fail before SQL",
    async () => {
      for (const [change, undo] of [
        [
          "ALTER TABLE aibean_private.admin_review_installations RENAME TO synthetic_missing_ledger",
          "ALTER TABLE aibean_private.synthetic_missing_ledger RENAME TO admin_review_installations",
        ],
        [
          "UPDATE aibean_private.admin_review_installations SET sql_sha256=repeat('0',64)",
          `UPDATE aibean_private.admin_review_installations SET sql_sha256='${reviewSqlSha256}'`,
        ],
        [
          "GRANT SELECT ON public.creator_applications TO authenticated",
          "REVOKE SELECT ON public.creator_applications FROM authenticated",
        ],
      ]) {
        await test.operator.unsafe(change).simple();
        await assert.rejects(
          installOperations(context(), sqlSha256),
          (e: unknown) =>
            e instanceof InstallationFailure && !e.evidence.attempted,
        );
        await test.operator.unsafe(undo).simple();
      }
      await assert.rejects(
        installOperations(
          { ...context(), hostnameVerified: () => false },
          sqlSha256,
        ),
        (e: unknown) =>
          e instanceof InstallationFailure && !e.evidence.attempted,
      );
    },
  );
  await check(
    "Late native DDL failure rolls back exact SQL and all prior data/history",
    async () => {
      await test.admin
        .unsafe(
          "CREATE SCHEMA synthetic_failure;CREATE FUNCTION synthetic_failure.reject_ledger() RETURNS event_trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS(SELECT 1 FROM pg_event_trigger_ddl_commands() WHERE object_identity='aibean_private.admin_operations_installations') THEN RAISE EXCEPTION 'Synthetic failure' USING ERRCODE='P0001';END IF;END $$;CREATE EVENT TRIGGER synthetic_review_failure ON ddl_command_end EXECUTE FUNCTION synthetic_failure.reject_ledger();",
        )
        .simple();
      const failedReference = await baseline(query(test.operator));
      const c = { ...context(), recovery: async () => failedReference };
      await assert.rejects(installOperations(c, sqlSha256), (e: unknown) => {
        assert(e instanceof InstallationFailure);
        console.log(JSON.stringify({ injectedFailure: e.evidence }));
        assert.equal(e.evidence.attempted, true);
        assert.equal(e.evidence.commitAcknowledged, false);
        assert.equal(e.evidence.rollback, "VERIFIED");
        return true;
      });
      assert.deepEqual(await baseline(query(test.operator)), failedReference);
      for (const r of operationsRelations)
        assert.equal(
          (
            await test.operator.unsafe(
              `SELECT to_regclass('${r}') IS NULL AS absent`,
            )
          )[0].absent,
          true,
        );
      await test.admin
        .unsafe(
          "DROP EVENT TRIGGER synthetic_review_failure;DROP SCHEMA synthetic_failure CASCADE",
        )
        .simple();
    },
  );
  await check(
    "Concurrent exact executors serialize: one commit and one verified rollback",
    async () => {
      let arrived = 0;
      let release!: () => void;
      const gate = new Promise<void>((r) => (release = r));
      const hook = async () => {
        if (++arrived === 2) release();
        await gate;
      };
      const other = connect(target, "postgres", "competitor");
      const both = await Promise.allSettled([
        installOperations({ ...context(), beforeSql: hook }, sqlSha256),
        installOperations({ ...context(other), beforeSql: hook }, sqlSha256),
      ]);
      assert.equal(both.filter((r) => r.status === "fulfilled").length, 1);
      const failure = both.find(
        (r) => r.status === "rejected",
      ) as PromiseRejectedResult;
      assert(failure.reason instanceof InstallationFailure);
      assert.equal(failure.reason.evidence.rollback, "VERIFIED");
    },
  );
  await check(
    "Independent postflight five catalogs FKs indexes constraints RLS effective grants",
    async () => {
      await independentPostflight(context(), before);
    },
  );
  await check(
    "Browser and BYPASSRLS service connections denied actual table reads",
    async () => {
      for (const role of ["anon", "authenticated", "service_role"]) {
        const c = connect(target, role);
        for (const table of operationsTables)
          await denied(c, `SELECT id FROM public.${table} LIMIT 0`);
        await denied(
          c,
          "SELECT package_id FROM aibean_private.admin_operations_installations LIMIT 0",
        );
      }
    },
  );
  await check(
    "Runtime cannot change capabilities requests ledger or schema",
    async () => {
      const c = connect(target, "aibean_app_login");
      for (const statement of [
        "UPDATE public.users SET is_admin=true WHERE false",
        "UPDATE public.users SET is_creator=true WHERE false",
        "INSERT INTO public.users(id,is_admin) VALUES ('synthetic-forbidden',true)",

        "DELETE FROM public.billing_transactions WHERE false",
        "UPDATE aibean_private.admin_operations_installations SET sql_sha256=repeat('0',64)",
        "CREATE TABLE public.synthetic_forbidden(id text)",
        "DELETE FROM public.tool_submissions WHERE false",
      ])
        await denied(c, statement);
      for (const table of operationsTables) {
        await denied(c, `DELETE FROM public.${table} WHERE false`);
        await denied(c, `TRUNCATE public.${table}`);
      }
      await denied(
        c,
        "CREATE TABLE aibean_private.synthetic_forbidden(id text)",
      );
    },
  );
  await check(
    "Paid transactions and subscriptions never mutate capabilities ownership trust or ranking",
    async () => {
      const c = connect(target, "aibean_app_login");

      await c.unsafe("BEGIN").simple();
      try {
        await c.unsafe(
          "INSERT INTO public.users(id) VALUES ('synthetic-payer'),('synthetic-owner')",
        );
        await c.unsafe(
          "INSERT INTO public.taxonomy(id,kind,name,slug,data) VALUES ('synthetic-taxonomy','category','Synthetic','synthetic','{}')",
        );
        await c.unsafe(
          `INSERT INTO public.tools(id,slug,name,category_id,data) VALUES ('synthetic-tool','synthetic-tool','Synthetic','synthetic-taxonomy','{"verified":false,"verification":"none","lastVerified":null,"organicRank":17}')`,
        );
        await c.unsafe(
          "INSERT INTO public.vendor_access(tool_id,user_id) VALUES ('synthetic-tool','synthetic-owner')",
        );
        const original = await c.unsafe(
          "SELECT tool_id,user_id FROM public.vendor_access ORDER BY tool_id",
        );
        const trust = await c.unsafe("SELECT * FROM public.tools ORDER BY id");
        await c.unsafe(
          "INSERT INTO public.billing_products(id,name,amount,updated_by) VALUES ('creator_subscription','Synthetic',100,'synthetic-payer')",
        );
        await c.unsafe(
          "INSERT INTO public.billing_transactions(id,user_id,product_id,kind,subject_id,amount,currency) VALUES ('synthetic-payment','synthetic-payer','creator_subscription','creator_subscription','synthetic-subject',100,'usd')",
        );
        await c.unsafe(
          "UPDATE public.billing_transactions SET status='paid' WHERE id='synthetic-payment'",
        );
        await c.unsafe(
          "INSERT INTO public.commerce_subscriptions(id,user_id,product_id,stripe_subscription_id,status) VALUES ('synthetic-subscription','synthetic-payer','creator_subscription','sub_synthetic','active')",
        );
        const [r] = await c.unsafe(
          "SELECT is_admin,is_creator FROM public.users WHERE id='synthetic-payer'",
        );
        assert.deepEqual({ ...r }, { is_admin: false, is_creator: false });
        assert.deepEqual(
          JSON.parse(
            JSON.stringify(
              await c.unsafe(
                "SELECT tool_id,user_id FROM public.vendor_access ORDER BY tool_id",
              ),
            ),
          ),
          JSON.parse(JSON.stringify(original)),
        );
        assert.deepEqual(
          JSON.parse(
            JSON.stringify(
              await c.unsafe("SELECT * FROM public.tools ORDER BY id"),
            ),
          ),
          JSON.parse(JSON.stringify(trust)),
        );
      } finally {
        await c.unsafe("ROLLBACK").simple();
      }
      await independentPostflight(context(), before);
    },
  );
  await check(
    "Re-execution refuses existing objects before transaction",
    async () => {
      await assert.rejects(
        installOperations(context(), sqlSha256),
        (e: unknown) =>
          e instanceof InstallationFailure && !e.evidence.attempted,
      );
    },
  );
  await check(
    "Post-commit verifier failure preserves installation and requires forward review",
    async () => {
      const i = await instance("postcommit");
      const f = await fixture(i);
      const prior = await baseline(query(f.operator));
      const ctx: Context = {
        operator: f.operator,
        hostnameVerified: () => i.verified,
        recovery: async () => prior,
        independent: () => connect(i, "postgres"),
        runtime: () => connect(i, "anon"),
      };
      await assert.rejects(installOperations(ctx, sqlSha256), (e: unknown) => {
        assert(e instanceof InstallationFailure);
        assert.equal(e.evidence.commitAcknowledged, true);
        assert.equal(e.evidence.rollback, "NOT_NEEDED");
        assert.equal(e.evidence.decision, "REVIEW_FORWARD_FIX_OR_RECOVERY");
        return true;
      });
      await independentPostflight(
        { ...ctx, runtime: () => connect(i, "aibean_app_login") },
        prior,
      );
    },
  );
  await check(
    "Independent verifier rejects extra grants missing index disabled RLS and wrong ledger",
    async () => {
      for (const [change, undo] of [
        [
          "GRANT SELECT ON public.tool_submissions TO authenticated",
          "REVOKE SELECT ON public.tool_submissions FROM authenticated",
        ],
        [
          "ALTER TABLE public.tool_submissions DISABLE ROW LEVEL SECURITY",
          "ALTER TABLE public.tool_submissions ENABLE ROW LEVEL SECURITY",
        ],
        [
          "DROP INDEX public.commercial_queue",
          "CREATE INDEX commercial_queue ON public.billing_transactions(status,created_at,id)",
        ],
        [
          "UPDATE aibean_private.admin_operations_installations SET sql_sha256=repeat('0',64)",
          `UPDATE aibean_private.admin_operations_installations SET sql_sha256='${sqlSha256}'`,
        ],
      ]) {
        await test.operator.unsafe(change).simple();
        await assert.rejects(independentPostflight(context(), before));
        await test.operator.unsafe(undo).simple();
      }
      await independentPostflight(context(), before);
    },
  );
  await check(
    "Lost COMMIT response is UNKNOWN, never retried or automatically rolled back",
    async () => {
      const i = await instance("unknowncommit"),
        f = await fixture(i);
      const prior = await baseline(query(f.operator));
      let sqlInvocations = 0;
      const proxy = {
        reserve: async () => {
          const pinned = await f.operator.reserve();
          return new Proxy(pinned, {
            get(target, key) {
              if (key === "unsafe")
                return (s: string) => {
                  if (s === frozen)
                    return {
                      simple: async () => {
                        sqlInvocations++;
                        await pinned.unsafe(s).simple();
                        throw Object.assign(
                          new Error("Synthetic lost COMMIT response"),
                          { code: "08006" },
                        );
                      },
                    };
                  return pinned.unsafe(s);
                };
              return Reflect.get(target, key);
            },
          });
        },
      } as unknown as Client;
      const ctx: Context = {
        operator: proxy,
        hostnameVerified: () => i.verified,
        recovery: async () => prior,
        independent: () => connect(i, "postgres"),
        runtime: () => connect(i, "aibean_app_login"),
      };
      await assert.rejects(installOperations(ctx, sqlSha256), (e: unknown) => {
        assert(e instanceof InstallationFailure);
        assert.equal(e.evidence.rollback, "UNVERIFIED");
        assert.equal(e.evidence.decision, "REVIEW_UNKNOWN_COMMIT_STATE");
        assert.equal(e.evidence.automaticRetry, false);
        return true;
      });
      assert.equal(sqlInvocations, 1);
      await independentPostflight({ ...ctx, operator: f.operator }, prior);
    },
  );
  await check(
    "Full native server commerce contract: account isolation payment/editorial separation and audit rollback",
    async () => {
      const i = await instance("commerce-contract"),
        f = await fixture(i);
      const prior = await baseline(query(f.operator));
      await installOperations(
        {
          operator: f.operator,
          hostnameVerified: () => i.verified,
          recovery: async () => prior,
          independent: () => connect(i, "postgres"),
          runtime: () => connect(i, "aibean_app_login"),
        },
        sqlSha256,
      );
      await setupAdminFixtures(drizzle(f.operator));
      await commerceContract(drizzle(connect(i, "aibean_app_login")));
    },
  );
  assert.equal(hash(readFileSync(sqlPath)), sqlSha256);
  writeFileSync(
    "docs/evidence/admin-operations-v2-native-readiness.json",
    JSON.stringify(
      {
        status: "PASS",
        capturedAt: new Date().toISOString(),
        sqlSha256,
        nativePostgreSQL: "17.11",
        freshInstances: 5,
        hostedConnections: 0,
        syntheticOnly: true,
        scenarioCount: outcomes.length,
        scenarios: outcomes,
        catalogCounts: {
          relations: expected.relations.length,
          columns: expected.columns.length,
          constraints: expected.constraints.length,
          foreignKeys: expected.constraints.filter((r) => r.type === "f")
            .length,
          indexes: expected.indexes.length,
          policies: expected.policies.length,
        },
        historicalRecoveryArtifactsTouched: false,
        frozenSqlUnchanged: true,
        codeHashes: [
          "scripts/admin-operations-v2/dependency-inventory.ts",
          "scripts/admin-operations-v2/core.ts",
          "scripts/admin-operations-v2/operator.ts",
          "scripts/admin-operations-v2/native-test.ts",
          "scripts/admin-operations-v2/execute.ts",
          "scripts/admin-operations-v2/verify.ts",
          "scripts/admin-operations-v2/prepare.ts",
          "tests/admin-operations-installation.test.ts",
        ].map((path) => ({ path, sha256: hash(readFileSync(path)) })),
      },
      null,
      2,
    ) + "\n",
  );
}
main()
  .catch((e) => {
    console.error(
      JSON.stringify({
        status: "FAIL",
        stage,
        sqlState: safeCode(e),
        details: "Native synthetic failure; protected diagnostics withheld",
      }),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled(clients.map((c) => c.end({ timeout: 5 })));
    for (const d of running.reverse())
      native(exe("pg_ctl"), ["-D", d, "-w", "-m", "fast", "stop"]);
    console.log(
      JSON.stringify({
        syntheticTargetsStopped: true,
        syntheticArtifactsRetained: true,
      }),
    );
  });
