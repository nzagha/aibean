// Disposable native PostgreSQL only. Deliberately does not load dotenv, accept
// DATABASE_URL, import the application DB, or connect to any supplied endpoint.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { createServer } from "node:net";
import { checkServerIdentity, type PeerCertificate } from "node:tls";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { inspectReadinessCounts } from "../src/lib/db/readiness-inventory";
import { resolveSupabaseUser } from "../src/lib/supabase/identity";
import {
  addOwnedStackTool,
  ownerPredicates,
} from "../src/lib/db/owned-resources";
import {
  claims,
  reviews,
  savedTools,
  stacks,
  vendorAccess,
} from "../src/lib/db/schema";

type Client = ReturnType<typeof postgres>;
const bin = process.env.PG_TEST_BIN;
const openssl = process.env.PG_TEST_OPENSSL || "openssl";
if (!bin)
  throw new Error("PG_TEST_BIN must point to native PostgreSQL 17 binaries.");
const root = resolve(
  "test-results",
  `postgres-${Date.now()}-${randomBytes(4).toString("hex")}`,
);
mkdirSync(root, { recursive: true, mode: 0o700 });
const exe = (name: string) =>
  join(bin, `${name}${process.platform === "win32" ? ".exe" : ""}`);
const clients: Client[] = [];
const running: string[] = [];
const passwords = new Map<string, string>();
const outcomes: { name: string; status: string }[] = [];
const read = (file: string) =>
  readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const sha = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const installation = read("db/install/reviewed-installation.sql");
const manifest = JSON.parse(read("db/install/manifest.json"));
const tables = [
  "taxonomy",
  "users",
  "tools",
  "saved_tools",
  "stacks",
  "stack_tools",
  "tool_reviews",
  "vendor_access",
  "claim_requests",
  "orders",
  "featured_placements",
  "billing_webhook_receipts",
  "audit_logs",
  "rate_limits",
];

function run(
  command: string,
  args: string[],
  extraEnv: Record<string, string> = {},
) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 60000,
    windowsHide: true,
    env: { ...process.env, ...extraEnv },
    maxBuffer: 8 * 1024 * 1024,
    // pg_ctl launches a detached server. Avoid inherited pipes keeping the
    // Windows caller alive after pg_ctl itself has returned.
    stdio: command.includes("pg_ctl") ? "ignore" : "pipe",
  });
  if (result.status !== 0) {
    // These commands receive only synthetic credentials; redact them anyway.
    let error =
      result.stderr ||
      result.stdout ||
      (result.error as NodeJS.ErrnoException | undefined)?.code ||
      "process failed";
    for (const password of passwords.values())
      error = error.split(password).join("[redacted]");
    throw new Error(`${command.split(/[\\/]/).pop()} failed: ${error}`);
  }
  return result.stdout;
}
async function port() {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");
  const value = address.port;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return value;
}
const passwordFor = (role: string) => {
  if (!passwords.has(role))
    passwords.set(role, randomBytes(32).toString("hex"));
  return passwords.get(role)!;
};
const cert = join(root, "test-ca.crt");
const key = join(root, "test-server.key");
type Instance = { directory: string; port: number };
function connect(instance: Instance, role: string, application = role): Client {
  assert(instance.port > 0);
  const client = postgres({
    host: "127.0.0.1",
    port: instance.port,
    database: "postgres",
    username: role,
    password: passwordFor(role),
    max: 1,
    prepare: false,
    connect_timeout: 5,
    ssl: {
      ca: readFileSync(cert, "utf8"),
      rejectUnauthorized: true,
      servername: "localhost",
      checkServerIdentity: (_hostname: string, peer: PeerCertificate) =>
        checkServerIdentity("127.0.0.1", peer),
    },
    connection: { application_name: `aibean-isolated-${application}` },
    onnotice: () => {},
  });
  clients.push(client);
  return client;
}
async function instance(name: string): Promise<Instance> {
  const directory = join(root, name);
  assert(!existsSync(directory), "Never reuse an existing data directory");
  const assignedPort = await port();
  const passwordFile = join(root, `${name}-bootstrap-password`);
  writeFileSync(passwordFile, passwordFor("cluster_admin"), { mode: 0o600 });
  run(exe("initdb"), [
    "-D",
    directory,
    "-U",
    "cluster_admin",
    "--pwfile",
    passwordFile,
    "--auth-host=scram-sha-256",
    "--auth-local=scram-sha-256",
    "--encoding=UTF8",
    "--no-locale",
  ]);
  const pgPath = (file: string) => file.replace(/\\/g, "/").replace(/'/g, "''");
  writeFileSync(
    join(directory, "postgresql.conf"),
    `listen_addresses='127.0.0.1'\nport=${assignedPort}\nssl=on\nssl_cert_file='${pgPath(cert)}'\nssl_key_file='${pgPath(key)}'\npassword_encryption='scram-sha-256'\n`,
  );
  writeFileSync(
    join(directory, "pg_hba.conf"),
    "hostssl all all 127.0.0.1/32 scram-sha-256\nhostnossl all all 127.0.0.1/32 reject\n",
  );
  run(exe("pg_ctl"), [
    "-D",
    directory,
    "-l",
    join(root, `${name}.log`),
    "-w",
    "start",
  ]);
  running.push(directory);
  return { directory, port: assignedPort };
}
async function count(db: Client, relation: string) {
  return (await db.unsafe(`SELECT count(*)::int AS n FROM ${relation}`))[0]
    .n as number;
}
async function check(name: string, action: () => Promise<void>) {
  await action();
  outcomes.push({ name, status: "PASS" });
  console.log(`PASS ${name}`);
}
async function denied(db: Client, statement: string, expected = "42501") {
  await assert.rejects(
    db.unsafe(statement),
    (error: { code?: string }) => error.code === expected,
  );
}
async function waitFor(db: Client, statement: string) {
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    if ((await db.unsafe(statement))[0].ready) return;
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  throw new Error("Deterministic concurrency barrier was not reached");
}
async function fixture(db: Client) {
  for (const [role, flags] of [
    ["postgres", "NOSUPERUSER BYPASSRLS CREATEDB CREATEROLE REPLICATION"],
    ["anon", "NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION"],
    [
      "authenticated",
      "NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION",
    ],
    [
      "service_role",
      "NOSUPERUSER BYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION",
    ],
  ]) {
    await db.unsafe(
      `CREATE ROLE ${role} LOGIN ${flags} PASSWORD '${passwordFor(role)}'`,
    );
  }
  await db.unsafe(`CREATE ROLE managed_auth_owner NOLOGIN;
    GRANT CREATE ON DATABASE postgres TO postgres;
    ALTER SCHEMA public OWNER TO postgres;
    REVOKE CREATE ON SCHEMA public FROM PUBLIC;
    CREATE SCHEMA auth AUTHORIZATION managed_auth_owner;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    ALTER TABLE auth.users OWNER TO managed_auth_owner;
    GRANT USAGE ON SCHEMA auth TO postgres;
    -- Match the live operator's observed read-only inventory and FK capability.
    GRANT SELECT, REFERENCES ON auth.users TO postgres;
    CREATE TABLE public."TestUsers"(id bigint PRIMARY KEY,email text);
    ALTER TABLE public."TestUsers" OWNER TO postgres;
    INSERT INTO public."TestUsers" VALUES (1,'synthetic-a@example.invalid'),(2,'synthetic-b@example.invalid');
    ALTER TABLE public."TestUsers" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY open_read ON public."TestUsers" FOR SELECT USING (true);
    GRANT ALL ON public."TestUsers" TO anon,authenticated;
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;`);
}
async function snapshot(db: Client) {
  const schemas = "('public','auth','drizzle','aibean_private')";
  const structure = {
    database: await db.unsafe(
      "SELECT datname,pg_get_userbyid(datdba) AS owner,coalesce(datacl,acldefault('d',datdba))::text AS acl FROM pg_database WHERE datname=current_database()",
    ),
    columns: await db.unsafe(
      `SELECT table_schema,table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema IN ${schemas} ORDER BY 1,2,ordinal_position`,
    ),
    constraints: await db.unsafe(
      `SELECT n.nspname,c.relname,k.conname,k.contype,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ${schemas} ORDER BY 1,2,3`,
    ),
    indexes: await db.unsafe(
      `SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname IN ${schemas} ORDER BY 1,2,3`,
    ),
    tables: await db.unsafe(
      // pg_dump normalizes explicit owner-only ACLs to NULL defaults. Compare
      // effective privileges without changing either database's permissions.
      `SELECT n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity,pg_get_userbyid(c.relowner) AS owner,coalesce(c.relacl,acldefault('r',c.relowner))::text AS acl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ${schemas} AND c.relkind='r' ORDER BY 1,2`,
    ),
    schemas: await db.unsafe(
      `SELECT nspname,pg_get_userbyid(nspowner) AS owner,coalesce(nspacl,acldefault('n',nspowner))::text AS acl FROM pg_namespace WHERE nspname IN ${schemas} ORDER BY 1`,
    ),
    policies: await db.unsafe(
      `SELECT schemaname,tablename,policyname,permissive,roles::text,cmd,qual,with_check FROM pg_policies WHERE schemaname IN ${schemas} ORDER BY 1,2,3`,
    ),
    grants: await db.unsafe(
      `SELECT table_schema,table_name,grantee,privilege_type,is_grantable FROM information_schema.table_privileges WHERE table_schema IN ${schemas} ORDER BY 1,2,3,4`,
    ),
    columnGrants: await db.unsafe(
      `SELECT table_schema,table_name,column_name,grantee,privilege_type FROM information_schema.column_privileges WHERE table_schema IN ${schemas} ORDER BY 1,2,3,4,5`,
    ),
    defaults: await db.unsafe(
      `SELECT pg_get_userbyid(d.defaclrole) AS role,n.nspname,d.defaclobjtype,d.defaclacl::text AS acl FROM pg_default_acl d JOIN pg_namespace n ON n.oid=d.defaclnamespace WHERE n.nspname IN ${schemas} ORDER BY 1,2,3`,
    ),
    roles: await db.unsafe(
      `SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls FROM pg_roles WHERE rolname !~ '^pg_' ORDER BY 1`,
    ),
    memberships: await db.unsafe(
      `SELECT parent.rolname AS parent,child.rolname AS child,m.admin_option,m.inherit_option,m.set_option FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid JOIN pg_roles child ON child.oid=m.member ORDER BY 1,2`,
    ),
    history: await db.unsafe(
      "SELECT hash,created_at FROM drizzle.__drizzle_migrations ORDER BY created_at",
    ),
    supplement: await db.unsafe(
      "SELECT id,sql_sha256 FROM aibean_private.installations ORDER BY id",
    ),
    counts: {} as Record<string, number>,
  };
  for (const relation of [
    ...tables.map((table) => `public.${table}`),
    'public."TestUsers"',
    "auth.users",
    "aibean_private.user_identities",
  ])
    structure.counts[relation] = await count(db, relation);
  return JSON.parse(JSON.stringify(structure));
}
async function restrictions(instance: Instance) {
  for (const role of ["anon", "authenticated", "service_role"]) {
    const client = connect(instance, role);
    assert.equal((await client`SELECT session_user AS role`)[0].role, role);
    for (const table of tables)
      await denied(client, `SELECT * FROM public.${table}`);
    for (const table of [
      "aibean_private.user_identities",
      "aibean_private.installations",
      "drizzle.__drizzle_migrations",
      "auth.users",
    ])
      await denied(client, `SELECT * FROM ${table}`);
    await client.end();
  }
  const runtime = connect(instance, "aibean_app_login");
  assert.equal(
    (await runtime`SELECT session_user AS role`)[0].role,
    "aibean_app_login",
  );
  const flags = (
    await runtime`SELECT rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication FROM pg_roles WHERE rolname=current_user`
  )[0];
  assert(Object.values(flags).every((value) => value === false));
  const inventory = await drizzle(runtime).transaction(
    async (tx) =>
      inspectReadinessCounts(async (statement) => await tx.execute(statement)),
    { accessMode: "read only" },
  );
  assert.equal(inventory.authUsersCountVerified, false);
  assert.equal(inventory.testUsersCountVerified, false);
  assert.equal(inventory.authUsersCount, null);
  assert.equal(inventory.testUsersCount, null);
  assert.equal(inventory.ledgers.drizzle, "drizzle.__drizzle_migrations");
  for (const table of tables)
    await runtime.unsafe(`SELECT * FROM public.${table} LIMIT 0`);
  await runtime`SELECT * FROM aibean_private.user_identities LIMIT 0`;
  for (const statement of [
    "CREATE TABLE public.unapproved(id int)",
    "CREATE SCHEMA unapproved",
    "CREATE ROLE unapproved",
    "ALTER ROLE aibean_app_login BYPASSRLS",
    "SET ROLE postgres",
    "SET ROLE service_role",
    "ALTER TABLE public.users ADD COLUMN bad int",
    "DROP TABLE public.orders",
    "TRUNCATE public.orders",
    "UPDATE public.users SET is_admin=true",
    "UPDATE public.users SET is_creator=true",
    "INSERT INTO public.users(id,is_admin) VALUES ('forged',true)",
    "DELETE FROM public.users",
    "DELETE FROM public.audit_logs",
    "UPDATE public.billing_webhook_receipts SET id='bad'",
    "DELETE FROM aibean_private.user_identities",
    "SELECT * FROM aibean_private.installations",
    "SELECT * FROM drizzle.__drizzle_migrations",
    "SELECT * FROM auth.users",
    'SELECT * FROM public."TestUsers"',
  ])
    await denied(runtime, statement);
  await runtime.end();
}

async function main() {
  const version = run(exe("postgres"), ["--version"]).trim();
  assert.match(version, /PostgreSQL\) 17\./);
  for (const entry of manifest.baselineMigrations)
    assert.equal(sha(read(entry.path)), entry.sha256);
  assert.equal(sha(installation), manifest.installationSqlSha256);
  assert.equal(
    sha(read("db/install/identity-and-security.sql")),
    manifest.securitySqlSha256,
  );
  assert.equal(
    sha(read("db/install/testusers-security-proposal.sql")),
    manifest.optionalTestUsersSqlSha256,
  );
  run(openssl, [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-sha256",
    "-days",
    "2",
    "-keyout",
    key,
    "-out",
    cert,
    "-subj",
    "/CN=aiBean disposable test CA",
    "-addext",
    "subjectAltName=IP:127.0.0.1,DNS:localhost",
    "-addext",
    "basicConstraints=critical,CA:TRUE",
  ]);
  const source = await instance("source");
  const restore = await instance("restore");
  const admin = connect(source, "cluster_admin", "observer");
  await fixture(admin);
  const operator = connect(source, "postgres", "installer-one");
  await check("Verified TLS and nonsuperuser migration operator", async () => {
    assert.equal(
      (
        await operator`SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()`
      )[0].ssl,
      true,
    );
    assert.equal(
      (
        await operator`SELECT rolsuper FROM pg_roles WHERE rolname=current_user`
      )[0].rolsuper,
      false,
    );
    assert.equal(
      (await operator`SELECT current_database() AS db`)[0].db,
      "postgres",
    );
  });
  await check(
    "Untrusted certificates and incorrect peer hostname fail closed",
    async () => {
      const attempts = [
        {
          ssl: { ca: [] as string[], rejectUnauthorized: true },
          code: "DEPTH_ZERO_SELF_SIGNED_CERT",
        },
        {
          ssl: {
            ca: readFileSync(cert, "utf8"),
            rejectUnauthorized: true,
            servername: "wrong.example.invalid",
          },
          code: "ERR_TLS_CERT_ALTNAME_INVALID",
        },
      ];
      for (const attempt of attempts) {
        const invalid = postgres({
          host: "127.0.0.1",
          port: source.port,
          database: "postgres",
          username: "postgres",
          password: passwordFor("postgres"),
          max: 1,
          prepare: false,
          connect_timeout: 5,
          ssl: attempt.ssl,
        });
        clients.push(invalid);
        await denied(invalid, "SELECT 1", attempt.code);
        await invalid.end({ timeout: 1 });
      }
    },
  );
  await check(
    "Late installation failure rolls back every new object and preserves TestUsers",
    async () => {
      await denied(
        operator,
        installation.replace("COMMIT;", "SELECT 1/0; COMMIT;"),
        "22012",
      );
      await operator`ROLLBACK`;
      assert.equal(
        (await admin`SELECT to_regclass('public.users')::text AS object`)[0]
          .object,
        null,
      );
      assert.equal(
        (
          await admin`SELECT to_regclass('drizzle.__drizzle_migrations')::text AS object`
        )[0].object,
        null,
      );
      assert.equal(
        (
          await admin`SELECT count(*)::int AS n FROM pg_roles WHERE rolname='aibean_runtime'`
        )[0].n,
        0,
      );
      assert.equal(
        (
          await admin`SELECT count(*)::int AS n FROM pg_namespace WHERE nspname='aibean_private'`
        )[0].n,
        0,
      );
      assert.equal(await count(admin, 'public."TestUsers"'), 2);
    },
  );
  await check(
    "Concurrent clean installations serialize; observer sees no partial schema",
    async () => {
      const second = connect(source, "postgres", "installer-two");
      const firstAttempt = operator
        .unsafe(installation.replace("COMMIT;", "SELECT pg_sleep(2); COMMIT;"))
        .then(
          () => null,
          (error) => error,
        );
      await waitFor(
        admin,
        "SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='aibean-isolated-installer-one' AND wait_event='PgSleep') AS ready",
      );
      const secondAttempt = second.unsafe(installation).then(
        () => null,
        (error) => error,
      );
      await waitFor(
        admin,
        "SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='aibean-isolated-installer-two' AND wait_event='advisory') AS ready",
      );
      assert.equal(
        (await admin`SELECT to_regclass('public.users')::text AS object`)[0]
          .object,
        null,
      );
      assert.equal(
        (
          await admin`SELECT to_regclass('aibean_private.user_identities')::text AS object`
        )[0].object,
        null,
      );
      assert.equal(
        (
          await admin`SELECT count(*)::int AS n FROM pg_roles WHERE rolname='aibean_runtime'`
        )[0].n,
        0,
      );
      assert.equal(await firstAttempt, null);
      assert.equal(await secondAttempt, null);
      await second.end();
      assert.equal(await count(admin, "drizzle.__drizzle_migrations"), 2);
      assert.equal(await count(admin, "aibean_private.installations"), 1);
    },
  );
  await check(
    "Exact package repeats without metadata, record or ledger changes",
    async () => {
      const before = await snapshot(admin);
      await operator.unsafe(installation);
      assert.deepEqual(await snapshot(admin), before);
      const fk =
        await admin`SELECT count(*)::int AS n FROM pg_constraint k JOIN pg_namespace n ON n.oid=k.connamespace WHERE k.contype='f' AND n.nspname IN ('public','aibean_private')`;
      assert.equal(fk[0].n, 18);
      assert.equal(
        (
          await admin`SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public' AND tablename <> 'TestUsers' AND rowsecurity`
        )[0].n,
        14,
      );
    },
  );
  await check(
    "Altered, missing and noncontiguous migration history is rejected atomically",
    async () => {
      const before = await snapshot(admin);
      for (const modification of [
        "UPDATE drizzle.__drizzle_migrations SET hash='tampered' WHERE id=1",
        "DELETE FROM drizzle.__drizzle_migrations WHERE created_at=(SELECT min(created_at) FROM drizzle.__drizzle_migrations)",
        "DELETE FROM drizzle.__drizzle_migrations WHERE created_at=(SELECT max(created_at) FROM drizzle.__drizzle_migrations)",
        "ALTER TABLE drizzle.__drizzle_migrations RENAME TO missing_history",
        "UPDATE aibean_private.installations SET sql_sha256='tampered'",
      ]) {
        await operator`BEGIN`;
        await operator.unsafe(modification);
        await assert.rejects(
          operator.unsafe(
            installation.replace(/^BEGIN;$/m, "").replace(/^COMMIT;$/m, ""),
          ),
        );
        await operator`ROLLBACK`;
        assert.deepEqual(await snapshot(admin), before);
      }
    },
  );
  await check(
    "Advisory lock timeout aborts a competing installation without changes",
    async () => {
      const before = await snapshot(admin);
      const holder = connect(source, "postgres", "lock-holder");
      await holder`BEGIN`;
      await holder`SELECT pg_advisory_xact_lock(621487190)`;
      await denied(operator, installation, "55P03");
      await operator`ROLLBACK`;
      await holder`ROLLBACK`;
      await holder.end();
      assert.deepEqual(await snapshot(admin), before);
    },
  );
  await check(
    "Exact Approval B preparation works as nonsuperuser migration operator",
    async () => {
      await operator.unsafe(read("db/install/runtime-login-proposal.sql"));
      assert.equal(
        (
          await admin`SELECT rolcanlogin FROM pg_roles WHERE rolname='aibean_app_login'`
        )[0].rolcanlogin,
        false,
      );
      // Equivalent to private psql password provisioning using a random fixture.
      await operator.unsafe(
        `ALTER ROLE aibean_app_login PASSWORD '${passwordFor("aibean_app_login")}'`,
      );
      await operator`ALTER ROLE aibean_app_login LOGIN`;
      await operator.unsafe(read("db/install/validation-read-only.sql"));
    },
  );
  await check(
    "Independent browser, service and restricted runtime login sessions enforce grants",
    () => restrictions(source),
  );
  const runtime = connect(source, "aibean_app_login", "runtime-one");
  await check(
    "Runtime provisioning defaults and identity constraints preserve ordinary users",
    async () => {
      await runtime`INSERT INTO public.users(id) VALUES ('ordinary-a'),('ordinary-b')`;
      assert.equal(
        (
          await runtime`SELECT count(*)::int AS n FROM public.users WHERE is_admin OR is_creator`
        )[0].n,
        0,
      );
      await admin`INSERT INTO auth.users VALUES ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002')`;
      await runtime`INSERT INTO aibean_private.user_identities(auth_user_id,user_id) VALUES ('00000000-0000-4000-8000-000000000001','ordinary-a')`;
      await denied(
        runtime,
        "INSERT INTO aibean_private.user_identities(auth_user_id,user_id) VALUES ('00000000-0000-4000-8000-000000000002','ordinary-a')",
        "23505",
      );
      await denied(
        runtime,
        "INSERT INTO aibean_private.user_identities(auth_user_id,user_id) VALUES ('00000000-0000-4000-8000-000000000001','ordinary-b')",
        "23505",
      );
      await denied(
        runtime,
        "INSERT INTO aibean_private.user_identities(auth_user_id,user_id) VALUES ('00000000-0000-4000-8000-000000000099','ordinary-b')",
        "23503",
      );
      await denied(
        runtime,
        "INSERT INTO aibean_private.user_identities(auth_user_id,user_id) VALUES ('00000000-0000-4000-8000-000000000002','missing-user')",
        "23503",
      );
      await denied(
        admin,
        "DELETE FROM auth.users WHERE id='00000000-0000-4000-8000-000000000001'",
        "23503",
      );
      await denied(
        admin,
        "DELETE FROM public.users WHERE id='ordinary-a'",
        "23503",
      );
      await denied(
        admin,
        "UPDATE auth.users SET id='00000000-0000-4000-8000-000000000099' WHERE id='00000000-0000-4000-8000-000000000001'",
        "23503",
      );
      await denied(
        admin,
        "UPDATE public.users SET id='changed' WHERE id='ordinary-a'",
        "23503",
      );
    },
  );
  await check(
    "RLS independently denies browser rows; shared runtime requires server ownership checks",
    async () => {
      await operator`GRANT SELECT ON public.users TO authenticated`;
      const browser = connect(source, "authenticated");
      assert.equal(await count(browser, "public.users"), 0);
      await denied(browser, "SET row_security=off; SELECT * FROM public.users");
      await browser.end();
      await operator`REVOKE SELECT ON public.users FROM authenticated`;
      await runtime.unsafe(
        "INSERT INTO public.stacks VALUES ('stack-a','ordinary-a','Synthetic A'),('stack-b','ordinary-b','Synthetic B')",
      );
      assert.equal(await count(runtime, "public.stacks"), 2);
    },
  );
  await check(
    "Competing authenticated runtime transactions cannot assign two Tool owners",
    async () => {
      await runtime.unsafe(
        "INSERT INTO public.taxonomy VALUES ('cat','category','Category','category',null,'{}'); INSERT INTO public.tools(id,slug,name,category_id,data) VALUES ('tool','tool','Tool','cat','{}')",
      );
      const second = connect(source, "aibean_app_login", "runtime-two");
      await runtime`BEGIN`;
      await runtime`INSERT INTO public.vendor_access VALUES ('tool','ordinary-a')`;
      const competing =
        second`INSERT INTO public.vendor_access VALUES ('tool','ordinary-b')`.then(
          () => null,
          (error: { code: string }) => error.code,
        );
      await waitFor(
        admin,
        "SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='aibean-isolated-runtime-two' AND wait_event='transactionid') AS ready",
      );
      await runtime`COMMIT`;
      assert.equal(await competing, "23505");
      assert.equal(await count(runtime, "public.vendor_access"), 1);
      assert.equal(
        (
          await runtime`SELECT user_id FROM public.vendor_access WHERE tool_id='tool'`
        )[0].user_id,
        "ordinary-a",
      );
      await second.end();
      await runtime.unsafe(
        "INSERT INTO public.saved_tools(user_id,tool_id) VALUES ('ordinary-a','tool'); INSERT INTO public.stack_tools VALUES ('stack-a','tool'); INSERT INTO public.tool_reviews(id,user_id,tool_id,rating,body) VALUES ('review','ordinary-a','tool',5,'Synthetic review'); INSERT INTO public.audit_logs(id,actor_id,action,entity_id,detail) VALUES ('audit','ordinary-a','fixture','tool','Synthetic'); INSERT INTO public.billing_webhook_receipts(id) VALUES ('fixture-event')",
      );
    },
  );
  await check(
    "Separate TestUsers permission fix preserves two rows and denies browser reads",
    async () => {
      await operator.unsafe(read("db/install/testusers-security-proposal.sql"));
      assert.equal(await count(admin, 'public."TestUsers"'), 2);
      for (const role of ["anon", "authenticated"]) {
        const browser = connect(source, role);
        await denied(browser, 'SELECT * FROM public."TestUsers"');
        await browser.end();
      }
    },
  );
  await check(
    "Candidate canonical identity provisions once across independent runtime sessions and rolls back conflicts",
    async () => {
      const candidateId = "00000000-0000-4000-8000-000000000010";
      const collisionId = "00000000-0000-4000-8000-000000000011";
      await admin`INSERT INTO auth.users(id) VALUES (${candidateId}),(${collisionId})`;
      const second = connect(source, "aibean_app_login", "identity-two");
      try {
        const beforeUsers = await count(runtime, "public.users");
        const beforeMappings = await count(
          runtime,
          "aibean_private.user_identities",
        );
        const [first, other] = await Promise.all([
          resolveSupabaseUser(drizzle(runtime), candidateId),
          resolveSupabaseUser(drizzle(second), candidateId),
        ]);
        assert.equal(first.id, other.id);
        assert.equal(first.isAdmin, false);
        assert.equal(first.isCreator, false);
        assert.equal(await count(runtime, "public.users"), beforeUsers + 1);
        assert.equal(
          await count(runtime, "aibean_private.user_identities"),
          beforeMappings + 1,
        );
        await assert.rejects(
          resolveSupabaseUser(drizzle(runtime), collisionId, () => first.id),
        );
        await assert.rejects(
          resolveSupabaseUser(
            drizzle(runtime),
            "00000000-0000-4000-8000-000000000099",
          ),
        );
        assert.equal(await count(runtime, "public.users"), beforeUsers + 1);
        assert.equal(
          await count(runtime, "aibean_private.user_identities"),
          beforeMappings + 1,
        );
        assert.equal(
          (
            await resolveSupabaseUser(
              drizzle(runtime),
              "00000000-0000-4000-8000-000000000001",
            )
          ).id,
          "ordinary-a",
        );
      } finally {
        await second.end();
      }
    },
  );
  await check(
    "Candidate application owner queries and transactional Stack writes isolate two actual runtime identities",
    async () => {
      await runtime`INSERT INTO public.claim_requests(id,tool_id,user_id,company,role,proof)
        VALUES ('claim-a','tool','ordinary-a','Synthetic','Owner','Synthetic proof')`;
      const orm = drizzle(runtime);
      const other = ownerPredicates("ordinary-b");
      assert.equal(
        (await orm.select().from(savedTools).where(other.saves)).length,
        0,
      );
      assert.equal(
        (await orm.select().from(stacks).where(other.stacks)).length,
        1,
      );
      assert.equal(
        (await orm.select().from(reviews).where(other.reviews)).length,
        0,
      );
      assert.equal(
        (await orm.select().from(claims).where(other.claims)).length,
        0,
      );
      assert.equal(
        (await orm.select().from(vendorAccess).where(other.vendorTool("tool")))
          .length,
        0,
      );
      assert.equal(
        (
          await orm
            .select()
            .from(vendorAccess)
            .where(ownerPredicates("ordinary-a").vendorTool("wrong-tool"))
        ).length,
        0,
      );
      await assert.rejects(
        addOwnedStackTool(orm, "ordinary-b", "stack-a", "tool"),
      );
      await addOwnedStackTool(orm, "ordinary-a", "stack-a", "tool");
      assert.equal(await count(runtime, "public.stack_tools"), 1);
    },
  );
  const expected = await snapshot(admin);
  await check(
    "Real PostgreSQL historical upgrade preserves internal IDs and existing ownership",
    async () => {
      const historical = await instance("historical");
      const historicalAdmin = connect(historical, "cluster_admin");
      await fixture(historicalAdmin);
      const historicalOperator = connect(historical, "postgres");
      await historicalOperator.unsafe(
        "CREATE SCHEMA drizzle; CREATE TABLE drizzle.__drizzle_migrations(id serial PRIMARY KEY,hash text NOT NULL,created_at bigint)",
      );
      for (const entry of manifest.baselineMigrations) {
        await historicalOperator.unsafe(read(entry.path));
        await historicalOperator`INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES (${entry.sha256},${entry.createdAt})`;
      }
      await historicalOperator.unsafe(`INSERT INTO public.users(id) VALUES ('legacy-a'),('legacy-b');
      INSERT INTO public.taxonomy VALUES ('cat','category','Category','category',null,'{}');
      INSERT INTO public.tools(id,slug,name,category_id,data) VALUES ('tool','tool','Tool','cat','{}');
      INSERT INTO public.stacks VALUES ('stack','legacy-a','Synthetic legacy stack');
      INSERT INTO public.stack_tools VALUES ('stack','tool');
      INSERT INTO public.saved_tools(user_id,tool_id) VALUES ('legacy-a','tool');
      INSERT INTO public.vendor_access VALUES ('tool','legacy-a');
      INSERT INTO public.tool_reviews(id,user_id,tool_id,rating,body) VALUES ('review','legacy-a','tool',5,'Synthetic');`);
      await historicalOperator.unsafe(installation);
      await historicalOperator.unsafe(installation);
      for (const table of [
        "stacks",
        "stack_tools",
        "saved_tools",
        "vendor_access",
        "tool_reviews",
      ])
        assert.equal(await count(historicalAdmin, `public.${table}`), 1);
      assert.equal(
        (await historicalAdmin`SELECT user_id FROM public.stacks`)[0].user_id,
        "legacy-a",
      );
      assert.equal(
        (await historicalAdmin`SELECT user_id FROM public.vendor_access`)[0]
          .user_id,
        "legacy-a",
      );
      assert.equal(await count(historicalAdmin, 'public."TestUsers"'), 2);
      assert.equal(
        await count(historicalAdmin, "drizzle.__drizzle_migrations"),
        2,
      );
      assert.equal(
        await count(historicalAdmin, "aibean_private.user_identities"),
        0,
      );
      await historicalOperator.end();
      await historicalAdmin.end();
    },
  );
  const archive = join(root, "synthetic.dump");
  const roleFile = join(root, "synthetic-roles.sql");
  const pgEnv = {
    PGHOST: "127.0.0.1",
    PGPORT: String(source.port),
    PGUSER: "cluster_admin",
    PGPASSWORD: passwordFor("cluster_admin"),
    PGDATABASE: "postgres",
    PGSSLMODE: "verify-full",
    PGSSLROOTCERT: cert,
  };
  await check(
    "Native pg_dump/pg_dumpall preserve synthetic schema, ledgers, records and roles",
    async () => {
      run(
        exe("pg_dump"),
        ["--create", "--format=custom", "--file", archive],
        pgEnv,
      );
      run(
        exe("pg_dumpall"),
        ["--roles-only", "--no-role-passwords", "--file", roleFile],
        pgEnv,
      );
      assert(!read(roleFile).includes("SCRAM-SHA-256$"));
      run(exe("pg_restore"), ["--list", archive]);
    },
  );
  await check(
    "Separate instance restores equivalent metadata, counts, FKs, ledgers and permissions",
    async () => {
      // The target's only existing role is its isolated bootstrap administrator.
      // Remove only that duplicate CREATE; preserve custom roles and memberships.
      writeFileSync(
        roleFile,
        read(roleFile).replace(/^CREATE ROLE cluster_admin;\n/m, ""),
      );
      const restoreEnv = { ...pgEnv, PGPORT: String(restore.port) };
      run(
        exe("psql"),
        [
          "--no-psqlrc",
          "--set",
          "ON_ERROR_STOP=1",
          "--single-transaction",
          "--file",
          roleFile,
        ],
        restoreEnv,
      );
      // Database-level grants are omitted without --create. The target is this
      // runner's fresh isolated instance, never a caller-supplied database.
      run(
        exe("psql"),
        [
          "--no-psqlrc",
          "--set",
          "ON_ERROR_STOP=1",
          "--dbname",
          "template1",
          "--command",
          "DROP DATABASE postgres",
        ],
        restoreEnv,
      );
      run(
        exe("pg_restore"),
        ["--exit-on-error", "--create", "--dbname", "template1", archive],
        restoreEnv,
      );
      const restored = connect(restore, "cluster_admin");
      assert.deepEqual(await snapshot(restored), expected);
      // Role dumps omit passwords. Re-provision synthetic passwords privately.
      for (const role of [
        "postgres",
        "anon",
        "authenticated",
        "service_role",
        "aibean_app_login",
      ])
        await restored.unsafe(
          `ALTER ROLE ${role} PASSWORD '${passwordFor(role)}'`,
        );
      await restrictions(restore);
      await denied(
        restored,
        "INSERT INTO public.vendor_access VALUES ('tool','ordinary-b')",
        "23505",
      );
      await denied(
        restored,
        "DELETE FROM auth.users WHERE id='00000000-0000-4000-8000-000000000001'",
        "23503",
      );
      const restoredOperator = connect(restore, "postgres");
      await restoredOperator.unsafe(installation);
      assert.deepEqual(await snapshot(restored), expected);
      await restoredOperator.end();
      await restored.end();
    },
  );
  const evidence = {
    date: new Date().toISOString(),
    environment: "Native disposable PostgreSQL; synthetic data only",
    version,
    tls: "Verified generated test CA, loopback hostname/IP, SCRAM authentication; hostnossl rejected",
    installationSqlSha256: manifest.installationSqlSha256,
    securitySqlSha256: manifest.securitySqlSha256,
    baselineMigrations: manifest.baselineMigrations,
    backupSha256: sha(readFileSync(archive)),
    roleBackupSha256: sha(readFileSync(roleFile)),
    applicationTables: tables.length,
    foreignKeys: 18,
    preservedTestUsers: 2,
    outcomes,
    hostedModified: false,
    hostedBackupVerified: false,
  };
  writeFileSync(
    join(root, "evidence.json"),
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(JSON.stringify(evidence, null, 2));
  console.log(
    `Synthetic artifacts retained in ${root}; both instances will be stopped.`,
  );
}

main()
  .catch((error) => {
    // No source/live credentials are loaded. Avoid raw driver query/parameter dumps.
    console.error(
      error instanceof Error ? error.message : "Isolated validation failed",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled(
      clients.map((client) => client.end({ timeout: 2 })),
    );
    for (const directory of running.reverse()) {
      try {
        run(exe("pg_ctl"), ["-D", directory, "-m", "fast", "-w", "stop"]);
      } catch {
        console.error(
          "A disposable instance needs manual pg_ctl shutdown; see test-results.",
        );
        process.exitCode = 1;
      }
    }
  });
