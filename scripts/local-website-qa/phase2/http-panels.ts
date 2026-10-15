// Actual HTTP/server-action QA; credentials and cookies stay in memory only.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";
import postgres from "postgres";
import { qaDatabaseConfig } from "../../../src/lib/local-qa-auth/config";
import { passwordAccountId } from "../../../src/lib/password-crypto";
import { assertQaOrigin, qaCredentialPath } from "../guards";
import { adminFixtureInput } from "../../../tests/fixtures/admin-workflow-contract";
import { createRequire } from "node:module";
const { encodeReply } = createRequire(__filename)(
  "next/dist/compiled/react-server-dom-turbopack/client.browser",
) as { encodeReply: (args: unknown[]) => Promise<string | FormData> };
type App = { role: string; url: string; email: string; password: string };
const state = JSON.parse(
  readFileSync("test-results/local-website-qa-active.json", "utf8"),
);
assert(/^[a-f0-9]{32}$/.test(state.run));
const fixture = JSON.parse(
  readFileSync(join(state.root, "browser-fixture.json"), "utf8"),
);
const credentials = JSON.parse(
  readFileSync(qaCredentialPath(state.run), "utf8"),
);
const manifest = JSON.parse(
  readFileSync(join(state.root, "runtime.json"), "utf8"),
);
assert.equal(state.run, fixture.run);
assert.equal(state.run, credentials.run);
const apps = (credentials.accounts as App[]).map((a) => ({
  ...a,
  url: "http://127.0.0.1:3000",
}));
assert.deepEqual(apps.map((a) => a.role).sort(), [
  "admin",
  "creator",
  "user",
  "vendor",
]);
assert.equal(new Set(apps.map((a) => a.password)).size, 4);
for (const a of apps) assertQaOrigin(a.url);
const cfg = qaDatabaseConfig({
  NODE_ENV: "development",
  AIBEAN_LOCAL_QA_AUTH: "1",
  AIBEAN_LOCAL_ACCEPTANCE_RUN: state.run,
  DATABASE_URL: manifest.connectionString,
})!;
const pg = postgres(cfg.connectionString, {
  ...cfg.options,
  onnotice: () => {},
});
const results: Record<string, unknown>[] = [];
const runSuffix = Date.now().toString(36);
const cookies = new Map<string, string>();
let phase = "setup";
async function check(name: string, work: () => Promise<void>) {
  phase = name;
  try {
    await work();
    results.push({ check: name, status: "PASS" });
  } catch {
    results.push({ check: name, status: "FAIL" });
  }
  console.log(JSON.stringify({ check: name, status: results.at(-1)!.status }));
}
async function request(
  a: App,
  path: string,
  cookie = "",
  options: RequestInit = {},
) {
  const r = await fetch(a.url + path, {
    ...options,
    headers: { ...(cookie ? { cookie } : {}), ...options.headers },
    redirect: "manual",
    signal: AbortSignal.timeout(90000),
  });
  const html = await r.text();
  const status = html.includes("NEXT_HTTP_ERROR_FALLBACK;404")
    ? 404
    : html.includes("NEXT_REDIRECT;")
      ? 307
      : r.status;
  return { r, html, status };
}
async function page(a: App, path: string, cookie = "", expected = 200) {
  const { r, html, status } = await request(a, path, cookie);
  assert(
    [expected, ...(expected === 307 ? [308] : [])].includes(status),
    "Unexpected route status",
  );
  assert(
    !/"digest"\s*:\s*"(?!NEXT_)[^"\n]+"/.test(html),
    "Server render error",
  );
  const dom = new JSDOM(html);
  const d = dom.window.document;
  if (expected === 200) assert(d.querySelector("main"));
  const unlabelled = Array.from(
    d.querySelectorAll<HTMLInputElement>(
      "input:not([type=hidden]),select,textarea",
    ),
  ).filter(
    (e) =>
      !e.closest("label") &&
      !e.getAttribute("aria-label") &&
      !e.getAttribute("aria-labelledby") &&
      !e.labels?.length,
  ).length;
  const nested = d.querySelectorAll("form form").length;
  results.push({
    route: path,
    persona: cookie ? a.role : "guest",
    status: "PASS",
    httpStatus: status,
    unlabelledControls: unlabelled,
    nestedForms: nested,
    kind: "HTTP_RENDER_ACCESS",
  });
  dom.window.close();
  return { html, r };
}
async function login(a: App) {
  const r = await fetch(a.url + "/api/auth/login", {
    method: "POST",
    headers: {
      origin: a.url,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      email: a.email,
      password: a.password,
      returnTo: "/account",
    }),
    redirect: "manual",
  });
  assert.equal(r.status, 303);
  assert.equal(r.headers.get("location"), a.url + "/account");
  const set = r.headers.get("set-cookie") || "";
  assert(set.includes("HttpOnly"));
  assert(/SameSite=strict/i.test(set));
  assert.equal(r.headers.get("cache-control"), "no-store");
  const cookie = set.split(";")[0];
  assert(cookie.startsWith("aibean_password_session="));
  cookies.set(a.role, cookie);
}
// Derive the action from the rendered RSC props, rather than hardcoding an action
// identifier or bypassing the actual framework/server authorization machinery.
function actionId(html: string, label: string) {
  const d = new JSDOM(html);
  let flight = "";
  for (const script of Array.from(d.window.document.scripts)) {
    const text = script.textContent || "";
    const p = text.indexOf("self.__next_f.push(");
    if (p < 0) continue;
    try {
      const tuple = JSON.parse(
        text.slice(p + "self.__next_f.push(".length).replace(/\)\s*;?\s*$/, ""),
      );
      if (tuple[0] === 1) flight += tuple[1];
    } catch {
      // Non-JSON framework scripts are not server-action metadata.
    }
  }
  d.window.close();
  const objects = new Map<string, unknown>();
  for (const line of flight.split("\n")) {
    const match = /^([a-f0-9]+):(\{|\[)/.exec(line);
    if (match)
      try {
        objects.set(match[1], JSON.parse(line.slice(match[1].length + 1)));
      } catch {
        // Ignore partial Flight records; only complete JSON nodes are traversed.
      }
  }
  let reference = "";
  const walk = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    const v = value as Record<string, unknown>;
    if (
      v.label === label &&
      typeof v.action === "string" &&
      (v.action.startsWith("$F") || v.action.startsWith("$h"))
    )
      reference = v.action.slice(2);
    for (const child of Object.values(v)) walk(child);
  };
  for (const object of objects.values()) walk(object);
  const record = objects.get(reference) as
    { id?: string; bound?: unknown } | undefined;
  assert(
    record && /^[a-f0-9]{40,64}$/.test(record.id || ""),
    "Rendered action reference unavailable",
  );
  assert.equal(record.bound, null, "Only unbound rendered actions are used");
  return record.id!;
}
async function action(
  a: App,
  path: string,
  id: string,
  fields: Record<string, string | string[]>,
  origin = a.url,
) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields))
    for (const item of Array.isArray(value) ? value : [value])
      form.append(key, item);
  const body = await encodeReply([{}, form]);
  return request(a, path, cookies.get(a.role) || "", {
    method: "POST",
    headers: { origin, "Next-Action": id, accept: "text/x-component" },
    body,
  });
}
const [user, admin, creator, vendor] = [
  "user",
  "admin",
  "creator",
  "vendor",
].map((role) => apps.find((a) => a.role === role)!);
const publicRoutes = [
  "/",
  "/tools",
  "/categories",
  "/industries",
  "/use-cases",
  "/search",
  "/compare",
  "/pricing",
  "/creators",
  "/skills",
  "/playbooks",
  "/events",
  "/login",
  "/register",
  "/submit",
  "/for-vendors",
];
const adminRoutes = [
  "/admin",
  "/admin/tools",
  "/admin/tools/new",
  "/admin/taxonomy",
  "/admin/reviews",
  "/admin/creators",
  "/admin/capabilities",
  "/admin/claims",
  "/admin/edits",
  "/admin/verification",
  "/admin/disputes",
  "/admin/content/skills",
  "/admin/content/playbooks",
  "/admin/content/resources",
  "/admin/content/events",
  "/admin/featured",
  "/admin/commerce/pricing",
  "/admin/commerce/payments",
  "/admin/commerce/subscriptions",
  "/admin/commerce/submissions",
  "/admin/analytics",
  "/admin/audit",
  "/admin/affiliates",
  "/admin/profiles",
  "/admin/reports",
  "/admin/files",
];
const accountRoutes = [
  "/account",
  "/account/profile",
  "/account/comparisons",
  "/account/following",
  "/account/activity",
  "/account/billing",
  "/account/membership",
  "/account/submissions",
];
const creatorRoutes = [
  "/creator",
  "/creator/profile/preview",
  "/creator/analytics",
  "/creator/content/skills",
  "/creator/content/playbooks",
  "/creator/content/resources",
  "/creator/content/events",
  "/creator/content/skills/new",
  "/creator/content/playbooks/new",
  "/creator/content/resources/new",
  "/creator/content/events/new",
];
async function main() {
  await check(
    "Runtime is actual isolated PostgreSQL 17 TLS and restricted role",
    async () => {
      const [r] =
        await pg`SELECT host(inet_server_addr()) AS host,current_database() AS database,current_user AS role,current_setting('cluster_name') AS cluster,(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls,current_setting('server_version_num')::int AS version`;
      assert.equal(r.host, "127.0.0.1");
      assert.equal(r.database, "postgres");
      assert.equal(r.cluster, "aibean-acceptance-" + state.run);
      assert.equal(r.role, "aibean_runtime");
      // The NOINHERIT runtime group cannot see its login's pg_stat_ssl fields.
      // Inspect only this same socket under the session login in a read-only
      // transaction; leave role/grant protections unchanged after COMMIT.
      const tls = await pg.begin("READ ONLY", async (tx) => {
        await tx.unsafe("SET LOCAL ROLE NONE");
        return (
          await tx`SELECT session_user AS login,(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls`
        )[0];
      });
      assert.equal(tls.login, "aibean_app_login");
      assert.equal(tls.tls, true);
      assert(r.version >= 170000 && r.version < 180000);
    },
  );
  if (results.at(-1)?.status !== "PASS")
    throw Error("Native fixture preflight failed");
  for (const route of publicRoutes)
    await check("Public render " + route, () =>
      page(user, route, "", route === "/pricing" ? 307 : 200).then(() => {}),
    );
  for (const app of apps) {
    await check(app.role + " unauthenticated panel denial", () =>
      page(
        app,
        app.role === "user" ? "/account" : "/" + app.role,
        "",
        307,
      ).then(() => {}),
    );
    await check(app.role + " genuine password login and signed cookie", () =>
      login(app),
    );
  }
  for (const route of adminRoutes)
    await check("Admin render " + route, () =>
      page(admin, route, cookies.get("admin")).then(() => {}),
    );
  for (const route of accountRoutes)
    await check("User render " + route, () =>
      page(user, route, cookies.get("user")).then(() => {}),
    );
  for (const route of creatorRoutes)
    await check("Creator render " + route, () =>
      page(creator, route, cookies.get("creator")).then(() => {}),
    );
  for (const route of [
    "/vendor",
    "/featured/manage",
    "/vendor/tools/" + fixture.toolIds[0],
    "/vendor/tools/" + fixture.toolIds[0] + "/analytics",
    "/creator/content/events",
  ])
    await check("Vendor render " + route, () =>
      page(vendor, route, cookies.get("vendor")).then(() => {}),
    );
  for (const route of [
    "/admin",
    "/admin/tools/new",
    "/creator",
    "/creator/content/skills/new",
    "/vendor/tools/" + fixture.toolIds[0],
  ])
    await check("Ordinary User capability denial " + route, () =>
      page(user, route, cookies.get("user"), 307).then(() => {}),
    );
  await check(
    "Ordinary User vendor overview remains a legitimate empty state",
    async () => {
      const p = await page(user, "/vendor", cookies.get("user"));
      assert(p.html.includes("No approved claims yet"));
    },
  );
  for (const a of [creator, vendor])
    await check(a.role + " Admin denial", () =>
      page(a, "/admin", cookies.get(a.role), 307).then(() => {}),
    );
  await check("Vendor cannot edit another approved owner Tool", () =>
    page(
      vendor,
      "/vendor/tools/" + fixture.toolIds[1],
      cookies.get("vendor"),
      307,
    ).then(() => {}),
  );
  await check("Creator cannot inspect another Creator private draft", () =>
    page(
      creator,
      "/creator/content/skills/" + fixture.peerDraftId,
      cookies.get("creator"),
      404,
    ).then(() => {}),
  );
  await check("Public cannot see another Creator private draft", () =>
    page(user, "/skills/other-creator-private-draft", "", 404).then(() => {}),
  );
  const [stack] =
    await pg`SELECT id FROM public.stacks WHERE user_id=${passwordAccountId(user.email)} LIMIT 1`;
  if (stack) {
    await check("User owns private Stack detail", () =>
      page(user, "/account/stacks/" + stack.id, cookies.get("user")).then(
        () => {},
      ),
    );
    await check("Creator cannot inspect User private Stack", () =>
      page(
        creator,
        "/account/stacks/" + stack.id,
        cookies.get("creator"),
        404,
      ).then(() => {}),
    );
  }
  await check(
    "Shared alias origins preserve ordinary User identity and Admin denial",
    async () => {
      for (const port of [3002, 3003, 3004]) {
        const alias = { ...user, url: "http://127.0.0.1:" + port };
        await page(alias, "/account", cookies.get("user"));
        await page(alias, "/admin", cookies.get("user"), 307);
      }
    },
  );
  await check("Forged login Origin rejected", async () => {
    const r = await request(user, "/api/auth/login", "", {
      method: "POST",
      headers: {
        origin: "https://evil.invalid",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        email: user.email,
        password: "NotTheFixture9!",
      }),
    });
    assert.equal(r.status, 403);
  });
  await check(
    "Registration and account-security form render under local QA v2",
    async () => {
      const registration = await page(user, "/register");
      assert(registration.html.includes("confirmPassword"));
      await page(user, "/account/security", cookies.get("user"));
    },
  );
  await check(
    "Homepage JavaScript CSS and brand assets actually respond",
    async () => {
      const { html } = await page(user, "/");
      const d = new JSDOM(html);
      const assets = new Set(
        Array.from(
          d.window.document.querySelectorAll(
            "script[src],link[rel=stylesheet],img[src]",
          ),
        )
          .map((e) => e.getAttribute("src") || e.getAttribute("href") || "")
          .filter((s) => s.startsWith("/")),
      );
      assert(assets.size >= 3);
      for (const path of assets)
        assert.equal(
          (await fetch(user.url + path, { signal: AbortSignal.timeout(90000) }))
            .status,
          200,
        );
      d.window.close();
    },
  );
  // These requests use the actual framework wire format and the real signed
  // session; successful writes are independently checked in the local database.
  const createPage = await page(
    admin,
    "/admin/tools/new",
    cookies.get("admin"),
  );
  let createId = "";
  await check("Derive rendered Admin create action reference", async () => {
    createId = actionId(createPage.html, "Create draft");
  });
  if (createId) {
    const input: Record<string, string | string[]> = {
      name: "HTTP QA Admin draft",
      slug: "phase2-http-qa-" + runSuffix,
      website: "https://example.invalid/tool",
      bestFor: adminFixtureInput.bestFor,
      notBestFor: adminFixtureInput.notBestFor,
      description: adminFixtureInput.description,
      categoryId: adminFixtureInput.categoryId,
      listingTypeId: "LST-01",
      subcategoryId: "",
      pricing: "unknown",
      api: "unknown",
      openSource: "unknown",
      selfHosted: "unknown",
      strengths: "Synthetic HTTP validation",
      limitations: "Synthetic local fixture only",
      features: "Synthetic local feature",
      useCaseIds: adminFixtureInput.useCaseIds,
      industryIds: [],
      integrations: "",
      platforms: "web",
      tags: "synthetic",
    };
    await check(
      "Admin real server action creates unpublished Tool",
      async () => {
        await action(admin, "/admin/tools/new", createId, input);
        const [row] =
          await pg`SELECT status FROM public.tools WHERE slug=${"phase2-http-qa-" + runSuffix}`;
        assert(row);
        assert.equal(row.status, "draft");
      },
    );
    await check(
      "Ordinary User real Admin POST is denied without a write",
      async () => {
        const before = (
          await pg`SELECT count(*)::int AS n FROM public.tools`
        )[0].n;
        const r = await action(user, "/admin/tools/new", createId, {
          ...input,
          slug: "forged-admin-tool",
        });
        assert(
          r.r.status >= 400 ||
            r.status === 307 ||
            r.r.headers.get("x-action-redirect")?.includes("admin-required"),
        );
        assert.equal(
          (await pg`SELECT count(*)::int AS n FROM public.tools`)[0].n,
          before,
        );
      },
    );
    await check("Forged cross-origin Admin action cannot write", async () => {
      const before = (await pg`SELECT count(*)::int AS n FROM public.tools`)[0]
        .n;
      const r = await action(
        admin,
        "/admin/tools/new",
        createId,
        { ...input, slug: "cross-origin-forged-tool" },
        "https://evil.invalid",
      );
      assert(r.r.status >= 400);
      assert.equal(
        (await pg`SELECT count(*)::int AS n FROM public.tools`)[0].n,
        before,
      );
    });
    await check(
      "Admin invalid Tool input returns safely without a write",
      async () => {
        const before = (
          await pg`SELECT count(*)::int AS n FROM public.tools`
        )[0].n;
        await action(admin, "/admin/tools/new", createId, {
          ...input,
          name: "",
          slug: "invalid-http-tool",
        });
        assert.equal(
          (await pg`SELECT count(*)::int AS n FROM public.tools`)[0].n,
          before,
        );
      },
    );
  }
  for (const a of apps)
    await check(
      a.role + " genuine logout clears session and denies account",
      async () => {
        const r = await request(a, "/api/auth/logout", cookies.get(a.role), {
          method: "POST",
          headers: { origin: a.url },
        });
        assert.equal(r.r.status, 303);
        assert(/Max-Age=0/i.test(r.r.headers.get("set-cookie") || ""));
        await page(a, "/account", "", 307);
      },
    );
}
void main()
  .catch(() => {
    results.push({
      check: phase,
      status: "FAIL",
      detail: "Unexpected local test error; raw details withheld",
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await pg.end({ timeout: 5 });
    const report = {
      capturedAt: new Date().toISOString(),
      target: "EXPLICIT_ISOLATED_FOUR_PERSONA_LOOPBACK_QA",
      hostedConnections: 0,
      credentialsPublished: false,
      results,
      summary: {
        pass: results.filter((r) => r.status === "PASS").length,
        fail: results.filter((r) => r.status === "FAIL").length,
      },
      externalProviders: "BLOCKED_NOT_CONFIGURED_OR_AUTHORIZED",
    };
    writeFileSync(
      "docs/evidence/local-ui-phase2-http.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify({ summary: report.summary }));
    if (report.summary.fail) process.exitCode = 1;
  });
