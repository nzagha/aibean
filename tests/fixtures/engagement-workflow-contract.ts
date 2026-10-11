import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import type {
  IdentityDatabase,
  IdentityTransaction,
} from "../../src/lib/supabase/identity";
import { mutateEngagement } from "../../src/lib/db/engagement-workflows";
import { resultRows } from "../../src/lib/admin/tool-workflows";
export async function engagementWorkflowContract(
  db: IdentityDatabase & IdentityTransaction,
) {
  await db.execute(
    sql`INSERT INTO public.users(id) VALUES('engagement-a'),('engagement-b')`,
  );
  await db.execute(
    sql`INSERT INTO public.taxonomy(id,kind,name,slug,data) VALUES('ENG-CAT','category','Synthetic engagement','synthetic-engagement','{}')`,
  );
  await db.execute(
    sql`INSERT INTO public.tools(id,slug,name,category_id,status,data) VALUES('eng-tool','eng-tool','Synthetic engagement','ENG-CAT','published','{}')`,
  );
  const a = "engagement-a",
    b = "engagement-b";
  await assert.rejects(
    mutateEngagement(db, "missing", { operation: "save", toolId: "eng-tool" }),
  );
  await mutateEngagement(db, a, {
    operation: "save",
    toolId: "eng-tool",
    userId: b,
  });
  await mutateEngagement(db, a, { operation: "save", toolId: "eng-tool" });
  assert.equal(
    resultRows(
      await db.execute(
        sql`SELECT user_id FROM public.saved_tools WHERE tool_id='eng-tool'`,
      ),
    ).length,
    1,
  );
  await mutateEngagement(db, a, {
    operation: "create-stack",
    name: "Synthetic account Stack",
  });
  const [stack] = resultRows<{ id: string }>(
    await db.execute(sql`SELECT id FROM public.stacks WHERE user_id=${a}`),
  );
  await assert.rejects(
    mutateEngagement(db, b, {
      operation: "add-stack",
      stackId: stack.id,
      toolId: "eng-tool",
    }),
  );
  await mutateEngagement(db, a, {
    operation: "add-stack",
    stackId: stack.id,
    toolId: "eng-tool",
  });
  const review = {
    operation: "review",
    toolId: "eng-tool",
    rating: 4,
    body: "Synthetic user review with enough useful detail.",
  };
  await mutateEngagement(db, a, review);
  const [old] = resultRows<{ revision: string }>(
    await db.execute(
      sql`SELECT xmin::text AS revision FROM public.tool_reviews WHERE user_id=${a} AND tool_id='eng-tool'`,
    ),
  );
  await assert.rejects(mutateEngagement(db, a, review));
  await mutateEngagement(db, a, {
    ...review,
    revision: old.revision,
    rating: 5,
    status: "approved",
  });
  await assert.rejects(
    mutateEngagement(db, a, { ...review, revision: old.revision }),
  );
  assert.equal(
    resultRows<{ status: string }>(
      await db.execute(
        sql`SELECT status FROM public.tool_reviews WHERE user_id=${a}`,
      ),
    )[0].status,
    "pending",
  );
  await db.execute(
    sql`INSERT INTO public.vendor_access(tool_id,user_id) VALUES('eng-tool',${b})`,
  );
  await assert.rejects(mutateEngagement(db, b, review));
  assert.equal(
    resultRows(
      await db.execute(
        sql`SELECT id FROM public.tool_reviews WHERE user_id=${b}`,
      ),
    ).length,
    0,
  );
  await db.execute(
    sql`UPDATE public.tools SET status='archived' WHERE id='eng-tool'`,
  );
  await assert.rejects(
    mutateEngagement(db, b, { operation: "save", toolId: "eng-tool" }),
  );
  await mutateEngagement(db, a, {
    operation: "save",
    toolId: "eng-tool",
    remove: "true",
  });
  assert.equal(
    resultRows(
      await db.execute(
        sql`SELECT user_id FROM public.saved_tools WHERE tool_id='eng-tool'`,
      ),
    ).length,
    0,
  );
  assert.equal(
    resultRows(
      await db.execute(
        sql`SELECT id FROM public.audit_logs WHERE actor_id=${a} AND action='review.submitted'`,
      ),
    ).length,
    2,
  );
}
