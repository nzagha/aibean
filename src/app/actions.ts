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
  auditLogs,
  claims,
  orders,
  vendorAccess,
} from "@/lib/db/schema";
import { reviewInput, toolInput } from "@/lib/validation";
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
  const admin = await requireAdmin();
  await rateLimit(admin.id, "admin-tool", 100);
  const input = toolInput.parse(Object.fromEntries(form));
  const id = randomUUID();
  await db().transaction(async (tx) => {
    await tx
      .insert(tools)
      .values({
        id,
        name: input.name,
        slug: input.slug,
        categoryId: input.categoryId,
        status: "draft",
        data: {
          ...input,
          id,
          subcategoryId: null,
          useCaseIds: [],
          industries: [],
          listingTypeId: "LST-01",
          startingPrice: null,
          freePlan: input.pricing === "free" ? true : null,
          trial: null,
          features: [],
          integrations: [],
          platforms: [],
          pros: [],
          limitations: [],
          verification: "unverified",
          verified: false,
          lastVerified: null,
          claimed: false,
          rating: null,
          reviewCount: 0,
          demo: false,
        },
      });
    await tx
      .insert(auditLogs)
      .values({
        id: randomUUID(),
        actorId: admin.id,
        action: "tool.created",
        entityId: id,
        detail: "Draft tool created",
      });
  });
  revalidatePath("/admin");
  redirect("/admin");
}
export async function setToolStatus(form: FormData) {
  const admin = await requireAdmin();
  const id = z.string().min(1).max(100).parse(form.get("toolId"));
  const status = z
    .enum(["published", "archived", "draft"])
    .parse(form.get("status"));
  await db().transaction(async (tx) => {
    await tx
      .update(tools)
      .set({ status, updatedAt: new Date() })
      .where(eq(tools.id, id));
    await tx
      .insert(auditLogs)
      .values({
        id: randomUUID(),
        actorId: admin.id,
        action: `tool.${status}`,
        entityId: id,
        detail: "Publication status updated",
      });
  });
  revalidatePath("/tools");
  revalidatePath("/admin");
}
export async function moderateReview(form: FormData) {
  const admin = await requireAdmin();
  const id = z.string().uuid().parse(form.get("reviewId"));
  const status = z.enum(["approved", "rejected"]).parse(form.get("status"));
  const reason = z.string().trim().min(5).max(500).parse(form.get("reason"));
  await db().transaction(async (tx) => {
    await tx.update(reviews).set({ status }).where(eq(reviews.id, id));
    await tx
      .insert(auditLogs)
      .values({
        id: randomUUID(),
        actorId: admin.id,
        action: `review.${status}`,
        entityId: id,
        detail: reason,
      });
  });
  revalidatePath("/admin");
}
export async function reviewClaim(form: FormData) {
  const admin = await requireAdmin();
  const id = z.string().uuid().parse(form.get("claimId"));
  const decision = z.enum(["approved", "rejected"]).parse(form.get("decision"));
  const reason = z.string().trim().min(5).max(500).parse(form.get("reason"));
  await db().transaction(async (tx) => {
    const [claim] = await tx
      .select()
      .from(claims)
      .where(eq(claims.id, id))
      .for("update");
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.claimId, id));
    if (!claim || claim.status !== "pending_review" || order?.status !== "paid")
      throw new Error("A confirmed payment and pending claim are required.");
    if (decision === "approved")
      await tx
        .insert(vendorAccess)
        .values({ toolId: claim.toolId, userId: claim.userId });
    await tx.update(claims).set({ status: decision }).where(eq(claims.id, id));
    await tx
      .insert(auditLogs)
      .values({
        id: randomUUID(),
        actorId: admin.id,
        action: `claim.${decision}`,
        entityId: id,
        detail: reason,
      });
  });
  revalidatePath("/admin");
}
