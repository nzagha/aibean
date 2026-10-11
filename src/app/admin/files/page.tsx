import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { readResourceFiles } from "@/lib/resources/workflows";
import { reviewResourceFile } from "@/app/content-actions";
import { ActionForm } from "@/components/action-form";
import { AdminPages, ReasonField } from "@/components/admin-shared";
import type { AdminParams } from "@/lib/admin/queries";
export default async function Files({
  searchParams,
}: {
  searchParams: Promise<AdminParams>;
}) {
  const admin = await requireAdmin(),
    params = await searchParams,
    data = await readResourceFiles(db(), admin.id, undefined, true, params);
  return (
    <section className="placeholder-card">
      <h2 className="text-2xl">Resource file review</h2>
      {!data.ready ? (
        <p className="preview-notice my-5">
          File review awaits the separately reviewed metadata and private
          storage packages.
        </p>
      ) : (
        <>
          <form className="grid gap-x-5 mt-5 sm:grid-cols-2">
            <label className="field">
              Search filename
              <input name="q" defaultValue={data.filters.q} maxLength={100} />
            </label>
            <label className="field">
              Status
              <select name="status" defaultValue={data.filters.status}>
                <option value="">All</option>
                {[
                  "uploading",
                  "pending",
                  "approved",
                  "rejected",
                  "disabled",
                  "failed",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <button className="button secondary justify-self-start">
              Filter
            </button>
          </form>
          {!data.rows.length && <p className="my-5">No matching files.</p>}
          {data.rows.map((r) => (
            <article className="account-row" key={r.id}>
              <h3 className="text-xl">{r.filename}</h3>
              <p className="my-4">
                {r.mime} · {Math.ceil(r.bytes / 1024)} KB · {r.status} · Scan:{" "}
                {r.scan_status}
              </p>
              <p className="my-3 text-sm">{r.review_reason}</p>
              {["pending", "approved"].includes(r.status) && (
                <>
                  <a
                    className="text-link"
                    href={"/resources/download/" + r.id}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Inspect private file →
                  </a>
                  <ActionForm
                    action={reviewResourceFile}
                    label="Save file decision"
                    confirmation="Confirm this resource-file review decision?"
                  >
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="revision" value={r.revision} />
                    <label className="field">
                      Decision
                      <select name="decision">
                        {(r.status === "pending"
                          ? ["approved", "rejected"]
                          : ["disabled"]
                        ).map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <ReasonField />
                  </ActionForm>
                </>
              )}
            </article>
          ))}
          <AdminPages
            base="/admin/files"
            total={data.total}
            page={data.filters.page}
            params={params}
          />
        </>
      )}
    </section>
  );
}
