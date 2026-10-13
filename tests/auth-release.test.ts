import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { authMode, productionAuth } from "../src/lib/auth-mode";
import {
  createAuthHandlers,
  type AuthDependencies,
} from "../src/lib/supabase/auth-flow";
import {
  createAuthProofs,
  ACCESS_COOKIE,
} from "../src/lib/supabase/auth-proof";
import { createSharedAuthSecurity } from "../src/lib/supabase/shared-security";
import { verifiedBusinessAccount } from "../src/lib/supabase/business-session";
import { authReleaseContract } from "./fixtures/auth-release-contract";

test("epoch-bound proofs remain invalid after cutover even when the provider session is reused", () => {
  const secret = "synthetic-epoch-proof-".repeat(6);
  const previous = createAuthProofs(secret, "synthetic-epoch-before");
  const current = createAuthProofs(secret, "synthetic-epoch-after");
  const token = previous.issue(
    { purpose: "access", sub: randomUUID(), session: randomUUID() },
    3600,
  );
  assert(previous.read(token, "access"));
  assert.equal(current.read(token, "access"), null);
});

async function localDatabase() {
  const pg = new PGlite();
  await pg.exec(
    "CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users(id),not_after timestamptz);CREATE SCHEMA aibean_private;CREATE TABLE public.rate_limits(key text PRIMARY KEY,count integer NOT NULL,window_start timestamptz NOT NULL)",
  );
  const sql = readFileSync(
    "db/proposals/auth-release-v1/reviewed-installation.sql",
    "utf8",
  );
  const fn = sql.match(
    /CREATE FUNCTION aibean_private\.auth_session_active[\s\S]+?\$function\$;/,
  )![0];
  await pg.exec(fn);
  return pg;
}
test("production release requires explicit verified exclusive configuration, HTTPS and legacy retirement", () => {
  const good = {
    AIBEAN_AUTH_MODE: "supabase",
    AIBEAN_SUPABASE_RELEASE: "production",
    NODE_ENV: "production",
    NEXT_PUBLIC_APP_URL: "https://aibean.io",
    AIBEAN_SUPABASE_PRODUCTION_APPROVED: "true",
    AIBEAN_SUPABASE_HOSTED_E2E_VERIFIED: "true",
    AIBEAN_AUTH_LEGACY_RETIREMENT_VERIFIED: "true",
    AIBEAN_AUTH_SHARED_STATE: "postgres",
    AIBEAN_AUTH_RELEASE_EPOCH: "synthetic-epoch-2026",
    AIBEAN_RECOVERY_SECRET: "synthetic-secret-".repeat(6),
    DATABASE_URL: "synthetic-private-connection",
  };
  assert.equal(authMode(good), "supabase");
  assert(productionAuth(good));
  for (const name of [
    "AIBEAN_SUPABASE_PRODUCTION_APPROVED",
    "AIBEAN_SUPABASE_HOSTED_E2E_VERIFIED",
    "AIBEAN_AUTH_LEGACY_RETIREMENT_VERIFIED",
    "AIBEAN_AUTH_SHARED_STATE",
    "AIBEAN_AUTH_RELEASE_EPOCH",
    "AIBEAN_RECOVERY_SECRET",
    "DATABASE_URL",
  ])
    assert.throws(() => authMode({ ...good, [name]: "" }));
  for (const url of [
    "http://aibean.io",
    "https://evil.invalid",
    "https://aibean.io:444",
    "https://aibean.io/path",
    "https://aibean.io/?returnTo=x",
    "https://user@aibean.io",
    "https://127.0.0.1",
  ])
    assert.throws(() => authMode({ ...good, NEXT_PUBLIC_APP_URL: url }));
  for (const key of [
    "CLERK_SECRET_KEY",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "LOCAL_LOGIN_PASSWORD_HASH",
    "LOCAL_SESSION_SECRET",
  ])
    assert.throws(() => authMode({ ...good, [key]: "old" }));
  for (const mode of ["password", "clerk", "disabled"])
    assert.throws(() => authMode({ ...good, AIBEAN_AUTH_MODE: mode }));
});
test("shared security uses exact private function and atomic persisted controls without identity disclosure", async () => {
  const pg = await localDatabase();
  try {
    const d = drizzle(pg);
    await authReleaseContract(d, d, d);
  } finally {
    await pg.close();
  }
});
test("real pinned Supabase SDK with disposable loopback Auth service: mapped business session, revocation, same-account step-up and fail-closed provider calls", async () => {
  const pg = await localDatabase(),
    sub = randomUUID(),
    sid = randomUUID(),
    other = randomUUID(),
    nextSession = randomUUID();
  const secret = "synthetic-flow-secret-".repeat(6),
    origin = "https://aibean.io";
  let calls = 0,
    currentSub = sub,
    currentSession = sid,
    provisioned = 0;
  const users = new Map(
    [sub, other].map((id) => [
      id,
      {
        id,
        aud: "authenticated",
        role: "authenticated",
        email: id + "@example.invalid",
        email_confirmed_at: "2026-01-01T00:00:00Z",
        created_at: "2026-01-01T00:00:00Z",
        app_metadata: {},
        user_metadata: { is_admin: true, is_creator: true },
      },
    ]),
  );
  await pg.query("INSERT INTO auth.users VALUES($1),($2)", [sub, other]);
  await pg.query("INSERT INTO auth.sessions VALUES($1,$2,NULL),($3,$2,NULL)", [
    sid,
    sub,
    nextSession,
  ]);
  const jwt = () =>
    [
      Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
        "base64url",
      ),
      Buffer.from(
        JSON.stringify({
          sub: currentSub,
          session_id: currentSession,
          role: "authenticated",
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
        }),
      ).toString("base64url"),
      Buffer.from("synthetic-signature").toString("base64url"),
    ].join(".");
  const server = createServer(async (req, res) => {
    calls++;
    res.setHeader("Content-Type", "application/json");
    if (req.url?.startsWith("/auth/v1/token")) {
      res.end(
        JSON.stringify({
          access_token: jwt(),
          refresh_token: randomUUID(),
          token_type: "bearer",
          expires_in: 3600,
          user: users.get(currentSub),
        }),
      );
      return;
    }
    if (req.url?.startsWith("/auth/v1/signup")) {
      let body = "";
      for await (const chunk of req) body += chunk.toString();
      const form = JSON.parse(body);
      assert(!form.data || !Object.keys(form.data).length);
      res.end(JSON.stringify({ ...users.get(sub), email_confirmed_at: null }));
      return;
    }
    if (req.url === "/auth/v1/user") {
      res.end(JSON.stringify(users.get(currentSub)));
      return;
    }
    if (req.url?.startsWith("/auth/v1/logout")) {
      res.statusCode = 204;
      res.end();
      return;
    }
    if (req.url?.includes("/.well-known/jwks.json")) {
      res.end('{"keys":[]}');
      return;
    }
    res.statusCode = 400;
    res.end('{"error":"Unsupported synthetic endpoint"}');
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address() as { port: number };
  const client = createClient(
    `http://127.0.0.1:${address.port}`,
    "synthetic-public-key",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
  const security = createSharedAuthSecurity(
    drizzle(pg),
    secret,
    "synthetic-http-epoch",
  );
  const deps: AuthDependencies = {
    origin,
    secret,
    epoch: "synthetic-http-epoch",
    client: () => ({ auth: client.auth, finish: (r: NextResponse) => r }),
    provision: async (uuid) => {
      assert.equal(uuid, sub);
      provisioned++;
    },
    allow: security.allow,
    replay: security,
    security,
  };
  const request = (
    action: string,
    cookie = "",
    email = users.get(currentSub)!.email,
  ) =>
    new NextRequest(`${origin}/api/auth/${action}`, {
      method: "POST",
      headers: {
        origin,
        "content-type": "application/x-www-form-urlencoded",
        cookie,
      },
      body: new URLSearchParams({
        email,
        password: "Synthetic!42",
        returnTo: "/account",
      }),
    });
  try {
    const handlers = createAuthHandlers(deps),
      login = await handlers.post("login", request("login"));
    assert.equal(new URL(login.headers.get("location")!).pathname, "/account");
    const proofCookie = login.cookies.get(ACCESS_COOKIE)!;
    assert(proofCookie.httpOnly);
    assert(proofCookie.secure);
    assert.equal(proofCookie.sameSite, "lax");
    assert.equal(provisioned, 1);
    const signup = await handlers.post(
      "register",
      new NextRequest(origin + "/api/auth/register", {
        method: "POST",
        headers: {
          origin,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          email: "new@example.invalid",
          password: "Synthetic!42",
          passwordConfirmation: "Synthetic!42",
          is_admin: "true",
          is_creator: "true",
          user_metadata: '{"is_admin":true}',
        }),
      }),
    );
    assert.equal(
      new URL(signup.headers.get("location")!).pathname,
      "/confirm-email",
    );
    assert.equal(provisioned, 1);
    assert.equal(
      await verifiedBusinessAccount(
        client.auth,
        proofCookie.value,
        secret,
        security.active,
      ),
      sub,
    );
    const cookie = `${ACCESS_COOKIE}=${proofCookie.value}`;
    currentSession = nextSession;
    const reauth = await handlers.post(
      "reauthenticate",
      request("reauthenticate", cookie),
    );
    assert.equal(new URL(reauth.headers.get("location")!).pathname, "/account");
    assert.equal(provisioned, 1);
    assert.equal(await security.active({ sub, session: sid }), false);
    assert.equal(
      await security.active({ sub, session: nextSession }, true),
      true,
    );
    const fresh = reauth.cookies.get(ACCESS_COOKIE)!.value;
    // Cross-account credentials never provision, merge or refresh privileges.
    currentSub = other;
    currentSession = randomUUID();
    const denied = await handlers.post(
      "reauthenticate",
      request("reauthenticate", `${ACCESS_COOKIE}=${fresh}`),
    );
    assert.equal(
      new URL(denied.headers.get("location")!).pathname,
      "/reauthenticate",
    );
    assert.equal(provisioned, 1);
    currentSub = sub;
    currentSession = nextSession;
    // Provider outage after application tombstone cannot leave copied proof valid.
    const outage = createAuthHandlers({
      ...deps,
      client: () => ({
        auth: {
          ...client.auth,
          signOut: async () => {
            throw new Error("synthetic unavailable");
          },
        } as unknown as typeof client.auth,
        finish: (r) => r,
      }),
    });
    await outage.post("logout", request("logout", `${ACCESS_COOKIE}=${fresh}`));
    assert.equal(await security.active({ sub, session: nextSession }), false);
    const before = calls,
      blocked = createAuthHandlers({
        ...deps,
        allow: async () => {
          throw new Error("synthetic shared-state failure");
        },
      });
    await assert.rejects(blocked.post("login", request("login")));
    assert.equal(calls, before);
    const duplicates = await handlers.callback(
      new NextRequest(
        origin + "/auth/callback?state=a&state=b&code=abcdefghijklmnop",
      ),
    );
    assert.equal(
      new URL(duplicates.headers.get("location")!).searchParams.get("error"),
      "invalidlink",
    );
    assert.equal(calls, before);
    const tampered = createAuthProofs(secret).read(fresh, "access")!;
    assert.equal(tampered.sub, sub);
  } finally {
    await client.auth.signOut().catch(() => {});
    await new Promise<void>((r) => server.close(() => r()));
    await pg.close();
  }
});
