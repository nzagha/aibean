import type { CatalogFilters } from "./catalog/types";
export type FilterPreferences = { filters: CatalogFilters; expanded: boolean };
export const EMPTY_FILTER_PREFERENCES: FilterPreferences = {
  filters: {},
  expanded: false,
};
const fields = new Set([
  "category",
  "subcategory",
  "industry",
  "useCase",
  "pricing",
  "free",
  "trial",
  "verification",
  "verified",
  "recency",
  "claimed",
  "sort",
  "rating",
  "type",
]);
export function parseFilterPreferences(value: unknown): FilterPreferences {
  if (!value || typeof value !== "object") return EMPTY_FILTER_PREFERENCES;
  const record = value as Record<string, unknown>;
  const filters =
    record.filters && typeof record.filters === "object"
      ? Object.fromEntries(
          Object.entries(record.filters).filter(
            ([key, val]) =>
              fields.has(key) && typeof val === "string" && val.length <= 120,
          ),
        )
      : {};
  return { filters, expanded: record.expanded === true };
}
