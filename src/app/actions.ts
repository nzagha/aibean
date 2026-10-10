"use server";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  tools,
  savedTools,
  stacks,
  reviews,
  vendorAccess,
} from "@/lib/db/schema";
import { reviewInput } from "@/lib/validation";
import { safeReturnPath } from "@/lib/catalog/filter";
import { rateLimit } from "@/lib/security";
import { addOwnedStackTool, ownerPredicates } from "@/lib/db/owned-resources";
async function publishedTool(id: unknown) {
  const toolId = z.string().min(1).max(100).parse(id);
  const [tool] = await db()
    .select()
    .from(tools)
    .where(and(eq(tools.id, toolId), eq(tools.status, "published")));
  if (!tool) throw new Error("This tool is unavailable.");
  return tool;
}
export async function saveTool(form: FormData) {
  const user = await requireUser(safeReturnPath(form.get("returnTo")));
  await rateLimit(user.id, "save");
  const tool = await publishedTool(form.get("toolId"));
  if (form.get("remove") === "true")
    await db()
      .delete(savedTools)
      .where(
        and(ownerPredicates(user.id).saves, eq(savedTools.toolId, tool.id)),
      );
  else
    await db()
      .insert(savedTools)
      .values({ userId: user.id, toolId: tool.id })
      .onConflictDoNothing();
  revalidatePath("/account");
  redirect(`/tools/${tool.slug}?notice=saved`);
}
export async function createStack(form: FormData) {
  const user = await requireUser();
  await rateLimit(user.id, "stack");
  const name = z.string().trim().min(2).max(80).parse(form.get("name"));
  await db().insert(stacks).values({ id: randomUUID(), userId: user.id, name });
  revalidatePath("/account");
  redirect("/account");
}
export async function addToStack(form: FormData) {
  const user = await requireUser();
  await rateLimit(user.id, "stack");
  const tool = await publishedTool(form.get("toolId"));
  const id = z.string().uuid().parse(form.get("stackId"));
  await addOwnedStackTool(db(), user.id, id, tool.id);
  revalidatePath("/account");
  redirect(`/tools/${tool.slug}?notice=stacked`);
}
export async function submitReview(form: FormData) {
  const user = await requireUser();
  await rateLimit(user.id, "review", 10);
  const input = reviewInput.parse(Object.fromEntries(form));
  const tool = await publishedTool(input.toolId);
  const [owner] = await db()
    .select()
    .from(vendorAccess)
    .where(ownerPredicates(user.id).vendorTool(tool.id));
  if (owner) throw new Error("Owners cannot review their own tools.");
  await db()
    .insert(reviews)
    .values({ id: randomUUID(), userId: user.id, ...input })
    .onConflictDoUpdate({
      target: [reviews.userId, reviews.toolId],
      set: { rating: input.rating, body: input.body, status: "pending" },
    });
  revalidatePath("/account");
  redirect(`/tools/${tool.slug}?notice=review-pending`);
}

export async function createTool(form: FormData) {
  await requireAdmin();
  const { createToolDraft } = await import("./admin/actions");
  const result = await createToolDraft({}, form);
  if (result.error) throw new Error(result.error);
}
export async function setToolStatus(form: FormData) {
  await requireAdmin();
  const { changeToolStatus } = await import("./admin/actions");
  const result = await changeToolStatus({}, form);
  if (result.error) throw new Error(result.error);
}
export async function moderateReview(form: FormData) {
  await requireAdmin();
  const { reviewRating } = await import("./admin/actions");
  const result = await reviewRating({}, form);
  if (result.error) throw new Error(result.error);
}
export async function reviewClaim(form: FormData) {
  await requireAdmin();
  const { reviewOwnership } = await import("./admin/actions");
  const result = await reviewOwnership({}, form);
  if (result.error) throw new Error(result.error);
}
