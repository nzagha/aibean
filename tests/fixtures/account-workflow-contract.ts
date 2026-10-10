import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import type {
  IdentityDatabase,
  IdentityTransaction,
} from "../../src/lib/supabase/identity";
import { updateOwnedAccount } from "../../src/lib/db/account-workflows";
import { readVendorTools } from "../../src/lib/db/vendor-workspace";

// Shared by PGlite and native PostgreSQL tests; synthetic records only.
export async function accountWorkflowContract(
  database: IdentityDatabase & IdentityTransaction,
) {
  const resultRows = async (query: ReturnType<typeof sql>) => {
    const result = await database.execute(query);
    return (
      Array.isArray(result)
        ? result
        : (result as { rows: Record<string, unknown>[] }).rows
    ) as Record<string, unknown>[];
  };
  await database.execute(
    sql`INSERT INTO public.users(id) VALUES ('panel-user-a'),('panel-user-b')`,
  );
  await database.execute(
    sql`INSERT INTO public.taxonomy(id,kind,name,slug,data) VALUES ('PANEL-CAT','category','Panel test','panel-test','{}')`,
  );
  await database.execute(sql`INSERT INTO public.tools(id,slug,name,category_id,status,data) VALUES
    ('panel-tool-a','panel-a','Synthetic published','PANEL-CAT','published','{}'),
    ('panel-tool-b','panel-b','Synthetic archived','PANEL-CAT','archived','{}')`);
  await database.execute(
    sql`INSERT INTO public.saved_tools(user_id,tool_id) VALUES ('panel-user-a','panel-tool-b'),('panel-user-b','panel-tool-b')`,
  );
  await updateOwnedAccount(database, "panel-user-a", {
    operation: "remove-save",
    toolId: "panel-tool-b",
    userId: "panel-user-b",
  });
  assert.deepEqual(
    (
      await resultRows(
        sql`SELECT user_id FROM public.saved_tools WHERE tool_id='panel-tool-b'`,
      )
    ).map((r) => r.user_id),
    ["panel-user-b"],
  );
  await database.execute(
    sql`INSERT INTO public.stacks(id,user_id,name) VALUES ('panel-stack-a','panel-user-a','Original A'),('panel-stack-b','panel-user-b','Original B')`,
  );
  await database.execute(
    sql`INSERT INTO public.stack_tools(stack_id,tool_id) VALUES ('panel-stack-a','panel-tool-a'),('panel-stack-b','panel-tool-a')`,
  );
  for (const command of [
    { operation: "rename-stack", stackId: "panel-stack-b", name: "Forged" },
    { operation: "delete-stack", stackId: "panel-stack-b", confirmed: "yes" },
    {
      operation: "remove-stack-tool",
      stackId: "panel-stack-b",
      toolId: "panel-tool-a",
    },
  ])
    await assert.rejects(updateOwnedAccount(database, "panel-user-a", command));
  await updateOwnedAccount(database, "panel-user-a", {
    operation: "rename-stack",
    stackId: "panel-stack-a",
    name: "Renamed",
  });
  assert.equal(
    (
      await resultRows(
        sql`SELECT name FROM public.stacks WHERE id='panel-stack-a'`,
      )
    )[0].name,
    "Renamed",
  );
  await assert.rejects(
    updateOwnedAccount(database, "panel-user-a", {
      operation: "delete-stack",
      stackId: "panel-stack-a",
    }),
  );
  await updateOwnedAccount(database, "panel-user-a", {
    operation: "remove-stack-tool",
    stackId: "panel-stack-a",
    toolId: "panel-tool-a",
  });
  assert.equal(
    (
      await resultRows(
        sql`SELECT * FROM public.stack_tools WHERE stack_id='panel-stack-a'`,
      )
    ).length,
    0,
  );
  await database.execute(sql`INSERT INTO public.tool_reviews(id,user_id,tool_id,rating,body,status) VALUES
    ('panel-review-a','panel-user-a','panel-tool-a',4,'Synthetic review before changes','approved'),
    ('panel-review-b','panel-user-b','panel-tool-a',4,'Another synthetic review for isolation','approved')`);
  const edit = {
    operation: "edit-review",
    reviewId: "panel-review-a",
    rating: 5,
    body: "Synthetic updated review waiting for moderation",
  };
  await assert.rejects(updateOwnedAccount(database, "panel-user-b", edit));
  await updateOwnedAccount(database, "panel-user-a", {
    ...edit,
    status: "approved",
  });
  assert.equal(
    (
      await resultRows(
        sql`SELECT status FROM public.tool_reviews WHERE id='panel-review-a'`,
      )
    )[0].status,
    "pending",
  );
  await database.execute(
    sql`INSERT INTO public.vendor_access(tool_id,user_id) VALUES ('panel-tool-a','panel-user-a'),('panel-tool-b','panel-user-b')`,
  );
  await assert.rejects(updateOwnedAccount(database, "panel-user-a", edit));
  const owned = await readVendorTools(database, "panel-user-b");
  assert.equal(owned.length, 1);
  assert.equal(owned[0].id, "panel-tool-b");
  assert.equal(owned[0].status, "archived");
  assert.equal((await readVendorTools(database, "panel-user-a"))[0].reviews, 1);
  await updateOwnedAccount(database, "panel-user-a", {
    operation: "delete-stack",
    stackId: "panel-stack-a",
    confirmed: "yes",
  });
  assert.equal(
    (
      await resultRows(
        sql`SELECT * FROM public.stacks WHERE id='panel-stack-a'`,
      )
    ).length,
    0,
  );
  assert.equal(
    (
      await resultRows(
        sql`SELECT * FROM public.stack_tools WHERE stack_id='panel-stack-b'`,
      )
    ).length,
    1,
  );
  assert.equal(
    (
      await resultRows(
        sql`SELECT name FROM public.stacks WHERE id='panel-stack-b'`,
      )
    )[0].name,
    "Original B",
  );
}
