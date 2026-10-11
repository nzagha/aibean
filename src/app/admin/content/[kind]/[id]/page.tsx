import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { contentKinds, type ContentKind } from "@/lib/content/contracts";
import { contentAvailable } from "@/lib/content/storage";
import { readContentDetail } from "@/lib/content/queries";
import { referenceOptions } from "@/lib/content/reference-options";
import { ContentEditor } from "@/components/content-editor";
export default async function EditorialEditor({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const admin = await requireAdmin();
  const { kind, id } = await params;
  if (!contentKinds.includes(kind as ContentKind)) notFound();
  if (!(await contentAvailable(db())))
    return (
      <p className="preview-notice">
        The reviewed Creator content package is not installed and enabled.
      </p>
    );
  const row =
    id === "new"
      ? undefined
      : await readContentDetail(
          db(),
          admin.id,
          kind as ContentKind,
          id,
          "admin",
        );
  if (id !== "new" && !row) notFound();
  return (
    <ContentEditor
      actor={admin.id}
      kind={kind as ContentKind}
      row={row}
      options={await referenceOptions(
        db(),
        admin.id,
        kind as ContentKind,
        true,
      )}
      admin
    />
  );
}
