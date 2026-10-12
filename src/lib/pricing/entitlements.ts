import { sql } from "drizzle-orm";
import type {
  IdentityTransaction,
  IdentityDatabase,
} from "../supabase/identity";
import { resultRows } from "../admin/tool-workflows";
import { creatorPublishingAllowed } from "../admin/review-storage";
import { AdminWorkflowError } from "../admin/contracts";
import { pricingAvailable, entitlementLock } from "./storage";
import { currentPricing } from "./releases";
import {
  PROPOSED_PRICING,
  pricingConfigSchema,
  quotaKeys,
  type PlanId,
  type QuotaKey,
  type PricingConfig,
} from "./config";
export async function entitlements(tx: IdentityTransaction, user: string) {
  const [u] = resultRows<{ is_admin: boolean; is_creator: boolean }>(
    await tx.execute(
      sql`SELECT is_admin,is_creator FROM public.users WHERE id=${user}`,
    ),
  );
  if (!u) throw new AdminWorkflowError("An available account is required.");
  const ready = await pricingAvailable(tx);
  const active = ready ? await currentPricing(tx) : null;
  const config = active?.config || PROPOSED_PRICING;
  const free = config.plans.filter((p) => p.id === "user_free");
  if (
    ready &&
    u.is_creator &&
    (await creatorPublishingAllowed(tx, user, true))
  ) {
    const [profile] = resultRows<{ status: string }>(
      await tx.execute(
        sql`SELECT status FROM public.account_profiles WHERE user_id=${user}`,
      ),
    );
    if (profile?.status !== "suspended")
      free.push(config.plans.find((p) => p.id === "creator_free")!);
  }
  if (
    ready &&
    resultRows(
      await tx.execute(
        sql`SELECT tool_id FROM public.vendor_access WHERE user_id=${user} LIMIT 1`,
      ),
    ).length
  )
    free.push(config.plans.find((p) => p.id === "vendor_free")!);
  const memberships = ready
    ? resultRows<{
        subscription_id: string;
        plan_id: PlanId;
        config: PricingConfig;
        interval: string;
        paid_through: string;
        status: string;
        cancel_at_period_end: boolean;
        revision: number;
        release_id: string;
      }>(
        await tx.execute(
          sql`SELECT b.*,r.config,s.status,s.cancel_at_period_end,b.paid_through::text FROM public.membership_bindings b JOIN public.pricing_releases r ON r.id=b.release_id JOIN public.commerce_subscriptions s ON s.id=b.subscription_id AND s.user_id=b.user_id WHERE b.user_id=${user} AND s.status='active' AND s.ends_at>now() AND b.paid_from<=now() AND b.paid_through>now() AND NOT EXISTS(SELECT 1 FROM public.pricing_refunds f WHERE f.payment_id=b.payment_id AND f.status='refunded') ORDER BY b.subscription_id LIMIT 10`,
        ),
      )
    : [];
  const qualified = memberships.filter((m) =>
    free.some((p) => p.family === m.plan_id.split("_")[0]),
  );
  const plans = [
    ...free,
    ...qualified.map((m) =>
      pricingConfigSchema
        .parse(m.config)
        .plans.find((p) => p.id === m.plan_id)!,
    ),
  ];
  const quotas = Object.fromEntries(
    quotaKeys.map((k) => [k, Math.max(...plans.map((p) => p.quotas[k]))]),
  ) as Record<QuotaKey, number>;
  const discounts = {
    submission: Math.max(...plans.map((p) => p.discounts.submission)),
    edit: Math.max(...plans.map((p) => p.discounts.edit)),
    verification: Math.max(...plans.map((p) => p.discounts.verification)),
  };
  return {
    ready,
    active,
    config,
    plans,
    quotas,
    discounts,
    memberships: qualified,
    isAdmin: u.is_admin,
  };
}
const ownership: Record<
  QuotaKey,
  { table: string; where?: ReturnType<typeof sql> }
> = {
  stacks: { table: "stacks" },
  saves: { table: "saved_tools" },
  comparisons: { table: "saved_comparisons" },
  follows: { table: "account_follows" },
  skills: { table: "ai_skills", where: sql`status<>'archived'` },
  playbooks: { table: "ai_playbooks", where: sql`status<>'archived'` },
  resources: { table: "creator_resources", where: sql`status<>'archived'` },
  events: {
    table: "public_events",
    where: sql`status NOT IN ('archived','canceled')`,
  },
  files: { table: "resource_files", where: sql`status<>'failed'` },
  storageBytes: { table: "resource_files", where: sql`status<>'failed'` },
  submissionsMonthly: { table: "tool_submissions" },
  editsMonthly: { table: "vendor_edit_requests" },
  verificationsMonthly: { table: "verification_requests" },
  claimsMonthly: { table: "claim_requests" },
};
export async function quotaUsage(
  tx: IdentityTransaction,
  user: string,
  key: QuotaKey,
) {
  const spec = ownership[key];
  const [r] = resultRows<{ n: number }>(
    await tx.execute(
      sql`SELECT ${key === "storageBytes" ? sql`coalesce(sum(bytes),0)` : sql`count(*)`}::bigint AS n FROM public.${sql.identifier(spec.table)} WHERE user_id=${user} ${spec.where ? sql`AND ${spec.where}` : sql``} ${key.endsWith("Monthly") ? sql`AND created_at >= (date_trunc('month',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')` : sql``}`,
    ),
  );
  let n = Number(r.n);
  if (key === "saves") {
    const [c] = resultRows<{ n: number }>(
      await tx.execute(
        sql`SELECT count(*)::int AS n FROM public.saved_entities WHERE user_id=${user}`,
      ),
    );
    n += c.n;
  }
  return n;
}
export async function assertQuota(
  tx: IdentityTransaction,
  user: string,
  key: QuotaKey,
  additional = 1,
) {
  if (process.env.AIBEAN_PRICING_WORKFLOWS !== "true") return;
  await entitlementLock(tx, user);
  const e = await entitlements(tx, user);
  if (!e.ready)
    throw new AdminWorkflowError(
      "Quota enforcement awaits the reviewed membership database package.",
    );
  if (e.isAdmin) return;
  if (!Number.isSafeInteger(additional) || additional < 0)
    throw new AdminWorkflowError("Invalid quota reservation.");
  const used = await quotaUsage(tx, user, key);
  if (used + additional > e.quotas[key])
    throw new AdminWorkflowError(
      "Your " +
        key.replace("Monthly", " monthly request") +
        " limit is reached. Existing content remains available; remove an item or review membership options.",
    );
}
export async function readMembership(database: IdentityDatabase, user: string) {
  return database.transaction(async (tx) => {
    const e = await entitlements(tx, user);
    const usage = e.ready
      ? await Promise.all(
          quotaKeys.map(async (key) => ({
            key,
            used: await quotaUsage(tx, user, key),
            limit: e.quotas[key],
          })),
        )
      : [];
    const changes = e.ready
      ? resultRows<{
          id: string;
          interval: string;
          status: string;
          effective_at: string;
        }>(
          await tx.execute(
            sql`SELECT id,interval,status,effective_at::text FROM public.membership_changes WHERE user_id=${user} ORDER BY created_at DESC LIMIT 20`,
          ),
        )
      : [];
    const refunds = e.ready
      ? resultRows<{
          id: string;
          payment_id: string;
          amount: number;
          status: string;
          revision: number;
          review_reason: string | null;
        }>(
          await tx.execute(
            sql`SELECT id,payment_id,amount,status,revision,review_reason FROM public.pricing_refunds WHERE user_id=${user} ORDER BY created_at DESC LIMIT 30`,
          ),
        )
      : [];
    return { ...e, usage, changes, refunds };
  });
}
