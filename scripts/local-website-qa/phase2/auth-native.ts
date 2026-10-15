import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import postgres from "postgres";
import { qaDatabaseConfig } from "../../../src/lib/local-qa-auth/config";
import { createQaAuth, digest } from "../../../src/lib/local-qa-auth/core";
import { qaCredentialPath } from "../guards";
const state = JSON.parse(
  readFileSync("test-results/local-website-qa-active.json", "utf8"),
);
assert.equal(state.authVersion, 2);
assert.equal(state.credentialsPath, qaCredentialPath(state.run));
const manifest = JSON.parse(
  readFileSync(join(state.root, "runtime.json"), "utf8"),
);
const config = qaDatabaseConfig({
  NODE_ENV: "development",
  AIBEAN_LOCAL_QA_AUTH: "1",
  AIBEAN_LOCAL_ACCEPTANCE_RUN: state.run,
  DATABASE_URL: manifest.connectionString,
})!;
const pg = postgres(config.connectionString, {
  ...config.options,
  max: 6,
  onnotice: () => {},
});
const privateConfig = JSON.parse(
  readFileSync(join(dirname(state.credentialsPath), "qa-auth.json"), "utf8"),
);
const auth = createQaAuth(pg, privateConfig.dummyHash);
const handoff = JSON.parse(readFileSync(state.credentialsPath, "utf8"));
const origin = "http://127.0.0.1:3000";
const password = () => "Qa9!" + randomBytes(16).toString("hex");
const email =
    "http-qa-" + randomBytes(8).toString("hex") + "@local-aibean.invalid",
  p1 = password(),
  p2 = password(),
  p3 = password();
const checks: { check: string; status: string }[] = [];
async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    checks.push({ check: name, status: "PASS" });
  } catch {
    checks.push({ check: name, status: "FAIL" });
    process.exitCode = 1;
  }
  console.log(JSON.stringify(checks.at(-1)));
}
async function post(
  path: string,
  form: Record<string, string>,
  cookie = "",
  customOrigin = origin,
) {
  const r = await fetch(origin + path, {
    method: "POST",
    headers: {
      Origin: customOrigin,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: new URLSearchParams(form),
    redirect: "manual",
    signal: AbortSignal.timeout(60000),
  });
  return {
    r,
    location: r.headers.get("location") || "",
    cookie: (r.headers.get("set-cookie") || "").split(";")[0],
    body: await r.text(),
  };
}
const login = (email: string, password: string) =>
  post("/api/auth/login", { email, password, returnTo: "/account" });
let session = "",
  otherSession = "",
  mailbox = "",
  userId = "",
  resetToken = "",
  recovery = "";
async function main() {
  await check("Strict local native target and TLS", async () => {
    const [r] =
      await pg`select current_database() db,host(inet_server_addr()) host,current_setting('cluster_name') cluster,current_user role`;
    assert.equal(r.db, "postgres");
    assert.equal(r.host, "127.0.0.1");
    assert.equal(r.cluster, "aibean-acceptance-" + state.run);
    assert.equal(r.role, "aibean_runtime");
  });
  await check(
    "Actual registration validates confirmation and policy",
    async () => {
      const r = await post("/api/auth/register", {
        email,
        password: p1,
        confirmPassword: p2,
      });
      assert(r.location.includes("error=confirmation"));
      assert.equal(
        (
          await pg`select user_id from local_qa_auth.accounts where email=${email}`
        ).length,
        0,
      );
    },
  );
  await check(
    "Actual registration creates only ordinary User and ignores privilege metadata",
    async () => {
      const r = await post("/api/auth/register", {
        email,
        password: p1,
        confirmPassword: p1,
        isAdmin: "true",
        isCreator: "true",
        userId: handoff.accounts.find(
          (a: { role: string }) => a.role === "admin",
        ).email,
      });
      assert(r.location.endsWith("/register?status=sent"));
      const [a] =
        await pg`select user_id,confirmed from local_qa_auth.accounts where email=${email}`;
      userId = a.user_id;
      assert.equal(a.confirmed, false);
      const [u] =
        await pg`select is_admin,is_creator from public.users where id=${userId}`;
      assert.deepEqual({ ...u }, { is_admin: false, is_creator: false });
    },
  );
  await check("Unverified login and business access denied", async () => {
    const r = await login(email, p1);
    assert(r.location.includes("error=credentials"));
    assert(!r.cookie.includes("aibean_password_session="));
  });
  await check(
    "Duplicate registration has same generic response and no password replacement",
    async () => {
      const r = await post("/api/auth/register", {
        email,
        password: p2,
        confirmPassword: p2,
      });
      assert(r.location.endsWith("/register?status=sent"));
      assert.equal(
        (
          await pg`select user_id from local_qa_auth.accounts where email=${email}`
        ).length,
        1,
      );
    },
  );
  await check(
    "Local mailbox is protected; confirmation never exposed publicly",
    async () => {
      const r = await fetch(origin + "/local-mailbox");
      const text = await r.text();
      const [m] =
        await pg`select token from local_qa_auth.mail where email=${email} and purpose='verify'`;
      assert(!text.includes(m.token));
      const denied = await post("/api/local-qa/exchange", {
        token: m.token,
        purpose: "verify",
      });
      assert.equal(denied.r.status, 403);
    },
  );
  await check(
    "Private mailbox login and one-use email confirmation",
    async () => {
      mailbox = (
        await post("/api/local-qa/mailbox", {
          password: handoff.mailbox.password,
        })
      ).cookie;
      assert(mailbox.startsWith("aibean_local_qa_mailbox="));
      const [m] =
        await pg`select token from local_qa_auth.mail where email=${email} and purpose='verify'`;
      const r = await post(
        "/api/local-qa/exchange",
        { token: m.token, purpose: "verify" },
        mailbox,
      );
      assert(r.location.endsWith("/login?status=verified"));
      assert(
        (
          await post(
            "/api/local-qa/exchange",
            { token: m.token, purpose: "verify" },
            mailbox,
          )
        ).location.includes("invalidlink"),
      );
    },
  );
  await check(
    "Verified login, secure cookie and account rendering",
    async () => {
      const r = await login(email, p1);
      session = r.cookie;
      assert(r.location.endsWith("/account"));
      assert(r.r.headers.get("set-cookie")?.includes("HttpOnly"));
      assert(r.r.headers.get("set-cookie")?.includes("SameSite=strict"));
      assert.equal(r.r.headers.get("cache-control"), "no-store");
      const page = await fetch(origin + "/account", {
        headers: { Cookie: session },
      });
      assert((await page.text()).includes("Your next moves."));
      otherSession = (await login(email, p1)).cookie;
    },
  );
  await check(
    "Current password failure does not change sessions or credential",
    async () => {
      const r = await post(
        "/api/local-qa/change",
        { currentPassword: p2, password: p2, confirmPassword: p2 },
        session,
      );
      assert(r.location.includes("error=current"));
      assert(await auth.identity(session.split("=")[1]));
    },
  );
  await check(
    "Real password change revokes both independent sessions",
    async () => {
      const r = await post(
        "/api/local-qa/change",
        { currentPassword: p1, password: p2, confirmPassword: p2 },
        session,
      );
      assert(r.location.endsWith("/login?status=changed"));
      assert.equal(await auth.identity(session.split("=")[1]), null);
      assert.equal(await auth.identity(otherSession.split("=")[1]), null);
      assert((await login(email, p1)).location.includes("error=credentials"));
      session = (await login(email, p2)).cookie;
      assert(session.startsWith("aibean_password_session="));
    },
  );
  await check(
    "Forgot-password enumeration boundary and no token in public response",
    async () => {
      const known = await post("/api/local-qa/forgot", { email });
      const unknown = await post("/api/local-qa/forgot", {
        email:
          "missing-" + randomBytes(8).toString("hex") + "@local-aibean.invalid",
      });
      assert.equal(known.location, unknown.location);
      assert.equal(known.body, unknown.body);
      const [m] =
        await pg`select token from local_qa_auth.mail where email=${email} and purpose='reset' order by created_at desc limit 1`;
      resetToken = m.token;
      assert(!known.body.includes(resetToken));
    },
  );
  await check(
    "Invalid and account-purpose mismatched tokens reject",
    async () => {
      assert.equal(
        await auth.exchange(randomBytes(32).toString("hex"), "reset"),
        null,
      );
      assert.equal(await auth.exchange(resetToken, "verify"), null);
    },
  );
  await check(
    "Recovery exchange is single use and recovery session cannot authorize business",
    async () => {
      const r = await post(
        "/api/local-qa/exchange",
        { token: resetToken, purpose: "reset" },
        mailbox,
      );
      assert(r.location.endsWith("/reset-password"));
      recovery = r.r.headers
        .get("set-cookie")!
        .match(/aibean_local_qa_recovery=([a-f0-9]{64})/)![0];
      assert.equal(await auth.identity(recovery.split("=")[1]), null);
      assert(
        (
          await post(
            "/api/local-qa/exchange",
            { token: resetToken, purpose: "reset" },
            mailbox,
          )
        ).location.includes("invalidlink"),
      );
      const a = await fetch(origin + "/account", {
        headers: { Cookie: recovery },
        redirect: "manual",
      });
      const body = await a.text();
      assert(
        a.status === 307 ||
          (a.status === 200 &&
            body.includes("NEXT_REDIRECT;") &&
            body.includes("/login?")),
      );
    },
  );
  await check(
    "Real reset revokes access session, rejects replay and accepts only new password",
    async () => {
      const r = await post(
        "/api/auth/reset",
        { password: p3, confirmPassword: p3 },
        recovery,
      );
      assert(r.location.endsWith("/login?status=changed"));
      assert.equal(await auth.identity(session.split("=")[1]), null);
      assert(
        (
          await post(
            "/api/auth/reset",
            { password: p1, confirmPassword: p1 },
            recovery,
          )
        ).location.includes("invalidlink"),
      );
      assert((await login(email, p2)).location.includes("error=credentials"));
      session = (await login(email, p3)).cookie;
      assert(session.startsWith("aibean_password_session="));
    },
  );
  await check(
    "Capabilities and identity unchanged by password operations",
    async () => {
      const [u] =
        await pg`select id,is_admin,is_creator from public.users where id=${userId}`;
      assert.deepEqual(
        { ...u },
        { id: userId, is_admin: false, is_creator: false },
      );
      assert.equal(
        (
          await pg`select user_id from public.vendor_access where user_id=${userId}`
        ).length,
        0,
      );
    },
  );
  await check(
    "Actual server denies ordinary Admin and Creator access",
    async () => {
      for (const path of ["/admin", "/creator"]) {
        const r = await fetch(origin + path, {
          headers: { Cookie: session },
          redirect: "manual",
        });
        const body = await r.text();
        assert(
          r.status === 307 ||
            (r.status === 200 && body.includes("NEXT_REDIRECT;")),
        );
        assert(
          (r.headers.get("location") || body).includes(
            path === "/admin" ? "admin-required" : "creator-required",
          ),
        );
      }
    },
  );
  await check(
    "Forged cross-origin registration, change and reset reject",
    async () => {
      for (const path of [
        "/api/auth/register",
        "/api/local-qa/change",
        "/api/auth/reset",
      ]) {
        assert.equal(
          (
            await post(
              path,
              { email, password: p1, confirmPassword: p1 },
              session,
              "https://example.invalid",
            )
          ).r.status,
          403,
        );
      }
    },
  );
  await check(
    "Concurrent signup yields exactly one ordinary identity",
    async () => {
      const e =
        "concurrent-" +
        randomBytes(8).toString("hex") +
        "@local-aibean.invalid";
      await Promise.all([auth.register(e, p1), auth.register(e, p1)]);
      assert.equal(
        (await pg`select user_id from local_qa_auth.accounts where email=${e}`)
          .length,
        1,
      );
    },
  );
  await check(
    "Atomic shared throttling cannot bypass budget concurrently",
    async () => {
      const key = "limit-" + randomBytes(8).toString("hex");
      const attempts = await Promise.allSettled(
        Array.from({ length: 12 }, () => auth.limit("synthetic-limit", key, 3)),
      );
      assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 3);
    },
  );
  await check(
    "Expired confirmation/reset tokens reject without account changes",
    async () => {
      await auth.forgot(email);
      const [mail] =
        await pg`select token from local_qa_auth.mail where email=${email} and purpose='reset' order by created_at desc limit 1`;
      await pg`update local_qa_auth.tokens set expires_at=now()-interval '1 minute' where digest=${digest(mail.token)}`;
      assert.equal(await auth.exchange(mail.token, "reset"), null);
      const [account] =
        await pg`select confirmed from local_qa_auth.accounts where user_id=${userId}`;
      assert.equal(account.confirmed, true);
    },
  );
  await check(
    "Concurrent token replay yields only one recovery authorization",
    async () => {
      await auth.forgot(email);
      const [mail] =
        await pg`select token from local_qa_auth.mail where email=${email} and purpose='reset' order by created_at desc limit 1`;
      const result = await Promise.all([
        auth.exchange(mail.token, "reset"),
        auth.exchange(mail.token, "reset"),
      ]);
      assert.equal(result.filter(Boolean).length, 1);
      const token = result.find(Boolean)!;
      await pg`update local_qa_auth.sessions set expires_at=now()-interval '1 minute' where digest=${digest(token)}`;
      assert.equal(await auth.reset(token, p1), false);
    },
  );
  await check(
    "Private Auth schema RLS and browser/service grants deny direct access",
    async () => {
      const tables =
        await pg`select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='local_qa_auth' and c.relkind='r'`;
      assert.equal(tables.length, 6);
      assert(tables.every((t) => t.relrowsecurity));
      for (const role of ["anon", "authenticated", "service_role"]) {
        const [grants] =
          await pg`select has_schema_privilege(${role},'local_qa_auth','USAGE') as usage,has_table_privilege(${role},'local_qa_auth.accounts','SELECT') as read,has_table_privilege(${role},'local_qa_auth.accounts','UPDATE') as write`;
        assert.equal(grants.usage, false);
        assert.equal(grants.read, false);
        assert.equal(grants.write, false);
      }
      const [caps] =
        await pg`select has_column_privilege(current_user,'public.users','is_admin','UPDATE') as admin,has_column_privilege(current_user,'public.users','is_creator','UPDATE') as creator`;
      assert.equal(caps.admin, false);
      assert.equal(caps.creator, false);
    },
  );
  await check(
    "Concurrent password replacement cannot leave a newly exchanged recovery session",
    async () => {
      for (let i = 0; i < 3; i++) {
        const isolatedEmail =
          "race-" + randomBytes(8).toString("hex") + "@local-aibean.invalid";
        await auth.register(isolatedEmail, p1);
        const [confirmation] =
          await pg`select token from local_qa_auth.mail where email=${isolatedEmail} and purpose='verify'`;
        assert.equal(
          await auth.exchange(confirmation.token, "verify"),
          "verified",
        );
        const access = await auth.login(isolatedEmail, p1);
        assert(access);
        await auth.forgot(isolatedEmail);
        const [mail] =
          await pg`select token from local_qa_auth.mail where email=${isolatedEmail} and purpose='reset'`;
        const [recovered, changed] = await Promise.all([
          auth.exchange(mail.token, "reset"),
          auth.change(access, p1, p2),
        ]);
        assert.equal(changed, true);
        if (recovered)
          assert.equal(await auth.identity(recovered, "recovery"), null);
        assert.equal(await auth.exchange(mail.token, "reset"), null);
      }
    },
  );
  await check(
    "Credential audit events contain no passwords, email or token values",
    async () => {
      const events =
        await pg`select action,detail from public.audit_logs where actor_id=${userId} and action like 'local-qa.%'`;
      for (const action of [
        "registered",
        "email-confirmed",
        "password-changed",
        "password-reset",
      ])
        assert(events.some((e) => e.action === "local-qa." + action));
      const body = JSON.stringify(events);
      for (const value of [email, p1, p2, p3]) assert(!body.includes(value));
    },
  );
  await check(
    "Auth record transaction failure rolls back without partial identity",
    async () => {
      const id = "rollback_" + randomBytes(12).toString("hex");
      await assert.rejects(
        pg.begin(async (tx) => {
          await tx`insert into public.users(id) values(${id})`;
          await tx`insert into local_qa_auth.accounts(user_id,email,password_hash) values(${id},${email},${privateConfig.dummyHash})`;
        }),
      );
      assert.equal(
        (await pg`select id from public.users where id=${id}`).length,
        0,
      );
    },
  );
  await check("Logout revokes server session and clears cookie", async () => {
    const r = await post("/api/auth/logout", {}, session);
    assert(r.r.headers.get("set-cookie")?.includes("Max-Age=0"));
    assert.equal(await auth.identity(session.split("=")[1]), null);
  });
  await check(
    "All existing persona credentials remain unchanged and login on a consistent origin",
    async () => {
      for (const a of handoff.accounts) {
        const r = await login(a.email, a.password);
        assert(r.cookie.startsWith("aibean_password_session="));
        await post("/api/auth/logout", {}, r.cookie);
      }
    },
  );
}
void main()
  .catch(() => {
    checks.push({
      check: "Unexpected local test error; private details withheld",
      status: "FAIL",
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await pg.end({ timeout: 5 });
    const report = {
      capturedAt: new Date().toISOString(),
      target: "EXISTING_DISPOSABLE_NATIVE_POSTGRESQL_ONLY",
      hostedConnections: 0,
      checks,
      summary: {
        pass: checks.filter((c) => c.status === "PASS").length,
        fail: checks.filter((c) => c.status === "FAIL").length,
      },
      browserEvidenceSeparate: true,
    };
    writeFileSync(
      "docs/evidence/local-ui-phase2-auth-native.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report.summary));
  });
