import { workspaceFilters } from "../workspace-filters";

export function catalogPage<T>(items: T[], raw: Record<string, unknown>) {
  const pages = Math.max(1, Math.ceil(items.length / 20));
  const page = Math.min(
    workspaceFilters({
      page: typeof raw.page === "string" ? raw.page : undefined,
    }).page,
    pages,
  );
  return { page, pages, shown: items.slice((page - 1) * 20, page * 20) };
}
export function catalogPageHref(raw: Record<string, unknown>, page: number) {
  const query = new URLSearchParams(
    Object.entries(raw).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  query.set("page", String(page));
  return "/tools?" + query.toString();
}
