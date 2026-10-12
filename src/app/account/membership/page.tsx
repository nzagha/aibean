import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readMembership } from "@/lib/pricing/entitlements";
import { dollars, quotaLabels } from "@/lib/pricing/config";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
import { ActionForm } from "@/components/action-form";
import { ReasonField } from "@/components/admin-shared";
import { changeMembershipInterval, requestRefund } from "@/app/pricing-actions";
import { readOwnCommerce } from "@/lib/admin/commerce-queries";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your membership",
  robots: { index: false, follow: false },
};
export default async function Membership() {
  const user = await requireUser("/account/membership"),
    m = await readMembership(db(), user.id),
    commerce = m.ready ? await readOwnCommerce(db(), user.id) : null;
  return (
    <div className="container py-16">
      <WorkspaceNavigation />
      <h1 className="font-display text-4xl">Your membership & usage</h1>
      <p className="preview-notice my-6">
        Proposed / Preview{m.active ? " · Approved sandbox configuration" : ""}{" "}
        · No live charges. Free membership remains available.
      </p>
      <p>{m.plans.map((p) => p.name).join(" · ")}</p>
      <p className="my-4">
        Current discounts: submissions {m.discounts.submission / 100}% · edits{" "}
        {m.discounts.edit / 100}% · verification{" "}
        {m.discounts.verification / 100}%. One highest eligible discount
        applies; claims and Featured remain full price.
      </p>
      <Link href="/pricing" className="text-link inline-block my-5">
        Plan comparison & fees →
      </Link>
      {!m.ready ? (
        <p>
          Account-backed commercial entitlements await the separately reviewed
          pricing package. Existing account features remain available.
        </p>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-3 my-8">
            {m.usage.map((u) => (
              <section className="placeholder-card" key={u.key}>
                <h2>{quotaLabels[u.key]}</h2>
                <p className="my-4">
                  {(u.key === "storageBytes"
                    ? u.used / 1048576
                    : u.used
                  ).toLocaleString()}{" "}
                  /{" "}
                  {(u.key === "storageBytes"
                    ? u.limit / 1048576
                    : u.limit
                  ).toLocaleString()}
                </p>
                {u.used > u.limit && (
                  <p>
                    Existing content is preserved. New additions pause until
                    usage is within your current limit.
                  </p>
                )}
              </section>
            ))}
          </div>
          <p>
            Usage requests reset each UTC calendar month. Unused allowance does
            not roll over. No publishing or verification privilege comes from
            payment. Editing/removing existing content remains available after
            downgrade.
          </p>
          <h2 className="text-2xl my-8">Current paid memberships</h2>
          {!m.memberships.length && (
            <p>
              No current verified paid membership benefits. Free limits apply.
            </p>
          )}
          {m.memberships.map((s) => (
            <section className="placeholder-card my-5" key={s.subscription_id}>
              <h3>
                {s.plan_id.replaceAll("_", " ")} ·{" "}
                {s.interval === "year" ? "Annual" : "Monthly"}
              </h3>
              <p className="my-4">
                Paid through {s.paid_through} ·{" "}
                {s.cancel_at_period_end
                  ? "Cancellation scheduled"
                  : "Renews unless canceled"}
              </p>
              {!s.cancel_at_period_end && (
                <ActionForm
                  action={changeMembershipInterval}
                  label="Schedule billing interval change"
                >
                  <input type="hidden" name="id" value={s.subscription_id} />
                  <input type="hidden" name="revision" value={s.revision} />
                  <label className="field">
                    Next billing interval
                    <select
                      name="interval"
                      defaultValue={s.interval === "month" ? "year" : "month"}
                    >
                      <option value="month">Monthly</option>
                      <option value="year">Annual</option>
                    </select>
                  </label>
                </ActionForm>
              )}
              <Link
                href="/account/billing"
                className="text-link inline-block mt-4"
              >
                Cancel at period end / downgrade to Free →
              </Link>
            </section>
          ))}
          {m.changes.map((c) => (
            <p key={c.id} className="my-4">
              Interval change: {c.interval} · {c.status} · Effective{" "}
              {c.effective_at}
            </p>
          ))}
          <h2 className="text-2xl my-8">Refund requests</h2>
          <p>
            Request within seven days; full refunds require independent review.
            Schedule cancellation before refunding a membership. Completed
            approved review services are not refundable through this workflow.
          </p>
          {commerce?.payments
            .filter((p) => p.status === "paid" && p.amount > 0)
            .map((p) => (
              <details className="account-row" key={p.id}>
                <summary>
                  {p.kind} · {dollars(p.amount)} · {p.created_at}
                </summary>
                <ActionForm
                  action={requestRefund}
                  label="Request refund review"
                >
                  <input type="hidden" name="paymentId" value={p.id} />
                  <ReasonField />
                </ActionForm>
              </details>
            ))}
          {m.refunds.map((r) => (
            <p key={r.id} className="my-4">
              {r.status} · {dollars(r.amount)}
              {r.review_reason ? " · " + r.review_reason : ""}
            </p>
          ))}
        </>
      )}
    </div>
  );
}
