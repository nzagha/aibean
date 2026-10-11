import Link from "next/link";
import { db } from "@/lib/db";
import { readResourceFiles } from "@/lib/resources/workflows";
import { resourceProviderConfigured } from "@/lib/resources/providers";
import type { ContentKind, ContentRow } from "@/lib/content/contracts";
import { ResourceUploadForm } from "./resource-upload-form";
export async function ContentFiles({
  kind,
  row,
  actor,
  admin = false,
}: {
  kind: ContentKind;
  row: ContentRow;
  actor: string;
  admin?: boolean;
}) {
  if (kind === "events") return null;
  const data = await readResourceFiles(
    db(),
    actor,
    { kind, id: row.id },
    admin,
  );
  return (
    <section className="placeholder-card mt-8">
      <h2 className="text-2xl">Resource files</h2>
      {!data.ready || !resourceProviderConfigured() ? (
        <p className="preview-notice my-5">
          Uploads await approved private storage, malware scanning and the
          reviewed file-metadata package.
        </p>
      ) : (
        <ResourceUploadForm
          kind={kind}
          id={row.id}
          revision={row.revision}
          admin={admin}
        />
      )}
      <p className="text-sm my-5">
        External resources can also be linked through a moderated resource
        campaign.
      </p>
      {data.rows.map((file) => (
        <article className="account-row" key={file.id}>
          <p>
            {file.filename} · {file.status} · {Math.ceil(file.bytes / 1024)} KB
          </p>
          <p className="my-3 text-sm">{file.review_reason}</p>
          {["pending", "approved"].includes(file.status) && (
            <a
              className="text-link"
              href={"/resources/download/" + file.id}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download private preview →
            </a>
          )}
        </article>
      ))}
    </section>
  );
}
export async function PublishedFiles({
  kind,
  id,
}: {
  kind: Exclude<ContentKind, "events">;
  id: string;
}) {
  const data = await readResourceFiles(db(), null, { kind, id });
  if (!data.ready || !data.rows.length) return null;
  return (
    <section className="mt-8">
      <h2 className="text-2xl">Approved resource files</h2>
      {data.rows.map((file) => (
        <Link
          className="text-link block mt-5"
          key={file.id}
          href={"/resources/download/" + file.id}
          prefetch={false}
        >
          {file.filename} · {Math.ceil(file.bytes / 1024)} KB →
        </Link>
      ))}
    </section>
  );
}
