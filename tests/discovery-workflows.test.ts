import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import {
  setupDiscoveryFixtures,
  comparisonContract,
  followsContract,
  notificationContract,
  analyticsContract,
} from "./fixtures/discovery-workflow-contract";
import { comparisonInput } from "../src/lib/discovery/comparisons";
import { analyticsInput } from "../src/lib/discovery/analytics-contracts";
import discovery from "../db/proposals/discovery-v1/manifest.json";
test("account comparisons, six-target follows, publication fanout and behavioral reporting preserve isolation and rollback", async () => {
  const pg = new PGlite();
  const previous = process.env.AIBEAN_DISCOVERY_WORKFLOWS,
    content = process.env.AIBEAN_CONTENT_WORKFLOWS;
  try {
    await pg.exec(
      "CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY)",
    );
    await pg.exec(
      await readFile("db/install/reviewed-installation.sql", "utf8"),
    );
    for (const [setting, path, manifest] of [
      [
        "review",
        "db/proposals/admin-review-v1.sql",
        "db/proposals/admin-review-v1.manifest.json",
      ],
      [
        "operations",
        "db/proposals/admin-operations-v2/0000_admin_operations.sql",
        "db/proposals/admin-operations-v2/manifest.json",
      ],
      [
        "content",
        "db/proposals/creator-content-v1/reviewed-installation.sql",
        "db/proposals/creator-content-v1/manifest.json",
      ],
      [
        "files",
        "db/proposals/creator-files-v1/reviewed-installation.sql",
        "db/proposals/creator-files-v1/manifest.json",
      ],
      [
        "discovery",
        discovery.sqlPath,
        "db/proposals/discovery-v1/manifest.json",
      ],
    ]) {
      const m = JSON.parse(await readFile(manifest, "utf8")),
        bytes = await readFile(path);
      assert.equal(
        createHash("sha256").update(bytes).digest("hex"),
        m.sqlSha256,
      );
      await pg.query("SELECT set_config($1,$2,false)", [
        "aibean." + setting + "_install_sha256",
        m.sqlSha256,
      ]);
      await pg.exec(bytes.toString("utf8"));
    }
    process.env.AIBEAN_DISCOVERY_WORKFLOWS = "true";
    process.env.AIBEAN_CONTENT_WORKFLOWS = "1";
    await setupDiscoveryFixtures(drizzle(pg));
    await pg.exec("SET ROLE aibean_runtime");
    const db = drizzle(pg);
    await comparisonContract(db);
    await followsContract(db);
    await notificationContract(db);
    await analyticsContract(db);
    for (const role of ["anon", "authenticated", "service_role"]) {
      await pg.exec("RESET ROLE; SET ROLE " + role);
      for (const table of discovery.tables)
        await assert.rejects(pg.query("SELECT * FROM public." + table));
    }
  } finally {
    if (previous === undefined) delete process.env.AIBEAN_DISCOVERY_WORKFLOWS;
    else process.env.AIBEAN_DISCOVERY_WORKFLOWS = previous;
    if (content === undefined) delete process.env.AIBEAN_CONTENT_WORKFLOWS;
    else process.env.AIBEAN_CONTENT_WORKFLOWS = content;
    await pg.close();
  }
});
test("comparison and analytics input contracts reject ambiguous, excessive and personal data", () => {
  const base = {
    operation: "save",
    name: "Comparison",
    toolIds: ["a", "b"],
    context: {},
  };
  for (const extra of [
    { toolIds: ["a"] },
    { toolIds: ["a", "a"] },
    { toolIds: ["a", "b", "c", "d", "e"] },
    { context: { industry: "invented" } },
    { revision: 0 },
  ])
    assert.equal(
      comparisonInput.safeParse({ ...base, ...extra }).success,
      false,
    );
  assert.equal(
    analyticsInput.safeParse({
      event: "tool_view",
      kind: "tools",
      targetId: "a",
      email: "personal",
    }).success,
    false,
  );
  assert.equal(
    analyticsInput.safeParse({
      event: "search",
      kind: "discovery",
      targetId: "tools",
      filters: { q: "raw personal text" },
    }).success,
    false,
  );
});
