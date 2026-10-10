import type { Tool } from "@/lib/catalog/types";
import {
  taxonomy,
  activeUseCases,
  toolListingTypes,
} from "@/lib/catalog/taxonomy";
export function AdminToolFields({ tool }: { tool?: Tool }) {
  return (
    <>
      <div className="grid gap-x-6 sm:grid-cols-2">
        {[
          ["name", "Name", 100],
          ["slug", "URL slug", 100],
          ["website", "Official website", 2000],
          ["logoUrl", "Logo URL or /tool-logos/ path", 2000],
          ["bestFor", "Best for", 300],
          ["notBestFor", "Not best for", 300],
        ].map(([name, label, max]) => (
          <label className="field" key={name}>
            {label}
            <input
              name={String(name)}
              defaultValue={String(tool?.[name as keyof Tool] || "")}
              maxLength={Number(max)}
              required={name !== "logoUrl"}
              type={name === "website" ? "url" : "text"}
              pattern={name === "slug" ? "[a-z0-9]+(-[a-z0-9]+)*" : undefined}
            />
          </label>
        ))}
      </div>
      <label className="field">
        Description
        <textarea
          name="description"
          required
          minLength={20}
          maxLength={1200}
          defaultValue={tool?.description}
        />
      </label>
      <div className="grid gap-x-6 sm:grid-cols-2">
        <label className="field">
          Category
          <select name="categoryId" defaultValue={tool?.categoryId}>
            {taxonomy.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.id}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Subcategory
          <select name="subcategoryId" defaultValue={tool?.subcategoryId || ""}>
            <option value="">None</option>
            {taxonomy.categories.map((c) => (
              <optgroup key={c.id} label={c.name}>
                {c.subcategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.id}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <span className="text-xs text-muted">
            Must belong to the selected category.
          </span>
        </label>
        <label className="field">
          Listing type
          <select
            name="listingTypeId"
            defaultValue={tool?.listingTypeId || "LST-01"}
          >
            {toolListingTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Pricing model
          <select name="pricing" defaultValue={tool?.pricing || "unknown"}>
            {["unknown", "free", "freemium", "paid"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Starting price (display text)
          <input
            name="startingPrice"
            defaultValue={tool?.startingPrice || ""}
            maxLength={120}
          />
        </label>
        {[
          ["freePlan", "Free plan"],
          ["trial", "Trial"],
        ].map(([name, label]) => (
          <label className="field" key={name}>
            {label}
            <select
              name={name}
              defaultValue={
                tool?.[name as "freePlan" | "trial"] == null
                  ? ""
                  : String(tool[name as "freePlan" | "trial"])
              }
            >
              <option value="">Unknown</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
        ))}
      </div>
      <details className="account-row">
        <summary className="cursor-pointer">Use cases and industry fit</summary>
        <fieldset className="mt-5">
          <legend>Use cases</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {activeUseCases.map((c) => (
              <label key={c.id} className="flex gap-2 items-start">
                <input
                  type="checkbox"
                  name="useCaseIds"
                  value={c.id}
                  defaultChecked={tool?.useCaseIds?.includes(c.id)}
                />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-6">
          <legend>Industry fit (0–100 relevance)</legend>
          {taxonomy.industries.map((c) => {
            const fit = tool?.industries?.find((i) => i.id === c.id);
            return (
              <div key={c.id} className="account-row grid gap-3 sm:grid-cols-3">
                <label className="flex gap-2 items-center">
                  <input
                    type="checkbox"
                    name="industryIds"
                    value={c.id}
                    defaultChecked={Boolean(fit)}
                  />
                  {c.name}
                </label>
                <label className="field">
                  Fit
                  <select
                    name={"industry-" + c.id + "-fit"}
                    defaultValue={fit?.fit || "general"}
                  >
                    {["native", "strong", "general", "suggested"].map(
                      (value) => (
                        <option key={value}>{value}</option>
                      ),
                    )}
                  </select>
                </label>
                <label className="field">
                  Relevance
                  <input
                    type="number"
                    name={"industry-" + c.id + "-relevance"}
                    defaultValue={fit?.relevance ?? 50}
                    min={0}
                    max={100}
                  />
                </label>
              </div>
            );
          })}
        </fieldset>
      </details>
      <details className="account-row">
        <summary className="cursor-pointer">
          Features, integrations and limitations
        </summary>
        {[
          ["features", "Features"],
          ["integrations", "Integrations"],
          ["platforms", "Platforms"],
          ["pros", "Strengths"],
          ["limitations", "Limitations"],
        ].map(([name, label]) => (
          <label className="field" key={name}>
            {label}
            <textarea
              name={name}
              defaultValue={tool?.[name as "features"]?.join("\n")}
              maxLength={12040}
            />
            <span className="text-xs text-muted">
              One item per line; up to 40 items of 300 characters.
            </span>
          </label>
        ))}
      </details>
    </>
  );
}
