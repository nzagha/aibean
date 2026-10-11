import { sql } from "drizzle-orm";
import { z } from "zod";
import type { IdentityDatabase } from "../supabase/identity";
import { safeWebUrl } from "../validation";
import { checkAdmin, resultRows } from "../admin/tool-workflows";
import { AdminWorkflowError, recordId } from "../admin/contracts";
import { contentAvailable, requireContentStorage } from "./storage";
import { publicAuthor } from "./queries";
export async function registerOutbound(
  database: IdentityDatabase,
  kind: "tools" | "resources" | "events",
  slug: string,
  source: "internal" | "direct" | "external",
) {
  z.enum(["tools", "resources", "events"]).parse(kind);
  z.enum(["internal", "direct", "external"]).parse(source);
  recordId.parse(slug);
  return database.transaction(async (tx) => {
    const ready = await contentAvailable(tx);
    if (kind !== "tools" && !ready)
      throw new AdminWorkflowError("This content is not available.");
    const [row] =
      kind === "tools"
        ? resultRows<{ id: string; destination: string }>(
            await tx.execute(
              sql`SELECT id,data->>'website' AS destination FROM public.tools WHERE slug=${slug} AND status='published' AND coalesce((data->>'demo')::boolean,false)=false`,
            ),
          )
        : resultRows<{ id: string; destination: string }>(
            await tx.execute(
              sql`SELECT r.id,${kind === "resources" ? sql`r.destination` : sql`r.registration_url`} AS destination FROM public.${sql.identifier(kind === "resources" ? "creator_resources" : "public_events")} r JOIN public.users u ON u.id=r.user_id WHERE r.slug=${slug} AND r.status='published' AND ${publicAuthor(kind)}`,
            ),
          );
    if (!row) throw new AdminWorkflowError("This content is not available.");
    const destination = safeWebUrl.parse(row.destination);
    if (ready) {
      const bucket = Math.floor(Date.now() / 60000);
      const [budget] = resultRows<{ count: number }>(
        await tx.execute(
          sql`INSERT INTO public.rate_limits(key,count,window_start) VALUES(${"outbound:" + kind + ":" + row.id + ":" + bucket},1,now()) ON CONFLICT(key) DO UPDATE SET count=rate_limits.count+1 RETURNING count`,
        ),
      );
      if (budget.count > 1000)
        throw new AdminWorkflowError(
          "This link is receiving too many requests. Try again shortly.",
        );
      await tx.execute(
        sql`INSERT INTO public.engagement_counters(kind,entity_id,day,source) VALUES(${kind},${row.id},(now() AT TIME ZONE 'UTC')::date,${source}) ON CONFLICT(kind,entity_id,day,source) DO UPDATE SET requests=engagement_counters.requests+1`,
      );
    }
    return destination;
  });
}
export async function readAdminAnalytics(
  database: IdentityDatabase,
  actor: string,
) {
  return database.transaction(async (tx) => {
    await checkAdmin(tx, actor);
    if (!(await contentAvailable(tx)))
      return {
        ready: false,
        rows: [] as AnalyticsRow[],
        totals: [] as { label: string; n: number }[],
      };
    const rows = resultRows<AnalyticsRow>(
      await tx.execute(
        sql`SELECT c.day::text,c.kind,c.source,sum(c.requests)::int AS requests FROM public.engagement_counters c WHERE c.day>=CURRENT_DATE-29 GROUP BY c.day,c.kind,c.source ORDER BY c.day DESC,c.kind,c.source`,
      ),
    );
    const totals = resultRows<{ label: string; n: number }>(
      await tx.execute(
        sql`SELECT 'Application accounts' AS label,count(*)::int AS n FROM public.users UNION ALL SELECT 'Approved Creator capabilities',count(*)::int FROM public.users WHERE is_creator UNION ALL SELECT 'Tool ownerships',count(*)::int FROM public.vendor_access UNION ALL SELECT 'Open reports',count(*)::int FROM public.content_reports WHERE status='open' UNION ALL SELECT 'Draft Skills',count(*)::int FROM public.ai_skills WHERE status='draft' UNION ALL SELECT 'Draft Playbooks',count(*)::int FROM public.ai_playbooks WHERE status='draft'`,
      ),
    );
    return { ready: true, rows, totals };
  });
}
export type AnalyticsRow = {
  day: string;
  kind: string;
  source: string;
  requests: number;
};
export async function readVendorAnalytics(
  database: IdentityDatabase,
  user: string,
  tool: string,
) {
  recordId.parse(tool);
  return database.transaction(async (tx) => {
    if (
      !resultRows(
        await tx.execute(
          sql`SELECT tool_id FROM public.vendor_access WHERE user_id=${user} AND tool_id=${tool}`,
        ),
      ).length
    )
      throw new AdminWorkflowError(
        "Approved ownership of this Tool is required.",
      );
    if (!(await contentAvailable(tx)))
      return { ready: false, rows: [] as AnalyticsRow[] };
    const rows = resultRows<AnalyticsRow>(
      await tx.execute(
        sql`SELECT day::text,kind,source,requests FROM public.engagement_counters WHERE kind='tools' AND entity_id=${tool} AND day>=CURRENT_DATE-29 ORDER BY day DESC,source`,
      ),
    );
    return { ready: true, rows };
  });
}
export async function readCreatorAnalytics(
  database: IdentityDatabase,
  user: string,
) {
  return database.transaction(async (tx) => {
    await requireContentStorage(tx);
    const { checkAuthor } = await import("./workflows");
    await checkAuthor(tx, user, "skills");
    return resultRows<AnalyticsRow>(
      await tx.execute(
        sql`SELECT c.day::text,c.kind,c.source,sum(c.requests)::int AS requests FROM public.engagement_counters c WHERE c.day>=CURRENT_DATE-29 AND (c.kind='resources' AND EXISTS(SELECT 1 FROM public.creator_resources r WHERE r.id=c.entity_id AND r.user_id=${user}) OR c.kind='events' AND EXISTS(SELECT 1 FROM public.public_events e WHERE e.id=c.entity_id AND e.user_id=${user})) GROUP BY c.day,c.kind,c.source ORDER BY c.day DESC,c.kind,c.source`,
      ),
    );
  });
}
