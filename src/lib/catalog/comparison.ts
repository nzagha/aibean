import type { Tool, CatalogFilters } from "./types";
import { taxonomy, activeUseCases } from "./taxonomy";
import { explainContextRank, filterTools } from "./filter";
export function comparisonContext(
  params: Record<string, unknown>,
): CatalogFilters {
  return {
    category: taxonomy.categories.some((c) => c.id === params.category)
      ? String(params.category)
      : undefined,
    industry: taxonomy.industries.some((c) => c.id === params.industry)
      ? String(params.industry)
      : undefined,
    useCase: activeUseCases.some((c) => c.id === params.useCase)
      ? String(params.useCase)
      : undefined,
  };
}
export function comparisonRanks(
  catalog: Tool[],
  selected: Tool[],
  context: CatalogFilters,
) {
  const candidates = filterTools(catalog, context).filter(
    (t) => !!t.organicRanking,
  );
  return selected.map((tool) => {
    if (!tool.organicRanking)
      return { label: "Not reviewed yet", ranking: null };
    if (!candidates.some((t) => t.id === tool.id))
      return { label: "Outside selected context", ranking: null };
    const ranking = explainContextRank(tool, context);
    // Different Admin-approved weight versions must not imply a common rank.
    const peers = candidates.filter(
      (t) => t.organicRanking?.version === ranking.version,
    );
    const position =
      1 +
      peers.filter((t) => explainContextRank(t, context).score > ranking.score)
        .length;
    return {
      label: `#${position} · ${ranking.score.toFixed(2)} · v${ranking.version}`,
      ranking,
    };
  });
}
export function comparisonVerdict(
  catalog: Tool[],
  selected: Tool[],
  context: CatalogFilters,
  now = Date.now(),
) {
  const ranks = comparisonRanks(catalog, selected, context);
  if (
    selected.length < 2 ||
    !Object.values(context).some(Boolean) ||
    selected.some(
      (t) =>
        t.demo ||
        !t.verified ||
        !t.lastVerified ||
        !Number.isFinite(Date.parse(t.lastVerified)) ||
        now - Date.parse(t.lastVerified) < 0 ||
        now - Date.parse(t.lastVerified) > 180 * 86400000,
    ) ||
    ranks.some((r) => !r.ranking) ||
    new Set(ranks.map((r) => r.ranking?.version)).size !== 1
  )
    return "A recommendation needs a shared context, current verification and comparable reviewed scores. Missing data stays visible.";
  const ordered = selected
    .map((t, i) => ({ tool: t, score: ranks[i].ranking!.score }))
    .sort((a, b) => b.score - a.score);
  if (ordered[0].score - ordered[1].score < 5)
    return "The reviewed scores are close. Compare strengths and limitations before deciding.";
  return `${ordered[0].tool.name} has the highest reviewed organic score in this context. This is editorial guidance, not a guarantee; payment and sponsorship do not influence it.`;
}
