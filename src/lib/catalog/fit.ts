import type { Tool, CatalogFilters } from "./types";
export const FIT_VERSION = "supported-fit-v1";
export type FitRequirements = {
  features: string[];
  pricing: "any" | "free" | "freemium" | "paid";
};
// Master 24.6 weights. Ease of use has no approved fact field and is never invented.
export function supportedFit(
  tool: Tool,
  context: CatalogFilters,
  requirements: FitRequirements,
  now = Date.now(),
) {
  const dimensions: number[] = [];
  if (context.category)
    dimensions.push(tool.categoryId === context.category ? 100 : 0);
  if (context.subcategory)
    dimensions.push(tool.subcategoryId === context.subcategory ? 100 : 0);
  if (context.useCase)
    dimensions.push(tool.useCaseIds.includes(context.useCase) ? 100 : 0);
  if (context.industry) {
    const assignment = tool.industries.find((i) => i.id === context.industry);
    if (assignment && Number.isFinite(assignment.relevance))
      dimensions.push(assignment.relevance);
    else if (!assignment) dimensions.push(0);
  }
  const normalization = (s: string) => s.trim().toLowerCase();
  const features = [
      ...new Set(requirements.features.map(normalization).filter(Boolean)),
    ].slice(0, 20),
    known = tool.features.map(normalization);
  const featureMatch = features.length
    ? (100 * features.filter((f) => known.includes(f)).length) / features.length
    : null;
  const pricing =
    requirements.pricing === "any" || tool.pricing === "unknown"
      ? null
      : tool.pricing === requirements.pricing
        ? 100
        : 0;
  const verified =
    tool.verified &&
    !!tool.lastVerified &&
    Number.isFinite(Date.parse(tool.lastVerified)) &&
    Date.parse(tool.lastVerified) <= now &&
    now - Date.parse(tool.lastVerified) <= 180 * 86400000;
  const rank = tool.demo ? undefined : tool.organicRanking;
  const factors = [
    {
      name: "Context assignments",
      weight: 0.35,
      value: dimensions.length
        ? dimensions.reduce((n, v) => n + v, 0) / dimensions.length
        : null,
    },
    {
      name: "Exact recorded feature matches",
      weight: 0.2,
      value: featureMatch,
    },
    { name: "Recorded pricing model", weight: 0.1, value: pricing },
    { name: "Ease of use", weight: 0.1, value: null },
    {
      name: "Reviewed verification",
      weight: 0.1,
      value: verified && rank ? rank.factors.verification : null,
    },
    {
      name: "Reviewed completeness",
      weight: 0.05,
      value: rank?.factors.completeness ?? null,
    },
    {
      name: "Reviewed editorial score",
      weight: 0.1,
      value: rank?.factors.editorial ?? null,
    },
  ];
  const knownWeight = factors.reduce(
      (n, f) => n + (f.value === null ? 0 : f.weight),
      0,
    ),
    weighted = factors.reduce(
      (n, f) => n + (f.value === null ? 0 : f.value * f.weight),
      0,
    );
  return {
    version: FIT_VERSION,
    factors,
    knownWeight,
    score: knownWeight
      ? Math.max(
          0,
          Math.min(100, weighted / knownWeight - (rank?.factors.risk ?? 0)),
        )
      : null,
    complete: false as const,
    missing: factors.filter((f) => f.value === null).map((f) => f.name),
    freshVerification: verified,
    explanation:
      "Partial evidence only; missing factors are not treated as zero. No guarantee or complete-fit recommendation. Affiliate payments and sponsored placement are excluded.",
  };
}
