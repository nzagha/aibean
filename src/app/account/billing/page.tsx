import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { commerceAvailable } from "@/lib/admin/commerce-storage";
import { readOwnCommerce } from "@/lib/admin/commerce-queries";
import { ActionForm } from "@/components/action-form";
import { checkout, cancelSubscription } from "@/app/commerce/actions";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Billing",
  robots: { index: false, follow: false },
};
export default async function Billing() {
  const user = await requireUser("/account/billing");
  const ready = await commerceAvailable(db());
  const data = ready ? await readOwnCommerce(db(), user.id) : null;
  return (
    <div className="container py-16">
      <h1 className="font-display text-4xl">Your billing</h1>
      <WorkspaceNavigation />
      <p className="preview-notice my-6">
        Sandbox payments only. Membership remains free. Purchases do not award
        editorial approval, ownership or capabilities.
      </p>
      {!data ? (
        <p>
          Billing workflows await the reviewed commercial database installation.
        </p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="placeholder-card">
            <h2 className="text-2xl">Request payments</h2>
            {!data.payments.length && (
              <p className="my-5">No commercial request payments yet.</p>
            )}
            {data.payments.map((p) => (
              <article key={p.id} className="account-row">
                <h3>
                  {p.kind} · USD {(p.amount / 100).toFixed(2)} · {p.status}
                </h3>
                <p className="text-sm my-3">{p.created_at}</p>
                {p.status === "created" && (
                  <ActionForm
                    action={checkout}
                    label="Prepare sandbox checkout"
                  >
                    <input type="hidden" name="kind" value={p.kind} />
                    <input
                      type="hidden"
                      name="subjectId"
                      value={
                        p.kind.endsWith("subscription") ? user.id : p.subject_id
                      }
                    />
                  </ActionForm>
                )}
              </article>
            ))}
          </section>
          <section className="placeholder-card">
            <h2 className="text-2xl">Subscriptions</h2>
            {data.products
              .filter((p) => p.id.endsWith("subscription"))
              .map((p) => (
                <div className="account-row" key={p.id}>
                  <h3>
                    {p.name} · USD {(p.amount / 100).toFixed(2)}/month
                  </h3>
                  <ActionForm
                    action={checkout}
                    label="Prepare subscription checkout"
                  >
                    <input type="hidden" name="kind" value={p.id} />
                    <input type="hidden" name="subjectId" value={user.id} />
                  </ActionForm>
                  <p className="text-sm mt-3">
                    Requires existing approved{" "}
                    {p.id === "vendor_subscription"
                      ? "Tool ownership"
                      : "Creator access"}
                    .
                  </p>
                </div>
              ))}
            {data.subscriptions.map((s) => (
              <article key={s.id} className="account-row">
                <h3>
                  {s.product_id} · {s.status}
                </h3>
                <p className="my-3">
                  {s.cancel_at_period_end
                    ? "Cancellation scheduled"
                    : "No cancellation scheduled"}{" "}
                  · Until {s.ends_at || "Awaiting provider"}
                </p>
                {!["canceled", "incomplete_expired"].includes(s.status) &&
                  !s.cancel_at_period_end && (
                    <ActionForm
                      action={cancelSubscription}
                      label="Cancel at period end"
                      confirmation="Schedule cancellation of this sandbox subscription at the end of the billing period?"
                    >
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="revision" value={s.revision} />
                    </ActionForm>
                  )}
              </article>
            ))}
          </section>
        </div>
      )}
      <Link className="text-link inline-block mt-8" href="/account/submissions">
        Your Tool submissions →
      </Link>
    </div>
  );
}
