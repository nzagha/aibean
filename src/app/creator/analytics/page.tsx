import { requireApprovedCreator } from "@/lib/auth";
import { db } from "@/lib/db";
import { contentAvailable } from "@/lib/content/storage";
import { readCreatorAnalytics } from "@/lib/content/analytics";
import { authorAllowed } from "@/lib/content/workflows";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
import { AnalyticsTable } from "@/components/analytics-table";
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
      </section>
    </div>
  );
}
