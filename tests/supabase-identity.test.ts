import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { and, eq } from "drizzle-orm";
import {
  resolveSupabaseUser,
  verifiedSupabaseAccount,
  type VerifiedAccountClient,
} from "../src/lib/supabase/identity";
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
import { hasCapability } from "../src/lib/capabilities";

const identityA = "00000000-0000-4000-8000-000000000001";
const identityB = "00000000-0000-4000-8000-000000000002";
const now = 1_000_000;
function provider(
  claimChanges: Record<string, unknown> = {},
  accountChanges: Record<string, unknown> = {},
) {
  return {
    getClaims: async () => ({
      data: {
        claims: {
          sub: identityA,
          role: "authenticated",
          exp: now / 1000 + 60,
          ...claimChanges,
        },
      },
      error: null,
    }),
    getUser: async () => ({
      data: {
        user: {
          id: identityA,
          email: "synthetic@example.invalid",
          email_confirmed_at: "2026-01-01T00:00:00Z",
          ...accountChanges,
        },
      },
      error: null,
    }),
  } as VerifiedAccountClient;
}

test("identity needs verified unexpired claims and a fresh matching confirmed non-anonymous account", async () => {
  assert.equal(await verifiedSupabaseAccount(provider(), now), identityA);
  for (const claims of [
    { sub: "cookie-user" },
    { role: "anon" },
    { exp: now / 1000 },
    { is_anonymous: true },
    { exp: "999999999" },
    { exp: Number.NaN },
    { exp: Number.POSITIVE_INFINITY },
  ])
    assert.equal(await verifiedSupabaseAccount(provider(claims), now), null);
  for (const account of [
    { id: identityB },
    { email_confirmed_at: undefined },
    { email: undefined },
    { is_anonymous: true },
  ])
    assert.equal(
      await verifiedSupabaseAccount(provider({}, account), now),
      null,
    );
  const absent = provider();
  absent.getUser = async () => ({ data: { user: null }, error: null });
  assert.equal(await verifiedSupabaseAccount(absent, now), null);
  const revoked = provider();
  revoked.getUser = async () => ({
    data: { user: null },
    error: new Error("revoked"),
  });
  assert.equal(await verifiedSupabaseAccount(revoked, now), null);
  const expired = provider();
  expired.getClaims = async () => ({ data: null, error: new Error("expired") });
  assert.equal(await verifiedSupabaseAccount(expired, now), null);
});

test("signup and JWT metadata cannot supply an internal User or capabilities", async () => {
  assert.equal(
    await verifiedSupabaseAccount(
      provider(
        {
          user_metadata: {
            is_admin: true,
            role: "Admin",
            user_id: "legacy-admin",
          },
        app_metadata: { is_admin: true, is_creator: true, paid: true },
        },
        {
          user_metadata: {
            is_admin: true,
            is_creator: true,
            user_id: "legacy-admin",
          },
        app_metadata: { role: "Admin", paid: true },
        },
      ),
      now,
    ),
    identityA,
  );
});

async function fixture() {
  const database = new PGlite({ database: "postgres" });
  await database.exec(`CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    INSERT INTO auth.users VALUES ('${identityA}'),('${identityB}');`);
  await database.exec(
    await fs.readFile("db/install/reviewed-installation.sql", "utf8"),
  );
  return database;
}

test("confirmed provisioning is ordinary, idempotent and never uses an email as an identity", async () => {
  const database = await fixture();
  try {
    await database.exec("SET ROLE aibean_runtime");
    const orm = drizzle(database);
    const [first, second] = await Promise.all([
      resolveSupabaseUser(orm, identityA),
      resolveSupabaseUser(orm, identityA),
    ]);
    assert.equal(first.id, second.id);
    assert.match(first.id, /^user_[0-9a-f-]{36}$/);
    assert.equal(first.isAdmin, false);
    assert.equal(first.isCreator, false);
    assert.equal(hasCapability(first, "admin"), false);
    assert.equal(hasCapability(first, "creator"), false);
    assert.equal(
      (await database.query("SELECT * FROM public.users")).rows.length,
      1,
    );
    assert.equal(
      (await database.query("SELECT * FROM aibean_private.user_identities"))
        .rows.length,
      1,
    );
  } finally {
    await database.close();
  }
});

test("mapping preserves historical internal IDs and reads authoritative capabilities", async () => {
  const database = await fixture();
  try {
    await database.exec(`INSERT INTO public.users(id,is_admin,is_creator) VALUES ('historical-internal-id',true,true);
      INSERT INTO aibean_private.user_identities(auth_user_id,user_id) VALUES ('${identityA}','historical-internal-id');
      SET ROLE aibean_runtime`);
    const user = await resolveSupabaseUser(drizzle(database), identityA);
    assert.equal(user.id, "historical-internal-id");
    assert.equal(hasCapability(user, "admin"), true);
    assert.equal(hasCapability(user, "creator"), true);
    assert.equal(
      (await database.query("SELECT * FROM public.users")).rows.length,
      1,
    );
    await assert.rejects(
      database.exec("UPDATE public.users SET is_admin=true"),
    );
    await assert.rejects(
      database.exec(
        "UPDATE aibean_private.user_identities SET user_id='other'",
      ),
    );
  } finally {
    await database.close();
  }
});

test("missing Auth identities, duplicate mappings and internal ID collisions roll back without orphans", async () => {
  const database = await fixture();
  try {
    await database.exec("SET ROLE aibean_runtime");
    const orm = drizzle(database);
    const first = await resolveSupabaseUser(orm, identityA);
    await assert.rejects(
      resolveSupabaseUser(orm, identityB, () => first.id),
      /Identity resolution unavailable/,
    );
    await assert.rejects(
      resolveSupabaseUser(orm, "00000000-0000-4000-8000-000000000099"),
      /Identity resolution unavailable/,
    );
    await assert.rejects(
      resolveSupabaseUser(orm, "unverified-email@example.invalid"),
      /Verified identity is required/,
    );
    await assert.rejects(
      database.query(
        "INSERT INTO aibean_private.user_identities(auth_user_id,user_id) VALUES ($1,$2)",
        [identityB, first.id],
      ),
    );
    assert.equal(
      (await database.query("SELECT * FROM public.users")).rows.length,
      1,
    );
    assert.equal(
      (await database.query("SELECT * FROM aibean_private.user_identities"))
        .rows.length,
      1,
    );
  } finally {
    await database.close();
  }
});

test("actual application owner predicates isolate saves, Stacks, reviews, claims and Tool-scoped Vendor access", async () => {
  const database = await fixture();
  try {
    await database.exec(`SET ROLE aibean_runtime;
      INSERT INTO public.users(id) VALUES ('user-a'),('user-b');
      INSERT INTO public.taxonomy VALUES ('category','category','Fixture','fixture',null,'{}');
      INSERT INTO public.tools(id,slug,name,category_id,status,data) VALUES
        ('tool-a','fixture-a','Fixture A','category','published','{}'),
        ('tool-b','fixture-b','Fixture B','category','published','{}');
      INSERT INTO public.stacks VALUES ('stack-a','user-a','Private A');
      INSERT INTO public.saved_tools(user_id,tool_id) VALUES ('user-a','tool-a');
      INSERT INTO public.tool_reviews(id,user_id,tool_id,rating,body) VALUES ('review-a','user-a','tool-a',5,'Private review');
      INSERT INTO public.claim_requests(id,user_id,tool_id,company,role,proof) VALUES ('claim-a','user-a','tool-a','Fixture','Owner','Synthetic proof');
      INSERT INTO public.vendor_access VALUES ('tool-a','user-a');`);
    const orm = drizzle(database);
    const other = ownerPredicates("user-b");
    assert.deepEqual(
      await orm.select().from(savedTools).where(other.saves),
      [],
    );
    assert.deepEqual(await orm.select().from(stacks).where(other.stacks), []);
    assert.deepEqual(await orm.select().from(reviews).where(other.reviews), []);
    assert.deepEqual(await orm.select().from(claims).where(other.claims), []);
    assert.deepEqual(
      await orm
        .delete(savedTools)
        .where(and(other.saves, eq(savedTools.toolId, "tool-a")))
        .returning(),
      [],
    );
    assert.deepEqual(
      await orm
        .update(reviews)
        .set({ body: "tampered" })
        .where(and(other.reviews, eq(reviews.id, "review-a")))
        .returning(),
      [],
    );
    assert.deepEqual(
      await orm
        .delete(claims)
        .where(and(other.claims, eq(claims.id, "claim-a")))
        .returning(),
      [],
    );
    await assert.rejects(
      addOwnedStackTool(orm, "user-b", "stack-a", "tool-b"),
      /This stack is unavailable/,
    );
    assert.equal(
      (await database.query("SELECT * FROM public.stack_tools")).rows.length,
      0,
    );
    await addOwnedStackTool(orm, "user-a", "stack-a", "tool-b");
    await addOwnedStackTool(orm, "user-a", "stack-a", "tool-b");
    assert.equal(
      (await database.query("SELECT * FROM public.stack_tools")).rows.length,
      1,
    );
    assert.deepEqual(
      await orm.select().from(vendorAccess).where(other.vendorTool("tool-a")),
      [],
    );
    assert.deepEqual(
      await orm
        .select()
        .from(vendorAccess)
        .where(ownerPredicates("user-a").vendorTool("tool-b")),
      [],
    );
    assert.equal(
      (
        await orm
          .select()
          .from(vendorAccess)
          .where(ownerPredicates("user-a").vendorTool("tool-a"))
      ).length,
      1,
    );
    assert.equal(
      (await orm.select().from(reviews)).at(0)?.body,
      "Private review",
    );
    assert.equal((await orm.select().from(claims)).length, 1);
    assert.equal((await orm.select().from(savedTools)).length, 1);
  } finally {
    await database.close();
  }
});
