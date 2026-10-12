import { FollowControl } from "@/components/follow-control";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and, sql } from "drizzle-orm";
import { getTool, getTools, getReviews } from "@/lib/catalog/repository";
import { categoryById, industryById } from "@/lib/catalog/taxonomy";
import { getIdentity } from "@/lib/auth";
import { db } from "@/lib/db";
import { stacks, savedTools } from "@/lib/db/schema";
import { CompareButton } from "@/components/compare-provider";
import { TrustStatus, ToolCard } from "@/components/tool-card";
import { ToolLogo } from "@/components/tool-logo";
import { updateEngagement } from "@/app/engagement-actions";
import { ActionForm } from "@/components/action-form";
import { resultRows } from "@/lib/admin/tool-workflows";
import { ownerPredicates } from "@/lib/db/owned-resources";
import { contentAvailable } from "@/lib/content/storage";
import { readToolRelatedContent } from "@/lib/content/queries";
import { ReportContent } from "@/components/report-content";
import { AffiliateDisclosure } from "@/components/creator-enhancements";
import { enhancementsAvailable } from "@/lib/creator-enhancements/storage";
import { campaignContains } from "@/lib/creator-enhancements/affiliates";
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
  searchParams: Promise<{ notice?: string; campaign?: string }>;
}) {
  const t = await getTool((await params).slug);
  if (!t) notFound();
  const incoming = await searchParams;
  const notice = incoming.notice;
  const campaign = typeof incoming.campaign === "string" && incoming.campaign.length <= 100 && process.env.DATABASE_URL && await db().transaction(async tx=>await enhancementsAvailable(tx)&&await campaignContains(tx,incoming.campaign!,"tools",t.id)) ? incoming.campaign : undefined;
  const userId = await getIdentity();
  const canWrite = !!userId && !!process.env.DATABASE_URL;
  const userStacks = canWrite
    ? await db().select().from(stacks).where(ownerPredicates(userId!).stacks)
    : [];
  const saved = canWrite
    ? (
        await db()
          .select()
          .from(savedTools)
          .where(
            and(ownerPredicates(userId!).saves, eq(savedTools.toolId, t.id)),
          )
      ).length > 0
    : false;
  const reviews = await getReviews(t.id);
  const [ownReview] = canWrite
    ? resultRows<{
        rating: number;
        body: string;
        revision: string;
        status: string;
      }>(
        await db().execute(sql`SELECT rating,body,status,xmin::text AS revision
          FROM public.tool_reviews WHERE user_id=${userId!} AND tool_id=${t.id}`),
      )
    : [];
  const contentReady =
    !!process.env.DATABASE_URL && (await contentAvailable(db()));
  const related = contentReady ? await readToolRelatedContent(db(), t.id) : [];
  const similar = (await getTools())
    .filter(
      (x) =>
        x.id !== t.id &&
        (t.similarToolIds?.length
          ? t.similarToolIds.includes(x.id)
          : x.categoryId === t.categoryId),
    )
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
          <span className="eyebrow">
            {t.categoryLabel || categoryById(t.categoryId)?.name}
          </span>
          <h1 className="my-5 flex items-center gap-4 font-display text-5xl font-bold">
            <ToolLogo tool={t} />
            <span>{t.name}</span>
          </h1>
          <p className="mb-6 max-w-2xl text-lg">{t.description}</p>
          <TrustStatus tool={t} />
          {t.organicRanking && (
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer">
                Why this organic score? · {t.organicRanking.score}
              </summary>
              <p className="my-3">
                General discovery · Version {t.organicRanking.version}. Payments
                and sponsorship are excluded.
              </p>
              <ul>
                {t.organicRanking.explanation.map((item) => (
                  <li key={item.factor}>
                    {item.factor}: {item.contribution.toFixed(2)}
                  </li>
                ))}
              </ul>
            </details>
          )}
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
                  {contentReady && <ReportContent kind="reviews" id={r.id} />}
                </article>
              ))
            ) : (
              <p className="mb-5">No approved reviews yet.</p>
            )}
            {canWrite ? (
              <div className="placeholder-card">
                <ActionForm action={updateEngagement} label="Submit for review">
                  <input type="hidden" name="operation" value="review" />
                  <input
                    type="hidden"
                    name="returnTo"
                    value={`/tools/${t.slug}`}
                  />
                  <input
                    type="hidden"
                    name="revision"
                    value={ownReview?.revision || ""}
                  />
                  <input type="hidden" name="toolId" value={t.id} />
                  <label className="field">
                    Your rating
                    <select
                      name="rating"
                      required
                      defaultValue={ownReview?.rating || ""}
                    >
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
                      defaultValue={ownReview?.body || ""}
                    />
                  </label>
                  <p className="mb-4 text-xs">
                    Submitting again updates your existing review and returns it
                    to moderation.
                  </p>
                  {ownReview && (
                    <p className="mb-4 text-sm">
                      Your review: {ownReview.status}
                    </p>
                  )}
                </ActionForm>
              </div>
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
            {related.map((item) => (
              <Link
                className="text-link block mt-5"
                key={item.id}
                href={"/" + item.kind + "/" + item.slug}
              >
                {item.title} →
              </Link>
            ))}
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
          {t.website &&
            (contentReady && !t.demo ? (
              <form
                method="post"
                action={"/outbound/tools/" + t.slug}
                target="_blank"
                rel="noopener noreferrer"
              >
                {campaign && <input type="hidden" name="campaign" value={campaign}/>}
                <AffiliateDisclosure tool={t.id} campaign={campaign}/>
                <button className="button primary w-full">
                  Visit official website →
                </button>
              </form>
            ) : (
              <a
                href={t.website}
                className="button primary w-full"
                rel="noopener noreferrer"
                target="_blank"
              >
                Visit official website →
              </a>
            ))}
          <div className="my-4">
            <CompareButton tool={t} />
            <FollowControl
              kind="tools"
              id={t.id}
              returnTo={"/tools/" + t.slug}
            />
            <AnalyticsBeacon
              value={{ event: "tool_view", kind: "tools", targetId: t.id }}
            />
          </div>
          {canWrite ? (
            <ActionForm
              action={updateEngagement}
              label={saved ? "Remove from saved" : "Save tool"}
              submitClassName="button secondary w-full"
            >
              <input type="hidden" name="operation" value="save" />
              <input type="hidden" name="returnTo" value={`/tools/${t.slug}`} />
              <input type="hidden" name="toolId" value={t.id} />
              <input type="hidden" name="remove" value={String(saved)} />
            </ActionForm>
          ) : (
            <Link className="button secondary w-full" href={login}>
              Sign in to save
            </Link>
          )}
          {canWrite && userStacks.length > 0 ? (
            <ActionForm
              action={updateEngagement}
              label="Add to stack"
              submitClassName="button secondary w-full"
            >
              <input type="hidden" name="operation" value="add-stack" />
              <input type="hidden" name="returnTo" value={`/tools/${t.slug}`} />
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
            </ActionForm>
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
