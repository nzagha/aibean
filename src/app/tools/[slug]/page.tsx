import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { getTool, getTools, getReviews } from "@/lib/catalog/repository";
import { categoryById, industryById } from "@/lib/catalog/taxonomy";
import { getIdentity } from "@/lib/auth";
import { db } from "@/lib/db";
import { stacks, savedTools } from "@/lib/db/schema";
import { CompareButton } from "@/components/compare-provider";
import { TrustStatus, ToolCard } from "@/components/tool-card";
import { ToolLogo } from "@/components/tool-logo";
import { saveTool, submitReview, addToStack } from "@/app/actions";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const t = await getTool((await params).slug);
  return { title: t?.name || "Tool not found" };
}
export default async function ToolPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const t = await getTool((await params).slug);
  if (!t) notFound();
  const notice = (await searchParams).notice;
  const userId = await getIdentity();
  const canWrite = !!userId && !!process.env.DATABASE_URL;
  const userStacks = canWrite
    ? await db().select().from(stacks).where(eq(stacks.userId, userId!))
    : [];
  const saved = canWrite
    ? (
        await db()
          .select()
          .from(savedTools)
          .where(
            and(eq(savedTools.userId, userId!), eq(savedTools.toolId, t.id)),
          )
      ).length > 0
    : false;
  const reviews = await getReviews(t.id);
  const similar = (await getTools())
    .filter((x) => x.id !== t.id && x.categoryId === t.categoryId)
    .slice(0, 3);
  const login = `/login?returnTo=/tools/${t.slug}`;
  return (
    <div className="container py-12">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/tools">AI Tools</Link>
        <span>/</span>
        <span aria-current="page">{t.name}</span>
      </nav>
      {t.demo && (
        <p className="preview-notice mb-8">
          Fictional development example. This is not a real product listing.
        </p>
      )}
      {notice && (
        <p role="status" className="preview-notice mb-6">
          {notice === "review-pending"
            ? "Your review is pending moderation."
            : notice === "stacked"
              ? "Tool added to your stack."
              : notice === "saved"
                ? "Your saved tools have been updated."
                : ""}
        </p>
      )}
      <div className="tool-detail-grid">
        <div>
          <span className="eyebrow">{categoryById(t.categoryId)?.name}</span>
          <h1 className="my-5 flex items-center gap-4 font-display text-5xl font-bold">
            <ToolLogo tool={t} />
            <span>{t.name}</span>
          </h1>
          <p className="mb-6 max-w-2xl text-lg">{t.description}</p>
          <TrustStatus tool={t} />
          <p className="mt-3 text-sm">
            Last verified: {t.lastVerified || "Not yet verified"} ·{" "}
            {t.reviewCount
              ? `${t.rating?.toFixed(1)} ★ from ${t.reviewCount} reviews`
              : "No reviews yet"}
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <article className="placeholder-card">
              <h2 className="text-xl">Best for</h2>
              <p className="mt-4">{t.bestFor}</p>
            </article>
            <article className="placeholder-card">
              <h2 className="text-xl">Not best for</h2>
              <p className="mt-4">{t.notBestFor}</p>
            </article>
          </div>
          {[
            ["Features", t.features],
            ["Integrations", t.integrations],
            ["Platforms", t.platforms],
            ["Strengths", t.pros],
            ["Limitations", t.limitations],
          ].map(([name, values]) => (
            <section key={name as string} className="mt-8">
              <h2 className="text-2xl">{name}</h2>
              <ul className="mt-4 list-disc pl-5 space-y-2 text-muted">
                {(values as string[]).length ? (
                  (values as string[]).map((v) => <li key={v}>{v}</li>)
                ) : (
                  <li>Unknown / not verified</li>
                )}
              </ul>
            </section>
          ))}
          <section className="mt-8">
            <h2 className="text-2xl">Industry fit</h2>
            {t.industries.length ? (
              t.industries.map((i) => (
                <p className="mt-3" key={i.id}>
                  {industryById(i.id)?.name} · {i.fit} fit
                </p>
              ))
            ) : (
              <p className="mt-3">No industry fit has been reviewed.</p>
            )}
          </section>
          <section className="mt-12" id="reviews">
            <h2 className="text-2xl">Community reviews</h2>
            <p className="my-5">
              Reviews are independently moderated. Vendors cannot edit or remove
              them.
            </p>
            {reviews.length ? (
              reviews.map((r) => (
                <article className="placeholder-card mb-4" key={r.id}>
                  <strong>{r.rating} / 5</strong>
                  <p className="mt-3 whitespace-pre-wrap">{r.body}</p>
                </article>
              ))
            ) : (
              <p className="mb-5">No approved reviews yet.</p>
            )}
            {canWrite ? (
              <form action={submitReview} className="placeholder-card">
                <input type="hidden" name="toolId" value={t.id} />
                <label className="field">
                  Your rating
                  <select name="rating" required>
                    <option value="">Choose a rating</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Your experience
                  <textarea
                    name="body"
                    required
                    minLength={20}
                    maxLength={4000}
                    rows={4}
                  />
                </label>
                <p className="mb-4 text-xs">
                  Submitting again updates your existing review and returns it
                  to moderation.
                </p>
                <button className="button primary">Submit for review</button>
              </form>
            ) : (
              <Link className="button secondary" href={login}>
                Sign in to rate and review
              </Link>
            )}
          </section>
          <section className="mt-12">
            <h2 className="text-2xl">Put this tool to work</h2>
            <p className="my-4">
              Related Skills, Playbooks, and Creator Stacks will appear as
              approved content is published.
            </p>
            <div className="flex gap-5">
              <Link className="text-link" href="/skills">
                AI Skills →
              </Link>
              <Link className="text-link" href="/playbooks">
                Playbooks →
              </Link>
            </div>
          </section>
        </div>
        <aside className="placeholder-card h-fit">
          <span className="eyebrow">Make your choice</span>
          <h2 className="mt-4 text-2xl capitalize">{t.pricing}</h2>
          <p className="my-4">
            {t.startingPrice || "Starting price: unknown / not verified"}
          </p>
          <p className="mb-6 text-sm">
            Free plan:{" "}
            {t.freePlan === null ? "Unknown" : t.freePlan ? "Yes" : "No"}
            <br />
            Trial: {t.trial === null ? "Unknown" : t.trial ? "Yes" : "No"}
          </p>
          {t.website && (
            <a
              href={t.website}
              className="button primary w-full"
              rel="noopener noreferrer"
              target="_blank"
            >
              Visit official website →
            </a>
          )}
          <div className="my-4">
            <CompareButton tool={t} />
          </div>
          {canWrite ? (
            <form action={saveTool}>
              <input type="hidden" name="toolId" value={t.id} />
              <input type="hidden" name="remove" value={String(saved)} />
              <button className="button secondary w-full">
                {saved ? "Remove from saved" : "Save tool"}
              </button>
            </form>
          ) : (
            <Link className="button secondary w-full" href={login}>
              Sign in to save
            </Link>
          )}
          {canWrite && userStacks.length > 0 ? (
            <form action={addToStack} className="mt-6">
              <input type="hidden" name="toolId" value={t.id} />
              <label className="field">
                Your stack
                <select name="stackId">
                  {userStacks.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button secondary w-full">Add to stack</button>
            </form>
          ) : (
            <Link className="text-link mt-5" href="/account">
              Create a personal stack →
            </Link>
          )}
          <div className="border-t border-line mt-7 pt-6">
            <p className="text-sm mb-3">Represent this tool?</p>
            <Link href={`/claim/${t.slug}`} className="text-link">
              Claim this tool →
            </Link>
            <p className="mt-3 text-xs">
              Payment and ownership approval are separate. Claiming does not
              award aiBean Verified.
            </p>
          </div>
        </aside>
      </div>
      {similar.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl">Similar tools</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {similar.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
