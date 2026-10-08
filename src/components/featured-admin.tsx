import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { featuredPlacements, tools } from "@/lib/db/schema";
import { ActionForm } from "@/components/action-form";
import { moderateFeatured } from "@/app/featured/actions";
import { placementLabel } from "@/lib/featured/rules";

// Rendered only within the server-authorized Admin route; actions recheck admin.
export async function FeaturedAdmin() {
  const rows = await db()
    .select({
      placement: featuredPlacements,
      name: tools.name,
      slug: tools.slug,
    })
    .from(featuredPlacements)
    .innerJoin(tools, eq(featuredPlacements.toolId, tools.id))
    .orderBy(desc(featuredPlacements.createdAt));
  return (
    <section id="featured" className="placeholder-card mt-8">
      <h2 className="text-2xl">Featured placement requests</h2>
      <p className="mt-4 text-sm">
        $99 USD for five days. Approval allows checkout; only confirmed payment
        activates the placement.
      </p>
      {!rows.length && (
        <p className="mt-5">No featured placement requests yet.</p>
      )}
      {rows.map(({ placement: p, name, slug }) => (
        <article key={p.id} className="account-row">
          <Link href={`/tools/${slug}`} className="text-link">
            {name} →
          </Link>
          <p className="mt-3">
            {p.sponsorName} · {placementLabel(p)}
          </p>
          <p className="text-sm text-muted mt-2">Applicant: {p.userId}</p>
          <p className="my-3 whitespace-pre-wrap">{p.note}</p>
          {p.reviewReason && (
            <p className="text-sm">Decision note: {p.reviewReason}</p>
          )}
          {p.endsAt && (
            <p className="text-sm mt-2">Ends: {p.endsAt.toUTCString()}</p>
          )}
          {(p.status === "pending_review" ||
            (p.status === "active" && p.endsAt && p.endsAt > new Date())) && (
            <ActionForm action={moderateFeatured} label="Save decision">
              <input type="hidden" name="id" value={p.id} />
              <label className="field">
                Decision
                <select name="decision">
                  {p.status === "active" ? (
                    <option value="suspended">Pause placement</option>
                  ) : (
                    <>
                      <option value="approved">Approve for payment</option>
                      <option value="rejected">Decline request</option>
                    </>
                  )}
                </select>
              </label>
              <label className="field">
                Reason (visible to applicant)
                <input name="reason" required minLength={5} maxLength={500} />
              </label>
            </ActionForm>
          )}
        </article>
      ))}
    </section>
  );
}
