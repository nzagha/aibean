import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import type {
  IdentityDatabase,
  IdentityTransaction,
} from "../supabase/identity";
import { audit, checkAdmin, resultRows } from "../admin/tool-workflows";
import {
  AdminWorkflowError,
  recordId,
  revisionInput,
  reasonInput,
} from "../admin/contracts";
import { checkAuthor, authorAllowed } from "../content/workflows";
import { visibleTarget } from "../discovery/targets";
import { publicAuthor } from "../content/queries";
import { enhancementsAvailable, requireEnhancements, history } from "./storage";
import {
  presentationInput,
  campaignInput,
  type CampaignBlock,
  type Presentation,
} from "./contracts";
const columns = {
  tools: "tool_id",
  skills: "skill_id",
  playbooks: "playbook_id",
  stacks: "stack_id",
  events: "event_id",
  resources: "resource_id",
  media: "file_id",
} as const;
type ImageRow = {
  id: string;
  user_id: string;
  resource_id: string | null;
  skill_id: string | null;
  playbook_id: string | null;
  object_key: string;
  filename: string;
  mime: string;
};
export async function imageMetadata(
  tx: IdentityTransaction,
  id: string,
  owner: string,
  publicOnly = true,
  campaign?: string,
) {
  const [f] = resultRows<ImageRow>(
    await tx.execute(
      sql`SELECT * FROM public.resource_files WHERE id=${id} AND user_id=${owner} AND status='approved' AND scan_status='clean' AND mime IN ('image/png','image/jpeg','image/webp') AND bytes BETWEEN 1 AND 5242880 FOR SHARE`,
    ),
  );
  if (!f) return undefined;
  const kind = f.skill_id
      ? "skills"
      : f.playbook_id
        ? "playbooks"
        : "resources",
    parent = f.skill_id || f.playbook_id || f.resource_id!;
  if (
    publicOnly &&
    parent !== campaign &&
    !(await visibleTarget(tx, kind, parent))
  )
    return undefined;
  return f;
}
export async function validatePresentation(
  tx: IdentityTransaction,
  owner: string,
) {
  if (!(await enhancementsAvailable(tx))) return;
  const p = await presentation(tx, owner);
  if (!p) return;
  const input = presentationInput.parse(p);
  for (const id of [input.avatarFileId, input.coverFileId])
    if (id && !(await imageMetadata(tx, id, owner, true)))
      throw new AdminWorkflowError(
        "Profile images require approved, clean, owned images attached to public eligible content.",
      );
}
async function presentation(
  tx: IdentityTransaction,
  owner: string,
): Promise<Presentation | undefined> {
  const [p] = resultRows<{
    headline: string;
    biography: Presentation["biography"];
    socials: Presentation["socials"];
    avatar_file_id: string | null;
    avatar_alt: string;
    cover_file_id: string | null;
    cover_alt: string;
  }>(
    await tx.execute(
      sql`SELECT * FROM public.creator_presentations WHERE user_id=${owner}`,
    ),
  );
  return p
    ? {
        headline: p.headline,
        biography: p.biography,
        socials: p.socials,
        avatarFileId: p.avatar_file_id,
        avatarAlt: p.avatar_alt,
        coverFileId: p.cover_file_id,
        coverAlt: p.cover_alt,
      }
    : undefined;
}
export async function recordProfileRevision(
  tx: IdentityTransaction,
  actor: string,
  owner: string,
) {
  if (!(await enhancementsAvailable(tx))) return;
  const [base] = resultRows<{ revision: string }>(
    await tx.execute(
      sql`SELECT *,updated_at::text AS revision FROM public.account_profiles WHERE user_id=${owner}`,
    ),
  );
  if (base)
    await history(tx, actor, "profile", owner, base.revision, {
      base,
      presentation: await presentation(tx, owner),
    });
}
export async function recordCampaignRevision(
  tx: IdentityTransaction,
  actor: string,
  id: string,
) {
  if (!(await enhancementsAvailable(tx))) return;
  const [base] = resultRows<{ revision: string }>(
    await tx.execute(
      sql`SELECT *,updated_at::text AS revision FROM public.creator_resources WHERE id=${id}`,
    ),
  );
  if (base)
    await history(tx, actor, "campaign", id, base.revision, {
      base,
      blocks: await blocks(tx, id),
    });
}
export async function savePresentation(
  database: IdentityDatabase,
  actor: string,
  revision: string,
  value: unknown,
) {
  const input = presentationInput.parse(value);
  revisionInput.parse(revision);
  return database.transaction(async (tx) => {
    await requireEnhancements(tx);
    await checkAuthor(tx, actor, "resources");
    const [p] = resultRows<{ status: string }>(
      await tx.execute(
        sql`SELECT status FROM public.account_profiles WHERE user_id=${actor} AND updated_at::text=${revision} FOR UPDATE`,
      ),
    );
    if (!p || p.status === "suspended")
      throw new AdminWorkflowError(
        "Choose an unchanged, non-suspended owned profile.",
      );
    for (const id of [input.avatarFileId, input.coverFileId])
      if (id && !(await imageMetadata(tx, id, actor, true)))
        throw new AdminWorkflowError(
          "Use an approved owned image from public content; upload and scanning remain separately gated.",
        );
    await tx.execute(
      sql`INSERT INTO public.creator_presentations(user_id,headline,biography,socials,avatar_file_id,avatar_alt,cover_file_id,cover_alt) VALUES(${actor},${input.headline},${JSON.stringify(input.biography)}::jsonb,${JSON.stringify(input.socials)}::jsonb,${input.avatarFileId},${input.avatarAlt},${input.coverFileId},${input.coverAlt}) ON CONFLICT(user_id) DO UPDATE SET headline=excluded.headline,biography=excluded.biography,socials=excluded.socials,avatar_file_id=excluded.avatar_file_id,avatar_alt=excluded.avatar_alt,cover_file_id=excluded.cover_file_id,cover_alt=excluded.cover_alt,updated_at=clock_timestamp()`,
    );
    const [r] = resultRows<{ revision: string }>(
      await tx.execute(
        sql`UPDATE public.account_profiles SET status='draft',reviewer_id=NULL,review_reason=NULL,updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE user_id=${actor} RETURNING updated_at::text AS revision`,
      ),
    );
    await recordProfileRevision(tx, actor, actor);
    await audit(tx, actor, "profile.presentation-saved", actor, {
      revision: r.revision,
      status: "draft",
      fields: Object.keys(input),
    });
  });
}
export async function blockTarget(
  tx: IdentityTransaction,
  block: CampaignBlock,
  owner: string,
  campaign: string,
  publicOnly: boolean,
) {
  if (block.kind === "text")
    return { id: "text", title: block.title, href: "" };
  if (block.kind === "media") {
    const f = await imageMetadata(
      tx,
      block.targetId!,
      owner,
      publicOnly,
      campaign,
    );
    return f
      ? { id: f.id, title: block.title, href: "/creator-media/" + f.id }
      : undefined;
  }
  if (block.kind === "stacks") {
    const [s] = resultRows<{ id: string; name: string; user_id: string }>(
      await tx.execute(
        sql`SELECT s.id,s.name,s.user_id FROM public.stacks s JOIN public.stack_settings x ON x.stack_id=s.id JOIN public.users u ON u.id=s.user_id JOIN public.account_profiles p ON p.user_id=s.user_id WHERE s.id=${block.targetId} AND x.visibility='public' AND p.status='published' AND ${publicAuthor("skills")} FOR SHARE OF s,x`,
      ),
    );
    return s
      ? { id: s.id, title: s.name, href: "/collections/" + s.id }
      : undefined;
  }
  if (block.kind === "resources" && block.targetId === campaign)
    return undefined;
  const target = await visibleTarget(tx, block.kind, block.targetId!);
  if (block.kind === "tools" && target) {
    const [real] = resultRows(
      await tx.execute(
        sql`SELECT id FROM public.tools WHERE id=${target.id} AND coalesce((data->>'demo')::boolean,false)=false`,
      ),
    );
    if (!real) return undefined;
  }
  return target;
}
async function blocks(tx: IdentityTransaction, id: string) {
  return resultRows<CampaignBlock & { position: number }>(
    await tx.execute(
      sql`SELECT kind,coalesce(tool_id,skill_id,playbook_id,stack_id,event_id,resource_id,file_id) AS "targetId",title,description,position FROM public.campaign_blocks WHERE campaign_id=${id} ORDER BY position`,
    ),
  );
}
export async function validateCampaignBlocks(
  tx: IdentityTransaction,
  campaign: string,
  owner: string,
) {
  if (!(await enhancementsAvailable(tx))) return;
  for (const b of await blocks(tx, campaign))
    if (!(await blockTarget(tx, b, owner, campaign, true)))
      throw new AdminWorkflowError(
        "Every campaign block must reference available public content or an approved owned image before publication.",
      );
}
export async function saveCampaignBlocks(
  database: IdentityDatabase,
  actor: string,
  id: string,
  revision: string,
  value: unknown,
  admin = false,
  reason?: string,
) {
  recordId.parse(id);
  revisionInput.parse(revision);
  const data = campaignInput.parse(value);
  if (admin) reasonInput.parse(reason);
  return database.transaction(async (tx) => {
    await requireEnhancements(tx);
    if (admin) await checkAdmin(tx, actor);
    else await checkAuthor(tx, actor, "resources");
    const [row] = resultRows<{ user_id: string; status: string }>(
      await tx.execute(
        sql`SELECT user_id,status FROM public.creator_resources WHERE id=${id} AND updated_at::text=${revision} AND ${admin ? sql`true` : sql`user_id=${actor}`} FOR UPDATE`,
      ),
    );
    if (!row || row.status === "archived")
      throw new AdminWorkflowError(
        "Choose an unchanged owned campaign that is still open.",
      );
    await checkAuthor(tx, row.user_id, "resources");
    for (const b of data)
      if (!(await blockTarget(tx, b, row.user_id, id, false)))
        throw new AdminWorkflowError(
          "Unavailable campaign reference. Choose published canonical content or an approved owned image.",
        );
    await tx.execute(
      sql`DELETE FROM public.campaign_blocks WHERE campaign_id=${id}`,
    );
    for (const [position, b] of data.entries()) {
      const values = Object.fromEntries(
        Object.entries(columns).map(([k]) => [
          k,
          k === b.kind ? b.targetId : null,
        ]),
      );
      await tx.execute(
        sql`INSERT INTO public.campaign_blocks(id,campaign_id,position,kind,title,description,tool_id,skill_id,playbook_id,stack_id,event_id,resource_id,file_id) VALUES(${randomUUID()},${id},${position},${b.kind},${b.title},${b.description},${values.tools},${values.skills},${values.playbooks},${values.stacks},${values.events},${values.resources},${values.media})`,
      );
    }
    const [r] = resultRows<{ revision: string }>(
      await tx.execute(
        sql`UPDATE public.creator_resources SET status='draft',reviewer_id=NULL,review_reason=NULL,updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE id=${id} RETURNING updated_at::text AS revision`,
      ),
    );
    await recordCampaignRevision(tx, actor, id);
    await audit(tx, actor, "campaign.blocks-saved", id, {
      count: data.length,
      owner: row.user_id,
      revision: r.revision,
      ...(admin ? { reason } : {}),
      status: "draft",
    });
  });
}
export async function unpublishCampaign(
  database: IdentityDatabase,
  actor: string,
  id: string,
  revision: string,
) {
  recordId.parse(id);
  revisionInput.parse(revision);
  await database.transaction(async (tx) => {
    await requireEnhancements(tx);
    await checkAuthor(tx, actor, "resources");
    const [r] = resultRows(
      await tx.execute(
        sql`UPDATE public.creator_resources SET status='draft',updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE id=${id} AND user_id=${actor} AND status='published' AND updated_at::text=${revision} RETURNING id`,
      ),
    );
    if (!r)
      throw new AdminWorkflowError(
        "Only an unchanged owned published campaign can be unpublished.",
      );
    await audit(tx, actor, "campaign.unpublished", id, { status: "draft" });
  });
}
export async function readPresentation(
  database: IdentityDatabase,
  owner: string,
  scope: "public" | "owner" | "admin",
  actor?: string,
) {
  return database.transaction(async (tx) => {
    if (scope === "admin") await checkAdmin(tx, actor || "");
    else if (scope === "owner") {
      if (actor !== owner)
        throw new AdminWorkflowError("Owned profile required.");
      await checkAuthor(tx, owner, "resources");
    }
    if (!(await enhancementsAvailable(tx))) return undefined;
    if (scope === "public" && !(await visibleTarget(tx, "creators", owner)))
      return undefined;
    const p = await presentation(tx, owner);
    if (!p) return undefined;
    // A subsequently disabled/private image is omitted even if a profile is still published.
    for (const key of ["avatarFileId", "coverFileId"] as const)
      if (
        p[key] &&
        !(await imageMetadata(tx, p[key]!, owner, scope === "public"))
      )
        p[key] = null;
    return p;
  });
}
export async function readCampaignBlocks(
  database: IdentityDatabase,
  actor: string | null,
  id: string,
  scope: "public" | "owner" | "admin",
) {
  return database.transaction(async (tx) => {
    if (scope === "admin") await checkAdmin(tx, actor || "");
    if (!(await enhancementsAvailable(tx)))
      return {
        ready: false,
        blocks: [] as (CampaignBlock & {
          href: string;
          canonicalTitle: string;
        })[],
        history: [] as { revision: string; created_at: string }[],
      };
    const [r] = resultRows<{ user_id: string }>(
      await tx.execute(
        sql`SELECT user_id FROM public.creator_resources WHERE id=${id}`,
      ),
    );
    if (!r) return { ready: true, blocks: [], history: [] };
    if (scope === "owner") {
      if (r.user_id !== actor)
        throw new AdminWorkflowError("Owned campaign required.");
      await checkAuthor(tx, actor, "resources");
    } else if (
      scope === "public" &&
      !(await visibleTarget(tx, "resources", id))
    )
      return { ready: true, blocks: [], history: [] };
    const rows = [];
    for (const b of await blocks(tx, id)) {
      const t = await blockTarget(tx, b, r.user_id, id, scope === "public");
      if (t) rows.push({ ...b, href: t.href, canonicalTitle: t.title });
      else if (scope !== "public")
        rows.push({
          ...b,
          href: "",
          canonicalTitle:
            "Unavailable dependency — remove or replace before publication",
        });
    }
    return {
      ready: true,
      blocks: rows,
      history:
        scope === "public"
          ? []
          : resultRows<{ revision: string; created_at: string }>(
              await tx.execute(
                sql`SELECT revision,created_at::text FROM public.creator_revision_history WHERE kind='campaign' AND entity_id=${id} ORDER BY created_at DESC LIMIT 20`,
              ),
            ),
    };
  });
}
export async function enhancementOptions(
  database: IdentityDatabase,
  actor: string,
  admin = false,
  owner = actor,
) {
  if (!admin && owner !== actor)
    throw new AdminWorkflowError("Owned reference options required.");
  return database.transaction(async (tx) => {
    if (admin) await checkAdmin(tx, actor);
    else await checkAuthor(tx, actor, "resources");
    if (!(await enhancementsAvailable(tx)))
      return [] as { kind: CampaignBlock["kind"]; id: string; title: string }[];
    const candidates = [];
    for (const [kind, table, title] of [
      ["tools", "tools", "name"],
      ["skills", "ai_skills", "title"],
      ["playbooks", "ai_playbooks", "title"],
      ["events", "public_events", "title"],
      ["resources", "creator_resources", "title"],
    ] as const) {
      const rows = resultRows<{ id: string; title: string }>(
        await tx.execute(
          sql`SELECT id,${sql.identifier(title)} AS title FROM public.${sql.identifier(table)} WHERE status='published' ORDER BY ${sql.identifier(title)},id LIMIT 200`,
        ),
      );
      for (const r of rows)
        if (await visibleTarget(tx, kind, r.id))
          candidates.push({ kind, ...r });
    }
    const stacks = resultRows<{ id: string; title: string }>(
      await tx.execute(
        sql`SELECT s.id,s.name AS title FROM public.stacks s JOIN public.stack_settings x ON x.stack_id=s.id WHERE x.visibility='public' ORDER BY s.id LIMIT 200`,
      ),
    );
    for (const s of stacks)
      if (
        await blockTarget(
          tx,
          { kind: "stacks", targetId: s.id, title: s.title, description: "" },
          actor,
          "",
          true,
        )
      )
        candidates.push({ kind: "stacks" as const, ...s });
    const files = resultRows<{ id: string; title: string }>(
      await tx.execute(
        sql`SELECT id,filename AS title FROM public.resource_files WHERE user_id=${owner} AND status='approved' AND mime IN ('image/png','image/jpeg','image/webp') ORDER BY created_at DESC LIMIT 200`,
      ),
    );
    for (const f of files) candidates.push({ kind: "media" as const, ...f });
    return candidates;
  });
}
export async function resolveCreatorImage(
  database: IdentityDatabase,
  actor: string | null,
  id: string,
) {
  recordId.parse(id);
  return database.transaction(async (tx) => {
    await requireEnhancements(tx);
    const [f] = resultRows<ImageRow>(
      await tx.execute(sql`SELECT * FROM public.resource_files WHERE id=${id}`),
    );
    if (!f) throw new AdminWorkflowError("Unavailable image.");
    const [u] = actor
      ? resultRows<{ is_admin: boolean }>(
          await tx.execute(
            sql`SELECT is_admin FROM public.users WHERE id=${actor}`,
          ),
        )
      : [];
    const own =
        actor === f.user_id && (await authorAllowed(tx, actor, "resources")),
      admin = u?.is_admin === true;
    const p = await presentation(tx, f.user_id);
    let permitted =
      !!p &&
      [p.avatarFileId, p.coverFileId].includes(id) &&
      (own || admin || !!(await visibleTarget(tx, "creators", f.user_id)));
    const links = resultRows<{ campaign_id: string }>(
      await tx.execute(
        sql`SELECT campaign_id FROM public.campaign_blocks WHERE file_id=${id} LIMIT 100`,
      ),
    );
    let campaign: string | undefined;
    for (const b of links)
      if (
        own ||
        admin ||
        (await visibleTarget(tx, "resources", b.campaign_id))
      ) {
        permitted = true;
        campaign = b.campaign_id;
        break;
      }
    const image = permitted
      ? await imageMetadata(tx, id, f.user_id, !own && !admin, campaign)
      : undefined;
    if (!image) throw new AdminWorkflowError("Unavailable image.");
    return { objectKey: image.object_key, filename: image.filename };
  });
}
