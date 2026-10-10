import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  readAdminAudit,
  normalizeAdminParams,
  type AdminParams,
} from "@/lib/admin/queries";
import { AdminPages } from "@/components/admin-shared";
export default async function Audit({
  searchParams,
}: {
  searchParams: Promise<AdminParams>;
}) {
  const admin = await requireAdmin();
  const params = normalizeAdminParams(await searchParams);
  const { rows, total, filters } = await readAdminAudit(db(), admin.id, params);
  return (
    <section className="placeholder-card">
      <h2 className="text-2xl">Audit history</h2>
      <form action="/admin/audit" className="my-6">
        <label className="field">
          Search action or entity
          <input name="q" maxLength={100} defaultValue={filters.q} />
        </label>
        <div className="grid gap-x-5 sm:grid-cols-2">
          <label className="field">
            Exact action
            <input
              name="action"
              maxLength={100}
              defaultValue={filters.action}
            />
          </label>
          <label className="field">
            Exact entity ID
            <input
              name="entity"
              maxLength={100}
              defaultValue={filters.entity}
            />
          </label>
        </div>
        <button className="button secondary">Filter audit</button>
      </form>
      {!rows.length && <p>No audit events match.</p>}
      {rows.map((row) => (
        <article className="account-row" key={row.id}>
          <strong>{row.action}</strong>
          <p className="text-sm my-3 break-words">
            Actor: {row.actor_id} · Entity: {row.entity_id} · {row.created_at}
          </p>
          <pre className="text-sm whitespace-pre-wrap break-words">
            {row.detail}
          </pre>
        </article>
      ))}
      <AdminPages
        base="/admin/audit"
        total={total}
        params={params}
        page={filters.page}
      />
    </section>
  );
}
