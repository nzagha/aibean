import { sql } from "drizzle-orm";
import type { IdentityDatabase } from "../supabase/identity";
import { checkAdmin, resultRows, type AdminToolRecord } from "./tool-workflows";
import { reviewWorkflowsAvailable } from "./review-storage";
import { workspaceFilters } from "../workspace-filters";
import { commerceAvailable } from "./commerce-storage";
export type AdminParams = {
  q?: string;
  status?: string;
  category?: string;
  sort?: string;
  page?: string;
  action?: string;
  entity?: string;
};
export type AdminRow = Record<string, unknown> & {
  id: string;
  revision: string;
  name?: string;
  tool_name?: string;
  status: string;
  body?: string;
  rating?: number;
  proof?: string;
  company?: string;
  role?: string;
  reason?: string;
  review_reason?: string;
  payment_state?: string;
  bio?: string;
  note?: string;
  proposed?: unknown;
  evidence?: unknown;
  links?: unknown;
  order_status?: string;
  order_matches?: boolean;
  user_id?: string;
  desired_state?: string;
  decision?: string;
  settled?: boolean;
};
export const reviewQueues = [
  "reviews",
  "claims",
  "creators",
  "edits",
  "verification",
  "disputes",
  "capabilities",
] as const;
export type ReviewQueue = (typeof reviewQueues)[number];
const tables = {
  reviews: "tool_reviews",
  claims: "claim_requests",
  creators: "creator_applications",
  edits: "vendor_edit_requests",
  verification: "verification_requests",
  disputes: "claim_disputes",
  capabilities: "creator_capability_requests",
};
const statuses = {
  reviews: ["pending", "approved", "rejected"],
  claims: [
    "pending_review",
    "payment_required",
    "approved",
    "rejected",
    "revoked",
  ],
  creators: ["pending", "approved", "rejected", "suspension_requested"],
  edits: ["pending", "approved", "rejected"],
  verification: ["pending", "approved", "rejected"],
  disputes: ["open", "resolved"],
  capabilities: ["pending_operator", "applied", "cancelled"],
};
export function normalizeAdminParams(input: AdminParams): AdminParams {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => typeof value === "string"),
  );
}
export function adminFilters(input: AdminParams) {
  const params = normalizeAdminParams(input);
  return {
    ...workspaceFilters(params),
    category: (params.category || "").slice(0, 100),
    sort: ["name", "oldest", "updated"].includes(params.sort || "")
      ? params.sort!
      : "updated",
    action: (params.action || "").slice(0, 100),
    entity: (params.entity || "").slice(0, 100),
  };
}
const like = (q: string) => "%" + q.replace(/[\\%_]/g, "\\$&") + "%";
export async function readAdminTools(
  database: IdentityDatabase,
  actorId: string,
  params: AdminParams,
) {
  const f = adminFilters(params);
  return database.transaction(async (tx) => {
    await checkAdmin(tx, actorId);
    const where = sql`WHERE (${f.status || null}::text IS NULL OR status=${f.status || null}) AND (${f.category || null}::text IS NULL OR category_id=${f.category || null}) AND (name ILIKE ${like(f.q)} OR slug ILIKE ${like(f.q)})`;
    const order =
      f.sort === "name"
        ? sql`name ASC,id`
        : f.sort === "oldest"
          ? sql`updated_at ASC,id`
          : sql`updated_at DESC,id`;
    const [total] = resultRows<{ value: number }>(
      await tx.execute(
        sql`SELECT count(*)::int AS value FROM public.tools ${where}`,
      ),
    );
    const rows = resultRows<AdminToolRecord>(
      await tx.execute(
        sql`SELECT *,updated_at::text AS revision FROM public.tools ${where} ORDER BY ${order} LIMIT ${f.size} OFFSET ${(f.page - 1) * f.size}`,
      ),
    );
    return { rows, total: total.value, filters: f };
  });
}
export async function readAdminTool(
  database: IdentityDatabase,
  actorId: string,
  id: string,
) {
  return database.transaction(async (tx) => {
    await checkAdmin(tx, actorId);
    const [row] = resultRows<AdminToolRecord>(
      await tx.execute(
        sql`SELECT *,updated_at::text AS revision FROM public.tools WHERE id=${id}`,
      ),
    );
    return row;
  });
}
export async function readAdminOverview(
  database: IdentityDatabase,
  actorId: string,
) {
  return database.transaction(async (tx) => {
    await checkAdmin(tx, actorId);
    const counts = resultRows<{ label: string; value: number }>(
      await tx.execute(
        sql`SELECT status||' Tools' AS label,count(*)::int AS value FROM public.tools GROUP BY status UNION ALL SELECT 'Pending reviews',count(*)::int FROM public.tool_reviews WHERE status='pending' UNION ALL SELECT 'Paid claims awaiting review',count(*)::int FROM public.claim_requests c JOIN public.orders o ON o.claim_id=c.id AND o.user_id=c.user_id WHERE c.status='pending_review' AND o.status='paid'`,
      ),
    );
    const reviewReady = await reviewWorkflowsAvailable(tx);
    if (reviewReady)
      counts.push(
        ...resultRows<{ label: string; value: number }>(
          await tx.execute(
            sql`SELECT 'Creator applications' AS label,count(*)::int AS value FROM public.creator_applications WHERE status='pending' UNION ALL SELECT 'Vendor edits',count(*)::int FROM public.vendor_edit_requests WHERE status='pending' UNION ALL SELECT 'Verification requests',count(*)::int FROM public.verification_requests WHERE status='pending' UNION ALL SELECT 'Open disputes',count(*)::int FROM public.claim_disputes WHERE status='open'`,
          ),
        ),
      );
    counts.push(
      ...resultRows<{ label: string; value: number }>(
        await tx.execute(
          sql`SELECT 'Featured awaiting review' AS label,count(*)::int AS value FROM public.featured_placements WHERE status='pending_review'`,
        ),
      ),
    );
    const recent = resultRows<{
      id: string;
      action: string;
      entity_id: string;
      created_at: string;
    }>(
      await tx.execute(
        sql`SELECT id,action,entity_id,created_at::text FROM public.audit_logs ORDER BY public.audit_logs.created_at DESC,id LIMIT 10`,
      ),
    );
    return { counts, reviewReady, recent };
  });
}
export async function readAdminQueue(
  database: IdentityDatabase,
  actorId: string,
  kind: ReviewQueue,
  params: AdminParams,
) {
  if (!reviewQueues.includes(kind)) throw new Error("Invalid queue");
  const f = adminFilters(params);
  params = normalizeAdminParams(params);
  const status = statuses[kind].includes(params.status || "")
    ? params.status
    : undefined;
  return database.transaction(async (tx) => {
    await checkAdmin(tx, actorId);
    const ready = await reviewWorkflowsAvailable(tx);
    const commercialReady =
      ["edits", "verification"].includes(kind) && (await commerceAvailable(tx));
    if (!["reviews", "claims"].includes(kind) && !ready)
      return { ready: false, rows: [] as AdminRow[], total: 0, filters: f };
    const table = sql.identifier(tables[kind]);
    const toolJoin = [
      "reviews",
      "claims",
      "edits",
      "verification",
      "disputes",
    ].includes(kind);
    const from = sql`FROM public.${table} r ${toolJoin ? sql`JOIN public.tools t ON t.id=r.tool_id` : sql``} ${kind === "claims" ? sql`LEFT JOIN public.orders o ON o.claim_id=r.id` : sql``}`;
    const where = sql`WHERE (${status || null}::text IS NULL OR r.status=${status || null}) AND (r.id ILIKE ${like(f.q)} ${toolJoin ? sql`OR t.name ILIKE ${like(f.q)}` : kind === "creators" ? sql`OR r.name ILIKE ${like(f.q)}` : sql``})`;
    const revision =
      kind === "reviews"
        ? sql`r.xmin::text`
        : kind === "claims" || kind === "capabilities"
          ? sql`r.created_at::text`
          : sql`r.updated_at::text`;
    const rows = resultRows<AdminRow>(
      await tx.execute(
        sql`SELECT r.*, ${revision} AS revision ${toolJoin ? sql`,t.name AS tool_name` : sql``} ${kind === "claims" ? sql`,o.status AS order_status, o.user_id=r.user_id AS order_matches` : sql``} ${commercialReady ? sql`,EXISTS(SELECT 1 FROM public.billing_transactions p WHERE p.kind=${kind === "edits" ? "edit" : "verification"} AND p.subject_id=r.id AND p.user_id=r.user_id AND p.status='paid') AS settled` : sql``} ${from} ${where} ORDER BY r.created_at DESC,r.id LIMIT ${f.size} OFFSET ${(f.page - 1) * f.size}`,
      ),
    );
    const [total] = resultRows<{ value: number }>(
      await tx.execute(sql`SELECT count(*)::int AS value ${from} ${where}`),
    );
    return { ready: true, rows, total: total.value, filters: f };
  });
}
export async function readAdminAudit(
  database: IdentityDatabase,
  actorId: string,
  params: AdminParams,
) {
  const f = adminFilters(params);
  return database.transaction(async (tx) => {
    await checkAdmin(tx, actorId);
    const where = sql`WHERE (action ILIKE ${like(f.q)} OR entity_id ILIKE ${like(f.q)}) AND (${f.action || null}::text IS NULL OR action=${f.action || null}) AND (${f.entity || null}::text IS NULL OR entity_id=${f.entity || null})`;
    const rows = resultRows<{
      id: string;
      action: string;
      actor_id: string;
      entity_id: string;
      detail: string;
      created_at: string;
    }>(
      await tx.execute(
        sql`SELECT *,created_at::text FROM public.audit_logs ${where} ORDER BY public.audit_logs.created_at DESC,id LIMIT ${f.size} OFFSET ${(f.page - 1) * f.size}`,
      ),
    );
    const [total] = resultRows<{ value: number }>(
      await tx.execute(
        sql`SELECT count(*)::int AS value FROM public.audit_logs ${where}`,
      ),
    );
    return { rows, total: total.value, filters: f };
  });
}
export const queueStatuses = (kind: ReviewQueue) => statuses[kind];
