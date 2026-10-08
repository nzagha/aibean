import test from "node:test";
import assert from "node:assert/strict";
import { FEATURED_PLAN, validFeaturedPrice } from "../src/lib/featured/plan";
import {
  paymentMatches,
  placementIsActive,
  placementWindow,
  placementLabel,
} from "../src/lib/featured/rules";

test("featured checkout accepts only the approved $99 USD one-time test price", () => {
  const price = {
    active: true,
    livemode: false,
    type: "one_time",
    unit_amount: 9900,
    currency: "usd",
  };
  assert.equal(validFeaturedPrice(price), true);
  for (const change of [
    { active: false },
    { livemode: true },
    { type: "recurring" },
    { unit_amount: 4900 },
    { unit_amount: null },
    { currency: "eur" },
  ]) {
    assert.equal(validFeaturedPrice({ ...price, ...change }), false);
  }
});

test("placement runs for five full days and disappears at its end time", () => {
  const now = new Date("2026-10-06T12:30:00Z");
  const window = placementWindow(FEATURED_PLAN.days, now);
  assert.equal(window.endsAt.toISOString(), "2026-10-11T12:30:00.000Z");
  const active = { status: "active", paidAt: now, ...window };
  assert.equal(placementIsActive(active, now), true);
  assert.equal(
    placementIsActive(active, new Date(window.endsAt.getTime() - 1)),
    true,
  );
  assert.equal(placementIsActive(active, window.endsAt), false);
  assert.equal(placementLabel(active, window.endsAt), "Completed");
  assert.equal(placementIsActive(active, new Date(now.getTime() - 1)), false);
  assert.equal(placementIsActive({ ...active, paidAt: null }, now), false);
  assert.equal(
    placementIsActive({ ...active, status: "approved" }, now),
    false,
  );
  assert.equal(
    placementIsActive({ ...active, status: "suspended" }, now),
    false,
  );
});

test("featured payment reconciliation rejects unpaid, mismatched and unrelated sessions", () => {
  const order = {
    id: "placement-1",
    amount: 9900,
    currency: "usd",
    stripeSessionId: "cs_test_1",
  };
  const session = {
    id: "cs_test_1",
    amount_total: 9900,
    currency: "usd",
    client_reference_id: "placement-1",
    payment_status: "paid",
  };
  assert.equal(paymentMatches(order, session), true);
  for (const change of [
    { payment_status: "unpaid" },
    { amount_total: 100 },
    { currency: "eur" },
    { id: "other-session" },
    { client_reference_id: "other-user-placement" },
  ]) {
    assert.equal(paymentMatches(order, { ...session, ...change }), false);
  }
  assert.equal(
    paymentMatches({ ...order, stripeSessionId: null }, session),
    false,
  );
  assert.equal(paymentMatches({ ...order, amount: null }, session), false);
});
