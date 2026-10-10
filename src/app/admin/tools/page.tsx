import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  readAdminTools,
  normalizeAdminParams,
  type AdminParams,
} from "@/lib/admin/queries";
import { taxonomy } from "@/lib/catalog/taxonomy";
import { AdminPages } from "@/components/admin-shared";
export default async function Tools({
  searchParams,
}: {
  searchParams: Promise<AdminParams>;
}) {
  const admin = await requireAdmin();
  const params = normalizeAdminParams(await searchParams);
  const { rows, total, filters } = await readAdminTools(db(), admin.id, params);
  return (
    <section className="placeholder-card">
      <div className="flex flex-wrap justify-between gap-4">
        <h2 className="text-2xl">Tool inventory</h2>
        <Link className="button primary" href="/admin/tools/new">
          Create draft
        </Link>
      </div>
      <form action="/admin/tools" className="my-6 grid gap-x-5 sm:grid-cols-2">
        <label className="field">
          Search name or slug
          <input name="q" defaultValue={filters.q} maxLength={100} />
        </label>
        <label className="field">
          Status
          <select name="status" defaultValue={filters.status || ""}>
            <option value="">All statuses</option>
            {["draft", "published", "archived"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Category
          <select name="category" defaultValue={filters.category}>
            <option value="">All categories</option>
            {taxonomy.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Sort
          <select name="sort" defaultValue={filters.sort}>
            <option value="updated">Recently updated</option>
            <option value="name">Name</option>
            <option value="oldest">Oldest update</option>
          </select>
        </label>
        <button className="button secondary justify-self-start">
          Filter inventory
        </button>
      </form>
      {!rows.length && (
        <p className="preview-notice">
          No Tools match. Adjust filters or create a draft.
        </p>
      )}
      {rows.map((t) => (
        <article className="account-row" key={t.id}>
          <div className="flex flex-wrap justify-between gap-3">
            <strong>{t.name}</strong>
            <span className="text-sm">{t.status}</span>
          </div>
          <p className="my-3 text-sm text-muted">
            /{t.slug} · {t.data.verification} ·{" "}
            {t.data.verified ? "aiBean Verified" : "Badge not awarded"}
          </p>
          <div className="flex gap-5">
            <Link
              className="text-link"
              href={"/admin/tools/" + encodeURIComponent(t.id)}
            >
              Edit & review
            </Link>
            <Link
              className="text-link"
              href={"/admin/tools/" + encodeURIComponent(t.id) + "/preview"}
            >
              Private preview
            </Link>
          </div>
        </article>
      ))}
      <AdminPages
        base="/admin/tools"
        total={total}
        params={params}
        page={filters.page}
      />
    </section>
  );
}
