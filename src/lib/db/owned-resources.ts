import { and, eq, sql } from "drizzle-orm";
import { claims, reviews, savedTools, stacks, vendorAccess } from "./schema";
import type { IdentityDatabase } from "../supabase/identity";

// The ID must come from requireUser/getIdentity, never a submitted owner field.
// Runtime RLS is shared server access, so every private query needs its owner.
export function ownerPredicates(userId: string) {
  if (!userId) throw new Error("An application identity is required.");
  return {
    saves: eq(savedTools.userId, userId),
    stacks: eq(stacks.userId, userId),
    reviews: eq(reviews.userId, userId),
    claims: eq(claims.userId, userId),
    vendorTool: (toolId: string) =>
      and(eq(vendorAccess.userId, userId), eq(vendorAccess.toolId, toolId)),
  };
}

export async function addOwnedStackTool(
  database: IdentityDatabase,
  userId: string,
  stackId: string,
  toolId: string,
) {
  if (!userId) throw new Error("This stack is unavailable.");
  await database.transaction(async (tx) => {
    const result = await tx.execute(sql`
      SELECT id FROM public.stacks
      WHERE id = ${stackId} AND user_id = ${userId}
      FOR UPDATE`);
    const owned = Array.isArray(result)
      ? result
      : (result as { rows: unknown[] }).rows;
    if (owned.length !== 1) throw new Error("This stack is unavailable.");
    await tx.execute(sql`
      INSERT INTO public.stack_tools (stack_id, tool_id)
      VALUES (${stackId}, ${toolId}) ON CONFLICT DO NOTHING`);
  });
}
