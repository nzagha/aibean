import { Search, ArrowRight } from "lucide-react";
import { scopes } from "@/lib/catalog/taxonomy";
export function ScopedSearch({
  scope = "tools",
  query = "",
}: {
  scope?: string;
  query?: string;
}) {
  return (
    <form
      action="/search"
      role="search"
      className="discovery-search scoped-search"
    >
      <Search size={20} aria-hidden="true" />
      <label className="sr-only" htmlFor="search-scope">
        Search in
      </label>
      <select id="search-scope" name="scope" defaultValue={scope}>
        {scopes.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="scoped-query">
        What do you want to find?
      </label>
      <input
        id="scoped-query"
        name="q"
        defaultValue={query}
        maxLength={120}
        placeholder="What do you want to find?"
      />
      <button className="button primary" type="submit">
        <span className="hidden sm:inline">Search</span>
        <ArrowRight size={18} />
        <span className="sr-only sm:hidden">Search</span>
      </button>
    </form>
  );
}
