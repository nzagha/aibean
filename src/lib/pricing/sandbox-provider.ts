import "server-only";
import { stripeClient } from "../billing";
import type { PriceProvider } from "./releases";
import type { MembershipProvider, RefundProvider } from "./lifecycle";
export function sandboxPriceProvider(): PriceProvider {
  const stripe = stripeClient();
  return {
    verify: async (id) => {
      const p = await stripe.prices.retrieve(id);
      return {
        id: p.id,
        active: p.active,
        livemode: p.livemode,
        amount: p.unit_amount,
        currency: p.currency,
        interval: p.recurring?.interval || null,
        intervalCount: p.recurring?.interval_count || 0,
      };
    },
  };
}
export function sandboxMembershipProvider(): MembershipProvider {
  const stripe = stripeClient();
  return {
    schedule: async (i) => {
      const s = await stripe.subscriptions.retrieve(i.subscriptionId);
      const item = s.items.data[0];
      if (
        s.livemode ||
        s.status !== "active" ||
        s.cancel_at_period_end ||
        s.items.data.length !== 1 ||
        item.price.id !== i.currentPrice ||
        item.quantity !== 1 ||
        item.current_period_end !== i.effectiveAt
      )
        throw new Error("Subscription schedule target changed.");
      const next = await stripe.prices.retrieve(i.nextPrice);
      if (
        next.livemode ||
        !next.active ||
        !next.recurring ||
        next.recurring.interval_count !== 1 ||
        next.currency !== "usd"
      )
        throw new Error("A verified recurring test price is required.");
      const schedule =
        typeof s.schedule === "string"
          ? await stripe.subscriptionSchedules.retrieve(s.schedule)
          : s.schedule ||
            (await stripe.subscriptionSchedules.create(
              { from_subscription: s.id },
              { idempotencyKey: i.idempotencyKey + "-create" },
            ));
      if (
        schedule.livemode ||
        !schedule.current_phase ||
        schedule.current_phase.end_date !== i.effectiveAt
      )
        throw new Error("Schedule is not at the reviewed billing boundary.");
      const updated = await stripe.subscriptionSchedules.update(
        schedule.id,
        {
          end_behavior: "release",
          proration_behavior: "none",
          phases: [
            {
              start_date: schedule.current_phase.start_date,
              end_date: i.effectiveAt,
              items: [{ price: i.currentPrice, quantity: 1 }],
              proration_behavior: "none",
            },
            {
              start_date: i.effectiveAt,
              items: [{ price: i.nextPrice, quantity: 1 }],
              duration: {
                interval: next.recurring.interval as "month" | "year",
                interval_count: 1,
              },
              proration_behavior: "none",
            },
          ],
        },
        { idempotencyKey: i.idempotencyKey },
      );
      const phase = updated.phases.find((p) => p.start_date === i.effectiveAt),
        price = phase?.items[0]?.price;
      const subscription =
        typeof updated.subscription === "string"
          ? updated.subscription
          : updated.subscription?.id;
      return {
        id: updated.id,
        livemode: updated.livemode,
        subscriptionId: subscription || "",
        priceId: typeof price === "string" ? price : price?.id || "",
        effectiveAt: phase?.start_date || 0,
      };
    },
  };
}
export function sandboxRefundProvider(): RefundProvider {
  const stripe = stripeClient();
  return {
    refund: async (i) => {
      const s = await stripe.checkout.sessions.retrieve(i.sessionId);
      if (
        s.livemode ||
        s.payment_status !== "paid" ||
        s.amount_total !== i.amount
      )
        throw new Error("Paid test checkout does not match the refund.");
      let paymentIntent =
        typeof s.payment_intent === "string"
          ? s.payment_intent
          : s.payment_intent?.id;
      if (!paymentIntent && s.invoice) {
        const invoice =
          typeof s.invoice === "string" ? s.invoice : s.invoice.id;
        const payments = await stripe.invoicePayments.list({ invoice });
        const first = payments.data.find((p) => p.status === "paid");
        paymentIntent =
          typeof first?.payment.payment_intent === "string"
            ? first.payment.payment_intent
            : first?.payment.payment_intent?.id;
      }
      if (!paymentIntent)
        throw new Error("A matched paid payment intent is required.");
      const p = await stripe.refunds.create(
        { payment_intent: paymentIntent, amount: i.amount },
        { idempotencyKey: i.idempotencyKey },
      );
      return {
        id: p.id,
        livemode: !p.id || s.livemode,
        amount: p.amount,
        sessionId: s.id,
        status: p.status || "",
      };
    },
  };
}
