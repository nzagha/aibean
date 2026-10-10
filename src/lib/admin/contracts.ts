import { z } from "zod";
import {
  taxonomy,
  activeUseCases,
  toolListingTypes,
} from "../catalog/taxonomy";
import { safeWebUrl, toolInput } from "../validation";
import { verificationStates, type Tool } from "../catalog/types";

const distinct = (values: string[]) => values.length === new Set(values).size;
const lines = z
  .array(z.string().trim().min(1).max(300))
  .max(40)
  .refine(distinct, "Remove duplicate entries.");
export const recordId = z.string().trim().min(1).max(100);
export const reasonInput = z.string().trim().min(5).max(1000);
export const revisionInput = z.string().min(1).max(100);
const optionalText = z.string().trim().max(120).nullable();
export const adminToolInput = toolInput
  .extend({
    subcategoryId: z.string().nullable(),
    useCaseIds: z
      .array(z.string())
      .max(40)
      .refine(distinct)
      .refine(
        (ids) =>
          ids.every((id) => activeUseCases.some((item) => item.id === id)),
        "Select an approved use case.",
      ),
    industries: z
      .array(
        z.object({
          id: z
            .string()
            .refine(
              (id) => taxonomy.industries.some((item) => item.id === id),
              "Select an approved industry.",
            ),
          fit: z.enum(["native", "strong", "general", "suggested"]),
          relevance: z.coerce.number().int().min(0).max(100),
        }),
      )
      .max(18)
      .refine(
        (items) => distinct(items.map((item) => item.id)),
        "An industry can appear only once.",
      ),
    listingTypeId: z
      .string()
      .refine(
        (id) => toolListingTypes.some((item) => item.id === id),
        "Select an approved Tool listing type.",
      ),
    startingPrice: optionalText,
    freePlan: z.boolean().nullable(),
    trial: z.boolean().nullable(),
    features: lines,
    integrations: lines,
    platforms: lines,
    pros: lines,
    limitations: lines,
  })
  .superRefine((input, ctx) => {
    if (
      input.subcategoryId &&
      !taxonomy.categories
        .find((item) => item.id === input.categoryId)
        ?.subcategories.some((item) => item.id === input.subcategoryId)
    )
      ctx.addIssue({
        code: "custom",
        path: ["subcategoryId"],
        message: "Subcategory must belong to the selected category.",
      });
  });
export type AdminToolInput = z.infer<typeof adminToolInput>;

export function toolFields(form: FormData) {
  const values = Object.fromEntries(form);
  const textList = (field: string) =>
    String(form.get(field) || "")
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);
  const triState = (field: string) =>
    form.get(field) === "true"
      ? true
      : form.get(field) === "false"
        ? false
        : null;
  return {
    ...values,
    subcategoryId: form.get("subcategoryId") || null,
    useCaseIds: form.getAll("useCaseIds"),
    industries: form.getAll("industryIds").map((id) => ({
      id,
      fit: form.get(`industry-${id}-fit`),
      relevance: form.get(`industry-${id}-relevance`),
    })),
    startingPrice: form.get("startingPrice") || null,
    freePlan: triState("freePlan"),
    trial: triState("trial"),
    features: textList("features"),
    integrations: textList("integrations"),
    platforms: textList("platforms"),
    pros: textList("pros"),
    limitations: textList("limitations"),
  };
}

export function initialTool(id: string, input: AdminToolInput): Tool {
  return {
    ...input,
    id,
    verification: "unverified",
    verified: false,
    lastVerified: null,
    claimed: false,
    rating: null,
    reviewCount: 0,
    demo: false,
  };
}
export const toolStatuses = ["draft", "published", "archived"] as const;
export type ToolStatus = (typeof toolStatuses)[number];
export function allowedToolTransition(from: string, to: ToolStatus) {
  return (
    from !== to &&
    (from === "archived"
      ? to === "draft"
      : ["draft", "published"].includes(from))
  );
}

export const trustInput = z
  .object({
    toolId: recordId,
    revision: revisionInput,
    reason: reasonInput,
    verification: z.enum(verificationStates),
    verified: z.boolean().default(false),
    checklist: z.string().trim().max(2000).default(""),
    evidence: z.union([safeWebUrl.max(2000), z.literal("")]),
    checkedOn: z.union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      z.literal(""),
    ]),
  })
  .superRefine((input, ctx) => {
    if (
      input.verified &&
      (input.verification !== "human_reviewed" || input.checklist.length < 30)
    )
      ctx.addIssue({
        code: "custom",
        path: ["checklist"],
        message:
          "Awarding aiBean Verified requires human review and a completed verification checklist of at least 30 characters.",
      });
    if (
      ["auto_checked", "human_reviewed", "vendor_confirmed"].includes(
        input.verification,
      )
    ) {
      if (!input.evidence)
        ctx.addIssue({
          code: "custom",
          path: ["evidence"],
          message: "A supporting evidence URL is required.",
        });
      const time = Date.parse(input.checkedOn);
      if (
        !Number.isFinite(time) ||
        new Date(time).toISOString().slice(0, 10) !== input.checkedOn ||
        time > Date.now()
      )
        ctx.addIssue({
          code: "custom",
          path: ["checkedOn"],
          message: "Use a valid check date no later than today.",
        });
    }
  });

export class AdminWorkflowError extends Error {}
export function refreshAfterCommit<T extends { message?: string }>(
  result: T,
  refresh: () => void,
): T {
  try {
    refresh();
    return result;
  } catch {
    return {
      ...result,
      message:
        (result.message || "Changes saved.") +
        " Refresh the workspace to load current data; do not repeat the completed operation.",
    };
  }
}
export function adminMessage(error: unknown): string {
  if (error instanceof AdminWorkflowError) return error.message;
  if (error instanceof z.ZodError)
    return error.issues
      .map((issue) => `${issue.path.join(".") || "Input"}: ${issue.message}`)
      .slice(0, 5)
      .join(" ");
  const code =
    (error as { code?: string; cause?: { code?: string } } | null)?.code ||
    (error as { cause?: { code?: string } } | null)?.cause?.code;
  if (code === "23505")
    return "This slug or record already exists. Refresh and choose a unique value.";
  if (code === "23503")
    return "A referenced account or taxonomy record is unavailable. Refresh and try again.";
  return "The transaction could not be completed. Your changes were not saved. Refresh and try again.";
}
