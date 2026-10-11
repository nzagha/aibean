import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { readCommercialAdmin } from "@/lib/admin/commerce-queries";
import { normalizeAdminParams, type AdminParams } from "@/lib/admin/queries";
import { productKinds } from "@/lib/admin/commerce-contracts";
import { ActionForm } from "@/components/action-form";
import { ReasonField, AdminPages } from "@/components/admin-shared";
import {
  configureProduct,
  reviewSubmission,
  cancelSandboxSubscription,
} from "../../actions";
export default async function Commercial({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<AdminParams>;
}) {
  const admin = await requireAdmin();
  const { section } = await params;
  if (
    !["payments", "subscriptions", "submissions", "pricing"].includes(section)
  )
    notFound();
  const requested = normalizeAdminParams(await searchParams);
  const data = await readCommercialAdmin(
    db(),
    admin.id,
    section === "pricing"
      ? "payments"
      : (section as "payments" | "subscriptions" | "submissions"),
    requested,
  );
  return (
    <section className="placeholder-card">
      <h2 className="text-2xl">
        {section[0].toUpperCase() + section.slice(1)}
      </h2>
      <p className="preview-notice my-5">
        Sandbox commerce. Payment never awards publication, ownership, Creator
        access, verification or organic rank. Featured placements retain their
        separate $99/five-day approval workflow.
      </p>
      {!data.ready ? (
        <p className="my-5">
          The reviewed admin-operations-v2 database migration and private enable
          flag are required.
        </p>
      ) : section === "pricing" ? (
        productKinds.map((kind) => {
          const product = data.products.find((p) => p.id === kind);
          return (
            <details className="account-row" key={kind}>
              <summary className="cursor-pointer">
                {kind.replaceAll("_", " ")} ·{" "}
                {product
                  ? `$${(product.amount / 100).toFixed(2)}` +
                    (product.active ? " · Enabled" : " · Disabled")
                  : "Not configured"}
              </summary>
              <ActionForm action={configureProduct} label="Save sandbox price">
                <input type="hidden" name="kind" value={kind} />
                {product && (
                  <input
                    type="hidden"
                    name="revision"
                    value={product.revision}
                  />
                )}
                <label className="field">
                  Product name
                  <input
                    name="name"
                    required
                    minLength={3}
                    maxLength={100}
                    defaultValue={product?.name || kind.replaceAll("_", " ")}
                  />
                </label>
                <label className="field">
                  USD cents{" "}
                  {kind.endsWith("subscription") ? "per month" : "per request"}
                  <input
                    type="number"
                    name="amount"
                    required
                    min={kind === "verification" ? 0 : 1}
                    max={1000000}
                    step={1}
                    defaultValue={product?.amount}
                  />
                </label>
                <label className="flex gap-3 my-4">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={product?.active}
                  />
                  Enable this sandbox product
                </label>
                <ReasonField />
              </ActionForm>
            </details>
          );
        })
      ) : (
        <>
          <form className="my-5 grid gap-x-5 sm:grid-cols-2">
            <label className="field">
              Search ID or account
              <input name="q" maxLength={100} defaultValue={data.filters.q} />
            </label>
            <label className="field">
              Status
              <input
                name="status"
                maxLength={40}
                defaultValue={data.filters.status}
              />
            </label>
            <button className="button secondary justify-self-start">
              Filter
            </button>
          </form>
          {!data.rows.length && <p className="my-5">No matching records.</p>}
          {data.rows.map((row) => (
            <article className="account-row" key={String(row.id)}>
              <h3 className="text-xl">
                {String(
                  row.kind ||
                    row.product_id ||
                    (row.proposed as Record<string, unknown>)?.name ||
                    row.id,
                )}
              </h3>
              <p className="text-sm my-3">
                {String(row.id)} · {String(row.status)} · Account{" "}
                {String(row.user_id)}
              </p>
              {row.amount !== undefined && (
                <p>USD {(Number(row.amount) / 100).toFixed(2)}</p>
              )}
              {section === "subscriptions" && (
                <>
                  <p>
                    Cancel at period end:{" "}
                    {row.cancel_at_period_end ? "Yes" : "No"} · Until:{" "}
                    {String(row.ends_at || "Awaiting provider")}
                  </p>
                  {!["canceled", "incomplete_expired"].includes(
                    String(row.status),
                  ) &&
                    !row.cancel_at_period_end && (
                      <ActionForm
                        action={cancelSandboxSubscription}
                        label="Cancel sandbox subscription at period end"
                        confirmation="Confirm cancellation of this account's sandbox subscription at period end?"
                      >
                        <input type="hidden" name="id" value={String(row.id)} />
                        <input
                          type="hidden"
                          name="revision"
                          value={String(row.revision)}
                        />
                        <ReasonField />
                      </ActionForm>
                    )}
                </>
              )}
              {section === "submissions" && (
                <>
                  <pre className="preview-notice my-4 whitespace-pre-wrap break-words text-sm">
                    {JSON.stringify(row.proposed, null, 2)}
                  </pre>
                  {row.status === "pending" && (
                    <ActionForm
                      action={reviewSubmission}
                      label="Save editorial decision"
                      confirmation="Confirm this submission decision? Payment does not guarantee publication."
                    >
                      <input type="hidden" name="id" value={String(row.id)} />
                      <input
                        type="hidden"
                        name="revision"
                        value={String(row.revision)}
                      />
                      <label className="field">
                        Decision
                        <select name="decision">
                          <option value="rejected">Reject</option>
                          {row.paid === true && (
                            <option value="approved">Approve as draft</option>
                          )}
                        </select>
                      </label>
                      <ReasonField />
                    </ActionForm>
                  )}
                </>
              )}
              {Boolean(row.review_reason) && (
                <p className="my-3">{String(row.review_reason)}</p>
              )}
            </article>
          ))}
          <AdminPages
            base={"/admin/commerce/" + section}
            total={data.total}
            params={requested}
            page={data.filters.page}
          />
        </>
      )}
    </section>
  );
}
