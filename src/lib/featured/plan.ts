// Approved by the product owner. Amount is in Stripe's minor currency units.
export const FEATURED_PLAN = {
  amount: 9900,
  currency: "usd",
  days: 5,
  label: "$99",
} as const;

export function validFeaturedPrice(price: {
  active: boolean;
  livemode: boolean;
  type: string;
  unit_amount: number | null;
  currency: string;
}) {
  return (
    price.active &&
    !price.livemode &&
    price.type === "one_time" &&
    price.unit_amount === FEATURED_PLAN.amount &&
    price.currency === FEATURED_PLAN.currency
  );
}
