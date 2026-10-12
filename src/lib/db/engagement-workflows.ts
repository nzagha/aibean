import { recordAnalytics } from "../discovery/analytics";
import type { AnalyticsSession } from "../discovery/analytics-contracts";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { IdentityDatabase } from "../supabase/identity";
import { reviewInput } from "../validation";
import { audit, resultRows, lockedTool } from "../admin/tool-workflows";
import { AdminWorkflowError } from "../admin/contracts";
const id = z.string().min(1).max(100);
export const engagementInput = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("save"),
    toolId: id,
    remove: z.enum(["true", "false"]).default("false"),
  }),
  z.object({
    operation: z.literal("create-stack"),
    name: z.string().trim().min(2).max(80),
  }),
  z.object({ operation: z.literal("add-stack"), toolId: id, stackId: id }),
  reviewInput.extend({
    operation: z.literal("review"),
    revision: z.string().max(100).default(""),
  }),
]);
export async function mutateEngagement(
  database: IdentityDatabase,
  userId: string,
  value: unknown,
  session?: AnalyticsSession,
) {
  const input = engagementInput.parse(value);
  return database.transaction(async (tx) => {
    if (
      !userId ||
      !resultRows(
        await tx.execute(sql`SELECT id FROM public.users WHERE id=${userId}`),
      ).length
    )
      throw new AdminWorkflowError("Sign in with an available account.");
    if (input.operation === "create-stack") {
      const stackId = randomUUID();
      await tx.execute(
        sql`INSERT INTO public.stacks(id,user_id,name) VALUES(${stackId},${userId},${input.name})`,
      );
      await audit(tx, userId, "stack.created", stackId, { name: input.name });
      return "Stack created.";
    }
    if (input.operation === "save" && input.remove === "true") {
      await tx.execute(
        sql`DELETE FROM public.saved_tools WHERE user_id=${userId} AND tool_id=${input.toolId}`,
      );
      return "Removed from your saved tools.";
    }
    if (input.operation === "add-stack") {
      if (
        !resultRows(
          await tx.execute(
            sql`SELECT id FROM public.stacks WHERE id=${input.stackId} AND user_id=${userId} FOR UPDATE`,
          ),
        ).length
      )
        throw new AdminWorkflowError("This stack is unavailable.");
    }
    // Same Tool-first ordering as ownership/review moderation: a new owner
    // cannot race a self-review past the ownership boundary.
    const tool = await lockedTool(tx, input.toolId);
    if (tool.status !== "published")
      throw new AdminWorkflowError("This Tool is unavailable.");
    if (input.operation === "save") {
      const inserted = resultRows(
        await tx.execute(
          sql`INSERT INTO public.saved_tools(user_id,tool_id) VALUES(${userId},${tool.id}) ON CONFLICT DO NOTHING RETURNING user_id`,
        ),
      );
      if (inserted.length)
        await recordAnalytics(tx, session, {
          event: "save",
          kind: "tools",
          targetId: tool.id,
        });
      return "Tool saved to your account.";
    }
    if (input.operation === "add-stack") {
      const inserted = resultRows(
        await tx.execute(
          sql`INSERT INTO public.stack_tools(stack_id,tool_id) VALUES(${input.stackId},${tool.id}) ON CONFLICT DO NOTHING RETURNING stack_id`,
        ),
      );
      if (inserted.length)
        await recordAnalytics(tx, session, {
          event: "stack_add",
          kind: "tools",
          targetId: tool.id,
        });
      return "Tool added to your stack.";
    }
    if (
      resultRows(
        await tx.execute(
          sql`SELECT tool_id FROM public.vendor_access WHERE tool_id=${tool.id} AND user_id=${userId}`,
        ),
      ).length
    )
      throw new AdminWorkflowError("Owners cannot review their own Tools.");
    const [old] = resultRows<{ id: string; revision: string }>(
      await tx.execute(
        sql`SELECT id,xmin::text AS revision FROM public.tool_reviews WHERE tool_id=${tool.id} AND user_id=${userId} FOR UPDATE`,
      ),
    );
    if ((old && old.revision !== input.revision) || (!old && input.revision))
      throw new AdminWorkflowError(
        "Your review changed. Refresh before resubmitting.",
      );
    if (old)
      await tx.execute(
        sql`UPDATE public.tool_reviews SET rating=${input.rating},body=${input.body},status='pending' WHERE id=${old.id} AND user_id=${userId}`,
      );
    else
      await tx.execute(
        sql`INSERT INTO public.tool_reviews(id,user_id,tool_id,rating,body,status) VALUES(${randomUUID()},${userId},${tool.id},${input.rating},${input.body},'pending')`,
      );
    await audit(tx, userId, "review.submitted", tool.id, { status: "pending" });
    return "Review submitted for independent moderation.";
  });
}
