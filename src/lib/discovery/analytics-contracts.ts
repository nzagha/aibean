import { z } from "zod";
export const analyticsEvents = [
  "search",
  "discovery_view",
  "tool_view",
  "save",
  "comparison_add",
  "comparison_complete",
  "stack_add",
  "skill_view",
  "playbook_view",
  "resource_view",
  "creator_view",
  "event_view",
  "resource_download",
  "event_outbound",
  "tool_outbound",
  "resource_outbound",
] as const;
export const analyticsInput = z
  .object({
    event: z.enum(analyticsEvents),
    kind: z.enum([
      "tools",
      "skills",
      "playbooks",
      "resources",
      "creators",
      "events",
      "discovery",
    ]),
    targetId: z.string().min(1).max(100),
    campaignId: z.string().min(1).max(100).optional(),
    filters: z
      .object({
        category: z.string().max(100).optional(),
        useCase: z.string().max(100).optional(),
        industry: z.string().max(100).optional(),
        hasQuery: z.boolean().optional(),
        subcategory: z.string().max(100).optional(),
        pricing: z.enum(["free", "freemium", "paid", "unknown"]).optional(),
        free: z.literal("true").optional(),
        trial: z.literal("true").optional(),
        verified: z.literal("true").optional(),
        claimed: z.literal("true").optional(),
        recency: z.enum(["30", "90", "180"]).optional(),
        rating: z.enum(["3", "4", "4.5"]).optional(),
        sort: z.enum(["rank", "name", "rating", "freshness"]).optional(),
        verification: z.string().max(100).optional(),
        type: z.string().max(100).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type AnalyticsInput = z.infer<typeof analyticsInput>;
export type AnalyticsSession = {
  hash: string;
  source:
    | "direct"
    | "directory"
    | "comparison"
    | "stack"
    | "creator"
    | "resource"
    | "event"
    | "featured";
};
export const eventKinds: Record<
  (typeof analyticsEvents)[number],
  readonly string[]
> = {
  search: ["discovery"],
  discovery_view: ["discovery"],
  tool_view: ["tools"],
  save: ["tools", "skills", "playbooks", "events"],
  comparison_add: ["tools"],
  comparison_complete: ["tools"],
  stack_add: ["tools"],
  skill_view: ["skills"],
  playbook_view: ["playbooks"],
  resource_view: ["resources"],
  creator_view: ["creators"],
  event_view: ["events"],
  resource_download: ["skills", "playbooks", "resources"],
  event_outbound: ["events"],
  tool_outbound: ["tools"],
  resource_outbound: ["resources"],
};
export const browserEvents = new Set([
  "search",
  "discovery_view",
  "tool_view",
  "comparison_add",
  "comparison_complete",
  "skill_view",
  "playbook_view",
  "resource_view",
  "creator_view",
  "event_view",
]);

export function selectedAnalyticsFilters(params: Record<string, unknown>) {
  const keys = [
    "category",
    "useCase",
    "industry",
    "subcategory",
    "pricing",
    "free",
    "trial",
    "verified",
    "claimed",
    "recency",
    "rating",
    "sort",
    "verification",
    "type",
  ];
  const values = Object.fromEntries(
    keys.flatMap((k) =>
      typeof params[k] === "string" && params[k] ? [[k, params[k]]] : [],
    ),
  );
  const parsed = analyticsInput.shape.filters.safeParse({
    ...values,
    hasQuery: !!params.q,
  });
  return parsed.success ? parsed.data : { hasQuery: !!params.q };
}
