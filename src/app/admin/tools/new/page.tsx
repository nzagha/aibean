import { requireAdmin } from "@/lib/auth";
import { ActionForm } from "@/components/action-form";
import { AdminToolFields } from "@/components/admin-tool-fields";
import { createToolDraft } from "../../actions";
export default async function NewTool() {
  await requireAdmin();
  return (
    <section className="placeholder-card">
      <h2 className="text-2xl">Create Tool draft</h2>
      <p className="my-4 text-muted">
        New Tools start as unpublished drafts. Taxonomy IDs retain their
        existing provenance.
      </p>
      <ActionForm action={createToolDraft} label="Create draft">
        <AdminToolFields />
      </ActionForm>
    </section>
  );
}
