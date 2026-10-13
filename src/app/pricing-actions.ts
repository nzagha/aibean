"use server";
import { requireAdmin, requireSensitiveUser as requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/security";
import { adminMessage, refreshAfterCommit } from "@/lib/admin/contracts";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/action-form";
import {
  savePricingRelease,
  reviewPricingRelease,
  activatePricingRelease,
} from "@/lib/pricing/releases";
import {
  requestMembershipInterval,
  requestCommercialRefund,
  reviewCommercialRefund,
  executeApprovedSandboxRefund,
} from "@/lib/pricing/lifecycle";
import {
  sandboxPriceProvider,
  sandboxMembershipProvider,
  sandboxRefundProvider,
} from "@/lib/pricing/sandbox-provider";
async function feedback(
  work: () => Promise<void>,
  message: string,
): Promise<ActionState> {
  try {
    await work();
    return refreshAfterCommit({ message }, () => {
      revalidatePath("/pricing");
      revalidatePath("/account/billing");
      revalidatePath("/account/membership");
      revalidatePath("/creator");
      revalidatePath("/vendor");
      revalidatePath("/admin/commerce/pricing");
    });
  } catch (e) {
    return { error: adminMessage(e) };
  }
}
export async function changePricing(_s: ActionState, form: FormData) {
  const a = await requireAdmin();
  await rateLimit(a.id, "pricing-admin", 30);
  return feedback(async () => {
    const operation = String(form.get("operation")),
      i = {
        id: form.get("id"),
        revision: form.get("revision"),
        reason: form.get("reason"),
      };
    if (operation === "save") {
      const raw = String(form.get("config") || "");
      if (raw.length > 16384)
        throw Error("Pricing configuration is too large.");
      await savePricingRelease(db(), a.id, {
        id: form.get("id") || undefined,
        revision: form.get("revision") || undefined,
        reason: form.get("reason"),
        config: JSON.parse(raw),
      });
    } else if (operation === "review")
      await reviewPricingRelease(db(), a.id, i);
    else if (operation === "activate") {
      await activatePricingRelease(
        db(),
        a.id,
        i,
        JSON.parse(String(form.get("providerPrices") || "")),
        sandboxPriceProvider(),
      );
    } else throw Error("Choose a valid pricing action.");
  }, "Pricing workflow saved. Proposals remain separate from live offerings.");
}
export async function changeMembershipInterval(
  _s: ActionState,
  form: FormData,
) {
  const u = await requireUser("/account/membership");
  await rateLimit(u.id, "membership-change", 10);
  return feedback(async () => {
    await requestMembershipInterval(
      db(),
      u.id,
      {
        id: form.get("id"),
        revision: form.get("revision"),
        interval: form.get("interval"),
      },
      sandboxMembershipProvider(),
    );
  }, "Billing interval scheduled for the next paid renewal. Current benefits and charges remain unchanged.");
}
export async function requestRefund(_s: ActionState, form: FormData) {
  const u = await requireUser("/account/membership");
  await rateLimit(u.id, "refund-request", 10);
  return feedback(async () => {
    await requestCommercialRefund(db(), u.id, {
      paymentId: form.get("paymentId"),
      reason: form.get("reason"),
    });
  }, "Refund request saved for independent review. No refund has been issued.");
}
export async function decideRefund(_s: ActionState, form: FormData) {
  const a = await requireAdmin();
  await rateLimit(a.id, "refund-review", 30);
  return feedback(async () => {
    if (form.get("operation") === "execute")
      await executeApprovedSandboxRefund(
        db(),
        a.id,
        String(form.get("id")),
        sandboxRefundProvider(),
      );
    else
      await reviewCommercialRefund(db(), a.id, {
        id: form.get("id"),
        revision: form.get("revision"),
        decision: form.get("decision"),
        reason: form.get("reason"),
      });
  }, "Refund workflow saved. Only verified completed sandbox refunds change commercial entitlement status.");
}
