import { readBehaviorAnalytics } from "@/lib/discovery/analytics";
import { BehaviorAnalyticsTable } from "@/components/behavior-analytics-table";
import { requireApprovedCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { contentAvailable } from "@/lib/content/storage";
import { readCreatorAnalytics } from "@/lib/content/analytics";
import { authorAllowed } from "@/lib/content/workflows";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
import { AnalyticsTable } from "@/components/analytics-table";
import { AffiliateReport } from "@/components/affiliate-report";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Creator analytics",
  robots: { index: false, follow: false },
};
export default async function Analytics() {
  const user = await requireApprovedCreator(),
    ready = await contentAvailable(db()),
    allowed =
      ready && (await db().transaction((tx) => authorAllowed(tx, user.id)));
  const rows = allowed ? await readCreatorAnalytics(db(), user.id) : [];
  const behavior = allowed
    ? await readBehaviorAnalytics(db(), user.id, "creator")
    : { ready: false, rows: [] };
  return (
    <div className="container py-16">
      <WorkspaceNavigation />
      <h1 className="font-display text-4xl mb-8">Your campaign analytics</h1>
      <section className="placeholder-card">
        {!allowed ? (
          <p className="preview-notice">
            Analytics require enabled content storage and an active publishing
            capability.
          </p>
        ) : (
          <AnalyticsTable rows={rows} />
        )}
        <BehaviorAnalyticsTable ready={behavior.ready} rows={behavior.rows} />
      </section>
      {allowed && <AffiliateReport actor={user.id} scope="creator"/>}
    </div>
  );
}
