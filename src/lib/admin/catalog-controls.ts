import { sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { IdentityDatabase } from "../supabase/identity";
import { approvedTaxonomy } from "../catalog/taxonomy-display";
import { calculateToolScore, weights } from "../ranking";
import {
  AdminWorkflowError,
  recordId,
  reasonInput,
  revisionInput,
} from "./contracts";
import {
  audit,
  checkAdmin,
  lockedTool,
  resultRows,
  writeToolData,
} from "./tool-workflows";

// Existing approved identifiers and parent relations are immutable here. This
// editor changes display metadata only; source reconciliation is a separate job.
export { approvedTaxonomy } from "../catalog/taxonomy-display";
export const taxonomyEditInput = z.object({
  id: recordId,
  revision: revisionInput,
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000),
  reason: reasonInput,
});
export async function editTaxonomy(
  database: IdentityDatabase,
  actorId: string,
  value: unknown,
) {
  const input = taxonomyEditInput.parse(value);
  const expected = approvedTaxonomy.find((t) => t.id === input.id);
  if (!expected)
    throw new AdminWorkflowError(
      "This identifier is outside the approved active taxonomy.",
    );
  await database.transaction(async (tx) => {
    await checkAdmin(tx, actorId);
    const [item] = resultRows<{
      name: string;
      kind: string;
      parent_id: string | null;
      data: Record<string, unknown>;
      revision: string;
    }>(
      await tx.execute(
        sql`SELECT *,xmin::text AS revision FROM public.taxonomy WHERE id=${input.id} FOR UPDATE`,
      ),
    );
    if (!item || item.revision !== input.revision)
      throw new AdminWorkflowError(
        "Taxonomy changed or is not installed. Refresh before saving.",
      );
    if (item.kind !== expected.kind || item.parent_id !== expected.parentId)
      throw new AdminWorkflowError(
        "Installed taxonomy relationship differs from the approved source. Reconcile it before editing.",
      );
    if (
      item.name === input.name &&
      item.data?.description === input.description
    )
      throw new AdminWorkflowError("No taxonomy fields changed.");
    await tx.execute(
      sql`UPDATE public.taxonomy SET name=${input.name},data=${JSON.stringify({ ...item.data, description: input.description })}::jsonb WHERE id=${input.id}`,
    );
    await audit(tx, actorId, "taxonomy.display-edited", input.id, {
      reason: input.reason,
      before: { name: item.name, description: item.data?.description },
      after: { name: input.name, description: input.description },
      identifiersAndRelationshipsPreserved: true,
    });
  });
}
export async function readTaxonomy(
  database: IdentityDatabase,
  actorId: string,
  q = "",
) {
  return database.transaction(async (tx) => {
    await checkAdmin(tx, actorId);
    return resultRows<{
      id: string;
      kind: string;
      name: string;
      slug: string;
      parent_id: string | null;
      data: Record<string, unknown>;
      revision: string;
    }>(
      await tx.execute(
        sql`SELECT *,xmin::text AS revision FROM public.taxonomy WHERE name ILIKE ${"%" + q.slice(0, 100).replace(/[\\%_]/g, "\\$&") + "%"} ORDER BY kind,id`,
      ),
    );
  });
}
const score = z.coerce.number().finite().min(0).max(100);
export const rankingWeightsInput = z
  .object({
    editorial: z.coerce.number().min(0).max(1),
    context: z.coerce.number().min(0).max(1),
    verification: z.coerce.number().min(0).max(1),
    completeness: z.coerce.number().min(0).max(1),
    freshness: z.coerce.number().min(0).max(1),
    reviews: z.coerce.number().min(0).max(1),
    popularity: z.coerce.number().min(0).max(1),
    engagement: z.coerce.number().min(0).max(1),
  })
  .refine(
    (w) => Math.abs(Object.values(w).reduce((a, b) => a + b, 0) - 1) < 0.000001,
    "Ranking weights must total 1.",
  );
export const rankingInput = z.object({
  toolId: recordId,
  revision: revisionInput,
  reason: reasonInput,
  editorial: score,
  context: score,
  verification: score,
  completeness: score,
  freshness: score,
  reviews: score,
  popularity: score,
  engagement: score,
  risk: score,
  adjustment: z.coerce.number().finite().min(-20).max(20),
  weights: rankingWeightsInput.optional(),
});
export async function updateOrganicRanking(
  database: IdentityDatabase,
  actorId: string,
  value: unknown,
) {
  const {
    toolId,
    revision,
    reason,
    weights: customWeights,
    ...factors
  } = rankingInput.parse(value);
  return database.transaction(async (tx) => {
    await checkAdmin(tx, actorId);
    const tool = await lockedTool(tx, toolId, revision);
    const config = customWeights || weights;
    const version =
      JSON.stringify(config) === JSON.stringify(weights)
        ? "0.1"
        : "0.1-" +
          createHash("sha256")
            .update(JSON.stringify(config))
            .digest("hex")
            .slice(0, 12);
    const result = calculateToolScore(factors, { weights: config, version });
    const ranking = {
      ...result,
      factors,
      weights: config,
      reviewedAt: new Date().toISOString(),
    };
    await writeToolData(tx, tool, { ...tool.data, organicRanking: ranking });
    await audit(tx, actorId, "tool.organic-ranking-reviewed", toolId, {
      reason,
      before: tool.data.organicRanking || null,
      after: ranking,
    });
    return result;
  });
}
