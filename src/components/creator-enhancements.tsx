import Link from "next/link";
import { db } from "@/lib/db";
import { CreatorPresentationForm } from "./creator-presentation-form";
import { enhancementsAvailable } from "@/lib/creator-enhancements/storage";
import { CampaignBlockEditor } from "./campaign-block-editor";

import {
  readCampaignBlocks,
  enhancementOptions,
  readPresentation,
} from "@/lib/creator-enhancements/presentation";
import type { Presentation } from "@/lib/creator-enhancements/contracts";
import type { ContentRow } from "@/lib/content/contracts";
import { resourceProviderConfigured } from "@/lib/resources/providers";
export async function CampaignBuilder({
  row,
  actor,
  admin = false,
}: {
  row: ContentRow;
  actor: string;
  admin?: boolean;
}) {
  const data = await readCampaignBlocks(
    db(),
    actor,
    row.id,
    admin ? "admin" : "owner",
  );
  return (
    <section className="placeholder-card mt-8">
      <h2 className="text-2xl">Campaign builder</h2>
      {!data.ready ? (
        <p className="preview-notice my-5">
          Structured campaigns await their reviewed database package.
        </p>
      ) : (
        <>
          <CampaignBlockEditor
            key={row.revision}
            id={row.id}
            revision={row.revision}
            initial={data.blocks.map(
              ({ kind, targetId, title, description }) => ({
                kind,
                targetId,
                title,
                description,
              }),
            )}
            options={await enhancementOptions(db(), actor, admin, row.user_id)}
            admin={admin}
            status={row.status}
          />
          <Link
            className="text-link inline-block my-5"
            href={
              (admin ? "/admin" : "/creator") +
              "/campaigns/" +
              row.id +
              "/preview"
            }
          >
            Preview campaign →
          </Link>
          <details>
            <summary>Saved campaign revisions</summary>
            {data.history.map((r) => (
              <p className="text-sm my-3" key={r.revision}>
                {r.created_at} · {r.revision}
              </p>
            ))}
          </details>
        </>
      )}
    </section>
  );
}
export async function ProfilePresentationEditor({
  user,
  revision,
}: {
  user: string;
  revision: string;
}) {
  if (!(await db().transaction((tx) => enhancementsAvailable(tx))))
    return (
      <p className="preview-notice mt-8">
        Creator presentation awaits its reviewed database package.
      </p>
    );
  const p = await readPresentation(db(), user, "owner", user);
  const options = await enhancementOptions(db(), user);
  const blank: Presentation = {
    headline: "",
    biography: [],
    socials: [],
    avatarFileId: null,
    avatarAlt: "",
    coverFileId: null,
    coverAlt: "",
  };
  return (
    <section className="placeholder-card max-w-3xl mt-8">
      <h2 className="text-2xl">Creator presentation</h2>
      <p className="my-5">
        Structured biography, approved social networks and image metadata share
        your profile’s moderation state. Uploads require verified private
        storage and scanning.
      </p>
      <CreatorPresentationForm
        key={revision}
        revision={revision}
        initial={p || blank}
        images={options.filter((o) => o.kind === "media")}
      />
      <Link
        className="text-link inline-block mt-5"
        href="/creator/profile/preview"
      >
        Preview presentation →
      </Link>
    </section>
  );
}
export function PresentationDetails({
  presentation: p,
}: {
  presentation?: Presentation;
}) {
  if (!p) return null;
  return (
    <>
      {p.headline && <p className="text-lg my-5">{p.headline}</p>}
      {resourceProviderConfigured() &&
        [p.coverFileId, p.avatarFileId].map((id, i) =>
          id ? (
            <div key={id} className="my-5">
              {/* Private, approval-gated image endpoint; no external browser-supplied source. */}
              <img
                src={"/creator-media/" + id}
                alt={i ? p.avatarAlt : p.coverAlt}
                className={
                  i
                    ? "w-24 h-24 rounded-full object-cover"
                    : "w-full max-w-3xl max-h-64 object-cover rounded-2xl"
                }
              />
            </div>
          ) : null,
        )}
      {p.biography.map((b, i) => (
        <section key={i} className="my-6 max-w-3xl">
          <h2 className="text-xl">{b.title}</h2>
          <p className="my-3 whitespace-pre-wrap">{b.body}</p>
        </section>
      ))}
      <div className="flex gap-5 flex-wrap my-5">
        {p.socials.map((s) => (
          <a
            className="text-link"
            key={s.network}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {s.network} ↗
          </a>
        ))}
      </div>
    </>
  );
}
export async function CampaignBlocks({
  id,
  actor = null,
  scope = "public",
}: {
  id: string;
  actor?: string | null;
  scope?: "public" | "owner" | "admin";
}) {
  const data = await readCampaignBlocks(db(), actor, id, scope);
  if (!data.blocks.length) return null;
  return (
    <div className="grid gap-6 md:grid-cols-2 my-8">
      {data.blocks.map((b, i) => (
        <article className="placeholder-card" key={i}>
          <span className="eyebrow">{b.kind}</span>
          <h2 className="text-2xl my-4">{b.title}</h2>
          <p className="whitespace-pre-wrap my-5">{b.description}</p>
          {b.kind === "media" && b.href && resourceProviderConfigured() ? (
            <>
              <img
                src={b.href}
                alt={b.description || b.title}
                className="max-w-full rounded-xl"
              />
            </>
          ) : b.kind !== "text" && b.href ? (
            <Link
              className="text-link"
              href={
                b.href +
                (b.kind === "skills" ||
                b.kind === "playbooks" ||
                b.kind === "tools"
                  ? "?campaign=" + encodeURIComponent(id)
                  : "")
              }
            >
              {b.canonicalTitle} →
            </Link>
          ) : null}
          {b.kind === "tools" && b.href && scope === "public" && (
            <>
              <form
                method="post"
                action={"/outbound/tools/" + b.href.split("/").pop()}
                target="_blank"
              >
                <input type="hidden" name="campaign" value={id} />
                {scope === "public" && (
                  <AffiliateDisclosure tool={b.targetId!} campaign={id} />
                )}
                <button className="button secondary">
                  Visit Tool website →
                </button>
              </form>
            </>
          )}
        </article>
      ))}
    </div>
  );
}
export async function AffiliateDisclosure({
  tool,
  campaign,
}: {
  tool: string;
  campaign?: string;
}) {
  const { affiliateDisclosure } =
    await import("@/lib/creator-enhancements/affiliates");
  const r = await db().transaction((tx) =>
    affiliateDisclosure(tx, tool, campaign),
  );
  return r ? (
    <>
      <p className="preview-notice my-4">Affiliate link · {r.disclosure}</p>
      <input type="hidden" name="affiliateDisclosure" value={r.config_sha256} />
    </>
  ) : null;
}
