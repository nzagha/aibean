import Link from "next/link";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
import { ActionForm } from "@/components/action-form";
import { updateAccount } from "./actions";
import { AccountSignOut } from "@/components/account-signout";
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
import { passwordConfiguration } from "@/lib/password-auth";
import { authMode } from "@/lib/auth-mode";
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
        <WorkspaceNavigation />
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
          <AccountSignOut mode={authMode()} compact />
        </section>
      </div>
    );
  const [saved, myStacks, myReviews, myClaims] = await Promise.all([
    db()
      .select({
        id: tools.id,
        name: tools.name,
        slug: tools.slug,
        status: tools.status,
      })
      .from(savedTools)
      .innerJoin(tools, eq(savedTools.toolId, tools.id))
      .where(ownerPredicates(user.id).saves),
    db().select().from(stacks).where(ownerPredicates(user.id).stacks),
    db().select().from(reviews).where(ownerPredicates(user.id).reviews),
    db().select().from(claims).where(ownerPredicates(user.id).claims),
  ]);
  const members = await db()
    .select({
      stackId: stackTools.stackId,
      toolId: tools.id,
      name: tools.name,
      slug: tools.slug,
      status: tools.status,
    })
    .from(stackTools)
    .innerJoin(stacks, eq(stackTools.stackId, stacks.id))
    .innerJoin(tools, eq(stackTools.toolId, tools.id))
    .where(ownerPredicates(user.id).stacks);
  return (
    <div className="container py-16">
      <div className="flex justify-between">
        <span className="eyebrow">Your aiBean</span>
        <AccountSignOut mode={authMode()} />
      </div>
      <h1 className="my-6 font-display text-5xl font-bold">Your next moves.</h1>
      <WorkspaceNavigation />
      <div className="flex flex-wrap gap-5 mb-8">
        <Link href="/featured/manage" className="text-link">
          Featured placements →
        </Link>
        <Link href="/pricing" className="text-link">
          Pricing →
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <section id="saved" className="placeholder-card">
          <h2 className="text-2xl">Saved tools</h2>
          {saved.length ? (
            saved.map((t) => (
              <div className="account-row" key={t.id}>
                {t.status === "published" ? (
                  <Link href={`/tools/${t.slug}`}>{t.name} →</Link>
                ) : (
                  <span>{t.name} · Currently unavailable</span>
                )}
                <ActionForm action={updateAccount} label="Remove saved tool">
                  <input type="hidden" name="operation" value="remove-save" />
                  <input type="hidden" name="toolId" value={t.id} />
                </ActionForm>
              </div>
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
              <details className="my-3">
                <summary className="text-link cursor-pointer">
                  Manage stack
                </summary>
                <ActionForm action={updateAccount} label="Rename stack">
                  <input type="hidden" name="operation" value="rename-stack" />
                  <input type="hidden" name="stackId" value={s.id} />
                  <label className="field">
                    Stack name
                    <input
                      name="name"
                      defaultValue={s.name}
                      required
                      minLength={2}
                      maxLength={80}
                    />
                  </label>
                </ActionForm>
                <ActionForm action={updateAccount} label="Delete this stack">
                  <input type="hidden" name="operation" value="delete-stack" />
                  <input type="hidden" name="stackId" value={s.id} />
                  <label className="my-4 flex items-start gap-3">
                    <input
                      type="checkbox"
                      name="confirmed"
                      value="yes"
                      required
                    />
                    Delete this stack and its memberships. My saved tools will
                    remain.
                  </label>
                </ActionForm>
              </details>
              {members
                .filter((m) => m.stackId === s.id)
                .map((m) => (
                  <div key={m.toolId} className="account-row">
                    {m.status === "published" ? (
                      <Link href={`/tools/${m.slug}`}>{m.name} →</Link>
                    ) : (
                      <span>{m.name} · Currently unavailable</span>
                    )}
                    <ActionForm
                      action={updateAccount}
                      label="Remove from stack"
                    >
                      <input
                        type="hidden"
                        name="operation"
                        value="remove-stack-tool"
                      />
                      <input type="hidden" name="stackId" value={s.id} />
                      <input type="hidden" name="toolId" value={m.toolId} />
                    </ActionForm>
                  </div>
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
                <details className="mt-4">
                  <summary className="text-link cursor-pointer">
                    Edit and resubmit
                  </summary>
                  <ActionForm
                    action={updateAccount}
                    label="Resubmit for moderation"
                  >
                    <input type="hidden" name="operation" value="edit-review" />
                    <input type="hidden" name="reviewId" value={r.id} />
                    <label className="field">
                      Rating
                      <select name="rating" defaultValue={r.rating}>
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <option key={rating} value={rating}>
                            {rating} / 5
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Your experience
                      <textarea
                        name="body"
                        defaultValue={r.body}
                        minLength={20}
                        maxLength={4000}
                        required
                      />
                    </label>
                    <p className="my-4 text-sm">
                      Edits return to moderation. Reviews of unavailable tools
                      or tools you now own cannot be resubmitted.
                    </p>
                  </ActionForm>
                </details>
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
