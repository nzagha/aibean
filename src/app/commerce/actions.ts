"use server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripeClient, stripeConfigured } from "@/lib/billing";
import { commerceAvailable } from "@/lib/admin/commerce-storage";
import {
  preparePayment,
  bindCheckout,
  submitToolProposal,
} from "@/lib/admin/commerce-workflows";
import {
  adminMessage,
  toolFields,
  refreshAfterCommit,
} from "@/lib/admin/contracts";
import { productKinds } from "@/lib/admin/commerce-contracts";
import type { ProductKind } from "@/lib/admin/commerce-contracts";
import { rateLimit } from "@/lib/security";
import { revalidatePath } from "next/cache";
import { requestSandboxCancellation } from "@/lib/admin/subscription-management";
import { sandboxSubscriptionProvider } from "@/lib/sandbox-subscriptions";
import type { ActionState } from "@/components/action-form";
function origin() {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  if (!value) throw new Error("Application origin is not configured.");
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    !(
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname))
    )
  )
    throw new Error("A safe application origin is required.");
  return url.origin;
}
export async function submitListing(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser("/account/submissions");
  try {
    await rateLimit(user.id, "paid-submission", 10);
    if (!(await commerceAvailable(db())))
      return { error: "Tool submission storage is not installed and enabled." };
    await submitToolProposal(db(), user.id, toolFields(form));
    return refreshAfterCommit(
      {
        message:
          "Submission saved. Payment and editorial approval are separate steps.",
      },
      () => revalidatePath("/account/submissions"),
    );
  } catch (error) {
    return { error: adminMessage(error) };
  }
}
export async function checkout(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser("/account/billing");
  try {
    await rateLimit(user.id, "commercial-checkout", 15);
    if (!(await commerceAvailable(db())))
      return {
        error:
          "Reviewed commerce storage and sandbox Stripe must be configured.",
      };
    const kind = String(form.get("kind")) as ProductKind;
    if (!productKinds.includes(kind))
      return { error: "Select an approved product." };
    const base = origin();
    const payment = await preparePayment(
      db(),
      user.id,
      kind,
      String(form.get("subjectId") || ""),
    );
    if (payment.status === "paid")
      return {
        message:
          "This request is already settled; editorial approval remains independent.",
      };
    if (!stripeConfigured())
      return {
        error: "Sandbox Stripe is not configured. No charge was initiated.",
      };
    const stripe = stripeClient();
    if (payment.stripe_session_id) {
      const previous = await stripe.checkout.sessions.retrieve(
        payment.stripe_session_id,
      );
      if (previous.livemode || previous.client_reference_id !== payment.id)
        return { error: "Checkout reconciliation failed." };
      if (previous.status !== "open" || !previous.url)
        return {
          error:
            "Checkout has completed or expired. Wait for reconciliation or contact support.",
        };
      return { href: previous.url, hrefLabel: "Open sandbox checkout →" };
    }
    const subscription = kind.endsWith("_subscription");
    const session = await stripe.checkout.sessions.create(
      {
        mode: subscription ? "subscription" : "payment",
        client_reference_id: payment.id,
        metadata: { kind: "commerce", paymentId: payment.id },
        ...(subscription
          ? {
              subscription_data: {
                metadata: { kind: "commerce", paymentId: payment.id },
              },
            }
          : {}),
        line_items: [
          {
            price_data: {
              currency: payment.currency,
              unit_amount: payment.amount,
              product_data: { name: kind.replaceAll("_", " ") },
              ...(subscription
                ? { recurring: { interval: "month" as const } }
                : {}),
            },
            quantity: 1,
          },
        ],
        success_url: base + "/account/billing?checkout=returned",
        cancel_url: base + "/account/billing",
      },
      { idempotencyKey: "aibean-commerce-" + payment.id },
    );
    await bindCheckout(db(), user.id, payment.id, session);
    if (!session.url) return { error: "Checkout did not return a redirect." };
    return {
      href: session.url,
      hrefLabel: "Open sandbox checkout →",
      message:
        "Test checkout only. Payment does not publish content or award capabilities.",
    };
  } catch (error) {
    return { error: adminMessage(error) };
  }
}
export async function cancelSubscription(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser("/account/billing");
  try {
    await rateLimit(user.id, "subscription-cancel", 10);
    if (!(await commerceAvailable(db())) || !stripeConfigured())
      return { error: "Sandbox subscriptions are unavailable." };
    await requestSandboxCancellation(
      db(),
      user.id,
      {
        id: form.get("id"),
        revision: form.get("revision"),
        reason: "Account requested cancellation at period end",
      },
      "owner",
      sandboxSubscriptionProvider(),
    );
    return refreshAfterCommit(
      {
        message:
          "Sandbox cancellation requested for the end of the billing period.",
      },
      () => {
        revalidatePath("/account/billing");
        revalidatePath("/admin/commerce/subscriptions");
      },
    );
  } catch (error) {
    return { error: adminMessage(error) };
  }
}
