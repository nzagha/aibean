import { randomUUID, createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import type {
  IdentityDatabase,
  IdentityTransaction,
} from "../supabase/identity";
import { checkAdmin, resultRows, audit } from "../admin/tool-workflows";
import { AdminWorkflowError, recordId, reasonInput } from "../admin/contracts";
import {
  pricingConfigSchema,
  PROPOSED_PRICING,
  type PricingConfig,
} from "./config";
import { pricingAvailable, requirePricing } from "./storage";
export type Release = {
  id: string;
  version: string;
  config: PricingConfig;
  config_sha256: string;
  status: string;
  revision: number;
  provider_prices: Record<string, string>;
};
export const priceBindingsSchema = z
  .object({
    creator_pro_month: z.string().regex(/^price_[a-zA-Z0-9_]+$/),
    creator_pro_year: z.string().regex(/^price_[a-zA-Z0-9_]+$/),
    vendor_pro_month: z.string().regex(/^price_[a-zA-Z0-9_]+$/),
    vendor_pro_year: z.string().regex(/^price_[a-zA-Z0-9_]+$/),
  })
  .strict();
export type PriceBindings = z.infer<typeof priceBindingsSchema>;
export type PriceProvider = {
  verify: (
    id: string,
  ) => Promise<{
    id: string;
    active: boolean;
    livemode: boolean;
    amount: number | null;
    currency: string;
    interval: string | null;
    intervalCount: number;
  }>;
};
export const configDigest = (config: PricingConfig) =>
  createHash("sha256")
    .update(JSON.stringify(pricingConfigSchema.parse(config)))
    .digest("hex");
export async function currentPricing(tx: IdentityTransaction) {
  if (!(await pricingAvailable(tx))) return null;
  return (
    resultRows<Release>(
      await tx.execute(
        sql`SELECT * FROM public.pricing_releases WHERE status='active' FOR SHARE`,
      ),
    )[0] || null
  );
}
export async function readPricing(database: IdentityDatabase, actor?: string) {
  return database.transaction(async (tx) => {
    if (actor) await checkAdmin(tx, actor);
    const ready = await pricingAvailable(tx);
    const rows = ready
      ? resultRows<Release>(
          await tx.execute(
            sql`SELECT * FROM public.pricing_releases ORDER BY created_at DESC,id LIMIT 30`,
          ),
        )
      : [];
    const active = rows.find((r) => r.status === "active");
    return {
      ready,
      rows,
      active,
      config: active?.config || rows[0]?.config || PROPOSED_PRICING,
    };
  });
}
const draftInput = z
  .object({
    id: recordId.optional(),
    revision: z.coerce.number().int().positive().optional(),
    config: pricingConfigSchema,
    reason: reasonInput,
  })
  .strict();
export async function savePricingRelease(
  database: IdentityDatabase,
  actor: string,
  value: unknown,
) {
  const input = draftInput.parse(value);
  return database.transaction(async (tx) => {
    await checkAdmin(tx, actor);
    await requirePricing(tx);
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended('pricing-config',0))`,
    );
    const id = input.id || randomUUID();
    if (input.id) {
      const [old] = resultRows<Release>(
        await tx.execute(
          sql`SELECT * FROM public.pricing_releases WHERE id=${id} FOR UPDATE`,
        ),
      );
      if (!old || old.status !== "proposed" || old.revision !== input.revision)
        throw new AdminWorkflowError(
          "Only an unchanged proposed configuration can be edited. Create a new version for reviewed or active settings.",
        );
      await tx.execute(
        sql`UPDATE public.pricing_releases SET version=${input.config.version},config=${JSON.stringify(input.config)}::jsonb,config_sha256=${configDigest(input.config)},revision=revision+1 WHERE id=${id}`,
      );
    } else {
      if (input.revision)
        throw new AdminWorkflowError("A new proposal has no revision.");
      await tx.execute(
        sql`INSERT INTO public.pricing_releases(id,version,config,config_sha256,created_by) VALUES(${id},${input.config.version},${JSON.stringify(input.config)}::jsonb,${configDigest(input.config)},${actor})`,
      );
    }
    await audit(tx, actor, "pricing.proposed", id, {
      version: input.config.version,
      reason: input.reason,
      chargeable: false,
    });
    return id;
  });
}
const decision = z.object({
  id: recordId,
  revision: z.coerce.number().int().positive(),
  reason: reasonInput,
});
export async function reviewPricingRelease(
  database: IdentityDatabase,
  actor: string,
  value: unknown,
) {
  const i = decision.parse(value);
  await database.transaction(async (tx) => {
    await checkAdmin(tx, actor);
    await requirePricing(tx);
    const [r] = resultRows<Release>(
      await tx.execute(
        sql`SELECT * FROM public.pricing_releases WHERE id=${i.id} FOR UPDATE`,
      ),
    );
    if (
      !r ||
      r.status !== "proposed" ||
      r.revision !== i.revision ||
      configDigest(r.config) !== r.config_sha256
    )
      throw new AdminWorkflowError(
        "Pricing proposal changed or is not reviewable.",
      );
    await tx.execute(
      sql`UPDATE public.pricing_releases SET status='reviewed',reviewed_by=${actor},review_reason=${i.reason},revision=revision+1 WHERE id=${i.id}`,
    );
    await audit(tx, actor, "pricing.reviewed", i.id, {
      reason: i.reason,
      sha256: r.config_sha256,
      chargeable: false,
    });
  });
}
export async function activatePricingRelease(
  database: IdentityDatabase,
  actor: string,
  value: unknown,
  prices: unknown,
  provider: PriceProvider,
) {
  const i = decision.parse(value),
    bindings = priceBindingsSchema.parse(prices);
  const r = await database.transaction(async (tx) => {
    await checkAdmin(tx, actor);
    await requirePricing(tx);
    return resultRows<Release>(
      await tx.execute(
        sql`SELECT * FROM public.pricing_releases WHERE id=${i.id}`,
      ),
    )[0];
  });
  if (
    !r ||
    r.status !== "reviewed" ||
    r.revision !== i.revision ||
    configDigest(r.config) !== r.config_sha256 ||
    process.env.AIBEAN_PRICING_APPROVED_SHA256 !== r.config_sha256
  )
    throw new AdminWorkflowError(
      "Separate owner approval for this exact configuration is required before sandbox activation.",
    );
  for (const [key, id] of Object.entries(bindings)) {
    const plan = r.config.plans.find((p) => key.startsWith(p.id + "_"))!,
      interval = key.endsWith("_year") ? "year" : "month",
      p = await provider.verify(id);
    if (
      p.id !== id ||
      p.livemode ||
      !p.active ||
      p.currency !== "usd" ||
      p.interval !== interval ||
      p.intervalCount !== 1 ||
      p.amount !== (interval === "year" ? plan.annual : plan.monthly)
    )
      throw new AdminWorkflowError(
        "Verified test-mode provider prices must match every proposed monthly/annual amount.",
      );
  }
  await database.transaction(async (tx) => {
    await checkAdmin(tx, actor);
    await requirePricing(tx);
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended('pricing-config',0))`,
    );
    const [fresh] = resultRows<Release>(
      await tx.execute(
        sql`SELECT * FROM public.pricing_releases WHERE id=${i.id} FOR UPDATE`,
      ),
    );
    if (
      !fresh ||
      fresh.status !== "reviewed" ||
      fresh.revision !== i.revision ||
      fresh.config_sha256 !== r.config_sha256 ||
      process.env.AIBEAN_PRICING_APPROVED_SHA256 !== fresh.config_sha256
    )
      throw new AdminWorkflowError(
        "Reviewed configuration or activation approval changed.",
      );
    await tx.execute(
      sql`UPDATE public.pricing_releases SET status='retired',revision=revision+1 WHERE status='active'`,
    );
    await tx.execute(
      sql`UPDATE public.pricing_releases SET status='active',activated_at=now(),provider_prices=${JSON.stringify(bindings)}::jsonb,revision=revision+1 WHERE id=${i.id}`,
    );
    for (const kind of [
      "submission",
      "edit",
      "verification",
      "creator_subscription",
      "vendor_subscription",
    ] as const) {
      const plan =
        kind === "creator_subscription"
          ? fresh.config.plans.find((p) => p.id === "creator_pro")
          : kind === "vendor_subscription"
            ? fresh.config.plans.find((p) => p.id === "vendor_pro")
            : null;
      const amount =
        plan?.monthly ??
        fresh.config.fees[kind as "submission" | "edit" | "verification"];
      await tx.execute(
        sql`INSERT INTO public.billing_products(id,name,amount,active,updated_by) VALUES(${kind},${plan?.name || kind},${amount},false,${actor}) ON CONFLICT DO NOTHING`,
      );
    }
    await audit(tx, actor, "pricing.sandbox-activated", i.id, {
      reason: i.reason,
      sha256: r.config_sha256,
      prices: bindings,
      live: false,
      capabilities: false,
    });
  });
}
