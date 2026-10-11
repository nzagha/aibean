// HTTP integration evidence from the new synthetic loopback fixture only.
// Cookies, connection strings and response bodies never enter the report.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import postgres from "postgres";
import { localAcceptanceConfig } from "../src/lib/db/local-acceptance-config";
import { taxonomy, activeUseCases } from "../src/lib/catalog/taxonomy";
const run = process.argv[2];
assert(/^[a-f0-9]{32}$/.test(run || ""));
const root = resolve("test-results", "product-acceptance-" + run);
const fixture = JSON.parse(
  readFileSync(join(root, "browser-fixture.json"), "utf8"),
);
const manifest = JSON.parse(readFileSync(join(root, "runtime.json"), "utf8"));
assert.equal(fixture.run, run);
const config = localAcceptanceConfig({
  NODE_ENV: "development",
  AIBEAN_LOCAL_ACCEPTANCE_RUN: run,
  DATABASE_URL: manifest.connectionString,
})!;
const pg = postgres(config.connectionString, config.options);
const results: {
  route: string;
  role: string;
  status: number;
  outcome: string;
  headings: string[];
  unlabelled?: number;
  nestedForms?: number;
}[] = [];
const errors: string[] = [];
async function check(
  base: string,
  path: string,
  role: string,
  cookie = "",
  expected = 200,
) {
  const response = await fetch(new URL(path, base), {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
    signal: AbortSignal.timeout(60000),
  });
  const text = await response.text();
  const dom = new JSDOM(text);
  const doc = dom.window.document;
  const headings = Array.from(doc.querySelectorAll("main h1,main h2"))
    .map((e) => e.textContent?.trim() || "")
    .slice(0, 6);
  const errorDigest = /"digest"\s*:\s*"(?!NEXT_)[^"\n]+"/.test(text);
  const effectiveStatus = text.includes("NEXT_HTTP_ERROR_FALLBACK;404")
    ? 404
    : text.includes("NEXT_REDIRECT;")
      ? 307
      : response.status;
  const redirected = response.status >= 300 && response.status < 400;
  const outcome =
    (effectiveStatus === expected ||
      (effectiveStatus === 308 && expected === 307)) &&
    !errorDigest
      ? "PASS"
      : "FAIL";
  if (outcome === "FAIL")
    errors.push(
      role +
        " " +
        path +
        " status=" +
        response.status +
        (errorDigest ? " server-render error" : ""),
    );
  results.push({
    route: path,
    role,
    status: effectiveStatus,
    outcome,
    headings: redirected || effectiveStatus !== 200 ? [] : headings,
    unlabelled: Array.from(
      doc.querySelectorAll<HTMLInputElement>(
        "input:not([type=hidden]),select,textarea",
      ),
    ).filter(
      (e) =>
        !e.closest("label") &&
        !e.getAttribute("aria-label") &&
        !e.getAttribute("aria-labelledby") &&
        !e.labels?.length,
    ).length,
    nestedForms: doc.querySelectorAll("form form").length,
  });
  dom.window.close();
}
function pages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? pages(join(dir, e.name))
      : e.name === "page.tsx"
        ? ["/" + relative("src/app", dir).replaceAll("\\", "/")]
        : [],
  );
}
async function main() {
  const apps = fixture.environments as {
    role: string;
    url: string;
    email: string;
  }[];
  for (const app of apps) {
    assert.equal(new URL(app.url).hostname, "127.0.0.1");
    assert(Number(new URL(app.url).port) > 1024);
  }
  const admin = apps.find((a) => a.role === "admin")!,
    user = apps.find((a) => a.role === "user")!;
  const login = async (app: typeof admin) => {
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
    assert.equal(response.headers.get("location"), app.url + "/account");
    const cookie = response.headers.get("set-cookie")?.split(";")[0];
    assert(cookie);
    return cookie;
  };
  const adminCookie = await login(admin),
    userCookie = await login(user);
  const [tool] =
    await pg`SELECT id,slug FROM public.tools WHERE slug='acceptance-tool-1'`;
  const [skill] =
    await pg`SELECT id,slug FROM public.ai_skills WHERE slug='acceptance-skill'`;
  const [stack] = await pg`SELECT id FROM public.stacks ORDER BY id LIMIT 1`;
  const [playbook] =
    await pg`SELECT id,slug FROM public.ai_playbooks WHERE slug='acceptance-playbook'`;
  const [event] =
    await pg`SELECT id,slug FROM public.public_events WHERE slug='acceptance-event'`;
  const [resource] =
    await pg`SELECT id,slug FROM public.creator_resources WHERE slug='acceptance-resource' AND status='published'`;
  const dynamic: Record<string, string[]> = {
    "/tools/[slug]": ["/tools/" + tool.slug],
    "/claim/[slug]": ["/claim/" + tool.slug],
    "/skills/[slug]": ["/skills/" + skill.slug],
    "/playbooks/[slug]": ["/playbooks/" + playbook.slug],
    "/events/[slug]": ["/events/" + event.slug],
    "/[creator]": ["/@acceptance-creator"],
    "/[creator]/[resource]": ["/@acceptance-creator/not-published"],
    "/categories/[slug]": ["/categories/" + taxonomy.categories[0].slug],
    "/subcategories/[slug]": [
      "/subcategories/" + taxonomy.categories[0].subcategories[0].slug,
    ],
    "/industries/[slug]": ["/industries/" + taxonomy.industries[0].slug],
    "/use-cases/[slug]": ["/use-cases/" + activeUseCases[0].slug],
    "/vendor/tools/[id]": ["/vendor/tools/" + tool.id],
    "/vendor/tools/[id]/analytics": ["/vendor/tools/" + tool.id + "/analytics"],
    "/admin/tools/[id]": ["/admin/tools/" + tool.id],
    "/admin/tools/[id]/preview": ["/admin/tools/" + tool.id + "/preview"],
    "/admin/[queue]": [
      "reviews",
      "claims",
      "creators",
      "edits",
      "verification",
      "disputes",
      "capabilities",
    ].map((k) => "/admin/" + k),
    "/admin/commerce/[section]": [
      "payments",
      "subscriptions",
      "submissions",
      "pricing",
    ].map((k) => "/admin/commerce/" + k),
    "/admin/content/[kind]": ["skills", "playbooks", "events", "resources"].map(
      (k) => "/admin/content/" + k,
    ),
    "/creator/content/[kind]": [
      "skills",
      "playbooks",
      "events",
      "resources",
    ].map((k) => "/creator/content/" + k),
    "/admin/content/[kind]/[id]": [
      "/admin/content/skills/" + skill.id,
      "/admin/content/playbooks/" + playbook.id,
      "/admin/content/events/" + event.id,
    ],
    "/creator/content/[kind]/[id]": [
      "/creator/content/skills/" + skill.id,
      "/creator/content/playbooks/new",
      "/creator/content/resources/new",
      "/creator/content/events/new",
    ],
    "/account/stacks/[id]": stack ? ["/account/stacks/" + stack.id] : [],
    "/collections/[id]": stack ? ["/collections/" + stack.id] : [],
  };
  for (const pattern of pages("src/app"))
    for (const path of pattern.includes("[")
      ? dynamic[pattern] || []
      : [pattern]) {
      const expected =
        path === "/@acceptance-creator/not-published" ||
        path.startsWith("/collections/") ||
        path.startsWith("/account/stacks/")
          ? 404
          : path.startsWith("/categories/") ||
              path.startsWith("/subcategories/") ||
              path.startsWith("/use-cases/") ||
              [
                "/knowledge",
                "/explore",
                "/collections",
                "/confirm-email",
                "/forgot-password",
                "/reset-password",
              ].includes(path)
            ? 307
            : 200;
      await check(
        admin.url,
        path,
        "synthetic-admin-creator-vendor",
        adminCookie,
        expected,
      );
    }
  for (const path of [
    "/account",
    "/account/profile",
    "/account/activity",
    "/account/billing",
    "/account/submissions",
    "/creators/apply",
    "/vendor",
    "/submit/tool",
    "/featured/manage",
  ])
    await check(user.url, path, "ordinary-user", userCookie);
  for (const path of [
    "/admin",
    "/admin/tools",
    "/admin/content/skills",
    "/creator/content/skills",
    "/vendor/tools/" + tool.id,
  ])
    await check(user.url, path, "ordinary-user-denial", userCookie, 307);
  for (const path of ["/admin", "/account", "/creator", "/vendor"])
    await check(admin.url, path, "anonymous-denial", "", 307);
  await check(admin.url, "/skills?q=not-a-match", "public-empty-filter");
  await check(
    admin.url,
    "/skills?category=" + taxonomy.categories[0].id,
    "public-context-filter",
  );
  await check(
    admin.url,
    "/compare?tools=acceptance-tool-1,acceptance-tool-2&category=" +
      taxonomy.categories[0].id,
    "public-comparison",
  );
  await check(admin.url, "/tools/not-published", "public-unavailable", "", 404);
  await check(
    admin.url,
    "/creators?category=" + taxonomy.categories[0].id,
    "creator-context-filter",
  );
  await check(
    admin.url,
    "/creators?industry=" + taxonomy.industries[0].id,
    "creator-empty-context-filter",
  );
  await check(
    admin.url,
    "/subcategories/knowledge-base-assistants",
    "ambiguous-historical-subcategory",
    "",
    404,
  );
  const duplicateParent = taxonomy.categories.find((c) =>
    c.subcategories.some((s) => s.slug === "knowledge-base-assistants"),
  )!;
  await check(
    admin.url,
    "/subcategories/knowledge-base-assistants?category=" + duplicateParent.id,
    "explicit-parent-subcategory",
    "",
    307,
  );
  if (stack)
    await check(
      user.url,
      "/account/stacks/" + stack.id,
      "ordinary-user-owned-stack",
      userCookie,
    );
  if (resource)
    await check(
      admin.url,
      "/@acceptance-creator/" + resource.slug,
      "public-published-resource",
    );
  for (const [path, destination] of [
    ["/outbound/tools/" + tool.slug, "https://example.invalid/tool"],
    ["/outbound/events/" + event.slug, "https://example.invalid/register"],
    ...(resource
      ? [
          [
            "/outbound/resources/" + resource.slug,
            "https://example.invalid/resource",
          ],
        ]
      : []),
  ]) {
    for (const [origin, expected] of [
      [admin.url, 303],
      ["https://evil.invalid", 403],
    ] as const) {
      const response = await fetch(admin.url + path, {
        method: "POST",
        headers: { origin },
        redirect: "manual",
      });
      const passed =
        response.status === expected &&
        (expected !== 303 || response.headers.get("location") === destination);
      results.push({
        route: path,
        role: expected === 303 ? "same-origin-outbound" : "cross-origin-denial",
        status: response.status,
        outcome: passed ? "PASS" : "FAIL",
        headings: [],
      });
      if (!passed) errors.push("Outbound boundary failed: " + path);
    }
  }
  const report = {
    date: new Date().toISOString(),
    target: "new disposable loopback PostgreSQL 17 fixture",
    hostedAccess: false,
    results,
    errors,
    summary: {
      checks: results.length,
      pass: results.filter((r) => r.outcome === "PASS").length,
      fail: errors.length,
    },
  };
  writeFileSync(
    "docs/evidence/mvp-product-http-acceptance.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify({ summary: report.summary, errors }));
  if (errors.length) process.exitCode = 1;
}
main()
  .catch((error) => {
    writeFileSync(join(root, "http-error.log"), String(error?.stack || error));
    console.error(
      "HTTP acceptance failed; no credentials or response bodies displayed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await pg.end({ timeout: 5 });
  });
