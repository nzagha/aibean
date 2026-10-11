import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  normalizeAdminParams,
  readAdminQueue,
  reviewQueues,
  queueStatuses,
  type ReviewQueue,
  type AdminParams,
} from "@/lib/admin/queries";
import { reviewWorkflowsAvailable } from "@/lib/admin/review-storage";
import { ActionForm } from "@/components/action-form";
import { ReasonField, ReviewGate, AdminPages } from "@/components/admin-shared";
import {
  reviewRating,
  reviewOwnership,
  reviewCreator,
  reviewEdit,
  reviewVerification,
  startDispute,
  resolveDispute,
} from "../actions";
const labels = {
  reviews: "Reviews & ratings",
  claims: "Tool ownership claims",
  creators: "Creator applications",
  edits: "Vendor edit requests",
  verification: "Verification requests",
  disputes: "Ownership disputes",
  capabilities: "Protected capability requests",
};
export default async function Queue({
  params,
  searchParams,
}: {
  params: Promise<{ queue: string }>;
  searchParams: Promise<AdminParams>;
}) {
  const admin = await requireAdmin();
  const { queue } = await params;
  if (!reviewQueues.includes(queue as ReviewQueue)) notFound();
  const kind = queue as ReviewQueue;
  const requested = normalizeAdminParams(await searchParams);
  const initial = {
    reviews: "pending",
    claims: "pending_review",
    creators: "pending",
    edits: "pending",
    verification: "pending",
    disputes: "open",
    capabilities: "pending_operator",
  };
  const query = { ...requested, status: requested.status ?? initial[kind] };
  const { ready, rows, total, filters } = await readAdminQueue(
    db(),
    admin.id,
    kind,
    query,
  );
  const disputesReady =
    kind === "claims" && (await reviewWorkflowsAvailable(db()));
  return (
    <section className="placeholder-card">
      <h2 className="text-2xl">{labels[kind]}</h2>
      {!ready ? (
        <div className="mt-5">
          <ReviewGate />
        </div>
      ) : (
        <>
          <form
            action={"/admin/" + queue}
            className="my-6 grid gap-x-5 sm:grid-cols-2"
          >
            <label className="field">
              Search ID or name
              <input name="q" maxLength={100} defaultValue={filters.q} />
            </label>
            <label className="field">
              Status
              <select name="status" defaultValue={query.status}>
                <option value="">All statuses</option>
                {queueStatuses(kind).map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <button className="button secondary justify-self-start">
              Filter queue
            </button>
          </form>
          {kind === "capabilities" && (
            <p className="preview-notice">
              These are requests only. The runtime cannot change protected User
              flags or fulfill these requests. Activation/removal needs a
              separately authorized operator.
            </p>
          )}
          {["edits", "verification"].includes(kind) && (
            <p className="preview-notice">
              Approval requires reconciled sandbox payment or an approved
              zero-price verification promotion. The current Tool owner and
              unchanged proposal are rechecked before applying a decision. The
              aiBean Verified checklist remains separate.
            </p>
          )}
          {!rows.length && <p className="my-6">No items match this queue.</p>}
          {rows.map((row) => {
            const token = row.revision;
            const keys = (
              <>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="revision" value={token} />
              </>
            );
            let action = reviewRating;
            let options = ["approved", "rejected", "pending"];
            let field = "decision";
            let canDecide = false;
            if (kind === "reviews") {
              action = reviewRating;
              field = "status";
              canDecide = true;
              options =
                row.status === "pending"
                  ? ["approved", "rejected"]
                  : ["pending", "rejected"].filter((s) => s !== row.status);
            }
            if (kind === "claims") {
              action = reviewOwnership;
              canDecide =
                row.status === "pending_review" &&
                row.order_status === "paid" &&
                row.order_matches === true;
              options = ["approved", "rejected"];
            }
            if (kind === "creators") {
              action = reviewCreator;
              canDecide = ["pending", "approved"].includes(row.status);
              options =
                row.status === "approved"
                  ? ["suspension_requested"]
                  : ["approved", "rejected"];
            }
            if (kind === "edits" || kind === "verification") {
              action = kind === "edits" ? reviewEdit : reviewVerification;
              canDecide = row.status === "pending";
              options =
                row.settled ||
                (kind === "verification" && row.payment_state === "promo_zero")
                  ? ["approved", "rejected"]
                  : ["rejected"];
            }
            if (kind === "disputes") {
              action = resolveDispute;
              canDecide = row.status === "open";
              options = ["retain", "revoke"];
            }
            return (
              <article key={row.id} className="account-row">
                <h3 className="text-xl">
                  {row.tool_name || row.name || row.id}
                </h3>
                <p className="text-sm mt-3">
                  {row.status}
                  {row.payment_state ? " · Payment: " + row.payment_state : ""}
                  {row.settled ? " · Reconciled sandbox payment" : ""}
                </p>
                {row.rating != null && (
                  <p className="my-3">Rating: {row.rating} / 5</p>
                )}
                {[
                  row.company,
                  row.role,
                  row.body,
                  row.proof,
                  row.bio,
                  row.note,
                  row.reason,
                  row.review_reason,
                ]
                  .filter(Boolean)
                  .map((value, i) => (
                    <p className="my-3 whitespace-pre-wrap break-words" key={i}>
                      {value}
                    </p>
                  ))}
                {[row.proposed, row.evidence, row.links]
                  .filter(Boolean)
                  .map((value, i) => (
                    <pre
                      className="preview-notice my-4 whitespace-pre-wrap break-words text-sm"
                      key={i}
                    >
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  ))}
                {kind === "claims" && (
                  <p className="text-sm my-3">
                    Order: {row.order_status || "Missing"} ·{" "}
                    {row.order_matches
                      ? "Requester matches"
                      : "Requester not verified against payment"}
                    . Approval is independent of payment.
                  </p>
                )}
                {kind === "capabilities" && (
                  <p className="my-3">
                    Requested state: {row.desired_state} · {row.user_id}
                  </p>
                )}
                {canDecide && (
                  <ActionForm action={action} label="Save decision">
                    {keys}
                    {kind === "reviews" && (
                      <input type="hidden" name="reviewId" value={row.id} />
                    )}{" "}
                    {kind === "claims" && (
                      <>
                        <input type="hidden" name="claimId" value={row.id} />
                        <input
                          type="hidden"
                          name="expectedStatus"
                          value={row.status}
                        />
                      </>
                    )}
                    <label className="field">
                      Decision
                      <select name={field}>
                        {options.map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </label>
                    <ReasonField />
                  </ActionForm>
                )}
                {kind === "claims" &&
                  row.status === "approved" &&
                  disputesReady && (
                    <ActionForm
                      action={startDispute}
                      label="Open ownership dispute"
                    >
                      <input type="hidden" name="claimId" value={row.id} />
                      <ReasonField />
                    </ActionForm>
                  )}
              </article>
            );
          })}
          <AdminPages
            base={"/admin/" + queue}
            params={query}
            total={total}
            page={filters.page}
          />
        </>
      )}
    </section>
  );
}
