import { taxonomy } from "./taxonomy";

// Historical slugs are not globally unique. Stable IDs stay authoritative;
// ambiguous slugs require their parent category instead of choosing silently.
export function resolveSubcategory(value: string, parent?: string) {
  const matches = taxonomy.categories.flatMap((category) =>
    category.subcategories
      .filter(
        (subcategory) =>
          (subcategory.id === value || subcategory.slug === value) &&
          (!parent || category.id === parent),
      )
      .map((subcategory) => ({ category, subcategory })),
  );
  return matches.length === 1 ? matches[0] : undefined;
}
