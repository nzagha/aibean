import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest, NextResponse } from "next/server";
import { authMode, providerTestApproved } from "../src/lib/auth-mode";
import {
  createAuthHandlers,
  type AuthDependencies,
  type AuthAction,
} from "../src/lib/supabase/auth-flow";
import {
  createAuthProofs,
  createProofReplayStore,
  INTENT_COOKIE,
  RECOVERY_COOKIE,
  ACCESS_COOKIE,
} from "../src/lib/supabase/auth-proof";
import { verifiedBusinessAccount } from "../src/lib/supabase/business-session";
import { createAuthLimiter } from "../src/lib/supabase/auth-limits";
import { createSessionCookieBridge } from "../src/lib/supabase/cookies";
import { refreshVerifiedSession } from "../src/lib/supabase/session-refresh";
import { SUPABASE_PROJECT_REF } from "../src/lib/supabase/config";

const origin = "http://127.0.0.1:3001";
const secret = "isolated-secret-fixture-".repeat(5);
const sub = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const sessionId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const verifierName = `sb-${SUPABASE_PROJECT_REF}-auth-token-code-verifier`;
const sessionName = `sb-${SUPABASE_PROJECT_REF}-auth-token.0`;
const claims = () => ({
  sub,
  role: "authenticated",
  session_id: sessionId,
  exp: Math.floor(Date.now() / 1000) + 3600,
});

function fixture(overrides: Record<string, unknown> = {}) {
  const calls: string[] = [];
  let redirectUrl = "";
  let provisioned = 0;
  const deps: AuthDependencies = {
    origin,
    secret,
    replay: createProofReplayStore(),
    allow: () => true,
    provision: async (uuid) => {
      assert.equal(uuid, sub);
      provisioned++;
    },
    client(request) {
      const bridge = createSessionCookieBridge(request);
      const success = async () => ({ data: {}, error: null });
      const issueVerifier = async (method: string, url: string) => {
        calls.push(method);
        redirectUrl = url;
        bridge.cookies.setAll!(
          [
            {
              name: verifierName,
              value: "base64-private-verifier-fixture",
              options: { path: "/" },
            },
          ],
          {},
        );
        return { data: { user: null, session: null }, error: null };
      };
      const auth = {
        signUp: async (args: { options: { emailRedirectTo: string } }) =>
          issueVerifier("signUp", args.options.emailRedirectTo),
        resend: async (args: { options: { emailRedirectTo: string } }) =>
          issueVerifier("resend", args.options.emailRedirectTo),
        resetPasswordForEmail: async (
          _email: string,
          args: { redirectTo: string },
        ) => issueVerifier("recover", args.redirectTo),
        signInWithPassword: async () => {
          calls.push("login");
          bridge.cookies.setAll!(
            [
              {
                name: sessionName,
                value: "new-session-fixture",
                options: { path: "/" },
              },
            ],
            {},
          );
          return { data: {}, error: null };
        },
        exchangeCodeForSession: async () => {
          calls.push("exchange");
          return { data: {}, error: null };
        },
        verifyOtp: async () => {
          calls.push("verifyOtp");
          return { data: {}, error: null };
        },
        getClaims: async () => ({ data: { claims: claims() }, error: null }),
        getUser: async () => ({
          data: {
            user: {
              id: sub,
              email: "fixture@example.invalid",
              email_confirmed_at: "2026-01-01",
              user_metadata: { is_admin: true },
            },
          },
          error: null,
        }),
        updateUser: async () => {
          calls.push("update");
          return success();
        },
        signOut: async () => {
          calls.push("logout");
          bridge.cookies.setAll!(
            [
              {
                name: sessionName,
                value: "",
                options: { path: "/", maxAge: 0 },
              },
            ],
            { "Cache-Control": "private, no-store" },
          );
          return { error: null };
        },
        ...overrides,
      } as unknown as ReturnType<AuthDependencies["client"]>["auth"];
      return { auth, finish: bridge.finish };
    },
  };
  return {
    handlers: createAuthHandlers(deps),
    calls,
    url: () => redirectUrl,
    provisioned: () => provisioned,
    deps,
  };
}
function post(
  action: AuthAction,
  fields: Record<string, string> = {},
  cookies = "",
  requestOrigin = origin,
) {
  return new NextRequest(`${origin}/api/auth/${action}`, {
    method: "POST",
    headers: {
      origin: requestOrigin,
      "content-type": "application/x-www-form-urlencoded",
      cookie: cookies,
    },
    body: new URLSearchParams({
      email: "fixture@example.invalid",
      password: "Valid!42",
      passwordConfirmation: "Valid!42",
      returnTo: "/account",
      ...fields,
    }),
  });
}
function cookieHeader(response: NextResponse) {
  return response.cookies
    .getAll()
    .filter((c) => c.value)
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}
function error(response: NextResponse) {
  return new URL(response.headers.get("location")!).searchParams.get("error");
}

test("auth mode is exclusive, candidate loopback gated, and provider approval separate", () => {
  assert.equal(
    authMode({
      AIBEAN_AUTH_MODE: "password",
      CLERK_SECRET_KEY: "also-configured",
    }),
    "password",
  );
  assert.equal(authMode({}), "disabled");
  for (const mode of ["future", "supabase", "clerk"])
    assert.throws(() => authMode({ AIBEAN_AUTH_MODE: mode }));
  const candidate = {
    AIBEAN_AUTH_MODE: "supabase",
    AIBEAN_SUPABASE_RELEASE: "candidate",
    AIBEAN_AUTH_ISOLATED: "true",
    NEXT_PUBLIC_APP_URL: origin,
  };
  assert.equal(authMode(candidate), "supabase");
  assert.equal(providerTestApproved(candidate), false);
  assert.equal(
    providerTestApproved({
      ...candidate,
      AIBEAN_SUPABASE_PROVIDER_TEST_APPROVED: "true",
    }),
    true,
  );
  assert.throws(() =>
    authMode({ ...candidate, NEXT_PUBLIC_APP_URL: "https://aibean.io" }),
  );
  assert.throws(() =>
    authMode({ ...candidate, AIBEAN_SUPABASE_RELEASE: "approved" }),
  );
});

test("registration rejects weak/mismatched passwords and oversized email before provider IO", async () => {
  const f = fixture();
  const cases: Record<string, string>[] = [
    { password: "weak" },
    { passwordConfirmation: "Different!42" },
    { email: "a".repeat(255) + "@example.invalid" },
  ];
  for (const fields of cases) {
    assert.equal(
      error(await f.handlers.post("register", post("register", fields))),
      "validation",
    );
  }
  assert.equal(f.calls.length, 0);
  assert.equal(f.provisioned(), 0);
});

test("auth posts enforce exact canonical origin, form type and streamed body bound", async () => {
  const f = fixture();
  assert.equal(
    (
      await f.handlers.post(
        "login",
        post("login", {}, "", "https://attacker.invalid"),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await f.handlers.post(
        "login",
        new NextRequest(`${origin}/api/auth/login`, {
          method: "POST",
          headers: { origin, "content-type": "application/json" },
          body: "{}",
        }),
      )
    ).status,
    415,
  );
  assert.equal(
    (await f.handlers.post("login", post("login", { email: "x".repeat(4097) })))
      .status,
    413,
  );
  assert.deepEqual(f.calls, []);
});

test("login uses generic credential errors and no unverified account provisioning", async () => {
  const invalid = fixture({
    signInWithPassword: async () => ({
      error: { code: "invalid_credentials" },
    }),
  });
  assert.equal(
    error(await invalid.handlers.post("login", post("login"))),
    "credentials",
  );
  assert.equal(invalid.provisioned(), 0);
  const stale = fixture({
    getUser: async () => ({
      data: { user: null },
      error: { code: "user_not_found" },
    }),
  });
  assert.equal(
    error(await stale.handlers.post("login", post("login"))),
    "credentials",
  );
  assert.equal(stale.provisioned(), 0);
  const unconfirmed = fixture({
    signInWithPassword: async () => ({
      error: { code: "email_not_confirmed" },
    }),
  });
  assert.equal(
    error(await unconfirmed.handlers.post("login", post("login"))),
    "notconfirmed",
  );
});

test("verified login provisions canonical identity and rejects open redirects", async () => {
  for (const returnTo of [
    "https://attacker.invalid",
    "//attacker.invalid",
    "/\\attacker.invalid",
    "/\nattacker.invalid",
  ]) {
    const f = fixture();
    const r = await f.handlers.post("login", post("login", { returnTo }));
    assert.equal(r.headers.get("location"), `${origin}/account`);
    assert.equal(f.provisioned(), 1);
    assert.equal(r.headers.get("cache-control"), "private, no-store");
  }
});

test("registration/confirmation have pending state, verifier-bound PKCE and one-time callback", async () => {
  const f = fixture();
  const pending = await f.handlers.post(
    "register",
    post("register", { returnTo: "/account/stacks" }),
  );
  assert.equal(
    new URL(pending.headers.get("location")!).pathname,
    "/confirm-email",
  );
  assert.equal(f.provisioned(), 0);
  const callback = new URL(f.url());
  callback.searchParams.set("code", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  const r = await f.handlers.callback(
    new NextRequest(callback, { headers: { cookie: cookieHeader(pending) } }),
  );
  assert.equal(r.headers.get("location"), `${origin}/account/stacks`);
  assert.equal(f.provisioned(), 1);
  const replay = await f.handlers.callback(
    new NextRequest(callback, { headers: { cookie: cookieHeader(pending) } }),
  );
  assert.equal(error(replay), "invalidlink");
  assert.equal(f.calls.filter((c) => c === "exchange").length, 1);
});

test("invalid/expired or altered callback proof cannot exchange a code", async () => {
  const f = fixture();
  const pending = await f.handlers.post("recover", post("recover"));
  const target = new URL(f.url());
  target.searchParams.set("code", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  target.searchParams.set("state", "forged");
  assert.equal(
    error(
      await f.handlers.callback(
        new NextRequest(target, { headers: { cookie: cookieHeader(pending) } }),
      ),
    ),
    "invalidlink",
  );
  const expired = createAuthProofs(secret).issue(
    {
      purpose: "intent",
      kind: "recovery",
      verifier: "fake",
      returnTo: "state|/account",
    },
    1,
    0,
  );
  assert.equal(
    error(
      await f.handlers.callback(
        new NextRequest(target, {
          headers: { cookie: `${INTENT_COOKIE}=${expired}` },
        }),
      ),
    ),
    "invalidlink",
  );
  assert.ok(!f.calls.includes("exchange"));
});

test("provider confirmation exchange/OTP errors show generic invalid-link state", async () => {
  const f = fixture({
    verifyOtp: async () => ({ error: { code: "otp_expired" } }),
  });
  const pending = await f.handlers.post("register", post("register"));
  const target = new URL(f.url());
  target.pathname = "/auth/confirm";
  target.searchParams.set("token_hash", "a".repeat(64));
  target.searchParams.set("type", "signup");
  const r = await f.handlers.callback(
    new NextRequest(target, { headers: { cookie: cookieHeader(pending) } }),
    true,
  );
  assert.equal(error(r), "invalidlink");
  assert.equal(f.provisioned(), 0);
  const badType = await f.handlers.callback(
    new NextRequest(
      `${origin}/auth/confirm?token_hash=${"a".repeat(64)}&type=magiclink&next=https://attacker.invalid`,
    ),
    true,
  );
  assert.equal(error(badType), "invalidlink");
  assert.deepEqual(f.calls, ["signUp"]);
});

test("direct token confirmation needs the initiating browser's signed intent and matching kind", async () => {
  const f = fixture();
  const target = new URL(
    `${origin}/auth/confirm?token_hash=${"a".repeat(64)}&type=signup`,
  );
  assert.equal(
    error(await f.handlers.callback(new NextRequest(target), true)),
    "invalidlink",
  );
  assert.equal(f.calls.length, 0);
  const pending = await f.handlers.post("register", post("register"));
  target.searchParams.set("state", new URL(f.url()).searchParams.get("state")!);
  target.searchParams.set("type", "recovery");
  assert.equal(
    error(
      await f.handlers.callback(
        new NextRequest(target, { headers: { cookie: cookieHeader(pending) } }),
        true,
      ),
    ),
    "invalidlink",
  );
  assert.ok(!f.calls.includes("verifyOtp"));
  target.searchParams.set("type", "signup");
  const result = await f.handlers.callback(
    new NextRequest(target, { headers: { cookie: cookieHeader(pending) } }),
    true,
  );
  assert.equal(f.provisioned(), 1);
  assert.ok(result.cookies.get(ACCESS_COOKIE)?.value);
});

test("removing recovery cookie cannot turn a recovery JWT into normal business access", async () => {
  const f = fixture();
  const auth = f.deps.client(new NextRequest(origin)).auth;
  assert.equal(await verifiedBusinessAccount(auth, undefined, secret), null);
  const recovery = createAuthProofs(secret).issue(
    { purpose: "recovery", sub, session: sessionId },
    600,
  );
  assert.equal(await verifiedBusinessAccount(auth, recovery, secret), null);
  const access = createAuthProofs(secret).issue(
    { purpose: "access", sub, session: sessionId },
    3600,
  );
  assert.equal(await verifiedBusinessAccount(auth, access, secret), sub);
  const different = createAuthProofs(secret).issue(
    { purpose: "access", sub, session: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" },
    3600,
  );
  assert.equal(await verifiedBusinessAccount(auth, different, secret), null);
});

test("ordinary confirmed session and client reset flags cannot authorize password update", async () => {
  const f = fixture();
  assert.equal(
    error(
      await f.handlers.post(
        "reset",
        post(
          "reset",
          { type: "recovery", recovery: "true" },
          `${sessionName}=ordinary`,
        ),
      ),
    ),
    "invalidlink",
  );
  assert.ok(!f.calls.includes("update"));
  const signed = createAuthProofs(secret).issue(
    {
      purpose: "recovery",
      sub,
      session: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    },
    600,
  );
  assert.equal(
    error(
      await f.handlers.post(
        "reset",
        post("reset", {}, `${RECOVERY_COOKIE}=${signed}`),
      ),
    ),
    "invalidlink",
  );
  assert.ok(!f.calls.includes("update"));
});

test("recovery callback binds one-use proof to verified session and never provisions a User", async () => {
  const f = fixture();
  const pending = await f.handlers.post("recover", post("recover"));
  const target = new URL(f.url());
  target.searchParams.set("code", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  target.searchParams.set("next", "https://attacker.invalid");
  const recovered = await f.handlers.callback(
    new NextRequest(target, { headers: { cookie: cookieHeader(pending) } }),
  );
  assert.equal(recovered.headers.get("location"), `${origin}/reset-password`);
  assert.equal(f.provisioned(), 0);
  assert.equal(recovered.cookies.get(ACCESS_COOKIE)?.maxAge, 0);
  const proof = cookieHeader(recovered);
  const reset = await f.handlers.post("reset", post("reset", {}, proof));
  assert.equal(
    new URL(reset.headers.get("location")!).searchParams.get("status"),
    "password-updated",
  );
  assert.equal(reset.cookies.get(RECOVERY_COOKIE)?.maxAge, 0);
  assert.ok(f.calls.includes("logout"));
  assert.equal(
    error(await f.handlers.post("reset", post("reset", {}, proof))),
    "invalidlink",
  );
  assert.equal(f.calls.filter((c) => c === "update").length, 1);
});

test("expired or forged recovery proof cannot be consumed and retry store is bounded", () => {
  const proofs = createAuthProofs(secret);
  const token = proofs.issue(
    { purpose: "recovery", sub, session: sessionId },
    1,
    0,
  );
  assert.equal(proofs.read(token, "recovery"), null);
  assert.equal(proofs.read(token + "x", "recovery", 0), null);
  const store = createProofReplayStore(1);
  const first = proofs.read(
    proofs.issue({ purpose: "recovery" }, 60),
    "recovery",
  )!;
  assert.equal(store.consume(first), true);
  assert.equal(store.consume(first), false);
  assert.equal(
    store.consume(
      proofs.read(proofs.issue({ purpose: "recovery" }, 60), "recovery")!,
    ),
    false,
  );
});

test("successful password update clears recovery and session cookies even if provider signout throws", async () => {
  const f = fixture({
    signOut: async () => {
      throw Error("private-provider-failure");
    },
  });
  const proof = createAuthProofs(secret).issue(
    { purpose: "recovery", sub, session: sessionId },
    600,
  );
  const result = await f.handlers.post(
    "reset",
    post(
      "reset",
      {},
      `${RECOVERY_COOKIE}=${proof}; ${sessionName}=recovery-session`,
    ),
  );
  assert.equal(
    new URL(result.headers.get("location")!).searchParams.get("status"),
    "password-updated",
  );
  assert.equal(result.cookies.get(RECOVERY_COOKIE)?.maxAge, 0);
  assert.equal(result.cookies.get(ACCESS_COOKIE)?.maxAge, 0);
  assert.equal(result.cookies.get(sessionName)?.maxAge, 0);
});

test("confirmation/recovery responses minimize enumeration and rate controls ignore spoofed IPs", async () => {
  const f = fixture({
    resetPasswordForEmail: async () => ({ error: { code: "user_not_found" } }),
    resend: async () => ({ error: { code: "email_not_confirmed" } }),
  });
  for (const action of ["recover", "resend"] as const) {
    const r = await f.handlers.post(action, post(action));
    assert.equal(
      new URL(r.headers.get("location")!).searchParams.get("status"),
      "sent",
    );
  }
  const allow = createAuthLimiter();
  for (let i = 0; i < 3; i++)
    assert.equal(allow("recover", "address", 0), true);
  assert.equal(allow("recover", "address", 0), false);
  assert.equal(allow("recover", "address", 15 * 60_000), true);
  for (let i = 0; i < 99; i++) allow("login", `different-${i}`, 15 * 60_000);
  assert.equal(allow("login", "another", 15 * 60_000), false);
});

test("logout removes all session chunks and recovery proof even when provider revocation fails", async () => {
  const f = fixture({
    signOut: async () => ({ error: { code: "network_failure" } }),
  });
  const r = await f.handlers.post(
    "logout",
    post(
      "logout",
      {},
      `${sessionName}=private-fixture; ${RECOVERY_COOKIE}=private-proof`,
    ),
  );
  assert.equal(error(r), "unavailable");
  assert.equal(r.cookies.get(sessionName)?.maxAge, 0);
  assert.equal(r.cookies.get(RECOVERY_COOKIE)?.maxAge, 0);
});

test("failed canonical provisioning abandons freshly established browser session even if signout throws", async () => {
  const f = fixture({
    signOut: async () => {
      throw Error("provider-private-error");
    },
  });
  f.deps.provision = async () => {
    throw Error("private-database-error");
  };
  const r = await f.handlers.post("login", post("login"));
  assert.equal(error(r), "unavailable");
  assert.equal(r.cookies.get(sessionName)?.maxAge, 0);
  assert.equal(r.cookies.get(ACCESS_COOKIE)?.maxAge, 0);
  assert.ok(!r.headers.get("location")?.includes("private"));
});

test("logout locally clears proof/session cookies when the abuse budget is exhausted", async () => {
  const f = fixture();
  f.deps.allow = () => false;
  const r = await f.handlers.post(
    "logout",
    post(
      "logout",
      {},
      `${sessionName}=existing; ${ACCESS_COOKIE}=proof; ${verifierName}=pending`,
    ),
  );
  assert.equal(error(r), "rate");
  assert.equal(r.cookies.get(sessionName)?.maxAge, 0);
  assert.equal(r.cookies.get(ACCESS_COOKIE)?.maxAge, 0);
  assert.equal(r.cookies.get(verifierName)?.maxAge, 0);
  assert.deepEqual(f.calls, []);
});

test("proxy refresh preserves new/chunk-deletion cookies and no-store across redirects", async () => {
  const req = new NextRequest(`${origin}/account`, {
    headers: { cookie: `${sessionName}=old` },
  });
  const bridge = createSessionCookieBridge(req);
  const auth = {
    getClaims: async () => {
      bridge.cookies.setAll!(
        [
          { name: sessionName, value: "fresh", options: { path: "/" } },
          {
            name: sessionName + ".old",
            value: "",
            options: { path: "/", maxAge: 0 },
          },
        ],
        { "Cache-Control": "private, no-store" },
      );
      return { data: { claims: claims() }, error: null };
    },
  } as unknown as Parameters<typeof refreshVerifiedSession>[1]["auth"];
  const r = await refreshVerifiedSession(req, { auth, finish: bridge.finish });
  assert.equal(r.cookies.get(sessionName)?.value, "fresh");
  assert.equal(req.cookies.get(sessionName)?.value, "fresh");
  assert.equal(r.cookies.get(sessionName + ".old")?.maxAge, 0);
  const badReq = new NextRequest(`${origin}/account`, {
    headers: { cookie: `${sessionName}=expired` },
  });
  const badBridge = createSessionCookieBridge(badReq);
  const expired = {
    getClaims: async () => ({
      data: { claims: { ...claims(), exp: 1 } },
      error: null,
    }),
  } as unknown as typeof auth;
  const denied = await refreshVerifiedSession(badReq, {
    auth: expired,
    finish: badBridge.finish,
  });
  assert.equal(error(denied), "expired");
  assert.equal(denied.cookies.get(sessionName)?.maxAge, 0);
  assert.equal(denied.headers.get("cache-control"), "private, no-store");
});

test("unauthenticated/expired refresh preserves pending PKCE verifier and flow cookies", async () => {
  for (const path of ["/confirm-email", "/forgot-password", "/account"]) {
    const flowName = `sb-${SUPABASE_PROJECT_REF}-auth-token-flow-abcdefgh-code-verifier`;
    const req = new NextRequest(`${origin}${path}`, {
      headers: {
        cookie: `${sessionName}=expired; ${verifierName}=pending; ${flowName}=slot`,
      },
    });
    const bridge = createSessionCookieBridge(req);
    const auth = {
      getClaims: async () => ({
        data: null,
        error: { code: "session_missing" },
      }),
    } as unknown as Parameters<typeof refreshVerifiedSession>[1]["auth"];
    const r = await refreshVerifiedSession(req, {
      auth,
      finish: bridge.finish,
    });
    assert.equal(req.cookies.get(verifierName)?.value, "pending");
    assert.equal(req.cookies.get(flowName)?.value, "slot");
    assert.equal(r.cookies.get(verifierName), undefined);
    assert.equal(r.cookies.get(sessionName)?.maxAge, 0);
  }
});
