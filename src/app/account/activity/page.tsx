import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { contentAvailable } from "@/lib/content/storage";
import { readEngagement } from "@/lib/content/queries";
import { ActionForm } from "@/components/action-form";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
import {
  changeSavedContent,
  changeFollow,
  readNotification,
} from "@/app/content-actions";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Saved content and notifications",
  robots: { index: false, follow: false },
};
export default async function Activity() {
  const user = await requireUser("/account/activity");
  if (!(await contentAvailable(db())))
    return (
      <div className="container py-16">
        <WorkspaceNavigation />
        <p className="preview-notice">
          Content saves, follows and notifications await the reviewed database
          package.
        </p>
      </div>
    );
  const data = await readEngagement(db(), user.id);
  return (
    <div className="container py-16">
      <WorkspaceNavigation />
      <h1 className="font-display text-4xl mb-8">
        Keep your next steps close.
      </h1>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="placeholder-card">
          <h2 className="text-2xl">Saved Skills, Playbooks & Events</h2>
          {!data.saves.length && (
            <p className="my-5">Save published content to find it here.</p>
          )}
          {data.saves.map((row) => (
            <article key={row.id} className="account-row">
              {row.available ? (
                <Link
                  className="text-link"
                  href={"/" + row.kind + "/" + row.slug}
                >
                  {row.title} →
                </Link>
              ) : (
                <p>{row.title}</p>
              )}
              <ActionForm
                action={changeSavedContent}
                label="Remove saved content"
              >
                <input type="hidden" name="id" value={row.target_id} />
                <input type="hidden" name="kind" value={row.kind} />
                <input type="hidden" name="remove" value="true" />
              </ActionForm>
            </article>
          ))}
        </section>
        <section className="placeholder-card">
          <h2 className="text-2xl">Following</h2>
          <Link href="/account/following" className="text-link">
            Manage all followed targets →
          </Link>
          {!data.follows.length && (
            <p className="my-5">
              Follow approved Creators from their public profiles.
            </p>
          )}
          {data.follows.map((row) => (
            <article key={row.creator_id} className="account-row">
              {row.handle ? (
                <Link className="text-link" href={"/@" + row.handle}>
                  {row.display_name} →
                </Link>
              ) : (
                <p>{row.display_name}</p>
              )}
              <ActionForm action={changeFollow} label="Unfollow">
                <input type="hidden" name="id" value={row.creator_id} />
                <input type="hidden" name="remove" value="true" />
              </ActionForm>
            </article>
          ))}
        </section>
        <section className="placeholder-card md:col-span-2">
          <h2 className="text-2xl">Notifications</h2>
          <p className="my-5 text-sm">
            Showing your most recent 100 items. Notifications stay inside your
            account.
          </p>
          {!data.notifications.length && <p>No notifications yet.</p>}
          {data.notifications.map((row) => (
            <article key={row.id} className="account-row">
              <p>{row.message}</p>
              <p className="my-3 text-sm">
                {row.created_at} · {row.read ? "Read" : "Unread"}
              </p>
              {!row.read && (
                <ActionForm action={readNotification} label="Mark read">
                  <input type="hidden" name="id" value={row.id} />
                </ActionForm>
              )}
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
