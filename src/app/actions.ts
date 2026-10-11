"use server";
import { requireAdmin } from "@/lib/auth";
export async function createTool(form: FormData) {
  await requireAdmin();
  const { createToolDraft } = await import("./admin/actions");
  const result = await createToolDraft({}, form);
  if (result.error) throw new Error(result.error);
}
export async function setToolStatus(form: FormData) {
  await requireAdmin();
  const { changeToolStatus } = await import("./admin/actions");
  const result = await changeToolStatus({}, form);
  if (result.error) throw new Error(result.error);
}
export async function moderateReview(form: FormData) {
  await requireAdmin();
  const { reviewRating } = await import("./admin/actions");
  const result = await reviewRating({}, form);
  if (result.error) throw new Error(result.error);
}
export async function reviewClaim(form: FormData) {
  await requireAdmin();
  const { reviewOwnership } = await import("./admin/actions");
  const result = await reviewOwnership({}, form);
  if (result.error) throw new Error(result.error);
}
