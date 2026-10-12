"use client";
import { useState } from "react";
import { supportedFit, type FitRequirements } from "@/lib/catalog/fit";
import type { Tool, CatalogFilters } from "@/lib/catalog/types";
export function SupportedFit({
  selected,
  context,
}: {
  selected: Tool[];
  context: CatalogFilters;
}) {
  const [features, setFeatures] = useState(""),
    [pricing, setPricing] = useState<FitRequirements["pricing"]>("any");
  return (
    <details className="placeholder-card my-8">
      <summary className="cursor-pointer font-semibold">
        Inspect fact-backed fit evidence
      </summary>
      <p className="text-sm my-5">
        Uses approved context assignments and recorded features/pricing. Ease of
        use remains unknown. These temporary inspection preferences do not
        change saved comparisons or organic ranking.
      </p>
      <label className="field">
        Required recorded features (one per line)
        <textarea
          maxLength={3000}
          rows={3}
          value={features}
          onChange={(e) => setFeatures(e.target.value)}
        />
      </label>
      <label className="field">
        Pricing preference
        <select
          value={pricing}
          onChange={(e) =>
            setPricing(e.target.value as FitRequirements["pricing"])
          }
        >
          {["any", "free", "freemium", "paid"].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </label>
      <div className="grid gap-6 md:grid-cols-2 mt-5">
        {selected.map((t) => {
          const f = supportedFit(t, context, {
            features: features.split("\n"),
            pricing,
          });
          return (
            <article key={t.id} className="account-row">
              <h2 className="text-xl">{t.name}</h2>
              <p className="my-4">
                Partial fit:{" "}
                {f.score === null ? "Unavailable" : f.score.toFixed(1)} ·{" "}
                {(f.knownWeight * 100).toFixed(0)}% supported formula weight
              </p>
              {f.factors.map((x) => (
                <p className="text-sm my-3" key={x.name}>
                  {x.name}:{" "}
                  {x.value === null
                    ? "Unknown / not selected"
                    : x.value.toFixed(1)}
                </p>
              ))}
              <p className="text-sm">{f.explanation}</p>
            </article>
          );
        })}
      </div>
    </details>
  );
}
