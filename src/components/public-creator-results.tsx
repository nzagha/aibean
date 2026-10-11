import Link from "next/link";
import { db } from "@/lib/db";
import { readPublicProfiles } from "@/lib/content/queries";
import type { CreatorFilters } from "@/lib/content/queries";
import { taxonomy, activeUseCases } from "@/lib/catalog/taxonomy";
import { comparisonContext } from "@/lib/catalog/comparison";
import { AdminPages } from "./admin-shared";
export async function PublicCreatorResults({
  params,
}: {
  params: CreatorFilters;
}) {
  const data = process.env.DATABASE_URL
    ? await readPublicProfiles(db(), params)
    : null;
  if (!data?.ready)
    return (
      <p className="preview-notice my-8">
        Approved Creator profiles will appear here when profile publishing
        opens.
      </p>
    );
  const context = comparisonContext(params);
  return (
    <section className="my-8">
      <h2 className="text-2xl">Find a Creator</h2>
      <form className="flex flex-wrap items-end gap-5 mt-5">
        <label className="field">
          Search name or bio
          <input name="q" maxLength={100} defaultValue={data.filters.q} />
        </label>
        {(
          [
            ["category", "Category", taxonomy.categories],
            ["industry", "Industry", taxonomy.industries],
            ["useCase", "Use case", activeUseCases],
          ] as const
        ).map(([name, label, values]) => (
          <label className="field" key={name}>
            {label}
            <select name={name} defaultValue={context[name] || ""}>
              <option value="">All</option>
              {values.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
        ))}
        <button className="button secondary mb-5">Search</button>
      </form>
      <p className="text-sm text-muted">
        Context matches a Creator’s published content. Private drafts do not
        affect discovery.
      </p>
      {!data.rows.length && (
        <p className="my-5">No matching published profiles yet.</p>
      )}
      <div className="grid gap-6 md:grid-cols-3 mt-8">
        {data.rows.map((row) => (
          <article className="placeholder-card" key={row.user_id}>
            <h3 className="text-2xl">{row.display_name}</h3>
            <p className="my-5 text-sm">{row.bio}</p>
            <Link className="text-link" href={"/@" + row.handle}>
              Explore @{row.handle} →
            </Link>
          </article>
        ))}
      </div>
      <AdminPages
        base="/creators"
        params={params}
        page={data.filters.page}
        total={data.total}
      />
    </section>
  );
}
