import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { accountWorkflowContract } from "./fixtures/account-workflow-contract";
import { accountCommand } from "../src/lib/db/account-workflows";
import { workspaceFilters } from "../src/lib/workspace-filters";

test("account mutations and vendor reads enforce two-user isolation with the installed restricted runtime grants", async () => {
  const database = new PGlite();
  try {
    await database.exec(
      "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY)",
    );
    await database.exec(
      await readFile("db/install/reviewed-installation.sql", "utf8"),
    );
    await database.exec("SET ROLE aibean_runtime");
    await accountWorkflowContract(drizzle(database));
  } finally {
    await database.close();
  }
});

test("workspace filters bound pagination and account edits cannot smuggle approval or ownership", () => {
  for (const page of ["-1", "Infinity", "1.5", "not-a-page"])
    assert.equal(workspaceFilters({ page }).page, 1);
  assert.equal(workspaceFilters({ page: "999999" }).page, 10000);
  assert.equal(
    workspaceFilters({ status: "injected", q: "x".repeat(300) }).q.length,
    100,
  );
  assert.equal(workspaceFilters({ status: "injected" }).status, undefined);
  assert.deepEqual(
    accountCommand.parse({
      operation: "rename-stack",
      stackId: "stack-a",
      name: " New name ",
      userId: "other",
      isAdmin: true,
    }),
    { operation: "rename-stack", stackId: "stack-a", name: "New name" },
  );
  assert.equal(
    accountCommand.safeParse({ operation: "delete-stack", stackId: "stack-a" })
      .success,
    false,
  );
});
