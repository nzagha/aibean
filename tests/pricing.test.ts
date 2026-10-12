import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { setupDiscoveryFixtures } from "./fixtures/discovery-workflow-contract";
import {
  setupPricingFixtures,
  pricingWorkflowContract,
} from "./fixtures/pricing-contract";
import {
  PROPOSED_PRICING,
  pricingConfigSchema,
  feeQuote,
} from "../src/lib/pricing/config";
test("pricing proposals, payment snapshots, quotas, invoice-backed benefits, lifecycle, refunds and capability separation", async () => {
  const pg = new PGlite(),
    keys = [
      "AIBEAN_PRICING_WORKFLOWS",
      "AIBEAN_PRICING_APPROVED_SHA256",
      "AIBEAN_CONTENT_WORKFLOWS",
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
    ]) {
      const m = JSON.parse(await readFile(path, "utf8")),
        bytes = await readFile(m.sqlPath);
      assert.equal(
        createHash("sha256").update(bytes).digest("hex"),
        m.sqlSha256,
      );
      await pg.query("SELECT set_config($1,$2,false)", [
        "aibean." + setting + "_install_sha256",
        m.sqlSha256,
      ]);
      await pg.exec(bytes.toString());
    }
    await setupDiscoveryFixtures(drizzle(pg));
    await setupPricingFixtures(drizzle(pg));
    await pg.exec("SET ROLE aibean_runtime");
    process.env.AIBEAN_PRICING_WORKFLOWS = "true";
    process.env.AIBEAN_CONTENT_WORKFLOWS = "1";
    delete process.env.AIBEAN_PRICING_APPROVED_SHA256;
    await pricingWorkflowContract(drizzle(pg));
    for (const role of ["anon", "authenticated", "service_role"]) {
      await pg.exec("RESET ROLE;SET ROLE " + role);
      for (const table of [
        "pricing_releases",
        "pricing_quotes",
        "membership_bindings",
        "membership_changes",
        "pricing_refunds",
      ])
        await assert.rejects(pg.query("SELECT * FROM public." + table));
    }
  } finally {
    keys.forEach((k, i) => {
      if (before[i] === undefined) delete process.env[k];
      else process.env[k] = before[i];
    });
    await pg.close();
  }
});
test("five proposed tiers preserve approved free/placement rules, integer discounts and non-stacking benefits", () => {
  assert.equal(PROPOSED_PRICING.plans.length, 5);
  assert.equal(
    feeQuote(PROPOSED_PRICING, "edit", ["creator_pro", "vendor_pro"]).amount,
    950,
  );
  assert.equal(
    feeQuote(PROPOSED_PRICING, "featured", ["creator_pro", "vendor_pro"])
      .amount,
    9900,
  );
  assert.equal(
    feeQuote(PROPOSED_PRICING, "claim", ["vendor_pro"]).amount,
    4900,
  );
  assert.equal(
    pricingConfigSchema.safeParse({ ...PROPOSED_PRICING, placementDays: 7 })
      .success,
    false,
  );
  const changed = structuredClone(PROPOSED_PRICING);
  changed.plans[0].monthly = 1;
  assert.equal(pricingConfigSchema.safeParse(changed).success, false);
});
