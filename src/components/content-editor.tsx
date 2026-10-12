import Link from "next/link";
import { ActionForm } from "./action-form";
import { ContentFields } from "./content-fields";
import { ReasonField } from "./admin-shared";
import { ContentFiles } from "./content-files";
import { CampaignBuilder } from "./creator-enhancements";
import type { ContentKind, ContentRow } from "@/lib/content/contracts";
import type { ReferenceOptions } from "./content-fields";
import {
  saveAuthorContent,
  saveEditorialContent,
  requestContentReview,
  requestEditorialReview,
  reviewContent,
  changeEventFeature,
} from "@/app/content-actions";
export function ContentEditor({
  kind,
  row,
  options,
  admin = false,
  actor,
}: {
  kind: ContentKind;
  row?: ContentRow;
  options: ReferenceOptions;
  admin?: boolean;
  actor: string;
}) {
  const Heading = admin ? "h2" : "h1";
  const keys = (
    <>
      <input type="hidden" name="kind" value={kind} />
      {row && (
        <>
          <input type="hidden" name="id" value={row.id} />
          <input type="hidden" name="revision" value={row.revision} />
        </>
      )}
    </>
  );
  return (
    <>
      <section className="placeholder-card">
        <Heading className="text-2xl">
          {row ? "Edit " + row.title : "New " + kind}
        </Heading>
        {row && (
          <p className="my-4">
            {row.status} · {row.review_reason || "No editorial decision yet"}
          </p>
        )}
        <ActionForm
          action={admin ? saveEditorialContent : saveAuthorContent}
          label="Save private draft"
        >
          {keys}
          <ContentFields kind={kind} row={row} options={options} />
          {admin && <ReasonField />}
        </ActionForm>
      </section>
      {row && (
        <ContentFiles kind={kind} row={row} actor={actor} admin={admin} />
      )}
      {row && kind === "resources" && <CampaignBuilder row={row} actor={actor} admin={admin}/>}
      {row && (
        <section className="placeholder-card mt-8">
          <h2 className="text-2xl">Editorial review</h2>
          {admin && kind === "events" && row.status === "published" && (
            <ActionForm action={changeEventFeature} label="Save editorial pick">
              {keys}
              <label className="field">
                Editorial featuring
                <select name="featured" defaultValue={String(row.featured)}>
                  <option value="false">Standard Event</option>
                  <option value="true">Editorial pick</option>
                </select>
              </label>
              <ReasonField />
            </ActionForm>
          )}
          {["draft", "rejected"].includes(row.status) && (
            <ActionForm
              action={admin ? requestEditorialReview : requestContentReview}
              label="Submit for review"
            >
              {keys}
            </ActionForm>
          )}
          {admin &&
            (["pending", "published", "rejected"].includes(row.status) ||
              (kind === "events" && row.status === "draft")) && (
              <ActionForm
                action={reviewContent}
                label="Save moderation decision"
                confirmation="Confirm this editorial decision?"
              >
                {keys}
                <label className="field">
                  Decision
                  <select name="decision">
                    {(row.status === "pending"
                      ? [
                          "published",
                          "rejected",
                          ...(kind === "events" ? ["canceled"] : []),
                        ]
                      : row.status === "draft"
                        ? ["canceled"]
                        : [
                            "archived",
                            ...(kind === "events" && row.status === "published"
                              ? ["canceled"]
                              : []),
                          ]
                    ).map((decision) => (
                      <option key={decision}>{decision}</option>
                    ))}
                  </select>
                </label>
                <ReasonField />
              </ActionForm>
            )}
          {row.status === "published" &&
            (kind !== "resources" || typeof row.publicHref === "string") && (
              <Link
                className="text-link inline-block mt-6"
                href={
                  kind === "resources"
                    ? String(row.publicHref)
                    : "/" + kind + "/" + row.slug
                }
              >
                View published content →
              </Link>
            )}
        </section>
      )}
    </>
  );
}
