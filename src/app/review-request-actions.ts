"use server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reviewWorkflowsAvailable } from "@/lib/admin/review-storage";
import {
  submitCreatorApplication,
  submitVendorEdit,
  submitVerificationRequest,
} from "@/lib/admin/review-workflows";
import { adminMessage, refreshAfterCommit } from "@/lib/admin/contracts";
import { rateLimit } from "@/lib/security";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/action-form";
const lines = (value: FormDataEntryValue | null) =>
  String(value || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
async function submit(
  work: (userId: string) => Promise<unknown>,
): Promise<ActionState> {
  const user = await requireUser();
  try {
    await rateLimit(user.id, "review-request", 10);
    if (!(await reviewWorkflowsAvailable(db())))
      return {
        error:
          "Applications and requests await the reviewed database installation.",
      };
    await work(user.id);
    return refreshAfterCommit(
      {
        message:
          "Request saved for independent review. Your account capabilities and canonical Tool content have not changed.",
      },
      () => {
        revalidatePath("/creators/apply");
        revalidatePath("/vendor", "layout");
        revalidatePath("/admin", "layout");
      },
    );
  } catch (error) {
    return { error: adminMessage(error) };
  }
}
export async function applyForCreator(_state: ActionState, form: FormData) {
  return submit((id) =>
    submitCreatorApplication(db(), id, {
      ...Object.fromEntries(form),
      links: lines(form.get("links")),
    }),
  );
}
export async function requestVendorEdit(_state: ActionState, form: FormData) {
  const values = Object.fromEntries(form);
  return submit((id) =>
    submitVendorEdit(db(), id, {
      toolId: form.get("toolId"),
      baseRevision: form.get("baseRevision"),
      note: form.get("note"),
      proposed: values,
    }),
  );
}
export async function requestVerification(_state: ActionState, form: FormData) {
  return submit((id) =>
    submitVerificationRequest(db(), id, {
      ...Object.fromEntries(form),
      evidence: lines(form.get("evidence")),
    }),
  );
}
