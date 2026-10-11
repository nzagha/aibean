import { sql } from "drizzle-orm";
import { z } from "zod";
import type { IdentityDatabase } from "../supabase/identity";
import { checkAdmin, audit, resultRows } from "../admin/tool-workflows";
import { AdminWorkflowError, reasonInput, recordId } from "../admin/contracts";
import { placementWindow } from "./rules";
export function scheduledStart(value: string, now = new Date()) {
  if (!value) return null;
  const parsed = z.iso.datetime({ offset: true }).parse(value),
    start = new Date(parsed);
  if (
    start.getTime() < now.getTime() ||
    start.getTime() > now.getTime() + 365 * 86400000
  )
    throw new AdminWorkflowError(
      "Schedule a future start within the next year, or leave it empty to begin after payment.",
    );
  return start;
}
export async function moderatePlacement(
  database: IdentityDatabase,
  actor: string,
  value: unknown,
) {
  const input = z
    .object({
      id: recordId,
      decision: z.enum(["approved", "rejected", "suspended"]),
      reason: reasonInput.max(500),
      scheduledStart: z.string().max(100).default(""),
    })
    .parse(value);
  await database.transaction(async (tx) => {
    await checkAdmin(tx, actor);
    const [placement] = resultRows<{
      status: string;
      starts_at: Date | null;
      paid_at: Date | null;
    }>(
      await tx.execute(
        sql`SELECT status,starts_at,paid_at FROM public.featured_placements WHERE id=${input.id} FOR UPDATE`,
      ),
    );
    if (
      !placement ||
      placement.status !==
        (input.decision === "suspended" ? "active" : "pending_review")
    )
      throw new AdminWorkflowError(
        "This placement changed. Refresh before reviewing.",
      );
    const start =
        input.decision === "approved"
          ? scheduledStart(input.scheduledStart)
          : null,
      window = start ? placementWindow(5, start) : null;
    await tx.execute(
      sql`UPDATE public.featured_placements SET status=${input.decision},review_reason=${input.reason}${input.decision === "approved" ? sql`,starts_at=${window?.startsAt.toISOString() || null}::timestamptz,ends_at=${window?.endsAt.toISOString() || null}::timestamptz` : sql``} WHERE id=${input.id}`,
    );
    await audit(tx, actor, "featured." + input.decision, input.id, {
      reason: input.reason,
      scheduledStart: start?.toISOString() || null,
      days: 5,
      activation: "verified sandbox payment only",
    });
  });
}
export function paidPlacementWindow(
  days: number,
  scheduled: Date | null,
  paidAt: Date,
) {
  return placementWindow(
    days,
    scheduled && scheduled > paidAt ? scheduled : paidAt,
  );
}
