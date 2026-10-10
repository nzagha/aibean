import { sql } from "drizzle-orm";
import type { IdentityTransaction } from "../supabase/identity";

export type OwnedToolSummary = {
  id: string;
  name: string;
  slug: string;
  status: string;
  reviews: number;
};
export async function readVendorTools(
  database: IdentityTransaction,
  userId: string,
): Promise<OwnedToolSummary[]> {
  if (!userId) throw Error("An account is required.");
  const result = await database.execute(sql`
    SELECT t.id, t.name, t.slug, t.status,
      (SELECT count(*)::integer FROM public.tool_reviews r WHERE r.tool_id=t.id AND r.status='approved') AS reviews
    FROM public.tools t
    JOIN public.vendor_access v ON v.tool_id=t.id
    WHERE v.user_id=${userId} ORDER BY t.name, t.id`);
  const rows = Array.isArray(result)
    ? result
    : (result as { rows: unknown[] }).rows;
  return rows as OwnedToolSummary[];
}
