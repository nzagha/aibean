import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  savedTools,
  tools,
  stacks,
  stackTools,
  reviews,
  claims,
} from "@/lib/db/schema";
import { createStack } from "@/app/actions";
import { passwordMode, passwordConfiguration } from "@/lib/password-auth";
import { ownerPredicates } from "@/lib/db/owned-resources";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};
export default async function Account() {
  const user = await requireUser("/account", false);
  if (!process.env.DATABASE_URL)
    return (
      <div className="container py-16">
        <span className="eyebrow">Your aiBean</span>
        <h1 className="my-6 font-display text-5xl font-bold">Welcome back.</h1>
        <section className="placeholder-card max-w-2xl">
          <h2 className="text-2xl">You are signed in.</h2>
          <p className="mt-4">
            {passwordConfiguration()?.email || "Your account is active."}
          </p>
          <p className="mt-4">
            Explore tools, preview details, and keep your comparison shortlist
            in this browser. Account-saved tools, stacks, reviews, and
            featured-placement requests will be available once database setup is
            complete.
          </p>
          <div className="flex flex-wrap gap-4 mt-6">
            <Link href="/tools" className="button primary">
              Explore AI Tools →
            </Link>
            <Link href="/compare" className="button secondary">
              Your comparison
            </Link>
          </div>
          {passwordMode() && (
            <form action="/api/auth/logout" method="post" className="mt-6">
              <button className="text-link">Sign out</button>
            </form>
          )}
        </section>
      </div>
    );
  const [saved, myStacks, myReviews, myClaims] = await Promise.all([
    db()
      .select({ id: tools.id, name: tools.name, slug: tools.slug })
      .from(savedTools)
      .innerJoin(tools, eq(savedTools.toolId, tools.id))
      .where(ownerPredicates(user.id).saves),
    db().select().from(stacks).where(ownerPredicates(user.id).stacks),
    db().select().from(reviews).where(ownerPredicates(user.id).reviews),
    db().select().from(claims).where(ownerPredicates(user.id).claims),
  ]);
  const members = await db()
    .select({ stackId: stackTools.stackId, name: tools.name, slug: tools.slug })
    .from(stackTools)
    .innerJoin(stacks, eq(stackTools.stackId, stacks.id))
    .innerJoin(tools, eq(stackTools.toolId, tools.id))
    .where(ownerPredicates(user.id).stacks);
  return (
    <div className="container py-16">
      <div className="flex justify-between">
        <span className="eyebrow">Your aiBean</span>
        {passwordMode() ? (
          <form action="/api/auth/logout" method="post">
            <button className="button secondary">Sign out</button>
          </form>
        ) : (
          <UserButton />
        )}
      </div>
      <h1 className="my-6 font-display text-5xl font-bold">Your next moves.</h1>
      <div className="flex flex-wrap gap-5 mb-8">
        <Link href="/featured/manage" className="text-link">
          Featured placements →
        </Link>
        <Link href="/vendor" className="text-link">
          Vendor workspace →
        </Link>
        <Link href="/pricing" className="text-link">
          Pricing →
        </Link>
        {user.isAdmin && (
          <Link href="/admin" className="text-link">
            Admin →
          </Link>
        )}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <section id="saved" className="placeholder-card">
          <h2 className="text-2xl">Saved tools</h2>
          {saved.length ? (
            saved.map((t) => (
              <Link
                className="account-row"
                key={t.id}
                href={`/tools/${t.slug}`}
              >
                {t.name} →
              </Link>
            ))
          ) : (
            <p className="mt-5">Your saved tools will appear here.</p>
          )}
        </section>
        <section id="stacks" className="placeholder-card">
          <h2 className="text-2xl">Personal stacks</h2>
          {myStacks.map((s) => (
            <div key={s.id} className="border-b border-line py-4">
              <h3 className="text-lg">{s.name}</h3>
              {members
                .filter((m) => m.stackId === s.id)
                .map((m) => (
                  <Link
                    key={m.slug}
                    className="account-row"
                    href={`/tools/${m.slug}`}
                  >
                    {m.name} →
                  </Link>
                ))}
            </div>
          ))}
          <form action={createStack} className="mt-5">
            <label className="field">
              New stack name
              <input
                name="name"
                required
                minLength={2}
                maxLength={80}
                placeholder="My research stack"
              />
            </label>
            <button className="button primary">Create stack</button>
          </form>
        </section>
        <section id="reviews" className="placeholder-card">
          <h2 className="text-2xl">Your reviews</h2>
          {myReviews.length ? (
            myReviews.map((r) => (
              <div key={r.id} className="account-row">
                <strong>
                  {r.rating} / 5 · {r.status}
                </strong>
                <p>{r.body}</p>
              </div>
            ))
          ) : (
            <p className="mt-5">You haven’t submitted any reviews.</p>
          )}
        </section>
        <section id="claims" className="placeholder-card">
          <h2 className="text-2xl">Claim requests</h2>
          {myClaims.length ? (
            myClaims.map((c) => (
              <p className="account-row" key={c.id}>
                {c.company} · {c.status.replaceAll("_", " ")}
              </p>
            ))
          ) : (
            <p className="mt-5">No claim requests yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
