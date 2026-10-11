import { notFound } from "next/navigation";
import { requirePublishingUser } from "@/lib/content/auth-server";
import { db } from "@/lib/db";
import { contentKinds, type ContentKind } from "@/lib/content/contracts";
import { contentAvailable } from "@/lib/content/storage";
import { readContentDetail } from "@/lib/content/queries";
import { referenceOptions } from "@/lib/content/reference-options";
import { ContentEditor } from "@/components/content-editor";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Content editor",
  robots: { index: false, follow: false },
};
export default async function Editor({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;
  if (!contentKinds.includes(kind as ContentKind)) notFound();
  const user = await requirePublishingUser(
    kind as ContentKind,
    "/creator/content/" + kind + "/" + id,
  );
  if (!(await contentAvailable(db())))
    return (
      <div className="container py-16">
        <p className="preview-notice">
          Publishing awaits the reviewed Creator content package.
        </p>
      </div>
    );
  const row =
    id === "new"
      ? undefined
      : await readContentDetail(
          db(),
          user.id,
          kind as ContentKind,
          id,
          "owner",
        );
  if (id !== "new" && !row) notFound();
  const options = await referenceOptions(db(), user.id, kind as ContentKind);
  return (
    <div className="container py-16">
      <WorkspaceNavigation />
      <ContentEditor
        kind={kind as ContentKind}
        row={row}
        options={options}
        actor={user.id}
      />
    </div>
  );
}
