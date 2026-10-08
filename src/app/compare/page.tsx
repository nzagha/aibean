import Link from "next/link";
import { ToolLogo } from "@/components/tool-logo";
import { getTools } from "@/lib/catalog/repository";
import { categoryById } from "@/lib/catalog/taxonomy";
export const dynamic = "force-dynamic";
export const metadata = { title: "Compare AI Tools" };
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ tools?: string }>;
}) {
  const p = await searchParams;
  const slugs = [
    ...new Set(
      (typeof p.tools === "string" ? p.tools : "").split(",").filter(Boolean),
    ),
  ];
  const catalog = await getTools();
  const selected = slugs
    .map((s) => catalog.find((t) => t.slug === s))
    .filter((t) => !!t);
  if (slugs.length < 2 || slugs.length > 4 || selected.length !== slugs.length)
    return (
      <div className="container py-20">
        <span className="eyebrow">Side by side</span>
        <h1 className="my-6 text-5xl font-display font-bold">
          A clearer choice.
        </h1>
        <p className="mb-8">
          Choose 2–4 available tools from the directory to compare. Unknown or
          unavailable tools cannot be compared.
        </p>
        <Link href="/tools" className="button primary">
          Choose your tools →
        </Link>
      </div>
    );
  const rows: [string, (t: (typeof selected)[number]) => string][] = [
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
    ["Context rank", () => "Not scored yet"],
  ];
  return (
    <div className="container py-16">
      <span className="eyebrow">Compare {selected.length} tools</span>
      <h1 className="my-6 font-display text-5xl font-bold">
        See the differences.
      </h1>
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
      <Link href="/tools" className="button secondary mt-8">
        Choose different tools
      </Link>
    </div>
  );
}
