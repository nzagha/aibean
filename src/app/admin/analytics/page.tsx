import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { readAdminAnalytics } from "@/lib/content/analytics";
import { AnalyticsTable } from "@/components/analytics-table";
export default async function Analytics() {
  const admin = await requireAdmin(),
    data = await readAdminAnalytics(db(), admin.id);
  return (
    <section className="placeholder-card">
      <h2 className="text-2xl">Operational analytics</h2>
      {!data.ready ? (
        <p className="preview-notice my-5">
          Analytics await the reviewed content database package.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-6 my-8">
            {data.totals.map((r) => (
              <p key={r.label}>
                <strong>{r.n}</strong> {r.label}
              </p>
            ))}
          </div>
          <AnalyticsTable rows={data.rows} />
        </>
      )}
    </section>
  );
}
