import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { selectedAnalyticsFilters } from "@/lib/discovery/analytics-contracts";
import type { Metadata } from "next";
import Link from "next/link";
import {
  getTools,
  demoMode,
  getTaxonomyLabels,
} from "@/lib/catalog/repository";
import { filterTools } from "@/lib/catalog/filter";
import { ToolCard } from "@/components/tool-card";
import { ToolFilters } from "@/components/tool-filters";
import type { CatalogFilters } from "@/lib/catalog/types";
import { catalogPage, catalogPageHref } from "@/lib/catalog/pagination";
import { ScopeDiscovery } from "@/components/scope-discovery";
import { comparisonRanks } from "@/lib/catalog/comparison";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "AI Tools" };
export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const filters: CatalogFilters = Object.fromEntries(
    Object.entries(raw)
      .filter(([, v]) => typeof v === "string")
      .map(([k, v]) => [k, (v as string).slice(0, 120)]),
  );
  const tools = filterTools(await getTools(), filters);
  const { page, pages, shown } = catalogPage(tools, raw);
  const pageHref = (number: number) => catalogPageHref(raw, number);
  const ranks = comparisonRanks(tools, shown, filters);
  const labels = await getTaxonomyLabels();
  return (
    <div className="container pb-24">
      <AnalyticsBeacon
        value={{
          event: Object.keys(filters).some(
            (k) => filters[k as keyof CatalogFilters],
          )
            ? "search"
            : "discovery_view",
          kind: "discovery",
          targetId: "tools",
          filters: selectedAnalyticsFilters(filters),
        }}
      />
      <div className="page-intro">
        <span className="eyebrow">Discover. Evaluate. Decide.</span>
        <h1>Find your next edge.</h1>
        <p className="max-w-2xl text-lg">
          The right tool starts with the right context. Explore by task,
          industry, and what matters to you.
        </p>
        <div className="mt-5 flex gap-5">
          <Link href="/industries" className="text-link">
            AI for Your Business →
          </Link>
          <Link href="/compare" className="text-link">
            Compare tools →
          </Link>
        </div>
      </div>
      {demoMode() && (
        <p className="preview-notice mb-8">
          Development catalog: these are fictional example tools for testing
          discovery and comparison. No real ratings, prices, or verification
          claims are implied.
        </p>
      )}
      <ScopeDiscovery filters={filters} />
      <div className="catalog-layout">
        <ToolFilters
          key={JSON.stringify(filters)}
          initial={filters}
          labels={labels}
        />
        <section aria-label="Tool results">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl">
              {tools.length} {tools.length === 1 ? "tool" : "tools"} found
            </h2>
            <span className="text-xs text-muted">
              Organic rankings appear only when scored data is available.
            </span>
          </div>
          {tools.length ? (
            <div className="grid gap-5 md:grid-cols-2">
              {shown.map((tool, index) => (
                <ToolCard
                  tool={tool}
                  key={tool.id}
                  rankLabel={
                    ranks[index].ranking ? ranks[index].label : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <div className="placeholder-card">
              <h3>No tools match these filters.</h3>
              <p className="my-4">
                Try a broader search or remove a filter. Unverified tools will
                not match verification-recency filters.
              </p>
              <Link href="/tools?reset=1" className="button secondary">
                Clear filters
              </Link>
            </div>
          )}
          {pages > 1 && (
            <nav
              aria-label="Tool results pages"
              className="flex flex-wrap items-center gap-5 mt-8"
            >
              {page > 1 && (
                <Link className="text-link" href={pageHref(page - 1)}>
                  Previous
                </Link>
              )}
              <span>
                Page {page} of {pages}
              </span>
              {page < pages && (
                <Link className="text-link" href={pageHref(page + 1)}>
                  Next
                </Link>
              )}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
