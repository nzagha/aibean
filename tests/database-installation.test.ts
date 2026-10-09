import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { hasCapability, ownsResource } from "../src/lib/capabilities";

const read = async (path: string) =>
  (await fs.readFile(path, "utf8")).replace(/\r\n/g, "\n");
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
async function fixture() {
  const db = new PGlite({ database: "postgres" });
  await db.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE TABLE public."TestUsers"(id bigint PRIMARY KEY, email text);
    INSERT INTO public."TestUsers" VALUES (1,'fixture-a@example.invalid'),(2,'fixture-b@example.invalid');
    ALTER TABLE public."TestUsers" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY open_read ON public."TestUsers" FOR SELECT USING (true);
    GRANT ALL ON public."TestUsers" TO anon,authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;`);
  return db;
}
async function count(db: PGlite, table: string) {
  return (
    await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${table}`)
  ).rows[0].n;
}

test("review package preserves source hashes, installs atomically, repeats safely and denies browser/runtime privilege escalation", async () => {
  const manifest = JSON.parse(await read("db/install/manifest.json"));
  for (const entry of manifest.baselineMigrations)
    assert.equal(sha(await read(entry.path)), entry.sha256);
  const installation = await read("db/install/reviewed-installation.sql");
  assert.equal(sha(installation), manifest.installationSqlSha256);
  const db = await fixture();
  try {
    await db.exec(installation);
    await db.exec(installation);
    assert.equal(await count(db, 'public."TestUsers"'), 2);
    assert.equal(await count(db, "drizzle.__drizzle_migrations"), 2);
    assert.equal(await count(db, "aibean_private.installations"), 1);
    for (const role of ["anon", "authenticated", "service_role"]) {
      await db.exec(`SET ROLE ${role}`);
      for (const table of [
        "users",
        "stacks",
        "tool_reviews",
        "orders",
        "claim_requests",
        "audit_logs",
        "tools",
      ]) {
        await assert.rejects(db.query(`SELECT * FROM public.${table}`));
      }
      await assert.rejects(
        db.query("SELECT * FROM aibean_private.user_identities"),
      );
      await db.exec("RESET ROLE");
    }
    await db.exec("SET ROLE aibean_runtime");
    await db.exec("INSERT INTO public.users(id) VALUES ('ordinary')");
    await assert.rejects(
      db.exec("INSERT INTO public.users(id,is_admin) VALUES ('elevated',true)"),
    );
    await assert.rejects(
      db.exec("UPDATE public.users SET is_creator=true WHERE id='ordinary'"),
    );
    await assert.rejects(db.exec("DELETE FROM public.audit_logs"));
    await assert.rejects(db.exec("TRUNCATE public.orders"));
    await assert.rejects(db.exec("CREATE TABLE public.unapproved(id int)"));
    await assert.rejects(
      db.query("SELECT * FROM drizzle.__drizzle_migrations"),
    );
    await db.exec("RESET ROLE");
    // RLS is independently default-deny even if an accidental SELECT grant appears.
    await db.exec(
      "GRANT SELECT ON public.users TO authenticated; SET ROLE authenticated",
    );
    assert.equal(await count(db, "public.users"), 0);
    await db.exec(
      "RESET ROLE; REVOKE SELECT ON public.users FROM authenticated",
    );
    await db.exec(await read("db/install/testusers-security-proposal.sql"));
    assert.equal(await count(db, 'public."TestUsers"'), 2);
    await db.exec("SET ROLE anon");
    await assert.rejects(db.query('SELECT * FROM public."TestUsers"'));
  } finally {
    await db.close();
  }
});

test("upgrade retains historical ownership and mapping rejects duplicates, missing identities and destructive deletes", async () => {
  const db = await fixture();
  try {
    const manifest = JSON.parse(await read("db/install/manifest.json"));
    await db.exec(
      "CREATE SCHEMA drizzle; CREATE TABLE drizzle.__drizzle_migrations(id serial PRIMARY KEY,hash text NOT NULL,created_at bigint)",
    );
    for (const entry of manifest.baselineMigrations) {
      await db.exec(await read(entry.path));
      await db.query(
        "INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES ($1,$2)",
        [entry.sha256, entry.createdAt],
      );
    }
    await db.exec(`INSERT INTO public.users(id) VALUES ('legacy-a'),('legacy-b');
      INSERT INTO public.taxonomy VALUES ('cat','category','Category','category',null,'{}');
      INSERT INTO public.tools(id,slug,name,category_id,data) VALUES ('tool','tool','Tool','cat','{}');
      INSERT INTO public.stacks VALUES ('stack','legacy-a','Saved stack');
      INSERT INTO public.stack_tools VALUES ('stack','tool');
      INSERT INTO public.saved_tools(user_id,tool_id) VALUES ('legacy-a','tool');
      INSERT INTO public.vendor_access VALUES ('tool','legacy-a');
      INSERT INTO public.tool_reviews(id,user_id,tool_id,rating,body) VALUES ('review','legacy-a','tool',5,'Fixture');
      INSERT INTO auth.users VALUES ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');`);
    await db.exec(await read("db/install/reviewed-installation.sql"));
    await db.exec(
      `INSERT INTO aibean_private.user_identities(auth_user_id,user_id) VALUES ('00000000-0000-4000-8000-000000000001','legacy-a')`,
    );
    await assert.rejects(
      db.exec(
        `INSERT INTO aibean_private.user_identities VALUES ('00000000-0000-4000-8000-000000000002','legacy-a',now())`,
      ),
    );
    await assert.rejects(
      db.exec(
        `INSERT INTO aibean_private.user_identities VALUES ('00000000-0000-4000-8000-000000000099','legacy-b',now())`,
      ),
    );
    await assert.rejects(
      db.exec(
        `DELETE FROM auth.users WHERE id='00000000-0000-4000-8000-000000000001'`,
      ),
    );
    await assert.rejects(
      db.exec("DELETE FROM public.users WHERE id='legacy-a'"),
    );
    await assert.rejects(
      db.exec("INSERT INTO public.vendor_access VALUES ('tool','legacy-b')"),
    );
    for (const table of [
      "stacks",
      "stack_tools",
      "saved_tools",
      "vendor_access",
      "tool_reviews",
    ])
      assert.equal(await count(db, `public.${table}`), 1);
    assert.equal(
      (await db.query<{ user_id: string }>("SELECT user_id FROM public.stacks"))
        .rows[0].user_id,
      "legacy-a",
    );
  } finally {
    await db.close();
  }
});

test("installation failure rolls back tables, roles and ledger; tampered history is rejected", async () => {
  const db = await fixture();
  try {
    const installation = await read("db/install/reviewed-installation.sql");
    await assert.rejects(
      db.exec(installation.replace("COMMIT;", "SELECT 1/0; COMMIT;")),
    );
    await db.exec("ROLLBACK");
    assert.equal(
      (
        await db.query<{ relation: string | null }>(
          "SELECT to_regclass('public.users')::text AS relation",
        )
      ).rows[0].relation,
      null,
    );
    assert.equal(
      (await db.query("SELECT 1 FROM pg_roles WHERE rolname='aibean_runtime'"))
        .rows.length,
      0,
    );
    assert.equal(await count(db, 'public."TestUsers"'), 2);
    await db.exec(installation);
    await db.exec(
      "UPDATE drizzle.__drizzle_migrations SET hash='tampered' WHERE id=1",
    );
    await assert.rejects(db.exec(installation));
    await db.exec("ROLLBACK");
    assert.equal(await count(db, "drizzle.__drizzle_migrations"), 2);
  } finally {
    await db.close();
  }
});

test("server capabilities are additive and ownership rejects other users", () => {
  const ordinary = { id: "a", isAdmin: false, isCreator: false };
  assert.equal(hasCapability(ordinary, "user"), true);
  assert.equal(hasCapability(ordinary, "admin"), false);
  assert.equal(hasCapability(ordinary, "creator"), false);
  const approved = { ...ordinary, isAdmin: true, isCreator: true };
  assert.equal(hasCapability(approved, "admin"), true);
  assert.equal(hasCapability(approved, "creator"), true);
  assert.equal(ownsResource(approved, "b"), false);
  assert.equal(ownsResource(approved, "a"), true);
  assert.equal(ownsResource(ordinary, undefined), false);
});
