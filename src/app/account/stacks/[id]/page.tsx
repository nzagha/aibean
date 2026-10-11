import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { contentAvailable } from "@/lib/content/storage";
import { readOwnedStackSettings } from "@/lib/content/queries";
import { authorAllowed } from "@/lib/content/workflows";
import { ActionForm } from "@/components/action-form";
import { StackOrder } from "@/components/stack-order";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
import { editStackSettings } from "@/app/content-actions";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Stack settings",
  robots: { index: false, follow: false },
};
export default async function Stack({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    user = await requireUser("/account/stacks/" + id);
  if (!(await contentAvailable(db())))
    return (
      <div className="container py-16">
        <WorkspaceNavigation />
        <p className="preview-notice">
          Advanced stack settings await the reviewed content database package.
        </p>
      </div>
    );
  const row = await readOwnedStackSettings(db(), user.id, id);
  if (!row) notFound();
  const canShare = await db().transaction((tx) => authorAllowed(tx, user.id));
  return (
    <div className="container py-16">
      <WorkspaceNavigation />
      <h1 className="font-display text-4xl mb-8">{row.name}</h1>
      <section className="placeholder-card max-w-3xl">
        <ActionForm action={editStackSettings} label="Save stack settings">
          <input type="hidden" name="id" value={id} />
          <h2 className="text-2xl">Tool order</h2>
          <StackOrder members={row.members} />
          <label className="field">
            Context and notes
            <textarea name="note" maxLength={1000} defaultValue={row.note} />
          </label>
          <label className="field">
            Visibility
            <select name="visibility" defaultValue={row.visibility}>
              <option value="private">Private</option>
              {canShare && <option value="public">Public Creator stack</option>}
            </select>
          </label>
          <p className="my-5 text-sm">
            Public stacks appear only with an approved public Creator profile.
            Unpublished Tools stay hidden.
          </p>
        </ActionForm>
      </section>
    </div>
  );
}
