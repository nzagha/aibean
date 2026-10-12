import { taxonomy, toolListingTypes } from "../catalog/taxonomy";
import { verificationStates } from "../catalog/types";
import { randomUUID, createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import type {
  IdentityDatabase,
  IdentityTransaction,
} from "../supabase/identity";
import { checkAdmin, resultRows, audit } from "../admin/tool-workflows";
import { AdminWorkflowError } from "../admin/contracts";
import { checkAuthor } from "../content/workflows";
import { comparisonContext } from "../catalog/comparison";
import { discoveryAvailable, requireDiscovery } from "./storage";
import { visibleTarget } from "./targets";
import {
  analyticsInput,
  eventKinds,
  type AnalyticsSession,
} from "./analytics-contracts";
export async function recordAnalytics(
  tx: IdentityTransaction,
  session: AnalyticsSession | undefined,
  value: unknown,
) {
  if (!session || !(await discoveryAvailable(tx))) return false;
  const input = analyticsInput.parse(value);
  if (
    !/^[a-f0-9]{64}$/.test(session.hash) ||
    !eventKinds[input.event].includes(input.kind)
  )
    throw new AdminWorkflowError("Invalid event contract.");
  let metadata: Record<string, unknown> = {};
  if (input.kind === "discovery") {
    if (
      !["tools", "skills", "playbooks", "events", "creators"].includes(
        input.targetId,
      )
    )
      throw new AdminWorkflowError("Invalid discovery scope.");
    const filters = input.filters || {},
      context = comparisonContext(filters);
    if (
      ["category", "useCase", "industry"].some(
        (k) =>
          filters[k as keyof typeof filters] &&
          !context[k as keyof typeof context],
      )
    )
      throw new AdminWorkflowError("Unknown discovery filter.");
    if (
      (filters.subcategory &&
        !taxonomy.categories.some(
          (c) =>
            (!filters.category || c.id === filters.category) &&
            c.subcategories.some((t) => t.id === filters.subcategory),
        )) ||
      (filters.type && !toolListingTypes.some((t) => t.id === filters.type)) ||
      (filters.verification &&
        !verificationStates.includes(
          filters.verification as (typeof verificationStates)[number],
        ))
    )
      throw new AdminWorkflowError("Unknown selected filter.");
    metadata = { ...filters, ...context, hasQuery: !!filters.hasQuery };
  } else if (!(await visibleTarget(tx, input.kind, input.targetId)))
    throw new AdminWorkflowError(
      "Only public available targets may be recorded.",
    );
  let campaign: string | null = null;
  if (input.campaignId) {
    const resource = await visibleTarget(tx, "resources", input.campaignId);
    if (!resource)
      throw new AdminWorkflowError("Unavailable campaign context.");
    const [link] = resultRows(
      await tx.execute(
        sql`SELECT id FROM public.creator_resources WHERE id=${input.campaignId} AND (${input.kind === "resources" && input.targetId === input.campaignId} OR ${input.kind === "skills"} AND skill_id=${input.targetId} OR ${input.kind === "playbooks"} AND playbook_id=${input.targetId})`,
      ),
    );
    if (!link)
      throw new AdminWorkflowError("Campaign is unrelated to this content.");
    campaign = input.campaignId;
  }
  // DB clock defines UTC minute boundaries; no IP, account ID, URL or free text.
  const [clock] = resultRows<{ bucket: string }>(
    await tx.execute(
      sql`SELECT floor(extract(epoch FROM now())/60)::text AS bucket`,
    ),
  );
  const key = createHash("sha256")
    .update(
      JSON.stringify([
        session.hash,
        input.event,
        input.kind,
        input.targetId,
        metadata,
        campaign,
        clock.bucket,
      ]),
    )
    .digest("hex");
  const [budget] = resultRows<{ count: number }>(
    await tx.execute(
      sql`INSERT INTO public.rate_limits(key,count,window_start) VALUES(${"analytics:" + session.hash + ":" + clock.bucket},1,now()) ON CONFLICT(key) DO UPDATE SET count=rate_limits.count+1 RETURNING count`,
    ),
  );
  if (budget.count > 60) return false;
  const [targetBudget] = resultRows<{ count: number }>(
    await tx.execute(
      sql`INSERT INTO public.rate_limits(key,count,window_start) VALUES(${"analytics-target:" + input.kind + ":" + input.targetId + ":" + clock.bucket},1,now()) ON CONFLICT(key) DO UPDATE SET count=rate_limits.count+1 RETURNING count`,
    ),
  );
  if (targetBudget.count > 1000) return false;
  const inserted = resultRows(
    await tx.execute(
      sql`INSERT INTO public.analytics_events(id,event,kind,target_id,session_hash,dedup_key,source,campaign_id,metadata) VALUES(${randomUUID()},${input.event},${input.kind},${input.targetId},${session.hash},${key},${session.source},${campaign},${JSON.stringify(metadata)}::jsonb) ON CONFLICT(dedup_key) DO NOTHING RETURNING id`,
    ),
  );
  // Enforce a rolling raw-event retention window on writes; bounded delete work.
  await tx.execute(
    sql`DELETE FROM public.analytics_events WHERE id IN (SELECT id FROM public.analytics_events WHERE created_at < now()-interval '30 days' ORDER BY created_at LIMIT 1000)`,
  );
  await tx.execute(
    sql`DELETE FROM public.rate_limits WHERE key IN (SELECT key FROM public.rate_limits WHERE (key LIKE 'analytics:%' OR key LIKE 'analytics-target:%') AND window_start<now()-interval '1 day' ORDER BY window_start LIMIT 1000)`,
  );
  return inserted.length > 0;
}
export type BehaviorRow = {
  day: string;
  event: string;
  kind: string;
  target_id: string;
  source: string;
  campaign_id: string | null;
  requests: number;
};
export async function readBehaviorAnalytics(
  database: IdentityDatabase,
  user: string,
  scope: "admin" | "creator" | "vendor",
  tool?: string,
) {
  return database.transaction(async (tx) => {
    if (scope === "admin") await checkAdmin(tx, user);
    else if (scope === "creator") await checkAuthor(tx, user, "skills");
    else if (
      !tool ||
      !resultRows(
        await tx.execute(
          sql`SELECT tool_id FROM public.vendor_access WHERE user_id=${user} AND tool_id=${tool}`,
        ),
      ).length
    )
      throw new AdminWorkflowError("Tool ownership is required.");
    if (!(await discoveryAvailable(tx)))
      return {
        ready: false,
        rows: [] as BehaviorRow[],
        status: undefined as
          | {
              events: number;
              oldest: string | null;
              expired: number;
              campaigns: number;
            }
          | undefined,
      };
    const where =
      scope === "admin"
        ? sql`true`
        : scope === "vendor"
          ? sql`e.kind='tools' AND e.target_id=${tool}`
          : sql`(e.kind='creators' AND e.target_id=${user} OR e.kind='skills' AND EXISTS(SELECT 1 FROM public.ai_skills s WHERE s.id=e.target_id AND s.user_id=${user}) OR e.kind='playbooks' AND EXISTS(SELECT 1 FROM public.ai_playbooks p WHERE p.id=e.target_id AND p.user_id=${user}) OR e.kind='resources' AND EXISTS(SELECT 1 FROM public.creator_resources r WHERE r.id=e.target_id AND r.user_id=${user}) OR e.kind='events' AND EXISTS(SELECT 1 FROM public.public_events v WHERE v.id=e.target_id AND v.user_id=${user}))`;
    const rows = resultRows<BehaviorRow>(
      await tx.execute(
        sql`SELECT (e.created_at AT TIME ZONE 'UTC')::date::text AS day,e.event,e.kind,e.target_id,e.source,e.campaign_id,count(*)::int AS requests FROM public.analytics_events e WHERE e.created_at>=now()-interval '30 days' AND ${where} GROUP BY day,e.event,e.kind,e.target_id,e.source,e.campaign_id ORDER BY day DESC,e.kind,e.target_id,e.event,e.source,e.campaign_id LIMIT 500`,
      ),
    );
    const status =
      scope === "admin"
        ? resultRows<{
            events: number;
            oldest: string | null;
            expired: number;
            campaigns: number;
          }>(
            await tx.execute(
              sql`SELECT count(*) FILTER(WHERE created_at>=now()-interval '30 days')::int AS events,min(created_at)::text AS oldest,count(*) FILTER(WHERE created_at<now()-interval '30 days')::int AS expired,count(*) FILTER(WHERE campaign_id IS NOT NULL AND created_at>=now()-interval '30 days')::int AS campaigns FROM public.analytics_events`,
            ),
          )[0]
        : undefined;
    return { ready: true, rows, status };
  });
}
export async function pruneAnalytics(database: IdentityDatabase, user: string) {
  return database.transaction(async (tx) => {
    await checkAdmin(tx, user);
    await requireDiscovery(tx);
    const rows = resultRows(
      await tx.execute(
        sql`DELETE FROM public.analytics_events WHERE id IN(SELECT id FROM public.analytics_events WHERE created_at<now()-interval '30 days' ORDER BY created_at LIMIT 10000) RETURNING id`,
      ),
    );
    const budgets = resultRows(
      await tx.execute(
        sql`DELETE FROM public.rate_limits WHERE key IN (SELECT key FROM public.rate_limits WHERE (key LIKE 'analytics:%' OR key LIKE 'analytics-target:%') AND window_start<now()-interval '1 day' ORDER BY window_start LIMIT 10000) RETURNING key`,
      ),
    );
    await audit(tx, user, "analytics.retention-pruned", "analytics_events", {
      removed: rows.length,
      expiredBudgets: budgets.length,
    });
    return rows.length;
  });
}
