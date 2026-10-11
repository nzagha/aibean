import "server-only";
import { stripeClient } from "./billing";
import type { SubscriptionProvider } from "./admin/subscription-management";
import type Stripe from "stripe";
const projection = (s: Stripe.Subscription) => ({
  id: s.id,
  livemode: s.livemode,
  status: s.status,
  cancelAtPeriodEnd: s.cancel_at_period_end,
  endsAt: s.items.data[0]?.current_period_end ?? null,
});
export function sandboxSubscriptionProvider(): SubscriptionProvider {
  const stripe = stripeClient();
  return {
    retrieve: async (id) => projection(await stripe.subscriptions.retrieve(id)),
    cancelAtPeriodEnd: async (id, idempotencyKey) =>
      projection(
        await stripe.subscriptions.update(
          id,
          { cancel_at_period_end: true },
          { idempotencyKey },
        ),
      ),
  };
}
