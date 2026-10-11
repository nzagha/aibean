import Link from "next/link";
import { requireVendorCapability } from "@/lib/auth";
import { db } from "@/lib/db";
import { readVendorAnalytics } from "@/lib/content/analytics";
import { AnalyticsTable } from "@/components/analytics-table";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Tool analytics",
  robots: { index: false, follow: false },
};
export default async function Analytics({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    user = await requireVendorCapability(id),
    data = await readVendorAnalytics(db(), user.id, id);
  return (
    <div className="container py-16">
      <Link className="text-link" href={"/vendor/tools/" + id}>
        ← Tool requests and history
      </Link>
      <h1 className="my-8 font-display text-4xl">Tool analytics</h1>
      <section className="placeholder-card">
        {!data.ready ? (
          <p className="preview-notice">
            Analytics await the reviewed content database package.
          </p>
        ) : (
          <AnalyticsTable rows={data.rows} />
        )}
      </section>
    </div>
  );
}
