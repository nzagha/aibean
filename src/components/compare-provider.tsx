"use client";
import Link from "next/link";
import { createContext, useContext, useState, type ReactNode } from "react";
import { X, Columns3 } from "lucide-react";
import { updateComparison } from "@/lib/catalog/filter";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useExploration } from "./exploration-provider";
type Item = { id: string; slug: string; name: string };
function parseItems(value: unknown): Item[] {
  if (!Array.isArray(value)) return [];
  const items = value
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        item.id.length <= 100 &&
        typeof item.slug === "string" &&
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug) &&
        item.slug.length <= 100 &&
        typeof item.name === "string" &&
        item.name.length <= 100,
    )
    .map(({ id, slug, name }) => ({ id, slug, name }));
  return items
    .filter(
      (item, index) =>
        items.findIndex((other) => other.id === item.id) === index,
    )
    .slice(0, 4);
}
const CompareContext = createContext<{
  items: Item[];
  toggle: (item: Item) => void;
  clear: () => void;
}>({ items: [], toggle: () => {}, clear: () => {} });
export const useCompare = () => useContext(CompareContext);
export function CompareProvider({ children }: { children: ReactNode }) {
  const {
    value: items,
    setValue: setItems,
    available,
  } = useLocalStorage<Item[]>("aibean:comparison:v1", [], parseItems);
  const { inspect } = useExploration();
  const [message, setMessage] = useState("");
  function toggle(item: Item) {
    if (!items.some((x) => x.id === item.id) && items.length >= 4) {
      setMessage("Your comparison has 4 tools. Remove one to add another.");
      return;
    }
    setMessage("");
    inspect("feature:compare");
    setItems((current) => {
      const next = updateComparison(
        current.map((x) => x.id),
        item.id,
      );
      return next.map((id) =>
        id === item.id ? item : current.find((x) => x.id === id)!,
      );
    });
  }
  return (
    <CompareContext.Provider
      value={{
        items,
        toggle,
        clear: () => {
          setItems([]);
          setMessage("");
        },
      }}
    >
      {children}
      {items.length > 0 && (
        <aside className="compare-tray" aria-label="Comparison tray">
          <div className="flex flex-wrap items-center gap-3">
            <Columns3 size={20} />
            <strong className="text-sm">Compare {items.length}/4</strong>
            {items.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => toggle(item)}
                className="compare-chip"
                aria-label={`Remove ${item.name} from comparison`}
              >
                {item.name}
                <X size={14} />
              </button>
            ))}
            <button className="text-link" onClick={() => setItems([])}>
              Clear
            </button>
            <Link
              aria-disabled={items.length < 2}
              onClick={(e) => {
                if (items.length < 2) e.preventDefault();
              }}
              href={`/compare?tools=${items.map((x) => x.slug).join(",")}`}
              className="button primary"
            >
              {items.length < 2 ? "Add 1 more tool" : "Compare tools"}
            </Link>
          </div>
          <p className="mt-2 text-xs" role="status">
            {message ||
              (available
                ? "Shortlist saved in this browser. Sign in to save tools to your account."
                : "Shortlist kept for this visit. Browser storage is unavailable.")}
          </p>
        </aside>
      )}
    </CompareContext.Provider>
  );
}
export function CompareButton({ tool }: { tool: Item }) {
  const { items, toggle } = useCompare();
  const selected = items.some((x) => x.id === tool.id);
  return (
    <button
      className={`button secondary compare-button ${selected ? "selected" : ""}`}
      aria-pressed={selected}
      onClick={() => toggle(tool)}
    >
      <Columns3 size={16} />
      {selected ? "Added" : "Compare"}
    </button>
  );
}
