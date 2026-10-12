import type { AnalyticsSession } from "./analytics-contracts";
import { assertQuota } from "../pricing/entitlements";
import { entitlementLock } from "../pricing/storage";
import { PROPOSED_PRICING } from "../pricing/config";
import { recordAnalytics } from "./analytics";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { comparisonContext } from "../catalog/comparison";
import { audit, resultRows } from "../admin/tool-workflows";
import { AdminWorkflowError } from "../admin/contracts";
import type {
  IdentityDatabase,
  IdentityTransaction,
} from "../supabase/identity";
import { discoveryAvailable, requireDiscovery } from "./storage";
const id = z.string().min(1).max(100);
const contextSchema = z
  .object({
    category: id.optional(),
    useCase: id.optional(),
    industry: id.optional(),
  })
  .strict()
  .refine(
    (v) =>
      Object.entries(v).every(
        ([k, val]) =>
          comparisonContext(v)[
            k as keyof ReturnType<typeof comparisonContext>
          ] === val,
      ),
    "Choose an approved comparison context.",
  );
export const comparisonInput = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("save"),
    id: id.optional(),
    revision: z.coerce.number().int().positive().optional(),
    name: z.string().trim().min(2).max(80),
    toolIds: z
      .array(id)
      .min(2, "Choose at least two Tools.")
      .max(4, "Choose no more than four Tools.")
      .refine((v) => new Set(v).size === v.length, "Choose distinct Tools."),
    context: contextSchema,
  }),
  z.object({
    operation: z.literal("delete"),
    id,
    revision: z.coerce.number().int().positive(),
  }),
]);
export async function canonicalUser(tx: IdentityTransaction, user: string) {
  if (
    !user ||
    !resultRows(
      await tx.execute(sql`SELECT id FROM public.users WHERE id=${user}`),
    ).length
  )
    throw new AdminWorkflowError("An available account is required.");
}
export type SavedComparison = {
  id: string;
  name: string;
  context: { category?: string; useCase?: string; industry?: string };
  revision: number;
  tools: {
    id: string;
    slug: string | null;
    name: string;
    available: boolean;
  }[];
};
export async function mutateComparison(
  database: IdentityDatabase,
  user: string,
  value: unknown,
  session?: AnalyticsSession,
) {
  const input = comparisonInput.parse(value);
  return database.transaction(async (tx) => {
    await requireDiscovery(tx);
    await canonicalUser(tx, user);
    await entitlementLock(tx, user);
    // Serialize account quota and mutations; revision remains explicit across devices.
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${"discovery-account:" + user},0))`,
    );
    const key = input.id || randomUUID();
    const [old] = resultRows<{ revision: number }>(
      await tx.execute(
        sql`SELECT revision FROM public.saved_comparisons WHERE id=${key} AND user_id=${user} FOR UPDATE`,
      ),
    );
    if (
      (input.id && (!old || old.revision !== input.revision)) ||
      (!input.id && input.operation === "save" && input.revision)
    )
      throw new AdminWorkflowError(
        "Comparison unavailable or changed. Refresh before saving.",
      );
    if (input.operation === "delete") {
      await tx.execute(
        sql`DELETE FROM public.saved_comparisons WHERE id=${key} AND user_id=${user}`,
      );
      await audit(tx, user, "comparison.deleted", key, {});
      return key;
    }
    if (!old) {
      await assertQuota(tx, user, "comparisons");
      const [n] = resultRows<{ n: number }>(
        await tx.execute(
          sql`SELECT count(*)::int AS n FROM public.saved_comparisons WHERE user_id=${user}`,
        ),
      );
      if (n.n >= PROPOSED_PRICING.plans[0].quotas.comparisons)
        throw new AdminWorkflowError(
          "You can keep up to 100 saved comparisons. Delete one first.",
        );
    }
    const prior = old
      ? resultRows<{ tool_id: string }>(
          await tx.execute(
            sql`SELECT tool_id FROM public.comparison_tools WHERE comparison_id=${key}`,
          ),
        ).map((t) => t.tool_id)
      : [];
    for (const tool of [...input.toolIds].sort()) {
      const [row] = resultRows<{ status: string }>(
        await tx.execute(
          sql`SELECT status FROM public.tools WHERE id=${tool} FOR SHARE`,
        ),
      );
      if (!row || (row.status !== "published" && !prior.includes(tool)))
        throw new AdminWorkflowError(
          "Only published Tools can be added. Existing unavailable Tools may be retained or removed.",
        );
    }
    if (old) {
      await tx.execute(
        sql`UPDATE public.saved_comparisons SET name=${input.name},context=${JSON.stringify(input.context)}::jsonb,revision=revision+1,updated_at=now() WHERE id=${key} AND user_id=${user}`,
      );
      await tx.execute(
        sql`DELETE FROM public.comparison_tools WHERE comparison_id=${key}`,
      );
    } else
      await tx.execute(
        sql`INSERT INTO public.saved_comparisons(id,user_id,name,context) VALUES(${key},${user},${input.name},${JSON.stringify(input.context)}::jsonb)`,
      );
    for (const [position, tool] of input.toolIds.entries())
      await tx.execute(
        sql`INSERT INTO public.comparison_tools(comparison_id,tool_id,position) VALUES(${key},${tool},${position})`,
      );
    for (const tool of input.toolIds.filter((t) => !prior.includes(t)))
      await recordAnalytics(tx, session, {
        event: "comparison_add",
        kind: "tools",
        targetId: tool,
      });
    await audit(
      tx,
      user,
      old ? "comparison.updated" : "comparison.created",
      key,
      { toolCount: input.toolIds.length },
    );
    return key;
  });
}
export async function readComparisons(
  database: IdentityDatabase,
  user: string,
  page = 1,
  key?: string,
) {
  return database.transaction(async (tx) => {
    await canonicalUser(tx, user);
    if (!(await discoveryAvailable(tx)))
      return { ready: false, rows: [] as SavedComparison[], total: 0, page: 1 };
    page = Number.isSafeInteger(page) ? Math.min(5, Math.max(1, page)) : 1;
    const [count] = resultRows<{ n: number }>(
      await tx.execute(
        sql`SELECT count(*)::int AS n FROM public.saved_comparisons WHERE user_id=${user}`,
      ),
    );
    page = Math.min(page, Math.max(1, Math.ceil(count.n / 20)));
    const rows = resultRows<SavedComparison>(
      await tx.execute(
        sql`SELECT c.id,c.name,c.context,c.revision,coalesce(jsonb_agg(jsonb_build_object('id',t.id,'slug',CASE WHEN t.status='published' THEN t.slug END,'name',CASE WHEN t.status='published' THEN t.name ELSE 'Unavailable Tool' END,'available',t.status='published') ORDER BY m.position),'[]') AS tools FROM public.saved_comparisons c JOIN public.comparison_tools m ON m.comparison_id=c.id JOIN public.tools t ON t.id=m.tool_id WHERE c.user_id=${user} AND (${key || null}::text IS NULL OR c.id=${key || null}) GROUP BY c.id ORDER BY c.updated_at DESC,c.id LIMIT 20 OFFSET ${(page - 1) * 20}`,
      ),
    );
    return { ready: true, rows, total: count.n, page };
  });
}
