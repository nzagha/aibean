export const dynamic = "force-dynamic";
import { requireVendor } from "@/lib/auth";
import { getTools } from "@/lib/catalog/repository";
import Link from "next/link";
export const metadata = {
  title: "Vendor workspace",
  robots: { index: false, follow: false },
};
export default async function Vendor() {
  const { access } = await requireVendor();
  const catalog = await getTools();
  return (
    <div className="container py-16">
      <span className="eyebrow">Vendor capability</span>
      <h1 className="my-6 font-display text-5xl font-bold">
        Your tools. Clearer context.
      </h1>
      <p className="mb-8">
        Access is granted per tool after payment and ownership review. Public
        edits, verification, analytics, and promotion workflows are scheduled
        for the next vendor stage.
      </p>
      {access.length ? (
        access.map((a) => {
          const t = catalog.find((t) => t.id === a.toolId);
          return (
            <div className="placeholder-card mb-4" key={a.toolId}>
              <h2 className="text-2xl">{t?.name || "Unpublished tool"}</h2>
              {t && (
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
