// Only newly generated disposable fixture URLs; no dotenv/provider or hosted access.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
const run = process.argv[2];
assert(/^[a-f0-9]{32}$/.test(run || ""));
const root = resolve("test-results", "product-acceptance-" + run),
  fixture = JSON.parse(
    readFileSync(join(root, "browser-fixture.json"), "utf8"),
  );
assert.equal(fixture.run, run);
type App = { role: string; url: string; email: string };
const admin: App = fixture.environments.find((a: App) => a.role === "admin"),
  user: App = fixture.environments.find((a: App) => a.role === "user");
for (const a of [admin, user]) {
  const u = new URL(a.url);
  assert.equal(u.hostname, "127.0.0.1");
  assert.equal(u.protocol, "http:");
  assert(Number(u.port) > 1024);
}
const results: { check: string; pass: boolean }[] = [];
async function page(a: App, path: string, cookie: string, status: number) {
  const r = await fetch(a.url + path, {
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
async function login(a: App) {
  const r = await fetch(a.url + "/api/auth/login", {
    method: "POST",
    headers: {
      origin: a.url,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      email: a.email,
      password: fixture.loginPassword,
      returnTo: "/account",
    }),
    redirect: "manual",
  });
  assert.equal(r.status, 303);
  const c = r.headers.get("set-cookie")?.split(";")[0];
  assert(c);
  return c;
}
async function check(name: string, work: () => Promise<void>) {
  try {
    await work();
  } catch (error) {
    console.error(
      "Failed check: " +
        name +
        " · " +
        (error instanceof Error
          ? error.message.split("\n").slice(0, 4).join(" ")
          : "assertion"),
    );
    throw error;
  }
  results.push({ check: name, pass: true });
}
async function main() {
  const ac = await login(admin),
    uc = await login(user);
  for (const path of ["/admin/affiliates", "/creator/profile/preview"])
    await check("Guest denial " + path, async () => {
      await page(user, path, "", 307);
    });
  for (const path of ["/admin/affiliates", "/creator/profile/preview"])
    await check("Ordinary User denial " + path, async () => {
      await page(user, path, uc, 307);
    });
  await check(
    "Admin affiliate configuration and no verified revenue fabrication",
    async () => {
      const b = await page(admin, "/admin/affiliates", ac, 200);
      assert(b.includes("Affiliate program administration"));
      assert(b.includes("Proposed / Preview"));
      assert(b.includes("None recorded"));
    },
  );
  await check(
    "Creator profile presentation fields and gated uploads",
    async () => {
      const b = await page(admin, "/account/profile", ac, 200);
      assert(b.includes("Biography sections"));
      assert(b.includes("Social links"));
      assert(b.includes("Approved image"));
    },
  );
  await check("Owned Creator profile preview", async () => {
    assert(
      (await page(admin, "/creator/profile/preview", ac, 200)).includes(
        "Private profile preview",
      ),
    );
  });
  const list = await page(admin, "/creator/content/resources", ac, 200);
  const matches = [
    ...list.matchAll(/href="\/creator\/content\/resources\/([^"?]+)"/g),
  ]
    .map((m) => m[1])
    .filter((x) => x !== "new");
  assert(matches.length);
  const id = matches[0];
  await check("Working ordered campaign builder", async () => {
    const b = await page(admin, "/creator/content/resources/" + id, ac, 200);
    assert(b.includes("Save ordered campaign draft"));
    assert(b.includes("Campaign Tool"));
    assert(b.includes("Move up"));
  });
  await check("Private owned campaign preview", async () => {
    const b = await page(
      admin,
      "/creator/campaigns/" + id + "/preview",
      ac,
      200,
    );
    assert(b.includes("Campaign Tool"));
    assert(!b.includes("Visit Tool website"));
  });
  await check("Admin editorial campaign preview", async () => {
    assert(
      (
        await page(admin, "/admin/campaigns/" + id + "/preview", ac, 200)
      ).includes("Campaign Skill"),
    );
  });
  await check("Ordinary User cannot inspect private campaign", async () => {
    await page(user, "/creator/campaigns/" + id + "/preview", uc, 307);
  });
  await check("Public approved campaign canonical references", async () => {
    const b = await page(
      user,
      "/@acceptance-creator/acceptance-resource",
      "",
      200,
    );
    assert(b.includes("Campaign Tool"));
    assert(b.includes("Campaign Skill"));
    assert(b.includes('name="campaign"'));
    assert(!b.includes("affiliateDisclosure"));
  });
  await check("Public Creator profile remains available", async () => {
    await page(user, "/@acceptance-creator", "", 200);
  });
  await check("Fact-backed fit inspection is additive", async () => {
    const b = await page(
      user,
      "/compare?tools=acceptance-tool-1,acceptance-tool-2",
      "",
      200,
    );
    assert(b.includes("Inspect fact-backed fit evidence"));
    assert(b.includes("Ease of use"));
  });
  await check(
    "Creator and Vendor reports distinguish unverified commissions",
    async () => {
      for (const p of [
        "/creator/analytics",
        "/vendor/tools/" + fixture.toolIds[0] + "/analytics",
      ])
        assert(
          (await page(admin, p, ac, 200)).includes(
            "Provider-verified commissions",
          ),
        );
    },
  );
  await check(
    "Unrelated campaign stops outbound without redirect",
    async () => {
      const r = await fetch(admin.url + "/outbound/tools/acceptance-tool-2", {
        method: "POST",
        headers: {
          origin: admin.url,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ campaign: id }),
        redirect: "manual",
      });
      assert.equal(r.status, 404);
      assert.equal(r.headers.get("location"), null);
    },
  );
  await check("Missing private media is unavailable", async () => {
    const r = await fetch(admin.url + "/creator-media/missing", {
      redirect: "manual",
    });
    assert.equal(r.status, 404);
  });
  writeFileSync(
    "docs/evidence/affiliate-creator-v1-http.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        environment: "New loopback fixture; synthetic identities only",
        hostedAccess: false,
        providerCalls: false,
        total: results.length,
        results,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify({ checks: results.length, pass: true }));
}
void main().catch(() => {
  console.error(
    "Affiliate/Creator HTTP verification failed; inspect the new synthetic fixture privately.",
  );
  process.exitCode = 1;
});
