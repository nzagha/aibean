import { ActionForm } from "./action-form";
import { changeComparison } from "@/app/discovery-actions";
import { taxonomy, activeUseCases } from "@/lib/catalog/taxonomy";
import type { SavedComparison } from "@/lib/discovery/comparisons";
export function ComparisonEditor({
  saved,
  options,
  selected,
  context = {},
}: {
  saved?: SavedComparison;
  options: { id: string; name: string }[];
  selected: string[];
  context?: SavedComparison["context"];
}) {
  const combined = [
    ...options,
    ...(saved?.tools.filter((t) => !t.available) || []),
  ];
  return (
    <section className="placeholder-card my-8">
      <h2 className="text-2xl">
        {saved ? "Manage saved comparison" : "Save this comparison"}
      </h2>
      <p className="my-4">
        Choose 2–4 Tools. Your account keeps this comparison across sessions and
        devices.
      </p>
      <ActionForm action={changeComparison} label="Save comparison">
        <input type="hidden" name="operation" value="save" />
        {saved && (
          <>
            <input type="hidden" name="id" value={saved.id} />
            <input type="hidden" name="revision" value={saved.revision} />
          </>
        )}
        <label className="field">
          Comparison name
          <input
            name="name"
            required
            minLength={2}
            maxLength={80}
            defaultValue={saved?.name || ""}
          />
        </label>
        <fieldset className="my-5">
          <legend>Tools (2–4)</legend>
          <div className="grid gap-3 sm:grid-cols-2 my-3 max-h-64 overflow-auto">
            {combined.map((t) => (
              <label key={t.id} className="flex gap-3 items-center">
                <input
                  type="checkbox"
                  name="toolIds"
                  value={t.id}
                  defaultChecked={selected.includes(t.id)}
                />
                {t.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid sm:grid-cols-3 gap-4 my-5">
          {(
            [
              ["category", "Category", taxonomy.categories],
              ["useCase", "Use case", activeUseCases],
              ["industry", "Industry", taxonomy.industries],
            ] as const
          ).map(([key, label, choices]) => (
            <label className="field" key={key}>
              {label}
              <select name={key} defaultValue={context[key] || ""}>
                <option value="">All contexts</option>
                {choices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </ActionForm>
      {saved && (
        <ActionForm
          action={changeComparison}
          label="Delete comparison"
          confirmation="Delete this saved comparison?"
          submitClassName="button secondary"
        >
          <input type="hidden" name="operation" value="delete" />
          <input type="hidden" name="id" value={saved.id} />
          <input type="hidden" name="revision" value={saved.revision} />
        </ActionForm>
      )}
    </section>
  );
}
