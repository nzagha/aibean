import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { readAdminOverview } from "@/lib/admin/queries";
export default async function Admin() {
  const admin = await requireAdmin();
  const { counts, reviewReady } = await readAdminOverview(db(), admin.id);
  return (
    <>
      <h2 className="text-2xl mb-6">Operations overview</h2>
      <div className="grid gap-8 lg:grid-cols-2">
        {counts.map((row) => (
          <section className="placeholder-card" key={row.label}>
            <strong className="font-display text-3xl">{row.value}</strong>
            <p className="mt-3">{row.label}</p>
          </section>
        ))}
        <section className="placeholder-card">
          <h3 className="text-xl">Tool lifecycle</h3>
          <p className="my-4">
            Create a draft, inspect its private preview, then publish with an
            audited decision.
          </p>
          <Link className="button primary" href="/admin/tools/new">
            Create Tool draft
          </Link>
        </section>
        <section className="placeholder-card">
          <h3 className="text-xl">Review readiness</h3>
          <p className="my-4">
            {reviewReady
              ? "Creator and Vendor review storage is installed and enabled."
              : "Creator applications, Vendor requests and disputes await separately approved database installation and validation."}
          </p>
          <p className="text-sm text-muted">
            Paid edits and paid verification await payment settlement
            integration. Creator activation remains a separate operator
            approval. Skills, Playbooks, resources and Events need their own
            reviewed persistence packages.
          </p>
        </section>
      </div>
    </>
  );
}
