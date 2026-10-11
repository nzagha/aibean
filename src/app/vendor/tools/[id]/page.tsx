import Link from "next/link";
import { requireVendorCapability } from "@/lib/auth";
import { db } from "@/lib/db";
import { reviewWorkflowsAvailable } from "@/lib/admin/review-storage";
import { readOwnedRequests } from "@/lib/admin/request-queries";
import { ActionForm } from "@/components/action-form";
import { commerceAvailable } from "@/lib/admin/commerce-storage";
import { checkout } from "@/app/commerce/actions";
import {
  requestVendorEdit,
  requestVerification,
} from "@/app/review-request-actions";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Tool requests",
  robots: { index: false, follow: false },
};
export default async function Requests({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireVendorCapability(id);
  const ready = await reviewWorkflowsAvailable(db());
  if (!ready)
    return (
      <section className="container py-16">
        <h1 className="font-display text-4xl">Tool requests</h1>
        <p className="preview-notice my-6">
          Vendor requests await the separately reviewed database installation.
          Paid edit and verification settlement is not yet integrated.
        </p>
        <Link className="text-link" href="/vendor">
          Return to Vendor workspace →
        </Link>
      </section>
    );
  const { tool, requests } = await readOwnedRequests(db(), user.id, id);
  const commercialReady = await commerceAvailable(db());
  const keys = (
    <>
      <input type="hidden" name="toolId" value={id} />
      <input type="hidden" name="baseRevision" value={tool.revision} />
    </>
  );
  return (
    <div className="container py-16">
      <h1 className="font-display text-4xl">Requests for {tool.name}</h1>
      <p className="preview-notice my-6">
        Proposals preserve the current public listing. Approval requires
        reconciled sandbox payment or a configured zero-price verification
        promotion. A request or payment never awards aiBean Verified.
      </p>
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="placeholder-card">
          <h2 className="text-2xl">Propose listing changes</h2>
          {requests.some((r) => r.kind === "edit" && r.status === "pending") ? (
            <p className="my-5">An edit request is already awaiting review.</p>
          ) : (
            <ActionForm action={requestVendorEdit} label="Submit edit proposal">
              {keys}
              {[
                ["name", "Name"],
                ["website", "Official website"],
                ["logoUrl", "Logo source"],
                ["bestFor", "Best for"],
                ["notBestFor", "Not best for"],
              ].map(([name, label]) => (
                <label className="field" key={name}>
                  {label}
                  <input
                    name={name}
                    defaultValue={String(
                      tool.data[name as keyof typeof tool.data] || "",
                    )}
                    maxLength={
                      name === "website" || name === "logoUrl"
                        ? 2000
                        : name === "name"
                          ? 100
                          : 300
                    }
                    required={name !== "logoUrl"}
                    type={name === "website" ? "url" : "text"}
                  />
                </label>
              ))}
              <label className="field">
                Description
                <textarea
                  name="description"
                  defaultValue={tool.data.description}
                  minLength={20}
                  maxLength={1200}
                  required
                />
              </label>
              <label className="field">
                Pricing model
                <select name="pricing" defaultValue={tool.data.pricing}>
                  {["free", "freemium", "paid", "unknown"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Why are these changes needed?
                <textarea
                  name="note"
                  minLength={20}
                  maxLength={2000}
                  required
                />
              </label>
            </ActionForm>
          )}
        </section>
        <section className="placeholder-card">
          <h2 className="text-2xl">Request verification</h2>
          {requests.some(
            (r) => r.kind === "verification" && r.status === "pending",
          ) ? (
            <p className="my-5">
              A verification request is already awaiting review.
            </p>
          ) : (
            <ActionForm
              action={requestVerification}
              label="Submit verification request"
            >
              {keys}
              <label className="field">
                Evidence URLs
                <textarea name="evidence" maxLength={10004} required />
                <span className="text-xs text-muted">
                  One URL per line, up to five.
                </span>
              </label>
              <label className="field">
                What should reviewers verify?
                <textarea
                  name="note"
                  minLength={20}
                  maxLength={2000}
                  required
                />
              </label>
            </ActionForm>
          )}
        </section>
      </div>
      <section className="placeholder-card mt-8">
        <h2 className="text-2xl">Your request history</h2>
        {!requests.length && <p className="my-5">No requests yet.</p>}
        {requests.map((r) => (
          <article key={r.id} className="account-row">
            <strong>
              {r.kind} · {r.status}
            </strong>
            <p className="my-3 text-sm">
              Payment: {r.payment_state} · {r.created_at}
            </p>
            {r.review_reason && <p>{r.review_reason}</p>}
            {commercialReady && r.status === "pending" && (
              <ActionForm action={checkout} label="Prepare request checkout">
                <input type="hidden" name="kind" value={r.kind} />
                <input type="hidden" name="subjectId" value={r.id} />
              </ActionForm>
            )}
          </article>
        ))}
      </section>
      <p className="mt-6">
        <Link className="text-link" href="/vendor">
          Return to Vendor workspace →
        </Link>
      </p>
    </div>
  );
}
