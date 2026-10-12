import { AnalyticsBeacon } from "./analytics-beacon";
import Link from "next/link";
import { ToolLogo } from "@/components/tool-logo";
import type { Tool, CatalogFilters } from "@/lib/catalog/types";
import { categoryById, taxonomy, activeUseCases } from "@/lib/catalog/taxonomy";
import { comparisonRanks, comparisonVerdict } from "@/lib/catalog/comparison";
export function ComparisonPresentation({
  catalog,
  selected,
  context,
  unavailableCount = 0,
  embedded = false,
}: {
  catalog: Tool[];
  selected: Tool[];
  context: CatalogFilters;
  unavailableCount?: number;
  embedded?: boolean;
}) {
  const Heading = embedded ? "h2" : "h1";
  const slugs = selected.map((t) => t.slug);
  const rows: [string, (t: (typeof selected)[number]) => string][] = [
    ["Description", (t) => t.description],
    ["Category", (t) => categoryById(t.categoryId)?.name || "Unknown"],
    ["Best for", (t) => t.bestFor],
    ["Not best for", (t) => t.notBestFor],
    ["Pricing model", (t) => t.pricing],
    ["Starting price", (t) => t.startingPrice || "Unknown / not verified"],
    [
      "Free plan",
      (t) =>
        t.freePlan === null
          ? "Unknown / not verified"
          : t.freePlan
            ? "Yes"
            : "No",
    ],
    [
      "Trial",
      (t) =>
        t.trial === null ? "Unknown / not verified" : t.trial ? "Yes" : "No",
    ],
    ["Features", (t) => t.features.join(", ") || "Unknown / not verified"],
    [
      "Integrations",
      (t) => t.integrations.join(", ") || "Unknown / not verified",
    ],
    ["Platforms", (t) => t.platforms.join(", ") || "Unknown / not verified"],
    ["Strengths", (t) => t.pros.join("; ") || "Unknown / not verified"],
    [
      "Limitations",
      (t) => t.limitations.join("; ") || "Unknown / not verified",
    ],
    [
      "Reviews",
      (t) =>
        t.rating
          ? `${t.rating.toFixed(1)} / 5 (${t.reviewCount})`
          : "No reviews yet",
    ],
    ["Verification", (t) => t.verification.replaceAll("_", " ")],
    ["aiBean Verified", (t) => (t.verified ? "Yes" : "No")],
    ["Owner claimed", (t) => (t.claimed ? "Yes" : "No")],
    ["Last verified", (t) => t.lastVerified || "Not yet verified"],
    [
      "Use cases",
      (t) =>
        t.useCaseIds
          .map((id) => activeUseCases.find((c) => c.id === id)?.name || id)
          .join(", ") || "Unknown / not verified",
    ],
    [
      "Industries",
      (t) =>
        t.industries
          .map(
            (i) =>
              (taxonomy.industries.find((c) => c.id === i.id)?.name || i.id) +
              ": " +
              i.fit,
          )
          .join("; ") || "Unknown / not verified",
    ],
    ["Context rank", (t) => comparisonRanks(catalog, [t], context)[0].label],
  ];
  return (
    <div className="container py-16">
      {selected.length >= 2 &&
        selected.map((t) => (
          <AnalyticsBeacon
            key={t.id}
            value={{
              event: "comparison_complete",
              kind: "tools",
              targetId: t.id,
            }}
          />
        ))}
      <span className="eyebrow">Compare {selected.length} tools</span>
      <Heading className="my-6 font-display text-5xl font-bold">
        See the differences.
      </Heading>
      <p className="mb-8">
        Unknown information stays visible. Recommendations will appear only when
        supported by verified data and contextual scores.
      </p>
      {selected.some((t) => t.demo) && (
        <p className="preview-notice mb-6">
          Fictional development examples. This comparison is not a product
          recommendation.
        </p>
      )}
      {!embedded && (
        <form
          action="/compare"
          className="grid gap-5 mb-8 sm:grid-cols-3"
          aria-label="Comparison context"
        >
          <input type="hidden" name="tools" value={slugs.join(",")} />
          {(
            [
              ["category", "Category", taxonomy.categories],
              ["useCase", "Use case", activeUseCases],
              ["industry", "Industry", taxonomy.industries],
            ] as const
          ).map(([key, label, options]) => (
            <label className="field" key={key}>
              {label}
              <select name={key} defaultValue={context[key] || ""}>
                <option value="">All {label.toLowerCase()} contexts</option>
                {options.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <button className="button secondary justify-self-start">
            Compare in this context
          </button>
        </form>
      )}
      <p className="preview-notice mb-8">
        {unavailableCount
          ? "Recommendations are withheld while selected Tools are unavailable."
          : comparisonVerdict(catalog, selected, context)}
      </p>
      <div
        className="compare-scroll"
        tabIndex={0}
        role="region"
        aria-label="Scrollable tool comparison"
      >
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col">What matters</th>
              {selected.map((t) => (
                <th scope="col" key={t.id}>
                  <Link
                    href={`/tools/${t.slug}`}
                    className="inline-flex items-center gap-3"
                  >
                    <ToolLogo tool={t} variant="compact" />
                    {t.name} →
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {selected.map((t) => (
                  <td key={t.id}>{value(t)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="mt-8" aria-label="Reviewed ranking explanations">
        {comparisonRanks(catalog, selected, context).map(
          (result, i) =>
            result.ranking && (
              <details className="my-4" key={selected[i].id}>
                <summary className="text-link cursor-pointer">
                  Why {selected[i].name} has this score
                </summary>
                <p className="my-4">
                  {result.label} · Reviewed scores are grouped by scoring
                  version. Paid placements and ownership are excluded.
                </p>
                <ul>
                  {result.ranking.explanation.map((e) => (
                    <li key={e.factor}>
                      {e.factor}: {e.contribution.toFixed(2)}
                    </li>
                  ))}
                </ul>
              </details>
            ),
        )}
      </section>
      <Link href="/tools" className="button secondary mt-8">
        Choose different tools
      </Link>
    </div>
  );
}
