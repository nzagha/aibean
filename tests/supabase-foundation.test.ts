import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest, NextResponse } from "next/server";
import {
  publicSupabaseConfig,
  SUPABASE_PROJECT_REF,
  SUPABASE_PROJECT_URL,
} from "../src/lib/supabase/config";
import { hostedDatabaseConfig } from "../src/lib/db/connection-config";
import { verifiedDatabaseConfig } from "../src/lib/db/tls-config";
import { createSessionCookieBridge } from "../src/lib/supabase/cookies";
import { assertRuntimeConnection } from "../src/lib/db/runtime-config";
import { compareTestUsers } from "../scripts/execute-approved-installation";

test("preservation comparison accepts the reviewed runtime USAGE on either snapshot but rejects additional ACLs", () => {
  type Snapshot = Parameters<typeof compareTestUsers>[0];
  const baseline = {
    metadata: {},
    details: [],
    sequence: [],
    sequenceState: [],
    permission: [],
    dataDigest: "private-fixture",
    acl: [],
    catalog: {
      schemaAcl: [{ owner: "pg_database_owner" }],
      databaseAcl: [],
      defaults: [],
    },
  } as unknown as Snapshot;
  const installed = {
    ...baseline,
    acl: [
      {
        kind: "schema",
        object: "public",
        column: "",
        grantee: "aibean_runtime",
        grantor: "pg_database_owner",
        privilege_type: "USAGE",
        is_grantable: false,
      },
    ],
  };
  assert.doesNotThrow(() => compareTestUsers(baseline, installed));
  assert.doesNotThrow(() => compareTestUsers(installed, installed));
  assert.throws(() =>
    compareTestUsers(installed, {
      ...installed,
      acl: [{ ...installed.acl[0], privilege_type: "CREATE" }],
    }),
  );
  assert.throws(() =>
    compareTestUsers(installed, {
      ...installed,
      acl: [...installed.acl, { ...installed.acl[0], grantee: "unapproved" }],
    }),
  );
});

test("application runtime rejects operator credentials and unexpected ports with no fallback", () => {
  const direct = `postgresql://aibean_app_login:fixture-secret@db.${SUPABASE_PROJECT_REF}.supabase.co:5432/postgres`;
  assert.doesNotThrow(() => assertRuntimeConnection(direct));
  assert.doesNotThrow(() =>
    assertRuntimeConnection(
      `postgresql://aibean_app_login.${SUPABASE_PROJECT_REF}:fixture-secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    ),
  );
  for (const unsafe of [
    direct.replace("aibean_app_login", "postgres"),
    direct.replace("5432", "6543"),
    direct.replace("5432", "9999"),
    undefined,
  ]) {
    assert.throws(
      () => assertRuntimeConnection(unsafe),
      (error: Error) => !error.message.includes("fixture-secret"),
    );
  }
});

test("public config rejects foreign projects and privileged or legacy keys without echoing them", () => {
  const key = "sb_publishable_fixture";
  assert.equal(
    publicSupabaseConfig(SUPABASE_PROJECT_URL, key).publishableKey,
    key,
  );
  for (const unsafe of [
    "sb_secret_private_fixture",
    "legacy-jwt-fixture",
    "",
  ]) {
    assert.throws(
      () => publicSupabaseConfig(SUPABASE_PROJECT_URL, unsafe),
      (error: Error) => {
        assert.ok(!unsafe || !error.message.includes(unsafe));
        return true;
      },
    );
  }
  assert.throws(() => publicSupabaseConfig("https://other.supabase.co", key));
});

test("operator database check rejects wrong targets and TLS downgrade without exposing credentials", () => {
  const direct = `postgresql://operator:fixture-password@db.${SUPABASE_PROJECT_REF}.supabase.co:5432/postgres`;
  assert.equal(hostedDatabaseConfig(direct).mode, "direct");
  assert.equal(
    hostedDatabaseConfig(
      `postgresql://operator.${SUPABASE_PROJECT_REF}:fixture-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    ).mode,
    "transaction-pooler",
  );
  for (const value of [
    direct.replace(SUPABASE_PROJECT_REF, "another-project"),
    `${direct}?sslmode=disable`,
    `${direct}?sslmode=prefer`,
    `${direct}?host=attacker.example`,
    direct.replace("/postgres", "/otherdb"),
    "postgresql://operator:fixture-password@localhost/postgres",
    "not-a-url-fixture-password",
  ]) {
    assert.throws(
      () => hostedDatabaseConfig(value),
      (error: Error) => {
        assert.ok(!error.message.includes("fixture-password"));
        return true;
      },
    );
  }
  assert.equal(
    hostedDatabaseConfig(direct).options.ssl.rejectUnauthorized,
    true,
  );
  assert.equal(hostedDatabaseConfig(direct).options.prepare, false);
});

test("verified TLS configuration fails closed without exposing a missing CA path", () => {
  const direct = `postgresql://operator:fixture-password@db.${SUPABASE_PROJECT_REF}.supabase.co:5432/postgres`;
  assert.throws(
    () => verifiedDatabaseConfig(direct, ""),
    /DATABASE_CA_CERT_PATH/,
  );
  const privatePath = "unavailable-private-fixture/certificate.pem";
  assert.throws(
    () => verifiedDatabaseConfig(direct, privatePath),
    (error: Error) => {
      assert.ok(!error.message.includes(privatePath));
      assert.ok(!error.message.includes("fixture-password"));
      return true;
    },
  );
});

test("SSR cookie bridge preserves refreshed and cleared chunks plus cache headers on redirects", async () => {
  const request = new NextRequest("https://aibean.example/account", {
    headers: { cookie: "session.0=old; session.1=obsolete" },
  });
  const bridge = createSessionCookieBridge(request);
  await bridge.cookies.setAll!(
    [
      {
        name: "session.0",
        value: "refreshed",
        options: { path: "/", sameSite: "lax", secure: true },
      },
      { name: "session.1", value: "", options: { path: "/", maxAge: 0 } },
    ],
    { "Cache-Control": "private, no-store", Expires: "0", Pragma: "no-cache" },
  );
  // SSR 0.12.7 supplies cache headers only on the first cookie write.
  await bridge.cookies.setAll!(
    [{ name: "verifier", value: "", options: { path: "/", maxAge: 0 } }],
    {},
  );
  const response = bridge.finish(
    NextResponse.redirect(new URL("/login", request.url)),
  );
  assert.equal(request.cookies.get("session.0")?.value, "refreshed");
  assert.equal(response.cookies.get("session.0")?.value, "refreshed");
  assert.equal(response.cookies.get("session.1")?.maxAge, 0);
  assert.equal(response.cookies.get("verifier")?.maxAge, 0);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("expires"), "0");
  assert.equal(response.headers.get("pragma"), "no-cache");
  assert.equal(response.status, 307);
  const other = createSessionCookieBridge(
    new NextRequest("https://aibean.example/account"),
  );
  assert.equal(other.finish().cookies.getAll().length, 0);
});
