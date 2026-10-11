import { taxonomy, activeUseCases, toolListingTypes } from "./taxonomy";
export const approvedTaxonomy = [
  ...taxonomy.categories.map((c) => ({
    id: c.id,
    kind: "category",
    parentId: null as string | null,
  })),
  ...taxonomy.categories.flatMap((c) =>
    c.subcategories.map((s) => ({
      id: s.id,
      kind: "subcategory",
      parentId: c.id,
    })),
  ),
  ...taxonomy.industries.map((c) => ({
    id: c.id,
    kind: "industry",
    parentId: null as string | null,
  })),
  ...activeUseCases.map((c) => ({
    id: c.id,
    kind: "use_case",
    parentId: null as string | null,
  })),
  ...toolListingTypes.map((c) => ({
    id: c.id,
    kind: "listing_type",
    parentId: null as string | null,
  })),
];
export function approvedDisplayLabels(
  rows: { id: string; kind: string; parentId: string | null; name: string }[],
) {
  const expected = new Map(approvedTaxonomy.map((t) => [t.id, t]));
  return Object.fromEntries(
    rows
      .filter((row) => {
        const source = expected.get(row.id);
        return (
          source?.kind === row.kind &&
          source.parentId === row.parentId &&
          row.name.trim().length >= 2 &&
          row.name.length <= 100
        );
      })
      .map((row) => [row.id, row.name]),
  );
}
