import { ActionForm } from "@/components/action-form";
import { pruneRecordedAnalytics } from "@/app/discovery-actions";
import { readBehaviorAnalytics } from "@/lib/discovery/analytics";
import { BehaviorAnalyticsTable } from "@/components/behavior-analytics-table";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { readAdminAnalytics } from "@/lib/content/analytics";
import { AnalyticsTable } from "@/components/analytics-table";
import { analyticsEnabled } from "@/lib/discovery/analytics-session";
export default async function Analytics() {
  const admin = await requireAdmin(),
    data = await readAdminAnalytics(db(), admin.id);
  const behavior = await readBehaviorAnalytics(db(), admin.id, "admin");
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
      <BehaviorAnalyticsTable ready={behavior.ready} rows={behavior.rows} />
      <p className="my-5 text-sm">
        Recording:{" "}
        {behavior.ready && analyticsEnabled()
          ? "configured"
          : "awaiting approved storage and private configuration"}
        . Instrumentation: fixed event taxonomy; signed 30-minute sessions; 60
        attempts/session/minute; 30-day event retention. Writes prune up to
        1,000 expired rows. Admin cleanup prunes up to 10,000 per run. No worker
        is configured; expired physical rows can remain until cleanup. Reports
        exclude them. Expired analytics throttle keys are pruned after one day;
        other security budgets remain unchanged. No IPs, account identifiers,
        raw searches or external referrers are recorded.
      </p>
      {behavior.status && (
        <>
          <p>
            {behavior.status.events} retained events · {behavior.status.expired}{" "}
            expired rows awaiting cleanup · {behavior.status.campaigns} events
            with verified Resource Page context.
          </p>
          <ActionForm
            action={pruneRecordedAnalytics}
            label="Remove expired analytics"
            confirmation="Remove up to 10,000 analytics events older than 30 days?"
          >
            {null}
          </ActionForm>
        </>
      )}
    </section>
  );
}
