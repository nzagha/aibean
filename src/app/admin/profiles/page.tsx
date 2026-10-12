import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { readProfileQueue } from "@/lib/content/queries";
import { ActionForm } from "@/components/action-form";
import { ReasonField, AdminPages } from "@/components/admin-shared";
import { reviewCreatorProfile } from "@/app/content-actions";
import type { AdminParams } from "@/lib/admin/queries";
import { readPresentation } from "@/lib/creator-enhancements/presentation";
import { PresentationDetails } from "@/components/creator-enhancements";
export default async function Profiles({
  searchParams,
}: {
  searchParams: Promise<AdminParams>;
}) {
  const admin = await requireAdmin(),
    params = await searchParams,
    data = await readProfileQueue(db(), admin.id, params);
  return (
    <section className="placeholder-card">
      <h2 className="text-2xl">Creator profile review</h2>
      {!data.ready ? (
        <p className="preview-notice my-5">
          Profile review awaits the reviewed content database package.
        </p>
      ) : (
        <>
          <form className="grid gap-x-5 mt-5 sm:grid-cols-2">
            <label className="field">
              Search display name
              <input name="q" defaultValue={data.filters.q} maxLength={100} />
            </label>
            <label className="field">
              Status
              <select name="status" defaultValue={data.filters.status}>
                <option value="">All profiles</option>
                {["draft", "pending", "published", "rejected", "suspended"].map(
                  (s) => (
                    <option key={s}>{s}</option>
                  ),
                )}
              </select>
            </label>
            <button className="button secondary justify-self-start">
              Filter
            </button>
          </form>
          {!data.rows.length && <p className="my-5">No matching profiles.</p>}
          {await Promise.all(data.rows.map(async (row) => (
            <article className="account-row" key={row.user_id}>
              <h3 className="text-xl">
                {row.display_name} · @{row.handle}
              </h3>
              <p className="my-4">{row.bio}</p>
              <PresentationDetails presentation={await readPresentation(db(),row.user_id,"admin",admin.id)}/>
              <p>
                {row.status} · {row.review_reason || "No review decision yet"}
              </p>
              {["pending", "published", "suspended"].includes(row.status) && (
                <ActionForm
                  action={reviewCreatorProfile}
                  label="Save profile decision"
                  confirmation="Confirm this profile review decision?"
                >
                  <input type="hidden" name="id" value={row.user_id} />
                  <input type="hidden" name="revision" value={row.revision} />
                  <label className="field">
                    Decision
                    <select name="decision">
                      {(row.status === "pending"
                        ? ["published", "rejected"]
                        : row.status === "published"
                          ? ["suspended"]
                          : ["pending"]
                      ).map((s) => (
                        <option key={s} value={s}>
                          {s === "pending" ? "Reopen for review" : s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <ReasonField />
                </ActionForm>
              )}
            </article>
          )))}
          <AdminPages
            base="/admin/profiles"
            total={data.total}
            page={data.filters.page}
            params={params}
          />
        </>
      )}
    </section>
  );
}
