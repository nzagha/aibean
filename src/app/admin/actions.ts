"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/security";
import {
  adminMessage,
  refreshAfterCommit,
  toolFields,
  type ToolStatus,
} from "@/lib/admin/contracts";
import {
  createAdminTool,
  editAdminTool,
  transitionAdminTool,
  updateAdminTrust,
  moderateAdminReview,
  moderateAdminClaim,
} from "@/lib/admin/tool-workflows";
import {
  reviewCreatorApplication,
  reviewVendorRequest,
  openClaimDispute,
  resolveClaimDispute,
} from "@/lib/admin/review-workflows";
import { reviewWorkflowsAvailable } from "@/lib/admin/review-storage";
import type { ActionState } from "@/components/action-form";
async function command(
  work: (actorId: string) => Promise<ActionState>,
  requiresReview = false,
) {
  const admin = await requireAdmin();
  try {
    await rateLimit(admin.id, "admin-operation", 100);
    if (requiresReview && !(await reviewWorkflowsAvailable(db())))
      return {
        error: "This database review package is not installed and enabled.",
      };
    const result = await work(admin.id);
    return refreshAfterCommit(result, () => {
      for (const path of [
        "/admin",
        "/tools",
        "/explore",
        "/account",
        "/vendor",
        "/creator",
        "/creators/apply",
        "/",
      ])
        revalidatePath(path, "layout");
    });
  } catch (error) {
    return { error: adminMessage(error) };
  }
}
export async function createToolDraft(_state: ActionState, form: FormData) {
  return command(async (id) => {
    const toolId = await createAdminTool(db(), id, toolFields(form));
    return {
      message: "Draft created. Review its private preview before publication.",
      href: "/admin/tools/" + encodeURIComponent(toolId),
    };
  });
}
export async function editToolDraft(_state: ActionState, form: FormData) {
  return command(async (id) => {
    await editAdminTool(db(), id, toolFields(form));
    return {
      message:
        "Tool content saved. Trust and ownership remain subject to independent review.",
    };
  });
}
export async function changeToolStatus(_state: ActionState, form: FormData) {
  return command(async (id) => {
    await transitionAdminTool(db(), id, {
      toolId: form.get("toolId"),
      revision: form.get("revision"),
      status: String(form.get("status")) as ToolStatus,
      reason: form.get("reason"),
    });
    return { message: "Publication status updated and audited." };
  });
}
export async function reviewTrust(_state: ActionState, form: FormData) {
  return command(async (id) => {
    await updateAdminTrust(db(), id, {
      ...Object.fromEntries(form),
      verified: form.get("verified") === "on",
    });
    return {
      message:
        "Verification status, freshness and independent badge decision saved.",
    };
  });
}
export async function reviewRating(_state: ActionState, form: FormData) {
  return command(async (id) => {
    await moderateAdminReview(db(), id, {
      reviewId: form.get("reviewId"),
      revision: form.get("revision"),
      status: String(form.get("status")),
      reason: form.get("reason"),
    });
    return { message: "Review decision saved." };
  });
}
export async function reviewOwnership(_state: ActionState, form: FormData) {
  return command(async (id) => {
    await moderateAdminClaim(db(), id, {
      claimId: form.get("claimId"),
      expectedStatus: form.get("expectedStatus"),
      decision: String(form.get("decision")),
      reason: form.get("reason"),
    });
    return {
      message:
        "Ownership decision saved. Payment does not award verification or organic rank.",
    };
  });
}
export async function reviewCreator(_state: ActionState, form: FormData) {
  return command(async (id) => {
    await reviewCreatorApplication(db(), id, Object.fromEntries(form));
    return {
      message:
        "Application decision saved. Protected capability activation requires a separately authorized operator.",
    };
  }, true);
}
export async function reviewEdit(_state: ActionState, form: FormData) {
  return command(async (id) => {
    await reviewVendorRequest(db(), id, "edit", Object.fromEntries(form));
    return { message: "Edit request decision saved." };
  }, true);
}
export async function reviewVerification(_state: ActionState, form: FormData) {
  return command(async (id) => {
    await reviewVendorRequest(
      db(),
      id,
      "verification",
      Object.fromEntries(form),
    );
    return {
      message:
        "Verification request decision saved. The aiBean Verified badge has a separate checklist.",
    };
  }, true);
}
export async function startDispute(_state: ActionState, form: FormData) {
  return command(async (id) => {
    await openClaimDispute(db(), id, Object.fromEntries(form));
    return {
      message:
        "Dispute opened; existing ownership is preserved pending resolution.",
    };
  }, true);
}
export async function resolveDispute(_state: ActionState, form: FormData) {
  return command(async (id) => {
    await resolveClaimDispute(db(), id, Object.fromEntries(form));
    return { message: "Ownership dispute resolved and audited." };
  }, true);
}
