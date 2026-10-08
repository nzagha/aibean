import "server-only";
import { and, asc, eq, gt, lte, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { featuredPlacements, tools } from "@/lib/db/schema";

export async function getFeaturedTools() {
  if (!process.env.DATABASE_URL) return [];
  const now = new Date();
  const rows = await db()
    .select({ placement: featuredPlacements, tool: tools })
    .from(featuredPlacements)
    .innerJoin(tools, eq(featuredPlacements.toolId, tools.id))
    .where(
      and(
        eq(featuredPlacements.status, "active"),
        isNotNull(featuredPlacements.paidAt),
        lte(featuredPlacements.startsAt, now),
        gt(featuredPlacements.endsAt, now),
        eq(tools.status, "published"),
      ),
    )
    .orderBy(asc(featuredPlacements.startsAt), asc(featuredPlacements.id));
  // Every active purchase receives a card. No silent truncation of paid inventory.
  return rows
    .filter((r) => !r.tool.data.demo)
    .map(({ placement, tool }) => ({
      id: placement.id,
      sponsorName: placement.sponsorName,
      tool: {
        ...tool.data,
        id: tool.id,
        name: tool.name,
        slug: tool.slug,
        categoryId: tool.categoryId,
      },
    }));
}
