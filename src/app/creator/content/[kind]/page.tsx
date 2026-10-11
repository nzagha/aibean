import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePublishingUser } from "@/lib/content/auth-server";
import { db } from "@/lib/db";
import { contentKinds, type ContentKind } from "@/lib/content/contracts";
import { readContentList } from "@/lib/content/queries";
import { AdminPages } from "@/components/admin-shared";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
import type { AdminParams } from "@/lib/admin/queries";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your publishing workspace",
  robots: { index: false, follow: false },
};
export default async function ContentWorkspace({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<AdminParams>;
}) {
  const { kind } = await params;
  if (!contentKinds.includes(kind as ContentKind)) notFound();
  const user = await requirePublishingUser(
    kind as ContentKind,
    "/creator/content/" + kind,
  );
  const query = await searchParams;
  const data = await readContentList(
    db(),
    user.id,
    kind as ContentKind,
    "owner",
    query,
  );
  return (
    <div className="container py-16">
      <h1 className="font-display text-4xl">Your {kind}</h1>
      <WorkspaceNavigation />
      {!data.ready ? (
        <p className="preview-notice">
          Publishing awaits the reviewed Creator content package.
        </p>
      ) : (
        <section className="placeholder-card">
          <Link
            className="button primary"
            href={"/creator/content/" + kind + "/new"}
          >
            Create private draft
          </Link>
          <form className="my-5 grid gap-x-5 sm:grid-cols-2">
            <label className="field">
              Search your content
              <input name="q" maxLength={100} defaultValue={data.filters.q} />
            </label>
            <label className="field">
              Status
              <select name="status" defaultValue={data.filters.status}>
                <option value="">All</option>
                {[
                  "draft",
                  "pending",
                  "published",
                  "rejected",
                  "archived",
                  "canceled",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <button className="button secondary justify-self-start">
              Filter
            </button>
          </form>
          {!data.rows.length && (
            <p className="my-5">No matching drafts or publications.</p>
          )}
          {data.rows.map((row) => (
            <article key={row.id} className="account-row">
              <h2 className="text-xl">
                <Link
                  className="text-link"
                  href={"/creator/content/" + kind + "/" + row.id}
                >
                  {row.title}
                </Link>
              </h2>
              <p className="my-3">
                {row.status} · {row.summary}
              </p>
              {row.review_reason && <p>{row.review_reason}</p>}
            </article>
          ))}
          <AdminPages
            base={"/creator/content/" + kind}
            total={data.total}
            page={data.filters.page}
            params={query}
          />
        </section>
      )}
    </div>
  );
}
