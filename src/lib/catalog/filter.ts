import type { CatalogFilters, Tool } from "./types";
export function filterTools(
  tools: Tool[],
  filters: CatalogFilters,
  now = Date.now(),
) {
  const q = (filters.q || "").trim().toLowerCase().slice(0, 120);
  const result = tools.filter((t) => {
    const age = t.lastVerified
      ? (now - Date.parse(t.lastVerified)) / 86400000
      : Infinity;
    return (
      (!q ||
        `${t.name} ${t.description} ${t.features.join(" ")} ${t.bestFor}`
          .toLowerCase()
          .includes(q)) &&
      (!filters.category || t.categoryId === filters.category) &&
      (!filters.subcategory || t.subcategoryId === filters.subcategory) &&
      (!filters.industry ||
        t.industries.some(
          (i) =>
            i.id === filters.industry && ["native", "strong"].includes(i.fit),
        )) &&
      (!filters.useCase || t.useCaseIds.includes(filters.useCase)) &&
      (!filters.pricing || t.pricing === filters.pricing) &&
      (filters.free !== "true" || t.freePlan === true) &&
      (filters.trial !== "true" || t.trial === true) &&
      (!filters.type || t.listingTypeId === filters.type) &&
      (!filters.verification || t.verification === filters.verification) &&
      (filters.verified !== "true" || t.verified) &&
      (filters.claimed !== "true" || t.claimed) &&
      (!filters.recency || (age >= 0 && age <= Number(filters.recency))) &&
      (!filters.rating ||
        (t.rating !== null && t.rating >= Number(filters.rating)))
    );
  });
  return result.sort((a, b) =>
    filters.sort === "rating"
      ? (b.rating ?? -1) - (a.rating ?? -1) || a.name.localeCompare(b.name)
      : filters.sort === "freshness"
        ? (Date.parse(b.lastVerified || "") || 0) -
            (Date.parse(a.lastVerified || "") || 0) ||
          a.name.localeCompare(b.name)
        : a.name.localeCompare(b.name),
  );
}
export function updateComparison(ids: string[], id: string): string[] {
  const unique = [...new Set(ids)];
  if (unique.includes(id)) return unique.filter((x) => x !== id);
  return unique.length < 4 ? [...unique, id] : unique;
}
export function safeReturnPath(input: unknown) {
  return typeof input === "string" &&
    /^\/(?!\/)/.test(input) &&
    !/[\\\u0000-\u001f]/.test(input)
    ? input
    : "/account";
}
