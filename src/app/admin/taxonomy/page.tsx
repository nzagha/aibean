import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { approvedTaxonomy, readTaxonomy } from "@/lib/admin/catalog-controls";
import { ActionForm } from "@/components/action-form";
import { ReasonField } from "@/components/admin-shared";
import { saveTaxonomy } from "../actions";
import {
  taxonomy,
  activeUseCases,
  toolListingTypes,
} from "@/lib/catalog/taxonomy";
export default async function Taxonomy({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const installed = await readTaxonomy(db(), admin.id, q);
  return (
    <section className="placeholder-card">
      <h2 className="text-2xl">Taxonomy provenance</h2>
      <p className="preview-notice my-5">
        The imported v1 workbook is historical. Existing taxonomy IDs and active
        data remain unchanged. Normalization and v1.1 workbook reconciliation
        require a separate review; no invented sub-verticals or excluded listing
        modules are activated.
      </p>
      <h3 className="text-xl">Installed display metadata</h3>
      <form className="my-5">
        <label className="field">
          Search installed taxonomy
          <input name="q" defaultValue={q} maxLength={100} />
        </label>
        <button className="button secondary">Search</button>
      </form>
      {!installed.length && (
        <p className="preview-notice my-5">
          No installed records match. This page does not import or seed
          taxonomy.
        </p>
      )}
      {installed.map((item) => {
        const expected = approvedTaxonomy.find((t) => t.id === item.id);
        const editable =
          expected?.kind === item.kind && expected.parentId === item.parent_id;
        return (
          <details key={item.id} className="account-row">
            <summary className="cursor-pointer">
              {item.id} · {item.name} · {item.kind}
            </summary>
            <p className="my-3 text-sm">
              Slug: {item.slug} · Parent: {item.parent_id || "None"}
            </p>
            {editable ? (
              <ActionForm action={saveTaxonomy} label="Save display metadata">
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="revision" value={item.revision} />
                <label className="field">
                  Display name
                  <input
                    name="name"
                    minLength={2}
                    maxLength={100}
                    required
                    defaultValue={item.name}
                  />
                </label>
                <label className="field">
                  Description
                  <textarea
                    name="description"
                    maxLength={1000}
                    defaultValue={String(item.data.description || "")}
                  />
                </label>
                <ReasonField />
              </ActionForm>
            ) : (
              <p className="preview-notice">
                Editing is blocked because this identifier or relationship needs
                source reconciliation.
              </p>
            )}
          </details>
        );
      })}
      {[
        ["Categories", taxonomy.categories],
        ["Industries", taxonomy.industries],
        ["Use cases", activeUseCases],
        ["Tool listing types", toolListingTypes],
      ].map(([name, items]) => (
        <details key={String(name)} className="account-row">
          <summary className="cursor-pointer">
            {String(name)} · {(items as { id: string }[]).length}
          </summary>
          <ul className="mt-4">
            {(items as { id: string; name: string }[]).map((item) => (
              <li key={item.id} className="my-2">
                {item.id} · {item.name}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
}
