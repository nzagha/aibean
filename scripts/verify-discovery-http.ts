// New milestone HTTP acceptance only; never loads .env or contacts hosted services.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import postgres from "postgres";
import { localAcceptanceConfig } from "../src/lib/db/local-acceptance-config";
const run = process.argv[2],
  comparisonId = process.argv[3];
assert(/^[a-f0-9]{32}$/.test(run || ""));
assert(/^[a-f0-9-]{36}$/.test(comparisonId || ""));
const root = resolve("test-results", "product-acceptance-" + run),
  fixture = JSON.parse(
    readFileSync(join(root, "browser-fixture.json"), "utf8"),
  ),
  manifest = JSON.parse(readFileSync(join(root, "runtime.json"), "utf8"));
assert.equal(fixture.run, run);
const config = localAcceptanceConfig({
  NODE_ENV: "development",
  AIBEAN_LOCAL_ACCEPTANCE_RUN: run,
  DATABASE_URL: manifest.connectionString,
})!;
const pg = postgres(config.connectionString, config.options);
type App = { url: string; email: string; role: string };
const admin: App = fixture.environments.find((a: App) => a.role === "admin"),
  user: App = fixture.environments.find((a: App) => a.role === "user");
for (const app of [admin, user]) {
  const url = new URL(app.url);
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.protocol, "http:");
  assert(Number(url.port) > 1024);
}
const results: { check: string; pass: boolean }[] = [];
async function check(name: string, work: () => Promise<void>) {
  try {
    await work();
    results.push({ check: name, pass: true });
  } catch (error) {
    results.push({ check: name, pass: false });
    console.error(
      "Failed check: " +
        name +
        " · " +
        (error instanceof Error
          ? error.message.split("\n").slice(0, 5).join(" ")
          : "assertion"),
    );
    throw error;
  }
}
async function login(app: App) {
  const response = await fetch(app.url + "/api/auth/login", {
    method: "POST",
    headers: {
      origin: app.url,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      email: app.email,
      password: fixture.loginPassword,
      returnTo: "/account",
    }),
    redirect: "manual",
  });
  assert.equal(response.status, 303);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert(cookie);
  return cookie;
}
async function page(app: App, path: string, cookie: string, status: number) {
  const r = await fetch(app.url + path, {
      headers: cookie ? { cookie } : {},
      redirect: "manual",
      signal: AbortSignal.timeout(60000),
    }),
    body = await r.text();
  const effective = body.includes("NEXT_HTTP_ERROR_FALLBACK;404")
    ? 404
    : body.includes("NEXT_REDIRECT;")
      ? 307
      : r.status;
  assert.equal(effective, status);
  assert(!/"digest"\s*:\s*"(?!NEXT_)/.test(body));
  if (status === 200) {
    const dom = new JSDOM(body),
      d = dom.window.document;
    assert.equal(d.querySelectorAll("h1").length, 1);
    assert.equal(d.querySelectorAll("form form").length, 0);
    dom.window.close();
  }
  return body;
}
let analyticsCookie = "";
async function event(
  value: unknown,
  expected: number,
  origin = user.url,
  extra: Record<string, string> = {},
) {
  const r = await fetch(user.url + "/api/analytics", {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      ...(analyticsCookie ? { cookie: analyticsCookie } : {}),
      ...extra,
    },
    body: typeof value === "string" ? value : JSON.stringify(value),
  });
  assert.equal(r.status, expected);
  const set = r.headers.get("set-cookie");
  if (set) {
    assert(set.includes("HttpOnly"));
    assert(set.includes("SameSite=lax"));
    analyticsCookie = set.split(";")[0];
  }
  assert.equal(await r.text(), "");
}
async function main() {
  try {
    const ac = await login(admin),
      uc = await login(user);
    for (const route of [
      "/account/comparisons",
      "/account/following",
      "/account/comparisons/" + comparisonId,
    ])
      await check("Guest denied " + route.replace(comparisonId, "[id]"), () =>
        page(user, route, "", 307).then(() => {}),
      );
    for (const route of [
      "/account/comparisons",
      "/account/following",
      "/account/comparisons/" + comparisonId,
      "/account/activity",
    ])
      await check("User owns " + route.replace(comparisonId, "[id]"), () =>
        page(user, route, uc, 200).then(() => {}),
      );
    await check("Admin cannot read another account comparison", () =>
      page(admin, "/account/comparisons/" + comparisonId, ac, 404).then(
        () => {},
      ),
    );
    await check("User denied Admin analytics", () =>
      page(user, "/admin/analytics", uc, 307).then(() => {}),
    );
    await check("User denied Creator analytics", () =>
      page(user, "/creator/analytics", uc, 307).then(() => {}),
    );
    const [tool] =
        await pg`SELECT id FROM public.tools WHERE slug='acceptance-tool-1'`,
      [peer] =
        await pg`SELECT id FROM public.tools WHERE slug='acceptance-tool-2'`,
      [skill] =
        await pg`SELECT id FROM public.ai_skills WHERE slug='acceptance-skill'`,
      [resource] =
        await pg`SELECT id FROM public.creator_resources WHERE slug='acceptance-resource'`;
    await check("Tool owner analytics", () =>
      page(admin, "/vendor/tools/" + tool.id + "/analytics", ac, 200).then(
        () => {},
      ),
    );
    await check("Vendor cannot read unowned Tool analytics", () =>
      page(admin, "/vendor/tools/" + peer.id + "/analytics", ac, 307).then(
        () => {},
      ),
    );
    await check("Creator recorded engagement", () =>
      page(admin, "/creator/analytics", ac, 200).then(() => {}),
    );
    await check("Admin instrumentation and retention", async () => {
      const body = await page(admin, "/admin/analytics", ac, 200);
      assert(body.includes("retained events"));
      assert(body.includes("expired rows awaiting cleanup"));
    });
    const view = { event: "tool_view", kind: "tools", targetId: tool.id };
    await check("Cross-origin event denied", () =>
      event(view, 403, "https://example.invalid"),
    );
    await check("Untrusted event body rejected", () =>
      event({ ...view, ip: "127.0.0.1" }, 400),
    );
    await check("Client cannot forge completed save", () =>
      event({ event: "save", kind: "tools", targetId: tool.id }, 400),
    );
    await check("Raw search text rejected", () =>
      event(
        {
          event: "search",
          kind: "discovery",
          targetId: "tools",
          filters: { q: "unnecessary private text" },
        },
        400,
      ),
    );
    await check("Payload size bounded", () => event("x".repeat(4097), 413));
    const before =
      await pg`SELECT count(*)::int AS n FROM public.analytics_events`;
    await check("DNT prevents recording and session cookie", () =>
      event(view, 204, user.url, { dnt: "1" }),
    );
    assert.equal(analyticsCookie, "");
    assert.equal(
      (await pg`SELECT count(*)::int AS n FROM public.analytics_events`)[0].n,
      before[0].n,
    );
    await check("Valid public Tool view recorded with signed cookie", () =>
      event(view, 204),
    );
    assert(analyticsCookie);
    const count = (
      await pg`SELECT count(*)::int AS n FROM public.analytics_events`
    )[0].n;
    await check("Duplicate event deduplicated", () => event(view, 204));
    assert.equal(
      (await pg`SELECT count(*)::int AS n FROM public.analytics_events`)[0].n,
      count,
    );
    await check("Unknown Tool target denied", () =>
      event({ ...view, targetId: "not-present" }, 400),
    );
    await check("Unrelated campaign attribution denied", () =>
      event({ ...view, campaignId: resource.id }, 400),
    );
    await check("Published Resource Page self-attribution accepted", () =>
      event(
        {
          event: "resource_view",
          kind: "resources",
          targetId: resource.id,
          campaignId: resource.id,
        },
        204,
      ),
    );
    await check("Anonymous comparison remains available", () =>
      page(
        user,
        "/compare?tools=acceptance-tool-1,acceptance-tool-2",
        "",
        200,
      ).then(() => {}),
    );
    await check(
      "Verified Resource Page to related Skill attribution accepted",
      () =>
        event(
          {
            event: "skill_view",
            kind: "skills",
            targetId: skill.id,
            campaignId: resource.id,
          },
          204,
        ),
    );
    const attrs = (
      await pg`SELECT count(*)::int AS n FROM public.analytics_events WHERE campaign_id=${resource.id}`
    )[0].n;
    assert(attrs > 0);
    writeFileSync(
      "docs/evidence/mvp-discovery-http.json",
      JSON.stringify(
        {
          date: new Date().toISOString(),
          environment: "New native loopback fixture; synthetic records only",
          hostedAccess: false,
          total: results.length,
          results,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(JSON.stringify({ checks: results.length, pass: true }));
  } finally {
    await pg.end();
  }
}
void main().catch(() => {
  console.error(
    "Synthetic discovery HTTP check failed. Inspect the local fixture privately.",
  );
  process.exitCode = 1;
});
