import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readComparisons } from "@/lib/discovery/comparisons";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Saved comparisons",
  robots: { index: false, follow: false },
};
export default async function Comparisons({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireUser("/account/comparisons"),
    p = await searchParams,
    data = await readComparisons(db(), user.id, Number(p.page || 1));
  return (
    <div className="container py-16">
      <WorkspaceNavigation />
      <h1 className="font-display text-4xl mb-8">Your saved comparisons</h1>
      <section className="placeholder-card">
        {!data.ready ? (
          <p className="preview-notice">
            Account comparisons await the reviewed discovery database package.
          </p>
        ) : !data.rows.length ? (
          <p>
            No saved comparisons yet. Choose Tools, then save a named
            comparison.
          </p>
        ) : (
          <ul className="grid gap-5">
            {data.rows.map((c) => (
              <li key={c.id}>
                <Link
                  className="text-link"
                  href={"/account/comparisons/" + c.id}
                >
                  {c.name} →
                </Link>
                <p>
                  {c.tools.length} Tools
                  {c.tools.some((t) => !t.available)
                    ? " · Contains unavailable Tools"
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
        <Link href="/tools" className="button secondary mt-6">
          Choose Tools →
        </Link>
        <nav className="flex gap-5 mt-6" aria-label="Saved comparison pages">
          {data.page > 1 && (
            <Link href={"?page=" + (data.page - 1)}>Previous</Link>
          )}
          {data.page * 20 < data.total && (
            <Link href={"?page=" + (data.page + 1)}>Next</Link>
          )}
        </nav>
      </section>
    </div>
  );
}
