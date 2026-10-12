// Approved by the product owner. Amount is in Stripe's minor currency units.
import { APPROVED_PLACEMENT } from "../pricing/config";
export const FEATURED_PLAN = APPROVED_PLACEMENT;

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
