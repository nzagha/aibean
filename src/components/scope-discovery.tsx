import Link from "next/link";
import type { CatalogFilters } from "@/lib/catalog/types";
import { comparisonContext } from "@/lib/catalog/comparison";
export function ScopeDiscovery({ filters }: { filters: CatalogFilters }) {
  const context = comparisonContext(filters);
  const query = new URLSearchParams(
    Object.entries(context).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  ).toString();
  if (!query) return null;
  return (
    <nav
      aria-label="Discover related content in this context"
      className="flex flex-wrap gap-5 mb-8"
    >
      <Link className="text-link" href={"/skills?" + query}>
        Skills in this context →
      </Link>
      <Link className="text-link" href={"/playbooks?" + query}>
        Playbooks in this context →
      </Link>
      <Link className="text-link" href={"/events?" + query}>
        Events in this context →
      </Link>
      <Link className="text-link" href={"/creators?" + query}>
        Creators in this context →
      </Link>
    </nav>
  );
}
