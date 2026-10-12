export const dynamic = "force-dynamic";
import { requireApprovedCreator } from "@/lib/auth";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
import { db } from "@/lib/db";
import { contentAvailable } from "@/lib/content/storage";
import { authorAllowed } from "@/lib/content/workflows";
import { readCreatorWorkspaceSummary } from "@/lib/content/queries";
import Link from "next/link";
import { MembershipSummary } from "@/components/membership-summary";
export const metadata = {
  title: "Creator workspace",
  robots: { index: false, follow: false },
};
export default async function Creator() {
  const user = await requireApprovedCreator(),
    ready = await contentAvailable(db());
  const allowed = ready
    ? await db().transaction((tx) => authorAllowed(tx, user.id))
    : false;
  const summary = allowed
    ? await readCreatorWorkspaceSummary(db(), user.id)
    : null;
  return (
    <div className="container py-16">
      <h1 className="font-display text-4xl font-bold">Creator workspace</h1>
      <div className="mt-6">
        <WorkspaceNavigation />
      </div>
      <p className="mt-6">
        Your User account and personal collections remain available alongside
        your Creator workspace. Publication requires editorial approval.
      </p>
      {!ready && (
        <p className="preview-notice my-8">
          Publishing will open after the reviewed content database package is
          installed and validated.
        </p>
      )}
      {ready && !allowed && (
        <p className="preview-notice my-8">
          Publishing is suspended. Check your profile review reason and
          notifications before requesting Admin review.
        </p>
      )}
      {summary && (
        <div className="flex flex-wrap gap-6 mt-8">
          <p>
            <strong>{summary.published}</strong> published items
          </p>
          <p>
            <strong>{summary.pending}</strong> awaiting review
          </p>
          <p>
            <strong>{summary.followers}</strong> followers
          </p>
          <p>
            <strong>{summary.saves}</strong> saves of your content
          </p>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-3 mt-8">
        <section className="placeholder-card">
          <h2 className="text-2xl">Personal stacks</h2>
          <p className="my-5">
            Order your Tools, add context, and choose which stacks to share from
            your Creator profile.
          </p>
          <Link href="/account#stacks" className="text-link">
            Manage my stacks →
          </Link>
        </section>
        <section className="placeholder-card">
          <h2 className="text-2xl">Skills and Playbooks</h2>
          <p className="my-5">
            Build practical Skills and free-to-read Playbooks with linked Tools
            and ordered steps.
          </p>
          <div className="flex flex-col gap-4">
            <Link href="/creator/content/skills" className="text-link">
              My Skills →
            </Link>
            <Link href="/creator/content/playbooks" className="text-link">
              My Playbooks →
            </Link>
            <Link href="/creator/content/events" className="text-link">
              My Events →
            </Link>
          </div>
        </section>
        <section className="placeholder-card">
          <h2 className="text-2xl">Profile and resources</h2>
          <p className="my-5">
            Prepare your public profile and moderated resource campaigns.
            Campaigns link to resources on your own website.
          </p>
          <div className="flex flex-col gap-4">
            <Link href="/account/profile" className="text-link">
              Manage profile →
            </Link>
            <Link href="/creator/content/resources" className="text-link">
              My resource campaigns →
            </Link>
            <Link href="/account/activity" className="text-link">
              Notifications →
            </Link>
            <Link href="/creator/analytics" className="text-link">
              Campaign analytics →
            </Link>
          </div>
        </section>
      </div>
      <MembershipSummary user={user.id} />
    </div>
  );
}
