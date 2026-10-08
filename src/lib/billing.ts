import "server-only";
import Stripe from "stripe";
// Stage 1 accepts test keys only. Live billing requires the remaining launch gates.
export function stripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.DATABASE_URL,
  );
}
export function billingConfigured() {
  return stripeConfigured() && Boolean(process.env.STRIPE_CLAIM_PRICE_ID);
}
export function featuredBillingConfigured() {
  return stripeConfigured() && Boolean(process.env.STRIPE_FEATURED_PRICE_ID);
}
export function stripeClient() {
  if (!stripeConfigured()) throw new Error("Test billing is not configured.");
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}
