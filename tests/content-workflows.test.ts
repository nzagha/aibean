import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import review from "../db/proposals/admin-review-v1.manifest.json";
import commerce from "../db/proposals/admin-operations-v2/manifest.json";
import content from "../db/proposals/creator-content-v1/manifest.json";
import { setupAdminFixtures } from "./fixtures/admin-workflow-contract";
import { contentWorkflowContract } from "./fixtures/content-workflow-contract";
import { inspectContentStorage } from "../src/lib/content/storage";
test("Distinct Skills/Playbooks, moderated profiles/resources/Events and User engagement enforce capability, ownership, privacy and rollback", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(
      "CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY)",
    );
    await pg.exec(
      await readFile("db/install/reviewed-installation.sql", "utf8"),
    );
    const db = drizzle(pg);
    await setupAdminFixtures(db);
    await pg.exec(
      "INSERT INTO public.users(id,is_creator) VALUES('content-other',true)",
    );
    for (const [manifest, setting] of [
      [review, "aibean.review_install_sha256"],
      [commerce, "aibean.operations_install_sha256"],
      [content, "aibean.content_install_sha256"],
    ] as const) {
      const bytes = await readFile(manifest.sqlPath);
      assert.equal(
        createHash("sha256").update(bytes).digest("hex"),
        manifest.sqlSha256,
      );
      await pg.query("SELECT set_config($1,$2,false)", [
        setting,
        manifest.sqlSha256,
      ]);
      if (manifest === content) {
        await pg.exec(
          "UPDATE drizzle.__drizzle_migrations SET hash=repeat('0',64) WHERE id=(SELECT min(id) FROM drizzle.__drizzle_migrations)",
        );
        await assert.rejects(pg.exec(bytes.toString("utf8")));
        await pg.exec("ROLLBACK");
        assert.equal(
          (
            await pg.query<{ name: string | null }>(
              "SELECT to_regclass('public.ai_skills')::text AS name",
            )
          ).rows[0].name,
          null,
        );
        await pg.exec(
          "UPDATE drizzle.__drizzle_migrations SET hash='b58134b31944656eda45a6ba929fcdb66a5ec4e66e01a8cfd3d8d9b16d4f4468' WHERE id=(SELECT min(id) FROM drizzle.__drizzle_migrations)",
        );
        await assert.rejects(
          pg.exec(
            bytes
              .toString("utf8")
              .replace(/\nCOMMIT;\s*$/, "\nSELECT 1/0;\nCOMMIT;\n"),
          ),
        );
        await pg.exec("ROLLBACK");
        assert.equal(
          (
            await pg.query<{ name: string | null }>(
              "SELECT to_regclass('aibean_private.content_installations')::text AS name",
            )
          ).rows[0].name,
          null,
        );
      }
      await pg.exec(bytes.toString("utf8"));
    }
    await pg.exec("SET ROLE aibean_runtime");
    assert.equal(await inspectContentStorage(db), true);
    await contentWorkflowContract(db);
    await pg.exec(
      "RESET ROLE;GRANT SELECT(bio) ON public.account_profiles TO anon;SET ROLE aibean_runtime",
    );
    assert.equal(await inspectContentStorage(db), false);
  } finally {
    await pg.close();
  }
});
