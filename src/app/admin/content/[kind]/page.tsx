import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { contentKinds, type ContentKind } from "@/lib/content/contracts";
import { readContentList } from "@/lib/content/queries";
import { AdminPages } from "@/components/admin-shared";
import type { AdminParams } from "@/lib/admin/queries";
export default async function ContentAdmin({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<AdminParams>;
}) {
  const admin = await requireAdmin();
  const { kind } = await params;
  if (!contentKinds.includes(kind as ContentKind)) notFound();
  const query = await searchParams;
  const data = await readContentList(
    db(),
    admin.id,
    kind as ContentKind,
    "admin",
    query,
  );
  return (
    <section className="placeholder-card">
      <h2 className="text-2xl">Manage {kind}</h2>
      {!data.ready ? (
        <p className="preview-notice my-5">
          The reviewed Creator content database proposal is not installed and
          enabled.
        </p>
      ) : (
        <>
          <Link
            className="button primary mt-5"
            href={"/admin/content/" + kind + "/new"}
          >
            Create editorial draft
          </Link>
          <form className="my-5 grid gap-x-5 sm:grid-cols-2">
            <label className="field">
              Search title or summary
              <input name="q" maxLength={100} defaultValue={data.filters.q} />
            </label>
            <label className="field">
              Status
              <select name="status" defaultValue={data.filters.status}>
                <option value="">All</option>
                {[
                  "draft",
                  "pending",
                  "published",
                  "rejected",
                  "archived",
                  ...(kind === "events" ? ["canceled"] : []),
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <button className="button secondary justify-self-start">
              Filter
            </button>
          </form>
          {!data.rows.length && <p className="my-5">No matching content.</p>}
          {data.rows.map((row) => (
            <article key={row.id} className="account-row">
              <h3 className="text-xl">
                <Link
                  className="text-link"
                  href={"/admin/content/" + kind + "/" + row.id}
                >
                  {row.title}
                </Link>
              </h3>
              <p className="my-3">
                {row.status} · Author {row.user_id}
              </p>
              <p>{row.summary}</p>
            </article>
          ))}
          <AdminPages
            base={"/admin/content/" + kind}
            total={data.total}
            page={data.filters.page}
            params={query}
          />
        </>
      )}
    </section>
  );
}
