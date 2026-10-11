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
import {
  saveProduct,
  reviewToolSubmission,
} from "@/lib/admin/commerce-workflows";
import { commerceAvailable } from "@/lib/admin/commerce-storage";
import { stripeConfigured } from "@/lib/billing";
import { sandboxSubscriptionProvider } from "@/lib/sandbox-subscriptions";
import { requestSandboxCancellation } from "@/lib/admin/subscription-management";
import {
  editTaxonomy,
  updateOrganicRanking,
} from "@/lib/admin/catalog-controls";
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
export async function saveTaxonomy(_state: ActionState, form: FormData) {
  return command(async (id) => {
    await editTaxonomy(db(), id, Object.fromEntries(form));
    return {
      message:
        "Display metadata saved. Stable IDs, slugs, source and relationships preserved.",
    };
  });
}
export async function configureProduct(_state: ActionState, form: FormData) {
  return command(async (id) => {
    if (!(await commerceAvailable(db())))
      return { error: "Commerce storage is not installed and enabled." };
    await saveProduct(db(), id, {
      ...Object.fromEntries(form),
      revision: form.get("revision") || undefined,
      active: form.get("active") === "on",
    });
    return {
      message:
        "Sandbox price saved. Existing orders keep their original amount.",
    };
  });
}
export async function cancelSandboxSubscription(
  _state: ActionState,
  form: FormData,
) {
  return command(async (id) => {
    if (!(await commerceAvailable(db())) || !stripeConfigured())
      return { error: "Reviewed sandbox commerce must be configured." };
    await requestSandboxCancellation(
      db(),
      id,
      Object.fromEntries(form),
      "admin",
      sandboxSubscriptionProvider(),
    );
    return {
      message:
        "Sandbox cancellation confirmed for the end of the billing period.",
    };
  });
}
export async function reviewSubmission(_state: ActionState, form: FormData) {
  return command(async (id) => {
    if (!(await commerceAvailable(db())))
      return { error: "Commerce storage is not installed and enabled." };
    const toolId = await reviewToolSubmission(
      db(),
      id,
      Object.fromEntries(form),
    );
    return {
      message: toolId
        ? "Paid submission approved as a private draft. Publication and ownership require separate review."
        : "Submission rejected and audited.",
      ...(toolId ? { href: "/admin/tools/" + encodeURIComponent(toolId) } : {}),
    };
  });
}
export async function saveRanking(_state: ActionState, form: FormData) {
  return command(async (id) => {
    const result = await updateOrganicRanking(db(), id, {
      ...Object.fromEntries(form),
      weights: Object.fromEntries(
        [
          "editorial",
          "context",
          "verification",
          "completeness",
          "freshness",
          "reviews",
          "popularity",
          "engagement",
        ].map((key) => [key, form.get("weight_" + key)]),
      ),
    });
    return {
      message: `Organic score ${result.score} saved with its explanation and audit trail.`,
    };
  });
}
