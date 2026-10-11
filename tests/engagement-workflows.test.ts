import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { engagementWorkflowContract } from "./fixtures/engagement-workflow-contract";
import { engagementInput } from "../src/lib/db/engagement-workflows";
test("saves, stacks and review resubmission enforce canonical ownership, revision and transactional audit", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(
      "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY)",
    );
    await pg.exec(
      await readFile("db/install/reviewed-installation.sql", "utf8"),
    );
    await pg.exec("SET ROLE aibean_runtime");
    await engagementWorkflowContract(drizzle(pg));
  } finally {
    await pg.close();
  }
});
test("engagement forms reject invalid input and cannot grant approval or impersonate another User", () => {
  assert.equal(
    engagementInput.safeParse({
      operation: "review",
      toolId: "x",
      rating: 6,
      body: "short",
    }).success,
    false,
  );
  assert.equal(
    engagementInput.safeParse({ operation: "create-stack", name: "x" }).success,
    false,
  );
  assert.deepEqual(
    engagementInput.parse({
      operation: "save",
      toolId: "x",
      userId: "other",
      isAdmin: true,
      status: "published",
    }),
    { operation: "save", toolId: "x", remove: "false" },
  );
});
