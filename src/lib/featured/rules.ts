export function placementDays(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) return null;
  const days = Number(value);
  return Number.isSafeInteger(days) && days >= 1 && days <= 365 ? days : null;
}

export function placementIsActive(
  placement: {
    status: string;
    paidAt: Date | null;
    startsAt: Date | null;
    endsAt: Date | null;
  },
  now = new Date(),
) {
  return (
    placement.status === "active" &&
    Boolean(placement.paidAt) &&
    Boolean(
      placement.startsAt &&
      placement.endsAt &&
      placement.startsAt <= now &&
      placement.endsAt > now,
    )
  );
}

export function placementLabel(
  placement: {
    status: string;
    paidAt: Date | null;
    startsAt: Date | null;
    endsAt: Date | null;
  },
  now = new Date(),
) {
  if (
    placement.status === "active" &&
    placement.endsAt &&
    placement.endsAt <= now
  )
    return "Completed";
  return (
    (
      {
        pending_review: "Awaiting review",
        approved: "Approved · ready for payment",
        rejected: "Not approved",
        active: "Live",
        suspended: "Paused by admin",
      } as Record<string, string>
    )[placement.status] || placement.status
  );
}

export function placementWindow(days: number, now = new Date()) {
  if (!Number.isInteger(days) || days < 1 || days > 365)
    throw new Error("Invalid placement duration.");
  return { startsAt: now, endsAt: new Date(now.getTime() + days * 86_400_000) };
}

export function paymentMatches(
  order: {
    id: string;
    amount: number | null;
    currency: string | null;
    stripeSessionId: string | null;
  },
  session: {
    id: string;
    amount_total: number | null;
    currency: string | null;
    client_reference_id: string | null;
    payment_status: string;
  },
) {
  return (
    session.payment_status === "paid" &&
    order.amount !== null &&
    order.amount > 0 &&
    order.amount === session.amount_total &&
    order.currency === session.currency &&
    order.id === session.client_reference_id &&
    order.stripeSessionId === session.id
  );
}
