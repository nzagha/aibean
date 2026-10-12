import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { setupDiscoveryFixtures } from "./fixtures/discovery-workflow-contract";
import {
  setupAffiliateFixtures,
  affiliateCreatorContract,
} from "./fixtures/affiliate-creator-contract";
import {
  publicHttps,
  destinationInput,
  presentationInput,
  campaignInput,
} from "../src/lib/creator-enhancements/contracts";
test("affiliate/Creator package: canonical references, owner privacy, reviewed previews, disclosures and provider receipt separation", async () => {
  const pg = new PGlite(),
    keys = [
      "AIBEAN_PRICING_WORKFLOWS",
      "AIBEAN_DISCOVERY_WORKFLOWS",
      "AIBEAN_CONTENT_WORKFLOWS",
      "AIBEAN_AFFILIATE_CREATOR_WORKFLOWS",
      "AIBEAN_AFFILIATE_APPROVED_PROGRAMS",
      "AIBEAN_AFFILIATE_PROVIDER_VERIFIED",
      "AIBEAN_AFFILIATE_RECEIPT_KEYS",
    ],
    before = keys.map((k) => process.env[k]);
  try {
    await pg.exec(
      "CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY)",
    );
    await pg.exec(
      await readFile("db/install/reviewed-installation.sql", "utf8"),
    );
    for (const [setting, path] of [
      ["review", "db/proposals/admin-review-v1.manifest.json"],
      ["operations", "db/proposals/admin-operations-v2/manifest.json"],
      ["content", "db/proposals/creator-content-v1/manifest.json"],
      ["files", "db/proposals/creator-files-v1/manifest.json"],
      ["discovery", "db/proposals/discovery-v1/manifest.json"],
      ["pricing", "db/proposals/pricing-v1/manifest.json"],
      ["affiliate_creator", "db/proposals/affiliate-creator-v1/manifest.json"],
    ]) {
      const m = JSON.parse(await readFile(path, "utf8")),
        b = await readFile(m.sqlPath);
      assert.equal(createHash("sha256").update(b).digest("hex"), m.sqlSha256);
      await pg.query("SELECT set_config($1,$2,false)", [
        "aibean." + setting + "_install_sha256",
        m.sqlSha256,
      ]);
      await pg.exec(b.toString());
    }
    await setupDiscoveryFixtures(drizzle(pg));
    await setupAffiliateFixtures(drizzle(pg));
    await pg.exec("SET ROLE aibean_runtime");
    for (const k of keys.slice(0, 4))
      process.env[k] = k === "AIBEAN_CONTENT_WORKFLOWS" ? "1" : "true";
    delete process.env.AIBEAN_AFFILIATE_APPROVED_PROGRAMS;
    delete process.env.AIBEAN_AFFILIATE_PROVIDER_VERIFIED;
    await affiliateCreatorContract(drizzle(pg));
    const m = JSON.parse(
      await readFile("db/proposals/affiliate-creator-v1/manifest.json", "utf8"),
    );
    for (const r of ["anon", "authenticated", "service_role"]) {
      await pg.exec("RESET ROLE;SET ROLE " + r);
      for (const table of m.tables)
        await assert.rejects(pg.query("SELECT * FROM public." + table));
    }
  } finally {
    keys.forEach((k, i) =>
      before[i] === undefined
        ? delete process.env[k]
        : (process.env[k] = before[i]),
    );
    await pg.close();
  }
});
test("affiliate HTTPS, parameter and structured media contracts reject redirects, credentials, local IPs and unapproved social hosts", () => {
  for (const s of [
    "https://127.0.0.1/",
    "https://[::1]/",
    "https://localhost/",
    "https://metadata.internal/",
    "https://a:b@example.com/",
    "javascript:alert(1)",
    "https://example.com/?x=%0a",
    "http://example.com/",
    "https://example.com:8443/",
  ])
    assert.equal(publicHttps.safeParse(s).success, false, s);
  assert.equal(publicHttps.safeParse("https://example.com/tool").success, true);
  assert.equal(
    destinationInput.safeParse({
      programId: "p",
      label: "Safe link",
      url: "https://example.com/tool",
      parameters: { redirect: "https://evil.com" },
      disclosure: "Disclosed relationship here",
      enabled: false,
    }).success,
    false,
  );
  const p = {
    headline: "",
    biography: [],
    socials: [{ network: "github", url: "https://evil.com/" }],
    avatarFileId: null,
    avatarAlt: "",
    coverFileId: null,
    coverAlt: "",
  };
  assert.equal(presentationInput.safeParse(p).success, false);
  assert.equal(
    campaignInput.safeParse([
      { kind: "text", targetId: "private", title: "Unsafe", description: "" },
    ]).success,
    false,
  );
});
