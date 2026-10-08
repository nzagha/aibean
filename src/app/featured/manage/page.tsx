import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { featuredPlacements, tools } from "@/lib/db/schema";
import { getTools } from "@/lib/catalog/repository";
import { featuredBillingConfigured } from "@/lib/billing";
import { placementLabel } from "@/lib/featured/rules";
import { ActionForm } from "@/components/action-form";
import { requestFeatured, checkoutFeatured } from "../actions";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your featured placements",
  robots: { index: false, follow: false },
};
export default async function ManageFeatured({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const user = await requireUser("/featured/manage");
  const { checkout } = await searchParams;
  const [catalog, placements] = await Promise.all([
    getTools(),
    db()
      .select({
        placement: featuredPlacements,
        name: tools.name,
        slug: tools.slug,
      })
      .from(featuredPlacements)
      .innerJoin(tools, eq(featuredPlacements.toolId, tools.id))
      .where(eq(featuredPlacements.userId, user.id))
      .orderBy(desc(featuredPlacements.createdAt)),
  ]);
  const eligible = catalog.filter((t) => !t.demo);
  const paymentsReady = featuredBillingConfigured();
  return (
    <div className="container py-16">
      <Link href="/featured" className="text-link">
        ← Featured placements
      </Link>
      <h1 className="my-6 font-display text-4xl font-bold">
        Your tool. In the spotlight.
      </h1>
      {checkout === "processing" && (
        <p role="status" className="preview-notice mb-6">
          We are waiting for payment confirmation. Returning from checkout does
          not activate a placement. Refresh to see the latest status.
        </p>
      )}
      {checkout === "canceled" && (
        <p role="status" className="preview-notice mb-6">
          You left checkout. Your request is saved; use Continue to checkout
          when you are ready.
        </p>
      )}
      {!paymentsReady && (
        <p className="preview-notice mb-6">
          Payments are not open yet. You can submit a request for review; no
          charge will be made.
        </p>
      )}
      {paymentsReady && (
        <p className="preview-notice mb-6">
          Payment testing is enabled. Use Stripe test cards only; live purchases
          are not available yet.
        </p>
      )}
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="placeholder-card">
          <h2 className="text-2xl">Request a featured spot</h2>
          <p className="mt-4">
            $99 USD for five days. Admin approval comes before payment.
          </p>
          {eligible.length ? (
            <ActionForm action={requestFeatured} label="Send for approval">
              <label className="field">
                Tool
                <select name="toolId" required defaultValue="">
                  <option value="" disabled>
                    Choose a published tool
                  </option>
                  {eligible.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Sponsor name
                <input
                  name="sponsorName"
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="Your name or organization"
                />
                <span className="text-xs text-muted">
                  Shown publicly as “Paid for by”.
                </span>
              </label>
              <label className="field">
                About your request
                <textarea
                  name="note"
                  required
                  minLength={10}
                  maxLength={1200}
                  placeholder="Tell us your connection to the tool and why you want to feature it."
                />
              </label>
              <label className="flex gap-3 text-sm mb-5 items-start">
                <input
                  type="checkbox"
                  name="consent"
                  required
                  className="mt-1"
                />
                <span>
                  I confirm these details are accurate and agree to a labeled
                  sponsored placement at $99 USD for five days after approval.
                  Payment does not confer ownership or verification.
                </span>
              </label>
            </ActionForm>
          ) : (
            <p className="preview-notice mt-5">
              There are no eligible published tools yet. Example listings cannot
              be promoted. A real tool must be published in the directory before
              a placement can be requested.
            </p>
          )}
        </section>
        <section className="placeholder-card">
          <h2 className="text-2xl">Your placements</h2>
          {!placements.length && (
            <p className="mt-5">
              Your requests, decisions, and placement dates will appear here.
            </p>
          )}
          {placements.map(({ placement: p, name, slug }) => (
            <article className="account-row" key={p.id}>
              <Link href={`/tools/${slug}`} className="text-link">
                {name} →
              </Link>
              <p className="mt-3">
                <span className="badge">{placementLabel(p)}</span>
              </p>
              <p className="text-sm mt-3">Sponsor: {p.sponsorName}</p>
              {p.reviewReason && (
                <p className="text-sm mt-2">Admin note: {p.reviewReason}</p>
              )}
              {p.startsAt && p.endsAt && (
                <p className="text-sm mt-2">
                  {p.startsAt.toUTCString()} – {p.endsAt.toUTCString()}
                </p>
              )}
              {p.status === "suspended" && (
                <p className="text-sm mt-2">
                  This placement is hidden. Contact the site administrator about
                  the review and any payment resolution.
                </p>
              )}
              {p.status === "approved" && paymentsReady && (
                <ActionForm
                  action={checkoutFeatured}
                  label="Continue to checkout · $99 USD"
                >
                  <input type="hidden" name="id" value={p.id} />
                </ActionForm>
              )}
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
