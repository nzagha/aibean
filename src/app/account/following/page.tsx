import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readFollowing } from "@/lib/discovery/follows";
import { followKind, followKinds } from "@/lib/discovery/targets";
import { ActionForm } from "@/components/action-form";
import { changeTargetFollow } from "@/app/discovery-actions";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Following",
  robots: { index: false, follow: false },
};
export default async function Following({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; kind?: string }>;
}) {
  const user = await requireUser("/account/following"),
    p = await searchParams,
    kind = followKind.safeParse(p.kind),
    data = await readFollowing(
      db(),
      user.id,
      Number(p.page || 1),
      kind.success ? kind.data : undefined,
    );
  const suffix = kind.success ? "&kind=" + kind.data : "";
  return (
    <div className="container py-16">
      <WorkspaceNavigation />
      <h1 className="font-display text-4xl mb-8">Following</h1>
      <section className="placeholder-card">
        {!data.ready ? (
          <p className="preview-notice">
            Multi-target follows await the reviewed discovery package.
          </p>
        ) : (
          <>
            <p>
              {data.total} followed targets. Unpublished or suspended content
              stays hidden.
            </p>
            <form className="flex gap-4 my-5">
              <label className="field">
                Target type
                <select name="kind" defaultValue={p.kind || ""}>
                  <option value="">All types</option>
                  {followKinds.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
              <button className="button secondary">Filter</button>
            </form>
            {!data.rows.length && <p>No follows yet.</p>}
            {data.rows.map((t) => (
              <article key={t.kind + ":" + t.id} className="account-row">
                <p className="eyebrow">{t.kind}</p>
                {t.href ? (
                  <Link className="text-link" href={t.href}>
                    {t.title} →
                  </Link>
                ) : (
                  <p>{t.title}</p>
                )}
                <ActionForm
                  action={changeTargetFollow}
                  label="Unfollow"
                  submitClassName="button secondary"
                >
                  <input type="hidden" name="kind" value={t.kind} />
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="remove" value="true" />
                </ActionForm>
              </article>
            ))}
            <nav className="flex gap-5 mt-6" aria-label="Following pages">
              {data.page > 1 && (
                <Link href={"?page=" + (data.page - 1) + suffix}>Previous</Link>
              )}
              {data.page * 20 < data.total && (
                <Link href={"?page=" + (data.page + 1) + suffix}>Next</Link>
              )}
            </nav>
          </>
        )}
      </section>
    </div>
  );
}
