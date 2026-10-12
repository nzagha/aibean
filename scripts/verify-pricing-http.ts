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
  for (const path of ["/pricing", "/account/membership"])
    await check("Guest denied " + path, async () => {
      await page(user, path, "", 307);
    });
  await check("User full five-tier preview with no checkout", async () => {
    const b = await page(user, "/pricing", uc, 200);
    for (const text of [
      "User Free",
      "Creator Free",
      "Creator Pro",
      "Vendor Free",
      "Vendor Pro",
      "$19.00/month or $190.00/year",
      "$39.00/month or $390.00/year",
      "Proposed / Preview",
    ])
      assert(b.includes(text));
    assert(!b.includes("Prepare sandbox membership checkout"));
  });
  await check("User actual membership and usage", async () => {
    const b = await page(user, "/account/membership", uc, 200);
    assert(b.includes("Personal Stacks"));
    assert(b.includes("No current verified paid membership benefits"));
  });
  await check("User billing shared membership", async () => {
    assert(
      (await page(user, "/account/billing", uc, 200)).includes(
        "Your membership",
      ),
    );
  });
  for (const path of ["/admin/commerce/pricing", "/creator"])
    await check("Ordinary User denied " + path, async () => {
      await page(user, path, uc, 307);
    });
  await check(
    "Ordinary User Vendor onboarding grants no ownership or Pro access",
    async () => {
      const body = await page(user, "/vendor", uc, 200);
      assert(body.includes("No approved claims yet."));
      assert(!body.includes("Vendor Free · Proposed"));
    },
  );
  await check("Admin auditable versioned plan controls", async () => {
    const b = await page(admin, "/admin/commerce/pricing", ac, 200);
    assert(b.includes("Versioned plans"));
    assert(b.includes("Create pricing proposal"));
    assert(b.includes("Refund review"));
  });
  await check("Creator shared subscription benefits", async () => {
    assert(
      (await page(admin, "/creator", ac, 200)).includes("Your membership"),
    );
  });
  await check("Vendor shared subscription benefits", async () => {
    assert((await page(admin, "/vendor", ac, 200)).includes("Your membership"));
  });
  await check("Admin membership remains account-scoped", async () => {
    assert(
      (await page(admin, "/account/membership", ac, 200)).includes(
        "Current discounts",
      ),
    );
  });
  writeFileSync(
    "docs/evidence/pricing-v1-http.json",
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
    "Pricing HTTP verification failed; inspect synthetic fixture privately.",
  );
  process.exitCode = 1;
});
