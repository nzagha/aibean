import { sql } from "drizzle-orm";
import { z } from "zod";
import type { IdentityDatabase } from "../supabase/identity";

const id = z.string().min(1).max(100);
export const accountCommand = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("remove-save"), toolId: id }),
  z.object({
    operation: z.literal("rename-stack"),
    stackId: id,
    name: z.string().trim().min(2).max(80),
  }),
  z.object({
    operation: z.literal("delete-stack"),
    stackId: id,
    confirmed: z.literal("yes"),
  }),
  z.object({
    operation: z.literal("remove-stack-tool"),
    stackId: id,
    toolId: id,
  }),
  z.object({
    operation: z.literal("edit-review"),
    reviewId: id,
    rating: z.coerce.number().int().min(1).max(5),
    body: z.string().trim().min(20).max(4000),
  }),
]);

function rows(result: unknown): Record<string, unknown>[] {
  const value = Array.isArray(result)
    ? result
    : (result as { rows?: unknown })?.rows;
  if (!Array.isArray(value)) throw Error("Account operation unavailable.");
  return value;
}

// Identity is supplied by the server action, never by a form field. Mutations
// constrain ownership at the database boundary even though runtime RLS is shared.
export async function updateOwnedAccount(
  database: IdentityDatabase,
  userId: string,
  value: unknown,
) {
  if (!userId) throw Error("An account is required.");
  const command = accountCommand.parse(value);
  await database.transaction(async (tx) => {
    if (command.operation === "remove-save") {
      // Removing an archived/unpublished Tool must not depend on public visibility.
      await tx.execute(
        sql`DELETE FROM public.saved_tools WHERE user_id=${userId} AND tool_id=${command.toolId}`,
      );
      return;
    }
    if (command.operation === "edit-review") {
      const owned = rows(
        await tx.execute(sql`
        SELECT r.id FROM public.tool_reviews r
        JOIN public.tools t ON t.id=r.tool_id
        WHERE r.id=${command.reviewId} AND r.user_id=${userId} AND t.status='published'
        AND NOT EXISTS (SELECT 1 FROM public.vendor_access v WHERE v.user_id=${userId} AND v.tool_id=r.tool_id)
        FOR UPDATE OF r`),
      );
      if (owned.length !== 1) throw Error("Review is unavailable.");
      await tx.execute(sql`UPDATE public.tool_reviews SET rating=${command.rating}, body=${command.body}, status='pending'
        WHERE id=${command.reviewId} AND user_id=${userId}`);
      return;
    }
    const owned = rows(
      await tx.execute(sql`SELECT id FROM public.stacks
      WHERE id=${command.stackId} AND user_id=${userId} FOR UPDATE`),
    );
    if (owned.length !== 1) throw Error("Stack is unavailable.");
    if (command.operation === "rename-stack") {
      await tx.execute(
        sql`UPDATE public.stacks SET name=${command.name} WHERE id=${command.stackId} AND user_id=${userId}`,
      );
    } else if (command.operation === "delete-stack") {
      await tx.execute(
        sql`DELETE FROM public.stacks WHERE id=${command.stackId} AND user_id=${userId}`,
      );
    } else {
      await tx.execute(
        sql`DELETE FROM public.stack_tools WHERE stack_id=${command.stackId} AND tool_id=${command.toolId}`,
      );
    }
  });
}
