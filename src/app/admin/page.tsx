export const dynamic = "force-dynamic";
import { requireAdmin } from "@/lib/auth";
import { FeaturedAdmin } from "@/components/featured-admin";
import { db } from "@/lib/db";
import { tools, reviews, claims, auditLogs } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { taxonomy } from "@/lib/catalog/taxonomy";
import {
  createTool,
  setToolStatus,
  moderateReview,
  reviewClaim,
} from "@/app/actions";
export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};
export default async function Admin() {
  await requireAdmin();
  const [catalog, pendingReviews, pendingClaims, audit] = await Promise.all([
    db().select().from(tools),
    db().select().from(reviews).where(eq(reviews.status, "pending")),
    db().select().from(claims).where(eq(claims.status, "pending_review")),
    db().select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(25),
  ]);
  return (
    <div className="container py-16">
      <span className="eyebrow">Admin operations · Stage 1</span>
      <h1 className="my-6 font-display text-4xl font-bold">
        Content and trust.
      </h1>
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="placeholder-card">
          <h2 className="text-2xl">Create a Tool draft</h2>
          <form action={createTool}>
            {[
              ["name", "Name"],
              ["slug", "URL slug"],
              ["website", "Official website"],
              ["bestFor", "Best for"],
              ["notBestFor", "Not best for"],
            ].map(([name, label]) => (
              <label key={name} className="field">
                {label}
                <input
                  name={name}
                  required
                  type={name === "website" ? "url" : "text"}
                />
              </label>
            ))}
            <label className="field">
              Description
              <textarea
                name="description"
                minLength={20}
                maxLength={1200}
                required
              />
            </label>
            <label className="field">
              Tool logo (optional)
              <input
                name="logoUrl"
                maxLength={2000}
                placeholder="https://example.com/logo.png"
              />
              <span className="text-xs text-muted">
                Use an approved HTTPS image URL or a local /tool-logos/ image
                path.
              </span>
            </label>
            <label className="field">
              Category
              <select name="categoryId">
                {taxonomy.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Pricing model
              <select name="pricing">
                {["unknown", "free", "freemium", "paid"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <button className="button primary">Create draft</button>
          </form>
        </section>
        <section className="placeholder-card">
          <h2 className="text-2xl">Tool publication</h2>
          {catalog.map((t) => (
            <form action={setToolStatus} className="account-row" key={t.id}>
              <strong>{t.name}</strong>
              <input type="hidden" name="toolId" value={t.id} />
              <label className="field">
                Status
                <select name="status" defaultValue={t.status}>
                  <option>draft</option>
                  <option>published</option>
                  <option>archived</option>
                </select>
              </label>
              <button className="button secondary">Update status</button>
            </form>
          ))}
        </section>
        <section className="placeholder-card">
          <h2 className="text-2xl">Review moderation</h2>
          {pendingReviews.length ? (
            pendingReviews.map((r) => (
              <form action={moderateReview} className="account-row" key={r.id}>
                <p>
                  {r.rating} / 5 · {r.body}
                </p>
                <input type="hidden" name="reviewId" value={r.id} />
                <label className="field">
                  Moderation reason
                  <input name="reason" required minLength={5} maxLength={500} />
                </label>
                <div className="flex gap-3">
                  <button
                    name="status"
                    value="approved"
                    className="button primary"
                  >
                    Approve
                  </button>
                  <button
                    name="status"
                    value="rejected"
                    className="button secondary"
                  >
                    Reject
                  </button>
                </div>
              </form>
            ))
          ) : (
            <p className="mt-5">No pending reviews.</p>
          )}
        </section>
        <section className="placeholder-card">
          <h2 className="text-2xl">Paid claims awaiting review</h2>
          {pendingClaims.length ? (
            pendingClaims.map((c) => (
              <form action={reviewClaim} className="account-row" key={c.id}>
                <strong>
                  {c.company} · {c.role}
                </strong>
                <p className="my-3 whitespace-pre-wrap">{c.proof}</p>
                <input type="hidden" name="claimId" value={c.id} />
                <label className="field">
                  Review reason
                  <input name="reason" required minLength={5} maxLength={500} />
                </label>
                <div className="flex gap-3">
                  <button
                    name="decision"
                    value="approved"
                    className="button primary"
                  >
                    Approve ownership
                  </button>
                  <button
                    name="decision"
                    value="rejected"
                    className="button secondary"
                  >
                    Reject
                  </button>
                </div>
              </form>
            ))
          ) : (
            <p className="mt-5">No paid claims awaiting review.</p>
          )}
        </section>
      </div>
      <FeaturedAdmin />
      <section className="placeholder-card mt-8">
        <h2 className="text-2xl">Recent audit history</h2>
        {audit.map((a) => (
          <div className="account-row text-sm" key={a.id}>
            {a.action} · {a.detail} · {a.createdAt.toISOString()}
          </div>
        ))}
      </section>
    </div>
  );
}
