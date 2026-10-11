import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { readAdminOverview } from "@/lib/admin/queries";
export default async function Admin() {
  const admin = await requireAdmin();
  const { counts, reviewReady, recent } = await readAdminOverview(
    db(),
    admin.id,
  );
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
      <section className="placeholder-card mt-8">
        <h2 className="text-2xl">Recent activity</h2>
        {!recent.length && <p className="my-5">No recorded operations yet.</p>}
        {recent.map((item) => (
          <div key={item.id} className="account-row">
            <Link
              className="text-link"
              href={"/admin/audit?entity=" + encodeURIComponent(item.entity_id)}
            >
              {item.action}
            </Link>
            <p className="text-sm mt-2">{item.created_at}</p>
          </div>
        ))}
      </section>
    </>
  );
}
