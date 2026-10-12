import { z } from "zod";
export const planIds = [
  "user_free",
  "creator_free",
  "creator_pro",
  "vendor_free",
  "vendor_pro",
] as const;
export type PlanId = (typeof planIds)[number];
export const feeKinds = [
  "submission",
  "edit",
  "verification",
  "claim",
  "featured",
] as const;
export type FeeKind = (typeof feeKinds)[number];
export const quotaKeys = [
  "stacks",
  "saves",
  "comparisons",
  "follows",
  "skills",
  "playbooks",
  "resources",
  "events",
  "files",
  "storageBytes",
  "submissionsMonthly",
  "editsMonthly",
  "verificationsMonthly",
  "claimsMonthly",
] as const;
export type QuotaKey = (typeof quotaKeys)[number];
export const quotaLabels: Record<QuotaKey, string> = {
  stacks: "Personal Stacks",
  saves: "Saved Tools & content",
  comparisons: "Saved comparisons",
  follows: "Following",
  skills: "Active Skills",
  playbooks: "Active Playbooks",
  resources: "Resource Pages",
  events: "Active Events",
  files: "Stored files",
  storageBytes: "File storage (MB)",
  submissionsMonthly: "Tool submissions / UTC month",
  editsMonthly: "Edit requests / UTC month",
  verificationsMonthly: "Verification requests / UTC month",
  claimsMonthly: "Claim requests / UTC month",
};
export const APPROVED_PLACEMENT = {
  amount: 9900,
  currency: "usd",
  days: 5,
  label: "$99",
} as const;
const limits = z
  .object(
    Object.fromEntries(
      quotaKeys.map((k) => [
        k,
        z
          .number()
          .int()
          .min(0)
          .max(k === "storageBytes" ? 1073741824 : 10000),
      ]),
    ) as Record<QuotaKey, z.ZodNumber>,
  )
  .strict();
const discounts = z
  .object({
    submission: z.number().int().min(0).max(5000),
    edit: z.number().int().min(0).max(5000),
    verification: z.number().int().min(0).max(5000),
  })
  .strict();
const plan = z
  .object({
    id: z.enum(planIds),
    name: z.string().trim().min(3).max(60),
    family: z.enum(["user", "creator", "vendor"]),
    monthly: z.number().int().min(0).max(100000),
    annual: z.number().int().min(0).max(1200000),
    quotas: limits,
    discounts,
  })
  .strict();
export const pricingConfigSchema = z
  .object({
    version: z.string().regex(/^pricing-v\d+\.\d+\.\d+$/),
    currency: z.literal("usd"),
    plans: z.array(plan).length(5),
    fees: z
      .object({
        submission: z.number().int().min(1).max(100000),
        edit: z.number().int().min(1).max(100000),
        verification: z.number().int().min(0).max(100000),
        claim: z.number().int().min(1).max(100000),
        featured: z.literal(APPROVED_PLACEMENT.amount),
      })
      .strict(),
    placementDays: z.literal(APPROVED_PLACEMENT.days),
    refundRequestDays: z.literal(7),
    analyticsDays: z.literal(30),
    fileMaxBytes: z.literal(5242880),
  })
  .strict()
  .superRefine((v, c) => {
    if (new Set(v.plans.map((p) => p.id)).size !== 5)
      c.addIssue({
        code: "custom",
        message: "Every approved plan identifier is required exactly once.",
      });
    for (const p of v.plans) {
      const family = p.id.split("_")[0];
      if (p.family !== family)
        c.addIssue({
          code: "custom",
          message: "Plan family must match its stable identifier.",
        });
      if (
        p.id.endsWith("_free") &&
        (p.monthly || p.annual || Object.values(p.discounts).some(Boolean))
      )
        c.addIssue({
          code: "custom",
          message: "Free membership must remain free without paid discounts.",
        });
      if (
        p.id.endsWith("_pro") &&
        (!p.monthly || !p.annual || p.annual > p.monthly * 12)
      )
        c.addIssue({
          code: "custom",
          message:
            "Pro needs positive monthly/annual prices; annual must not exceed twelve monthly payments.",
        });
      if (p.quotas.comparisons !== 100 || p.quotas.follows !== 1000)
        c.addIssue({
          code: "custom",
          message: "Preserve existing 100 comparisons and 1,000 follows.",
        });
    }
  });
export type PricingConfig = z.infer<typeof pricingConfigSchema>;
const personal = {
  stacks: 20,
  saves: 1000,
  comparisons: 100,
  follows: 1000,
  skills: 0,
  playbooks: 0,
  resources: 0,
  events: 0,
  files: 0,
  storageBytes: 0,
  submissionsMonthly: 10,
  editsMonthly: 10,
  verificationsMonthly: 5,
  claimsMonthly: 10,
};
const freeAuthor = {
  ...personal,
  skills: 5,
  playbooks: 3,
  resources: 3,
  events: 2,
  files: 10,
  storageBytes: 52428800,
};
const noDiscount = { submission: 0, edit: 0, verification: 0 };
export const PROPOSED_PRICING: PricingConfig = pricingConfigSchema.parse({
  version: "pricing-v1.0.0",
  currency: "usd",
  plans: [
    {
      id: "user_free",
      name: "User Free",
      family: "user",
      monthly: 0,
      annual: 0,
      quotas: personal,
      discounts: noDiscount,
    },
    {
      id: "creator_free",
      name: "Creator Free",
      family: "creator",
      monthly: 0,
      annual: 0,
      quotas: freeAuthor,
      discounts: noDiscount,
    },
    {
      id: "creator_pro",
      name: "Creator Pro",
      family: "creator",
      monthly: 1900,
      annual: 19000,
      quotas: {
        ...freeAuthor,
        stacks: 100,
        skills: 50,
        playbooks: 25,
        resources: 50,
        events: 10,
        files: 200,
        storageBytes: 524288000,
        submissionsMonthly: 20,
        editsMonthly: 20,
        verificationsMonthly: 10,
      },
      discounts: { submission: 2000, edit: 2500, verification: 2000 },
    },
    {
      id: "vendor_free",
      name: "Vendor Free",
      family: "vendor",
      monthly: 0,
      annual: 0,
      quotas: { ...personal, events: 2 },
      discounts: noDiscount,
    },
    {
      id: "vendor_pro",
      name: "Vendor Pro",
      family: "vendor",
      monthly: 3900,
      annual: 39000,
      quotas: {
        ...personal,
        stacks: 100,
        events: 10,
        submissionsMonthly: 50,
        editsMonthly: 50,
        verificationsMonthly: 20,
      },
      discounts: { submission: 3000, edit: 5000, verification: 3000 },
    },
  ],
  fees: {
    submission: 4900,
    edit: 1900,
    verification: 4900,
    claim: 4900,
    featured: APPROVED_PLACEMENT.amount,
  },
  placementDays: APPROVED_PLACEMENT.days,
  refundRequestDays: 7,
  analyticsDays: 30,
  fileMaxBytes: 5242880,
});
export function feeQuote(
  config: PricingConfig,
  kind: FeeKind,
  plans: PlanId[],
) {
  const base = config.fees[kind];
  const bps =
    kind === "claim" || kind === "featured"
      ? 0
      : Math.max(
          0,
          ...config.plans
            .filter((p) => plans.includes(p.id))
            .map((p) => p.discounts[kind]),
        );
  const discount = Math.floor((base * bps) / 10000);
  return {
    base,
    discount,
    bps,
    amount: base - discount,
    currency: config.currency,
  };
}
export function dollars(amount: number) {
  return "$" + (amount / 100).toFixed(2);
}
export function nextPricingVersion(version: string) {
  const parts = version.replace("pricing-v", "").split(".").map(Number);
  return "pricing-v" + parts[0] + "." + parts[1] + "." + (parts[2] + 1);
}
