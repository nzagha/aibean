import "server-only";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { tools, reviews, vendorAccess } from "@/lib/db/schema";
import { demoTools } from "@/data/demo-tools";
import type { Tool } from "./types";
export const demoMode = () =>
  process.env.AIBEAN_DEMO_MODE === "true" ||
  (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production");
export async function getTools(): Promise<Tool[]> {
  if (!process.env.DATABASE_URL) return demoMode() ? demoTools : [];
  const [rows, approvedReviews, owners] = await Promise.all([
    db().select().from(tools).where(eq(tools.status, "published")),
    db().select().from(reviews).where(eq(reviews.status, "approved")),
    db().select().from(vendorAccess),
  ]);
  return rows
    .filter((r) => demoMode() || !r.data.demo)
    .map((row) => {
      const ratings = approvedReviews.filter((r) => r.toolId === row.id);
      return {
        ...row.data,
        id: row.id,
        slug: row.slug,
        name: row.name,
        categoryId: row.categoryId,
        claimed: owners.some((o) => o.toolId === row.id),
        reviewCount: ratings.length,
        rating: ratings.length
          ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
          : null,
      };
    });
}
export async function getTool(slug: string) {
  return (await getTools()).find((t) => t.slug === slug);
}
export async function getReviews(toolId: string) {
  if (!process.env.DATABASE_URL) return [];
  return db()
    .select({ id: reviews.id, rating: reviews.rating, body: reviews.body })
    .from(reviews)
    .where(and(eq(reviews.toolId, toolId), eq(reviews.status, "approved")));
}
