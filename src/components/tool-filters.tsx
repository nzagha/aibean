"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  EMPTY_FILTER_PREFERENCES,
  parseFilterPreferences,
} from "@/lib/filter-preferences";
import { useExploration } from "./exploration-provider";
import Link from "next/link";
import {
  taxonomy,
  toolListingTypes,
  activeUseCases,
} from "@/lib/catalog/taxonomy";
import { verificationStates, type CatalogFilters } from "@/lib/catalog/types";
export function ToolFilters({
  initial,
  labels = {},
}: {
  initial: CatalogFilters;
  labels?: Record<string, string>;
}) {
  const [category, setCategory] = useState(initial.category || "");
  const [subcategory, setSubcategory] = useState(initial.subcategory || "");
  const router = useRouter();
  const { inspect } = useExploration();
  const preferences = useLocalStorage(
    "aibean:filters:v1",
    EMPTY_FILTER_PREFERENCES,
    parseFilterPreferences,
  );
  const restored = useRef(false);
  const hasAdvanced = Boolean(
    initial.verification ||
    initial.recency ||
    initial.type ||
    initial.rating ||
    initial.free ||
    initial.trial ||
    initial.verified ||
    initial.claimed,
  );
  const [expanded, setExpanded] = useState(hasAdvanced);
  useEffect(() => {
    if (!preferences.ready || restored.current) return;
    restored.current = true;
    if ((initial as Record<string, string>).reset === "1") {
      preferences.setValue(EMPTY_FILTER_PREFERENCES);
      setExpanded(false);
      return;
    }
    setExpanded(hasAdvanced || preferences.value.expanded);
    if (Object.values(initial).some(Boolean)) return; // Explicit URLs always win.
    const query = new URLSearchParams(
      preferences.value.filters as Record<string, string>,
    ).toString();
    if (query) router.replace(`/tools?${query}`, { scroll: false });
  }, [preferences, hasAdvanced, initial, router]);
  const select = (
    name: string,
    label: string,
    options: { id: string; name: string }[],
  ) => (
    <label className="field" key={name}>
      {label}
      <select
        name={name}
        defaultValue={initial[name as keyof CatalogFilters] || ""}
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {labels[o.id] || o.name}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <form
      action="/tools"
      className="filter-panel"
      onSubmit={(event) => {
        preferences.setValue({
          filters: Object.fromEntries(
            new FormData(event.currentTarget),
          ) as CatalogFilters,
          expanded,
        });
        inspect("filters:applied");
      }}
    >
      <h2 className="text-xl">Find your fit</h2>
      <label className="field">
        Keyword
        <input
          name="q"
          defaultValue={initial.q}
          placeholder="Search tools"
          maxLength={120}
        />
      </label>
      <label className="field">
        Category
        <select
          name="category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setSubcategory("");
          }}
        >
          <option value="">All categories</option>
          {taxonomy.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {labels[c.id] || c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Subcategory
        <select
          name="subcategory"
          value={subcategory}
          disabled={!category}
          onChange={(e) => setSubcategory(e.target.value)}
        >
          <option value="">All subcategories</option>
          {taxonomy.categories
            .find((c) => c.id === category)
            ?.subcategories.map((c) => (
              <option key={c.id} value={c.id}>
                {labels[c.id] || c.name}
              </option>
            ))}
        </select>
      </label>
      {select("industry", "Industry", taxonomy.industries)}
      {select("useCase", "Use case", activeUseCases)}
      {select(
        "pricing",
        "Pricing",
        ["free", "freemium", "paid", "unknown"].map((id) => ({ id, name: id })),
      )}
      <details className="filter-details" open={expanded}>
        <summary
          onClick={(event) => {
            event.preventDefault();
            setExpanded(!expanded);
            preferences.setValue((current) => ({
              ...current,
              expanded: !expanded,
            }));
            if (!expanded) inspect("filters:advanced");
          }}
        >
          Trust & more filters
        </summary>
        {select("type", "Listing type", toolListingTypes)}
        {select(
          "verification",
          "Verification status",
          verificationStates.map((id) => ({
            id,
            name: id.replaceAll("_", " "),
          })),
        )}
        {select("recency", "Last verified", [
          { id: "30", name: "Within 30 days" },
          { id: "90", name: "Within 90 days" },
          { id: "180", name: "Within 180 days" },
        ])}
        {select("rating", "Minimum rating", [
          { id: "3", name: "3 stars" },
          { id: "4", name: "4 stars" },
          { id: "4.5", name: "4.5 stars" },
        ])}
        {[
          ["free", "Free plan"],
          ["trial", "Free trial"],
          ["verified", "aiBean Verified"],
          ["claimed", "Owner claimed"],
        ].map(([name, label]) => (
          <label className="check-field" key={name}>
            <input
              type="checkbox"
              name={name}
              value="true"
              defaultChecked={initial[name as keyof CatalogFilters] === "true"}
            />
            {label}
          </label>
        ))}
      </details>
      {select("sort", "Sort by", [
        { id: "rank", name: "Organic relevance" },
        { id: "name", name: "Name A–Z" },
        { id: "rating", name: "Highest rated" },
        { id: "freshness", name: "Recently verified" },
      ])}
      <button className="button primary w-full">Apply filters</button>
      <Link
        href="/tools"
        className="text-link justify-center"
        onClick={() => {
          preferences.setValue(EMPTY_FILTER_PREFERENCES);
          setCategory("");
          setSubcategory("");
          setExpanded(false);
        }}
      >
        Clear all filters
      </Link>
    </form>
  );
}
