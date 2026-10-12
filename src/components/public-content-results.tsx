import { AnalyticsBeacon } from "./analytics-beacon";
import { selectedAnalyticsFilters } from "@/lib/discovery/analytics-contracts";
import Link from "next/link";
import { db } from "@/lib/db";
import { readContentList } from "@/lib/content/queries";
import type { ContentKind } from "@/lib/content/contracts";
import type { AdminParams } from "@/lib/admin/queries";
import { taxonomy, activeUseCases } from "@/lib/catalog/taxonomy";
import { AdminPages } from "./admin-shared";
export async function PublicContentResults({
  kind,
  params,
}: {
  kind: Exclude<ContentKind, "resources">;
  params: AdminParams & {
    useCase?: string;
    industry?: string;
    format?: string;
    period?: string;
  };
}) {
  const data = process.env.DATABASE_URL
    ? await readContentList(db(), null, kind, "public", params)
    : null;
  if (!data?.ready)
    return (
      <p className="preview-notice my-8">
        Publication is being prepared. Approved content will appear here when
        this section opens.
      </p>
    );
  return (
    <section className="my-8" aria-label={"Published " + kind}>
      <h2 className="text-2xl">Discover {kind}</h2>
      <AnalyticsBeacon
        value={{
          event: Object.keys(params).some(
            (k) => params[k as keyof typeof params],
          )
            ? "search"
            : "discovery_view",
          kind: "discovery",
          targetId: kind,
          filters: selectedAnalyticsFilters(params),
        }}
      />
      <form className="grid gap-x-5 mt-5 sm:grid-cols-2 lg:grid-cols-3">
        <label className="field">
          Search
          <input name="q" defaultValue={data.filters.q} maxLength={100} />
        </label>
        <label className="field">
          Category
          <select name="category" defaultValue={data.filters.category}>
            <option value="">All categories</option>
            {taxonomy.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Use case
          <select name="useCase" defaultValue={params.useCase}>
            <option value="">All use cases</option>
            {activeUseCases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Industry
          <select name="industry" defaultValue={params.industry}>
            <option value="">All industries</option>
            {taxonomy.industries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {kind === "events" && (
          <>
            <label className="field">
              Format
              <select name="format" defaultValue={params.format}>
                <option value="">All formats</option>
                {["virtual", "in_person", "hybrid"].map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              When
              <select name="period" defaultValue={params.period}>
                <option value="">All published events</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past events archive</option>
              </select>
            </label>
          </>
        )}
        <button className="button secondary justify-self-start">
          Filter results
        </button>
      </form>
      {!data.rows.length && <p className="my-8">No published matches yet.</p>}
      <div className="grid gap-6 md:grid-cols-3 mt-8">
        {data.rows.map((row) => (
          <article key={row.id} className="placeholder-card">
            <h3 className="text-2xl">
              <Link href={"/" + kind + "/" + row.slug}>{row.title}</Link>
            </h3>
            <p className="my-5 text-sm">{row.summary}</p>
            {kind === "events" && row.featured === true && (
              <span className="eyebrow">Editorial pick</span>
            )}
            <Link className="text-link" href={"/" + kind + "/" + row.slug}>
              Explore →
            </Link>
          </article>
        ))}
      </div>
      <AdminPages
        base={"/" + kind}
        total={data.total}
        page={data.filters.page}
        params={params}
      />
    </section>
  );
}
