export const dynamic = "force-dynamic";
import { requireVendor } from "@/lib/auth";
import { readVendorTools } from "@/lib/db/vendor-workspace";
import { db } from "@/lib/db";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
import Link from "next/link";
export const metadata = {
  title: "Vendor workspace",
  robots: { index: false, follow: false },
};
export default async function Vendor() {
  const { user } = await requireVendor();
  const catalog = await readVendorTools(db(), user.id);
  return (
    <div className="container py-16">
      <span className="eyebrow">Vendor capability</span>
      <h1 className="my-6 font-display text-5xl font-bold">
        Your tools. Clearer context.
      </h1>
      <WorkspaceNavigation />
      <p className="mb-8">
        Access is granted per tool after payment and ownership review. Public
        edits, verification, analytics, and promotion workflows are scheduled
        for the next vendor stage.
      </p>
      <div className="flex flex-wrap gap-5 mb-8">
        <p>
          <strong>{catalog.length}</strong> approved Tool ownerships
        </p>
        <Link href="/account#claims" className="text-link">
          My claim requests →
        </Link>
        <Link href="/featured/manage" className="text-link">
          My sponsored placements →
        </Link>
      </div>
      {catalog.length ? (
        catalog.map((t) => {
          return (
            <div className="placeholder-card mb-4" key={t.id}>
              <h2 className="text-2xl">{t.name}</h2>
              <p className="my-4">
                {t.status} · {t.reviews} approved reviews
              </p>
              {t.status === "published" && (
                <Link href={`/tools/${t.slug}`} className="text-link mt-4">
                  View listing →
                </Link>
              )}
            </div>
          );
        })
      ) : (
        <div className="placeholder-card">
          <h2 className="text-2xl">No approved claims yet.</h2>
          <p className="my-4">
            Find your tool in the directory to begin an ownership claim.
          </p>
          <Link href="/tools" className="button primary">
            Find your tool →
          </Link>
        </div>
      )}
    </div>
  );
}
