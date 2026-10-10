import { requireAdmin } from "@/lib/auth";
import {
  taxonomy,
  activeUseCases,
  toolListingTypes,
} from "@/lib/catalog/taxonomy";
export default async function Taxonomy() {
  await requireAdmin();
  return (
    <section className="placeholder-card">
      <h2 className="text-2xl">Taxonomy provenance</h2>
      <p className="preview-notice my-5">
        The imported v1 workbook is historical. Existing taxonomy IDs and active
        data remain unchanged. Normalization and v1.1 workbook reconciliation
        require a separate review; no invented sub-verticals or excluded listing
        modules are activated.
      </p>
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
