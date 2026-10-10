import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import manifest from "../db/proposals/admin-review-v1.manifest.json";
import {
  setupAdminFixtures,
  adminWorkflowContract,
  adminReviewWorkflowContract,
  adminContractValidation,
} from "./fixtures/admin-workflow-contract";
import { inspectReviewStorage } from "../src/lib/admin/review-storage";
import { readAdminQueue } from "../src/lib/admin/queries";
const reviewedSql = async () => {
  const text = await readFile(manifest.sqlPath, "utf8");
  assert.equal(
    createHash("sha256").update(text).digest("hex"),
    manifest.sqlSha256,
  );
  return text;
};
test(
  "Admin validation rejects credential URLs, wrong taxonomy and unsupported verification",
  adminContractValidation,
);
test("Admin Tool lifecycle, atomic audit, moderation, ownership and pagination under restricted grants", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(
      "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY)",
    );
    await pg.exec(
      await readFile("db/install/reviewed-installation.sql", "utf8"),
    );
    const operator = drizzle(pg);
    await setupAdminFixtures(operator);
    await pg.exec("SET ROLE aibean_runtime");
    assert.equal(await inspectReviewStorage(operator), false);
    assert.equal(
      (await readAdminQueue(operator, "admin-fixture", "creators", {})).ready,
      false,
    );
    const id = await adminWorkflowContract(operator);
    await pg.exec("RESET ROLE");
    await pg.query(
      "SELECT set_config('aibean.review_install_sha256',$1,false)",
      [manifest.sqlSha256],
    );
    await pg.exec(await reviewedSql());
    await pg.exec("SET ROLE aibean_runtime");
    await adminReviewWorkflowContract(operator, id);
    await pg.exec("RESET ROLE");
    for (const role of ["anon", "authenticated", "service_role"])
      for (const table of manifest.tables) {
        const r = await pg.query<{ allowed: boolean }>(
          `SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE') AS allowed`,
          [role, "public." + table],
        );
        assert.equal(r.rows[0].allowed, false);
      }
    await pg.exec("GRANT SELECT ON public.creator_applications TO anon");
    await pg.exec("SET ROLE aibean_runtime");
    assert.equal(await inspectReviewStorage(operator), false);
    await pg.exec(
      "RESET ROLE; REVOKE SELECT ON public.creator_applications FROM anon; GRANT SELECT(name) ON public.creator_applications TO anon; SET ROLE aibean_runtime",
    );
    assert.equal(await inspectReviewStorage(operator), false);
    await assert.rejects(
      operator.execute(
        sql`UPDATE public.users SET is_admin=true WHERE id='admin-ordinary'`,
      ),
    );
  } finally {
    await pg.close();
  }
});

test("Review proposal stops on changed migration history and existing objects without partial installation", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(
      "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY)",
    );
    await pg.exec(
      await readFile("db/install/reviewed-installation.sql", "utf8"),
    );
    await pg.query(
      "SELECT set_config('aibean.review_install_sha256',$1,false)",
      [manifest.sqlSha256],
    );
    const prior = await pg.query<{
      id: number;
      hash: string;
      created_at: number;
    }>(
      "SELECT id,hash,created_at FROM drizzle.__drizzle_migrations ORDER BY id",
    );
    await pg.exec(
      "UPDATE drizzle.__drizzle_migrations SET hash='changed' WHERE id=" +
        prior.rows[0].id,
    );
    await assert.rejects(
      pg.exec(await reviewedSql()),
      /Unexpected baseline migration history/,
    );
    await pg.exec("ROLLBACK");
    assert.equal(
      (
        await pg.query<{ present: boolean }>(
          "SELECT to_regclass('public.creator_applications') IS NOT NULL AS present",
        )
      ).rows[0].present,
      false,
    );
    await pg.query(
      "UPDATE drizzle.__drizzle_migrations SET hash=$1 WHERE id=$2",
      [prior.rows[0].hash, prior.rows[0].id],
    );
    await pg.exec(
      "UPDATE drizzle.__drizzle_migrations SET created_at=0 WHERE id=" +
        prior.rows[0].id,
    );
    await assert.rejects(
      pg.exec(await reviewedSql()),
      /Unexpected baseline migration history/,
    );
    await pg.exec("ROLLBACK");
    await pg.query(
      "UPDATE drizzle.__drizzle_migrations SET created_at=$1 WHERE id=$2",
      [prior.rows[0].created_at, prior.rows[0].id],
    );
    await pg.exec("CREATE TABLE public.claim_disputes(id text)");
    await assert.rejects(
      pg.exec(await reviewedSql()),
      /Unexpected existing review object/,
    );
    await pg.exec("ROLLBACK");
    assert.equal(
      (
        await pg.query<{ present: boolean }>(
          "SELECT to_regclass('public.creator_applications') IS NOT NULL AS present",
        )
      ).rows[0].present,
      false,
    );
  } finally {
    await pg.close();
  }
});
