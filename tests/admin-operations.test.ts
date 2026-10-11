import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import manifest from "../db/proposals/admin-operations-v2/manifest.json";
import review from "../db/proposals/admin-review-v1.manifest.json";
import { setupAdminFixtures } from "./fixtures/admin-workflow-contract";
import {
  catalogControlsContract,
  commerceContract,
} from "./fixtures/admin-operations-contract";
import { inspectCommerceStorage } from "../src/lib/admin/commerce-storage";
import { approvedDisplayLabels } from "../src/lib/catalog/taxonomy-display";
import { adminFixtureInput } from "./fixtures/admin-workflow-contract";
import { safeWebUrl } from "../src/lib/validation";
test("Taxonomy display overrides accept only approved stable relationships; optional URL validation never throws", () => {
  assert.deepEqual(
    approvedDisplayLabels([
      {
        id: adminFixtureInput.categoryId,
        kind: "category",
        parentId: null,
        name: "Approved label",
      },
      { id: "invented", kind: "category", parentId: null, name: "Invalid" },
      { id: "UC-035", kind: "use_case", parentId: null, name: "Excluded" },
    ]),
    { [adminFixtureInput.categoryId]: "Approved label" },
  );
  assert.deepEqual(
    approvedDisplayLabels([
      {
        id: adminFixtureInput.categoryId,
        kind: "category",
        parentId: "wrong",
        name: "Mismatch",
      },
    ]),
    {},
  );
  assert.equal(safeWebUrl.safeParse("").success, false);
  assert.equal(safeWebUrl.safeParse("javascript:alert(1)").success, false);
});
test("Commercial proposal aborts changed prerequisite history and rolls back without new objects", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(
      "CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY)",
    );
    await pg.exec(
      await readFile("db/install/reviewed-installation.sql", "utf8"),
    );
    await pg.query(
      "SELECT set_config('aibean.review_install_sha256',$1,false)",
      [review.sqlSha256],
    );
    await pg.exec(await readFile(review.sqlPath, "utf8"));
    await pg.query(
      "SELECT set_config('aibean.operations_install_sha256',$1,false)",
      [manifest.sqlSha256],
    );
    await pg.exec(
      "UPDATE aibean_private.admin_review_installations SET sql_sha256=repeat('0',64)",
    );
    await assert.rejects(
      pg.exec(await readFile(manifest.sqlPath, "utf8")),
      /Review history differs/,
    );
    await pg.exec("ROLLBACK");
    assert.equal(
      (
        await pg.query<{ exists: boolean }>(
          "SELECT to_regclass('public.billing_products') IS NOT NULL AS exists",
        )
      ).rows[0].exists,
      false,
    );
  } finally {
    await pg.close();
  }
});
test("Safe taxonomy, organic ranking and Last Verified integrity under restricted runtime", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(
      "CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY)",
    );
    await pg.exec(
      await readFile("db/install/reviewed-installation.sql", "utf8"),
    );
    const database = drizzle(pg);
    await setupAdminFixtures(database);
    await pg.exec("SET ROLE aibean_runtime");
    await catalogControlsContract(database);
  } finally {
    await pg.close();
  }
});
test("Forward commercial migration and sandbox submission/edit/verification/subscription isolation, idempotency and rollback", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(
      "CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY)",
    );
    await pg.exec(
      await readFile("db/install/reviewed-installation.sql", "utf8"),
    );
    const database = drizzle(pg);
    await setupAdminFixtures(database);
    await pg.query(
      "SELECT set_config('aibean.review_install_sha256',$1,false)",
      [review.sqlSha256],
    );
    await pg.exec(await readFile(review.sqlPath, "utf8"));
    const text = await readFile(manifest.sqlPath, "utf8");
    assert.equal(
      createHash("sha256").update(text).digest("hex"),
      manifest.sqlSha256,
    );
    await pg.query(
      "SELECT set_config('aibean.operations_install_sha256',$1,false)",
      [manifest.sqlSha256],
    );
    await pg.exec(text);
    await pg.exec("SET ROLE aibean_runtime");
    await commerceContract(database);
    await pg.exec(
      "RESET ROLE;GRANT SELECT(name) ON public.billing_products TO authenticated;SET ROLE aibean_runtime",
    );
    assert.equal(await inspectCommerceStorage(database), false);
  } finally {
    await pg.close();
  }
});
