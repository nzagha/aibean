import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { readContentReports } from "@/lib/content/operations";
import { ActionForm } from "@/components/action-form";
import { ReasonField, AdminPages } from "@/components/admin-shared";
import { reviewReportedContent } from "@/app/content-actions";
import type { AdminParams } from "@/lib/admin/queries";
export default async function Reports({
  searchParams,
}: {
  searchParams: Promise<AdminParams>;
}) {
  const admin = await requireAdmin(),
    params = await searchParams,
    data = await readContentReports(db(), admin.id, params);
  return (
    <section className="placeholder-card">
      <h2 className="text-2xl">Reported content</h2>
      {!data.ready ? (
        <p className="preview-notice my-5">
          Reports await the reviewed content database package.
        </p>
      ) : (
        <>
          <form className="grid gap-x-5 sm:grid-cols-2 mt-5">
            <label className="field">
              Search reason or report
              <input name="q" defaultValue={data.filters.q} maxLength={100} />
            </label>
            <label className="field">
              Status
              <select name="status" defaultValue={data.filters.status}>
                <option value="">All</option>
                {["open", "actioned", "dismissed"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <button className="button secondary justify-self-start">
              Filter
            </button>
          </form>
          {!data.rows.length && <p className="my-5">No matching reports.</p>}
          {data.rows.map((r) => (
            <article className="account-row" key={r.id}>
              <h3 className="text-xl">{r.target_text}</h3>
              <p className="my-4">{r.reason}</p>
              <p>
                {r.status} · {r.review_reason || "Awaiting review"}
              </p>
              {r.status === "open" && (
                <ActionForm
                  action={reviewReportedContent}
                  label="Resolve report"
                  confirmation="Confirm this report decision? An actioned report removes its published target from public view."
                >
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="revision" value={r.revision} />
                  <label className="field">
                    Decision
                    <select name="decision">
                      <option value="dismissed">Dismiss report</option>
                      <option value="actioned">Hide reported content</option>
                    </select>
                  </label>
                  <ReasonField />
                </ActionForm>
              )}
            </article>
          ))}
          <AdminPages
            base="/admin/reports"
            page={data.filters.page}
            total={data.total}
            params={params}
          />
        </>
      )}
    </section>
  );
}
