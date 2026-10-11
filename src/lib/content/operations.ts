import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import type { IdentityDatabase } from "../supabase/identity";
import { requireContentStorage, contentAvailable } from "./storage";
import {
  checkAdmin,
  resultRows,
  audit,
  lockedTool,
  writeToolData,
} from "../admin/tool-workflows";
import {
  AdminWorkflowError,
  reasonInput,
  recordId,
  revisionInput,
} from "../admin/contracts";
import { adminFilters, type AdminParams } from "../admin/queries";
import { publicAuthor } from "./queries";
import { contentTables } from "./contracts";
import { notify } from "./workflows";
const reportInput = z.object({
  kind: z.enum(["reviews", "skills", "playbooks", "resources", "events"]),
  id: recordId,
  reason: reasonInput,
});
const reportColumns = {
  reviews: "review_id",
  skills: "skill_id",
  playbooks: "playbook_id",
  resources: "resource_id",
  events: "event_id",
} as const;
export async function createContentReport(
  database: IdentityDatabase,
  user: string,
  value: unknown,
) {
  const input = reportInput.parse(value),
    column = sql.identifier(reportColumns[input.kind]);
  return database.transaction(async (tx) => {
    await requireContentStorage(tx);
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${"report:" + user + ":" + input.kind + ":" + input.id},0))`,
    );
    const visible =
      input.kind === "reviews"
        ? resultRows(
            await tx.execute(
              sql`SELECT r.id FROM public.tool_reviews r JOIN public.tools t ON t.id=r.tool_id WHERE r.id=${input.id} AND r.status='approved' AND t.status='published' FOR SHARE OF r`,
            ),
          )
        : resultRows(
            await tx.execute(
              sql`SELECT r.id FROM public.${sql.identifier(contentTables[input.kind])} r JOIN public.users u ON u.id=r.user_id WHERE r.id=${input.id} AND r.status='published' AND ${publicAuthor(input.kind)} FOR SHARE OF r`,
            ),
          );
    if (!visible.length)
      throw new AdminWorkflowError(
        "Only visible published content can be reported.",
      );
    const [existing] = resultRows<{ id: string }>(
      await tx.execute(
        sql`SELECT id FROM public.content_reports WHERE user_id=${user} AND ${column}=${input.id} AND status='open'`,
      ),
    );
    if (existing) return existing.id;
    const id = randomUUID();
    await tx.execute(
      sql`INSERT INTO public.content_reports(id,user_id,${column},reason) VALUES(${id},${user},${input.id},${input.reason})`,
    );
    await audit(tx, user, "content.reported", id, {
      kind: input.kind,
      target: input.id,
    });
    return id;
  });
}
export async function resolveContentReport(
  database: IdentityDatabase,
  actor: string,
  value: unknown,
) {
  const input = z
    .object({
      id: recordId,
      revision: revisionInput,
      decision: z.enum(["dismissed", "actioned"]),
      reason: reasonInput,
    })
    .parse(value);
  await database.transaction(async (tx) => {
    await requireContentStorage(tx);
    await checkAdmin(tx, actor);
    const [row] = resultRows<
      {
        id: string;
        user_id: string;
        status: string;
        revision: string;
      } & Record<string, string>
    >(
      await tx.execute(
        sql`SELECT *,updated_at::text AS revision FROM public.content_reports WHERE id=${input.id} FOR UPDATE`,
      ),
    );
    if (!row || row.status !== "open" || row.revision !== input.revision)
      throw new AdminWorkflowError(
        "This report has already changed. Refresh before reviewing.",
      );
    if (input.decision === "actioned") {
      const kind = Object.keys(reportColumns).find(
          (k) => row[reportColumns[k as keyof typeof reportColumns]],
        )! as keyof typeof reportColumns,
        id = row[reportColumns[kind]];
      const table = kind === "reviews" ? "tool_reviews" : contentTables[kind];
      const [target] = resultRows<{ status: string; user_id: string }>(
        await tx.execute(
          sql`SELECT status,user_id FROM public.${sql.identifier(table)} WHERE id=${id} FOR UPDATE`,
        ),
      );
      if (
        !target ||
        target.status !== (kind === "reviews" ? "approved" : "published")
      )
        throw new AdminWorkflowError(
          "Reported content changed or is already hidden. Inspect its history before dismissing this report.",
        );
      await tx.execute(
        kind === "reviews"
          ? sql`UPDATE public.tool_reviews SET status='rejected' WHERE id=${id}`
          : sql`UPDATE public.${sql.identifier(table)} SET status='archived',reviewer_id=${actor},review_reason=${input.reason},updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE id=${id}`,
      );
      await audit(tx, actor, "reported-content.hidden", id, {
        kind,
        reason: input.reason,
        report: input.id,
        from: target.status,
      });
      await notify(
        tx,
        target.user_id,
        "Reported content was removed from public view. " + input.reason,
      );
    }
    await tx.execute(
      sql`UPDATE public.content_reports SET status=${input.decision},reviewer_id=${actor},review_reason=${input.reason},updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE id=${input.id}`,
    );
    await notify(
      tx,
      row.user_id,
      "Your report was reviewed: " + input.decision + ". " + input.reason,
    );
    await audit(tx, actor, "content-report.resolved", input.id, {
      decision: input.decision,
      reason: input.reason,
    });
  });
}
export async function readContentReports(
  database: IdentityDatabase,
  actor: string,
  params: AdminParams = {},
) {
  const filters = adminFilters(params);
  return database.transaction(async (tx) => {
    await checkAdmin(tx, actor);
    if (!(await contentAvailable(tx)))
      return { ready: false, rows: [] as ReportRow[], total: 0, filters };
    const match = "%" + filters.q.replace(/[\\%_]/g, "\\$&") + "%";
    const where = sql`WHERE (${filters.status || null}::text IS NULL OR r.status=${filters.status || null}) AND (r.reason ILIKE ${match} OR r.id ILIKE ${match})`;
    const rows = resultRows<ReportRow>(
      await tx.execute(
        sql`SELECT r.*,r.updated_at::text AS revision,coalesce(k.title,p.title,c.title,e.title,v.body) AS target_text FROM public.content_reports r LEFT JOIN public.ai_skills k ON k.id=r.skill_id LEFT JOIN public.ai_playbooks p ON p.id=r.playbook_id LEFT JOIN public.creator_resources c ON c.id=r.resource_id LEFT JOIN public.public_events e ON e.id=r.event_id LEFT JOIN public.tool_reviews v ON v.id=r.review_id ${where} ORDER BY r.created_at DESC,r.id LIMIT ${filters.size} OFFSET ${(filters.page - 1) * filters.size}`,
      ),
    );
    const [n] = resultRows<{ n: number }>(
      await tx.execute(
        sql`SELECT count(*)::int AS n FROM public.content_reports r ${where}`,
      ),
    );
    return { ready: true, rows, total: n.n, filters };
  });
}
export type ReportRow = {
  id: string;
  user_id: string;
  reason: string;
  status: string;
  review_reason: string | null;
  revision: string;
  target_text: string;
};
export async function featureEvent(
  database: IdentityDatabase,
  actor: string,
  value: unknown,
) {
  const input = z
    .object({
      id: recordId,
      revision: revisionInput,
      featured: z.boolean(),
      reason: reasonInput,
    })
    .parse(value);
  await database.transaction(async (tx) => {
    await requireContentStorage(tx);
    await checkAdmin(tx, actor);
    const [row] = resultRows<{
      featured: boolean;
      status: string;
      revision: string;
    }>(
      await tx.execute(
        sql`SELECT featured,status,updated_at::text AS revision FROM public.public_events WHERE id=${input.id} FOR UPDATE`,
      ),
    );
    if (!row || row.status !== "published" || row.revision !== input.revision)
      throw new AdminWorkflowError(
        "Only an unchanged published Event can be featured.",
      );
    await tx.execute(
      sql`UPDATE public.public_events SET featured=${input.featured},updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE id=${input.id}`,
    );
    await audit(tx, actor, "event.editorial-featured", input.id, {
      from: row.featured,
      to: input.featured,
      reason: input.reason,
      paymentInfluence: false,
    });
  });
}
export async function updateSimilarTools(
  database: IdentityDatabase,
  actor: string,
  value: unknown,
) {
  const input = z
    .object({
      toolId: recordId,
      revision: revisionInput,
      relatedIds: z
        .array(recordId)
        .max(12)
        .refine((v) => new Set(v).size === v.length),
      reason: reasonInput,
    })
    .parse(value);
  await database.transaction(async (tx) => {
    await checkAdmin(tx, actor);
    const tool = await lockedTool(tx, input.toolId, input.revision);
    for (const id of input.relatedIds)
      if (
        id === input.toolId ||
        !resultRows(
          await tx.execute(
            sql`SELECT id FROM public.tools WHERE id=${id} AND status='published' AND coalesce((data->>'demo')::boolean,false)=false FOR SHARE`,
          ),
        ).length
      )
        throw new AdminWorkflowError("Choose other published real Tools.");
    await writeToolData(tx, tool, {
      ...tool.data,
      similarToolIds: input.relatedIds,
    });
    await audit(tx, actor, "tool.similar-reviewed", input.toolId, {
      ids: input.relatedIds,
      reason: input.reason,
    });
  });
}
