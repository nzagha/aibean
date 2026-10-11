import { sql } from "drizzle-orm";
import { z } from "zod";
import type { IdentityDatabase } from "../supabase/identity";
import {
  AdminWorkflowError,
  recordId,
  revisionInput,
  reasonInput,
} from "./contracts";
import { requireCommerceStorage } from "./commerce-storage";
import { checkAdmin, resultRows, audit } from "./tool-workflows";
import { reconcileSubscription } from "./commerce-workflows";
const cancellationInput = z.object({
  id: recordId,
  revision: revisionInput,
  reason: reasonInput,
});
type ProviderSubscription = {
  id: string;
  livemode: boolean;
  status: string;
  cancelAtPeriodEnd: boolean;
  endsAt: number | null;
};
export type SubscriptionProvider = {
  retrieve: (id: string) => Promise<ProviderSubscription>;
  cancelAtPeriodEnd: (
    id: string,
    idempotencyKey: string,
  ) => Promise<ProviderSubscription>;
};
export async function requestSandboxCancellation(
  database: IdentityDatabase,
  actor: string,
  value: unknown,
  scope: "owner" | "admin",
  provider: SubscriptionProvider,
) {
  const input = cancellationInput.parse(value);
  const target = await database.transaction(async (tx) => {
    await requireCommerceStorage(tx);
    if (scope === "admin") await checkAdmin(tx, actor);
    const [item] = resultRows<{
      stripe_subscription_id: string;
      user_id: string;
    }>(
      await tx.execute(
        sql`SELECT * FROM public.commerce_subscriptions WHERE id=${input.id} AND ${scope === "owner" ? sql`user_id=${actor}` : sql`true`} AND updated_at::text=${input.revision} AND status IN ('active','trialing','past_due','unpaid','incomplete','paused') AND NOT cancel_at_period_end FOR UPDATE`,
      ),
    );
    if (!item)
      throw new AdminWorkflowError(
        "Subscription changed, ended or does not belong to this account.",
      );
    await audit(tx, actor, "commerce.cancellation-requested", input.id, {
      scope,
      reason: input.reason,
      atPeriodEnd: true,
    });
    return item.stripe_subscription_id;
  });
  const current = await provider.retrieve(target);
  if (current.id !== target || current.livemode)
    throw new AdminWorkflowError(
      "Only the reconciled sandbox subscription can be managed.",
    );
  const updated = await provider.cancelAtPeriodEnd(
    target,
    "aibean-cancel-" + input.id + "-" + input.revision,
  );
  if (updated.id !== target || updated.livemode || !updated.cancelAtPeriodEnd)
    throw new AdminWorkflowError(
      "Sandbox cancellation was not confirmed. Reconcile with the provider before retrying.",
    );
  try {
    await reconcileSubscription(database, {
      id: "cancel-" + input.id + "-" + input.revision,
      created: Math.floor(Date.now() / 1000),
      livemode: updated.livemode,
      subscriptionId: updated.id,
      status: updated.status,
      cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
      endsAt: updated.endsAt,
    });
  } catch {
    throw new AdminWorkflowError(
      "Provider cancellation was confirmed; local reconciliation is pending. Do not repeat the request.",
    );
  }
}
