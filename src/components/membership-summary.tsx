import Link from "next/link";
import { db } from "@/lib/db";
import { readMembership } from "@/lib/pricing/entitlements";
import { dollars } from "@/lib/pricing/config";
export async function MembershipSummary({ user }: { user: string }) {
  const m = await readMembership(db(), user);
  return (
    <section className="placeholder-card my-8">
      <h2 className="text-2xl">Your membership</h2>
      <p className="my-4">
        {m.plans.map((p) => p.name).join(" · ")}
        {" · Proposed / Preview"}
      </p>
      <p>
        Free membership remains available. Pro benefits require approved
        capability, verified sandbox billing and a current paid period. Payments
        never grant publication or rank.
      </p>
      {m.memberships.map((s) => (
        <p key={s.subscription_id} className="my-4">
          {s.plan_id.replaceAll("_", " ")} ·{" "}
          {s.interval === "year" ? "Annual" : "Monthly"} · Paid through{" "}
          {s.paid_through}
          {s.cancel_at_period_end ? " · Cancellation scheduled" : ""}
        </p>
      ))}
      <p className="my-4">
        Featured Tool placement: {dollars(m.config.fees.featured)} for{" "}
        {m.config.placementDays} paid days; review required.
      </p>
      <p className="my-4">
        Your current fee discounts: submissions {m.discounts.submission / 100}%
        · edits {m.discounts.edit / 100}% · verification{" "}
        {m.discounts.verification / 100}%. Discounts do not stack; existing paid
        benefits retain their purchased version.
      </p>
      <Link className="text-link" href="/account/membership">
        Membership, usage & benefits →
      </Link>
      <Link className="text-link block mt-4" href="/pricing">
        Review plans →
      </Link>
    </section>
  );
}
