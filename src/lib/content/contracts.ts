import { z } from "zod";
import { taxonomy, activeUseCases } from "../catalog/taxonomy";
import { safeWebUrl } from "../validation";
import { recordId, reasonInput, revisionInput } from "../admin/contracts";
export const contentKinds = [
  "skills",
  "playbooks",
  "resources",
  "events",
] as const;
export type ContentKind = (typeof contentKinds)[number];
const ids = z
  .array(recordId)
  .max(30)
  .refine((v) => v.length === new Set(v).size, "Remove duplicate references.");
const base = z.object({
  title: z.string().trim().min(3).max(120),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(3)
    .max(100),
  summary: z.string().trim().min(30).max(1200),
  categoryId: z
    .string()
    .refine(
      (id) => taxonomy.categories.some((c) => c.id === id),
      "Choose an approved category.",
    ),
  useCaseIds: ids.refine((v) =>
    v.every((id) => activeUseCases.some((c) => c.id === id)),
  ),
  industryIds: ids.refine((v) =>
    v.every((id) => taxonomy.industries.some((c) => c.id === id)),
  ),
  toolIds: ids,
});
export const skillInput = base.extend({
  outcome: z.string().trim().min(20).max(600),
  instructions: z.string().trim().min(30).max(20000),
  prompts: z.string().trim().max(10000),
  examples: z.string().trim().max(6000),
});
export const playbookInput = base.extend({
  outcome: z.string().trim().min(20).max(600),
  audience: z.string().trim().min(10).max(500),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  minutes: z.coerce.number().int().min(1).max(100000),
  steps: z
    .array(
      z.object({
        title: z.string().trim().min(3).max(150),
        instruction: z.string().trim().min(20).max(3000),
      }),
    )
    .min(1)
    .max(40),
  examples: z.string().trim().max(6000),
  skillIds: ids,
});
export const resourceInput = base.omit({ toolIds: true }).extend({
  destination: safeWebUrl.max(2000),
  disclosure: z.string().trim().min(5).max(500),
  skillId: recordId.nullable(),
  playbookId: recordId.nullable(),
});
export const eventInput = base
  .extend({
    description: z.string().trim().min(30).max(12000),
    organizer: z.string().trim().min(3).max(150),
    eventType: z.enum([
      "conference",
      "summit",
      "workshop",
      "creator_session",
      "vendor_webinar",
      "meetup",
      "training",
    ]),
    format: z.enum(["in_person", "virtual", "hybrid"]),
    venue: z.string().trim().max(300),
    city: z.string().trim().max(150),
    country: z.string().trim().max(150),
    virtualUrl: safeWebUrl.max(2000).nullable(),
    registrationUrl: safeWebUrl.max(2000),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    timezone: z
      .string()
      .max(100)
      .refine((zone) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: zone });
          return true;
        } catch {
          return false;
        }
      }, "Choose a valid timezone."),
  })
  .superRefine((e, ctx) => {
    if (Date.parse(e.endsAt) <= Date.parse(e.startsAt))
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "End must be later than start.",
      });
    if (e.format !== "in_person" && !e.virtualUrl)
      ctx.addIssue({
        code: "custom",
        path: ["virtualUrl"],
        message: "Virtual/hybrid events require a URL.",
      });
    if (e.format !== "virtual" && (!e.city || !e.country))
      ctx.addIssue({
        code: "custom",
        path: ["city"],
        message: "Physical events require city and country.",
      });
  });
export const profileInput = z.object({
  handle: z.string().regex(/^[a-z0-9][a-z0-9-]{2,29}$/),
  displayName: z.string().trim().min(2).max(100),
  bio: z.string().trim().min(20).max(2000),
  website: z.union([safeWebUrl.max(2000), z.literal("")]),
});
export const schemas = {
  skills: skillInput,
  playbooks: playbookInput,
  resources: resourceInput,
  events: eventInput,
};
export const contentDecision = z.object({
  id: recordId,
  revision: revisionInput,
  decision: z.enum(["published", "rejected", "archived", "canceled"]),
  reason: reasonInput,
});
export const profileDecision = contentDecision.extend({
  decision: z.enum(["published", "rejected", "suspended", "pending"]),
});
export const contentTables = {
  skills: "ai_skills",
  playbooks: "ai_playbooks",
  resources: "creator_resources",
  events: "public_events",
} as const;
export type ContentRow = Record<string, unknown> & {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  summary: string;
  status: string;
  revision: string;
  review_reason: string | null;
  created_at: string;
  updated_at: string;
  toolIds: string[];
  skillIds: string[];
};
export function parseContentFields(kind: ContentKind, form: FormData) {
  let steps: unknown = [];
  if (kind === "playbooks") {
    try {
      steps = JSON.parse(String(form.get("steps") || "[]"));
    } catch {
      steps = null;
    }
  }
  return {
    ...Object.fromEntries(form),
    toolIds: form.getAll("toolIds").map(String),
    skillIds: form.getAll("skillIds").map(String),
    useCaseIds: form.getAll("useCaseIds"),
    industryIds: form.getAll("industryIds"),
    steps,
    skillId: form.get("skillId") || null,
    playbookId: form.get("playbookId") || null,
    virtualUrl: form.get("virtualUrl") || null,
  };
}
