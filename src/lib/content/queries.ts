import { discoveryAvailable } from "../discovery/storage";
import type { AnalyticsSession } from "../discovery/analytics-contracts";
import { recordAnalytics } from "../discovery/analytics";
import { sql } from "drizzle-orm";
import { assertQuota } from "../pricing/entitlements";
import { entitlementLock } from "../pricing/storage";
import type { IdentityDatabase } from "../supabase/identity";
import { audit, checkAdmin, resultRows } from "../admin/tool-workflows";
import { AdminWorkflowError, recordId } from "../admin/contracts";
import { adminFilters, type AdminParams } from "../admin/queries";
import {
  contentKinds,
  contentTables,
  type ContentKind,
  type ContentRow,
} from "./contracts";
import { contentAvailable, requireContentStorage } from "./storage";
import { checkAuthor, readRelations } from "./workflows";
import { comparisonContext } from "../catalog/comparison";
export type CreatorFilters = AdminParams & {
  useCase?: string;
  industry?: string;
};
export const publicAuthor = (kind: ContentKind) =>
  sql`(u.is_admin OR u.is_creator AND NOT EXISTS(SELECT 1 FROM public.creator_applications a WHERE a.user_id=u.id AND a.status='suspension_requested') AND NOT EXISTS(SELECT 1 FROM public.account_profiles p WHERE p.user_id=u.id AND p.status='suspended') ${kind === "events" ? sql`OR EXISTS(SELECT 1 FROM public.vendor_access v WHERE v.user_id=u.id)` : sql``}) ${kind === "resources" ? sql`AND EXISTS(SELECT 1 FROM public.account_profiles p WHERE p.user_id=u.id AND p.status='published')` : sql``}`;
export async function readContentList(
  database: IdentityDatabase,
  actor: string | null,
  kind: ContentKind,
  scope: "public" | "owner" | "admin",
  params: AdminParams & {
    useCase?: string;
    industry?: string;
    format?: string;
    period?: string;
  } = {},
) {
  if (!contentKinds.includes(kind))
    throw new AdminWorkflowError("Invalid content type.");
  const filters = adminFilters(params);
  const scoped = Object.fromEntries(
    ["useCase", "industry", "format", "period"].map((k) => [
      k,
      typeof params[k as keyof typeof params] === "string"
        ? String(params[k as keyof typeof params]).slice(0, 100)
        : "",
    ]),
  );
  return database.transaction(async (tx) => {
    if (scope === "admin") await checkAdmin(tx, actor || "");
    if (!(await contentAvailable(tx)))
      return { ready: false, rows: [] as ContentRow[], total: 0, filters };
    if (scope === "owner") await checkAuthor(tx, actor || "", kind);
    const table = sql.identifier(contentTables[kind]);
    const predicate =
      scope === "public"
        ? sql`r.status='published' AND ${publicAuthor(kind)}`
        : scope === "owner"
          ? sql`r.user_id=${actor}`
          : sql`true`;
    const match = "%" + filters.q.replace(/[\\%_]/g, "\\$&") + "%";
    const extra = sql`AND (${filters.category || null}::text IS NULL OR r.category_id=${filters.category || null}) AND (${scoped.useCase || null}::text IS NULL OR r.use_case_ids ? ${scoped.useCase || ""}) AND (${scoped.industry || null}::text IS NULL OR r.industry_ids ? ${scoped.industry || ""}) ${kind === "events" ? sql`AND (${scoped.format || null}::text IS NULL OR r.format=${scoped.format || null}) AND ${scoped.period === "past" ? sql`r.ends_at < now()` : scoped.period === "upcoming" ? sql`r.ends_at >= now()` : sql`true`}` : sql``}`;
    const where = sql`WHERE ${predicate} AND (r.title ILIKE ${match} OR r.summary ILIKE ${match}) AND (${scope === "public" ? null : filters.status || null}::text IS NULL OR r.status=${filters.status || null}) ${extra}`;
    const rows = resultRows<ContentRow>(
      await tx.execute(
        sql`SELECT r.*,r.updated_at::text AS revision,r.created_at::text AS created_at,r.updated_at::text AS updated_at FROM public.${table} r JOIN public.users u ON u.id=r.user_id ${where} ORDER BY r.created_at DESC,r.id LIMIT ${filters.size} OFFSET ${(filters.page - 1) * filters.size}`,
      ),
    );
    const [count] = resultRows<{ n: number }>(
      await tx.execute(
        sql`SELECT count(*)::int AS n FROM public.${table} r JOIN public.users u ON u.id=r.user_id ${where}`,
      ),
    );
    return { ready: true, rows, total: count.n, filters };
  });
}
export async function readContentDetail(
  database: IdentityDatabase,
  actor: string | null,
  kind: ContentKind,
  key: string,
  scope: "public" | "owner" | "admin",
) {
  if (!contentKinds.includes(kind))
    throw new AdminWorkflowError("Invalid content type.");
  return database.transaction(async (tx) => {
    if (scope === "admin") await checkAdmin(tx, actor || "");
    if (!(await contentAvailable(tx))) return undefined;
    if (scope === "owner") await checkAuthor(tx, actor || "", kind);
    const table = sql.identifier(contentTables[kind]);
    const predicate =
      scope === "public"
        ? sql`r.slug=${key} AND r.status='published' AND ${publicAuthor(kind)}`
        : sql`r.id=${key} AND ${scope === "owner" ? sql`r.user_id=${actor}` : sql`true`}`;
    const [row] = resultRows<ContentRow>(
      await tx.execute(
        sql`SELECT r.*,r.updated_at::text AS revision,r.created_at::text AS created_at,r.updated_at::text AS updated_at FROM public.${table} r JOIN public.users u ON u.id=r.user_id WHERE ${predicate}`,
      ),
    );
    if (!row) return undefined;
    if (kind === "resources") {
      const [profile] = resultRows<{ handle: string }>(
        await tx.execute(
          sql`SELECT handle FROM public.account_profiles WHERE user_id=${row.user_id} AND status='published'`,
        ),
      );
      if (profile) row.publicHref = "/@" + profile.handle + "/" + row.slug;
    }
    return readRelations(tx, row, kind);
  });
}
export type ProfileRow = {
  user_id: string;
  handle: string;
  display_name: string;
  bio: string;
  website: string | null;
  status: string;
  review_reason: string | null;
  revision: string;
};
export async function readProfile(database: IdentityDatabase, user: string) {
  return database.transaction(async (tx) => {
    await requireContentStorage(tx);
    return resultRows<ProfileRow>(
      await tx.execute(
        sql`SELECT *,updated_at::text AS revision FROM public.account_profiles WHERE user_id=${user}`,
      ),
    )[0];
  });
}
export async function readProfileQueue(
  database: IdentityDatabase,
  actor: string,
  params: AdminParams,
) {
  const filters = adminFilters(params);
  return database.transaction(async (tx) => {
    await checkAdmin(tx, actor);
    if (!(await contentAvailable(tx)))
      return { ready: false, rows: [] as ProfileRow[], total: 0, filters };
    const where = sql`WHERE (${filters.status || null}::text IS NULL OR status=${filters.status || null}) AND display_name ILIKE ${"%" + filters.q.replace(/[\\%_]/g, "\\$&") + "%"}`;
    const rows = resultRows<ProfileRow>(
      await tx.execute(
        sql`SELECT *,updated_at::text AS revision FROM public.account_profiles ${where} ORDER BY created_at DESC,user_id LIMIT ${filters.size} OFFSET ${(filters.page - 1) * filters.size}`,
      ),
    );
    const [count] = resultRows<{ n: number }>(
      await tx.execute(
        sql`SELECT count(*)::int AS n FROM public.account_profiles ${where}`,
      ),
    );
    return { ready: true, rows, total: count.n, filters };
  });
}
export async function readPublicProfile(
  database: IdentityDatabase,
  handle: string,
) {
  return database.transaction(async (tx) => {
    if (!(await contentAvailable(tx))) return undefined;
    return resultRows<ProfileRow>(
      await tx.execute(
        sql`SELECT p.user_id,p.handle,p.display_name,p.bio,p.website,p.status FROM public.account_profiles p JOIN public.users u ON u.id=p.user_id WHERE p.handle=${handle} AND p.status='published' AND ${publicAuthor("skills")}`,
      ),
    )[0];
  });
}
export async function saveEntity(
  database: IdentityDatabase,
  user: string,
  kind: "skills" | "playbooks" | "events",
  id: string,
  remove = false,
  session?: AnalyticsSession,
) {
  recordId.parse(id);
  if (!["skills", "playbooks", "events"].includes(kind))
    throw new AdminWorkflowError("Invalid save type.");
  await database.transaction(async (tx) => {
    await requireContentStorage(tx);
    const column = sql.identifier(
      kind === "skills"
        ? "skill_id"
        : kind === "playbooks"
          ? "playbook_id"
          : "event_id",
    );
    await entitlementLock(tx, user);
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${"save:" + user + ":" + kind + ":" + id},0))`,
    );
    let inserted = false;
    if (remove)
      await tx.execute(
        sql`DELETE FROM public.saved_entities WHERE user_id=${user} AND ${column}=${id}`,
      );
    else {
      if (
        !resultRows(
          await tx.execute(
            sql`SELECT r.id FROM public.${sql.identifier(contentTables[kind])} r JOIN public.users u ON u.id=r.user_id WHERE r.id=${id} AND r.status='published' AND ${publicAuthor(kind)}`,
          ),
        ).length
      )
        throw new AdminWorkflowError(
          "Only published eligible content can be saved.",
        );
      if (
        !resultRows(
          await tx.execute(
            sql`SELECT id FROM public.saved_entities WHERE user_id=${user} AND ${column}=${id}`,
          ),
        ).length
      ) {
        inserted = true;
        await assertQuota(tx, user, "saves");
        await tx.execute(
          sql`INSERT INTO public.saved_entities(id,user_id,${column}) VALUES(${crypto.randomUUID()},${user},${id})`,
        );
      }
    }
    if (inserted)
      await recordAnalytics(tx, session, { event: "save", kind, targetId: id });
    await audit(
      tx,
      user,
      remove ? "account.content-unsaved" : "account.content-saved",
      id,
      { kind },
    );
  });
}
export async function followCreator(
  database: IdentityDatabase,
  user: string,
  target: string,
  remove = false,
) {
  if (process.env.AIBEAN_DISCOVERY_WORKFLOWS === "true") {
    const { mutateFollow } = await import("../discovery/follows");
    return mutateFollow(database, user, {
      kind: "creators",
      id: target,
      remove,
    });
  }
  recordId.parse(target);
  await database.transaction(async (tx) => {
    await requireContentStorage(tx);
    if (remove)
      await tx.execute(
        sql`DELETE FROM public.creator_follows WHERE user_id=${user} AND creator_id=${target}`,
      );
    else {
      if (
        user === target ||
        !resultRows(
          await tx.execute(
            sql`SELECT p.user_id FROM public.account_profiles p JOIN public.users u ON u.id=p.user_id WHERE p.user_id=${target} AND p.status='published' AND ${publicAuthor("skills")}`,
          ),
        ).length
      )
        throw new AdminWorkflowError(
          "Choose another published, approved Creator profile.",
        );
      await tx.execute(
        sql`INSERT INTO public.creator_follows(user_id,creator_id) VALUES(${user},${target}) ON CONFLICT DO NOTHING`,
      );
    }
    await audit(
      tx,
      user,
      remove ? "account.creator-unfollowed" : "account.creator-followed",
      target,
      {},
    );
  });
}
export async function readEngagement(database: IdentityDatabase, user: string) {
  return database.transaction(async (tx) => {
    await requireContentStorage(tx);
    const saves = resultRows<{
      id: string;
      kind: "skills" | "playbooks" | "events";
      target_id: string;
      title: string;
      slug: string;
      available: boolean;
    }>(
      await tx.execute(
        sql`SELECT s.id,CASE WHEN s.skill_id IS NOT NULL THEN 'skills' WHEN s.playbook_id IS NOT NULL THEN 'playbooks' ELSE 'events' END AS kind,coalesce(s.skill_id,s.playbook_id,s.event_id) AS target_id,coalesce(k.title,p.title,e.title,'Unavailable saved content') AS title,coalesce(k.slug,p.slug,e.slug) AS slug,coalesce(k.status,p.status,e.status,'unavailable')='published' AS available FROM public.saved_entities s LEFT JOIN public.ai_skills k ON k.id=s.skill_id AND k.status='published' AND EXISTS(SELECT 1 FROM public.users u WHERE u.id=k.user_id AND ${publicAuthor("skills")}) LEFT JOIN public.ai_playbooks p ON p.id=s.playbook_id AND p.status='published' AND EXISTS(SELECT 1 FROM public.users u WHERE u.id=p.user_id AND ${publicAuthor("playbooks")}) LEFT JOIN public.public_events e ON e.id=s.event_id AND e.status='published' AND EXISTS(SELECT 1 FROM public.users u WHERE u.id=e.user_id AND ${publicAuthor("events")}) WHERE s.user_id=${user} ORDER BY s.created_at DESC,s.id LIMIT 100`,
      ),
    );
    const followTable = (await discoveryAvailable(tx))
      ? sql`public.account_follows`
      : sql`public.creator_follows`;
    const follows = resultRows<{
      creator_id: string;
      display_name: string;
      handle: string | null;
    }>(
      await tx.execute(
        sql`SELECT f.creator_id,coalesce(p.display_name,'Unavailable Creator') AS display_name,p.handle FROM ${followTable} f LEFT JOIN public.account_profiles p ON p.user_id=f.creator_id AND p.status='published' AND EXISTS(SELECT 1 FROM public.users u WHERE u.id=p.user_id AND ${publicAuthor("skills")}) WHERE f.user_id=${user} AND f.creator_id IS NOT NULL ORDER BY f.created_at DESC LIMIT 100`,
      ),
    );
    const notifications = resultRows<{
      id: string;
      message: string;
      read: boolean;
      created_at: string;
    }>(
      await tx.execute(
        sql`SELECT id,message,read,created_at::text FROM public.account_notifications WHERE user_id=${user} ORDER BY public.account_notifications.created_at DESC,id LIMIT 100`,
      ),
    );
    return { saves, follows, notifications };
  });
}
export async function markNotificationRead(
  database: IdentityDatabase,
  user: string,
  id: string,
) {
  recordId.parse(id);
  await database.transaction(async (tx) => {
    await requireContentStorage(tx);
    if (
      !resultRows(
        await tx.execute(
          sql`UPDATE public.account_notifications SET read=true WHERE id=${id} AND user_id=${user} RETURNING id`,
        ),
      ).length
    )
      throw new AdminWorkflowError(
        "Notification belongs to another account or is unavailable.",
      );
  });
}
export async function updateStackSettings(
  database: IdentityDatabase,
  user: string,
  value: {
    id: unknown;
    orderedToolIds: unknown;
    visibility: unknown;
    note: unknown;
  },
) {
  const id = recordId.parse(value.id);
  const ids = (await import("zod")).z
    .array(recordId)
    .max(100)
    .parse(value.orderedToolIds);
  const visibility = (await import("zod")).z
    .enum(["private", "public"])
    .parse(value.visibility);
  const note = (await import("zod")).z
    .string()
    .trim()
    .max(1000)
    .parse(value.note);
  await database.transaction(async (tx) => {
    await requireContentStorage(tx);
    if (
      !resultRows(
        await tx.execute(
          sql`SELECT id FROM public.stacks WHERE id=${id} AND user_id=${user} FOR UPDATE`,
        ),
      ).length
    )
      throw new AdminWorkflowError("Stack ownership is required.");
    if (visibility === "public") await checkAuthor(tx, user, "skills");
    const members = resultRows<{ tool_id: string }>(
      await tx.execute(
        sql`SELECT tool_id FROM public.stack_tools WHERE stack_id=${id} ORDER BY tool_id`,
      ),
    ).map((r) => r.tool_id);
    if (
      new Set(ids).size !== ids.length ||
      JSON.stringify([...ids].sort()) !== JSON.stringify(members)
    )
      throw new AdminWorkflowError(
        "Order must include every current Tool exactly once.",
      );
    await tx.execute(
      sql`INSERT INTO public.stack_settings(stack_id,visibility,ordered_tool_ids,note) VALUES(${id},${visibility},${JSON.stringify(ids)}::jsonb,${note}) ON CONFLICT(stack_id) DO UPDATE SET visibility=excluded.visibility,ordered_tool_ids=excluded.ordered_tool_ids,note=excluded.note,updated_at=GREATEST(clock_timestamp(),stack_settings.updated_at+interval '1 microsecond')`,
    );
    await audit(tx, user, "stack.settings-updated", id, {
      visibility,
      order: ids,
    });
  });
}

export async function readPublicProfiles(
  database: IdentityDatabase,
  params: CreatorFilters = {},
) {
  const filters = adminFilters(params);
  const context = comparisonContext(params);
  return database.transaction(async (tx) => {
    if (!(await contentAvailable(tx)))
      return { ready: false, rows: [] as ProfileRow[], total: 0, filters };
    const match = "%" + filters.q.replace(/[\\%_]/g, "\\$&") + "%";
    const hasContext = Object.values(context).some(Boolean);
    const contextual = hasContext
      ? sql`AND EXISTS(SELECT 1 FROM (
      ${sql.join(
        contentKinds.map(
          (kind) =>
            sql`SELECT category_id,use_case_ids,industry_ids FROM public.${sql.identifier(contentTables[kind])} WHERE user_id=p.user_id AND status='published'`,
        ),
        sql` UNION ALL `,
      )}
      ) content WHERE (${context.category || null}::text IS NULL OR content.category_id=${context.category || null})
      AND (${context.useCase || null}::text IS NULL OR content.use_case_ids ? ${context.useCase || ""})
      AND (${context.industry || null}::text IS NULL OR content.industry_ids ? ${context.industry || ""}))`
      : sql``;
    const where = sql`WHERE p.status='published' AND ${publicAuthor("skills")} AND (p.display_name ILIKE ${match} OR p.bio ILIKE ${match}) ${contextual}`;
    const rows = resultRows<ProfileRow>(
      await tx.execute(
        sql`SELECT p.user_id,p.handle,p.display_name,p.bio,p.website,p.status FROM public.account_profiles p JOIN public.users u ON u.id=p.user_id ${where} ORDER BY p.display_name,p.user_id LIMIT ${filters.size} OFFSET ${(filters.page - 1) * filters.size}`,
      ),
    );
    const [count] = resultRows<{ n: number }>(
      await tx.execute(
        sql`SELECT count(*)::int AS n FROM public.account_profiles p JOIN public.users u ON u.id=p.user_id ${where}`,
      ),
    );
    return { ready: true, rows, total: count.n, filters };
  });
}
export async function readCreatorPublicContent(
  database: IdentityDatabase,
  user: string,
) {
  return database.transaction(async (tx) => {
    if (!(await contentAvailable(tx)))
      return {
        skills: [],
        playbooks: [],
        resources: [],
        events: [],
        stacks: [],
      };
    const output: Record<
      ContentKind,
      { id: string; title: string; slug: string; summary: string }[]
    > = { skills: [], playbooks: [], resources: [], events: [] };
    for (const kind of contentKinds)
      output[kind] = resultRows(
        await tx.execute(
          sql`SELECT r.id,r.title,r.slug,r.summary FROM public.${sql.identifier(contentTables[kind])} r JOIN public.users u ON u.id=r.user_id WHERE r.user_id=${user} AND r.status='published' AND ${publicAuthor(kind)} ORDER BY r.published_at DESC,r.id LIMIT 50`,
        ),
      );
    const stacks = resultRows<{ id: string; title: string; summary: string }>(
      await tx.execute(
        sql`SELECT s.id,s.name AS title,x.note AS summary FROM public.stacks s JOIN public.stack_settings x ON x.stack_id=s.id JOIN public.users u ON u.id=s.user_id WHERE s.user_id=${user} AND x.visibility='public' AND ${publicAuthor("skills")} ORDER BY x.created_at DESC,s.id LIMIT 50`,
      ),
    );
    return { ...output, stacks };
  });
}
export async function readPublicStack(database: IdentityDatabase, id: string) {
  return database.transaction(async (tx) => {
    if (!(await contentAvailable(tx))) return undefined;
    const [stack] = resultRows<{
      id: string;
      name: string;
      note: string;
      ordered_tool_ids: string[];
      handle: string;
      display_name: string;
    }>(
      await tx.execute(
        sql`SELECT s.id,s.name,x.note,x.ordered_tool_ids,p.handle,p.display_name FROM public.stacks s JOIN public.stack_settings x ON x.stack_id=s.id JOIN public.users u ON u.id=s.user_id JOIN public.account_profiles p ON p.user_id=s.user_id AND p.status='published' WHERE s.id=${id} AND x.visibility='public' AND ${publicAuthor("skills")}`,
      ),
    );
    if (!stack) return undefined;
    const members = resultRows<{
      id: string;
      name: string;
      slug: string;
      summary: string;
    }>(
      await tx.execute(
        sql`SELECT t.id,t.name,t.slug,t.data->>'shortDescription' AS summary FROM public.stack_tools m JOIN public.tools t ON t.id=m.tool_id AND t.status='published' WHERE m.stack_id=${id}`,
      ),
    );
    members.sort(
      (a, b) =>
        stack.ordered_tool_ids.indexOf(a.id) -
        stack.ordered_tool_ids.indexOf(b.id),
    );
    return { ...stack, members };
  });
}
export async function readOwnedStackSettings(
  database: IdentityDatabase,
  user: string,
  id: string,
) {
  return database.transaction(async (tx) => {
    await requireContentStorage(tx);
    const [stack] = resultRows<{
      id: string;
      name: string;
      visibility: string;
      note: string;
      ordered_tool_ids: string[];
    }>(
      await tx.execute(
        sql`SELECT s.id,s.name,coalesce(x.visibility,'private') AS visibility,coalesce(x.note,'') AS note,coalesce(x.ordered_tool_ids,'[]'::jsonb) AS ordered_tool_ids FROM public.stacks s LEFT JOIN public.stack_settings x ON x.stack_id=s.id WHERE s.id=${id} AND s.user_id=${user}`,
      ),
    );
    if (!stack) return undefined;
    const members = resultRows<{
      id: string;
      name: string;
      slug: string;
      status: string;
    }>(
      await tx.execute(
        sql`SELECT t.id,t.name,t.slug,t.status FROM public.stack_tools m JOIN public.tools t ON t.id=m.tool_id WHERE m.stack_id=${id} ORDER BY t.name,t.id`,
      ),
    );
    members.sort((a, b) => {
      const ai = stack.ordered_tool_ids.indexOf(a.id),
        bi = stack.ordered_tool_ids.indexOf(b.id);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    });
    return { ...stack, members };
  });
}

export async function readCreatorWorkspaceSummary(
  database: IdentityDatabase,
  user: string,
) {
  return database.transaction(async (tx) => {
    await requireContentStorage(tx);
    await checkAuthor(tx, user, "skills");
    const [counts] = resultRows<{ published: number; pending: number }>(
      await tx.execute(
        sql`SELECT count(*) FILTER(WHERE status='published')::int AS published,count(*) FILTER(WHERE status='pending')::int AS pending FROM (SELECT status FROM public.ai_skills WHERE user_id=${user} UNION ALL SELECT status FROM public.ai_playbooks WHERE user_id=${user} UNION ALL SELECT status FROM public.creator_resources WHERE user_id=${user} UNION ALL SELECT status FROM public.public_events WHERE user_id=${user}) items`,
      ),
    );
    const [following] = resultRows<{ followers: number }>(
      await tx.execute(
        (await discoveryAvailable(tx))
          ? sql`SELECT count(*)::int AS followers FROM public.account_follows WHERE creator_id=${user}`
          : sql`SELECT count(*)::int AS followers FROM public.creator_follows WHERE creator_id=${user}`,
      ),
    );
    const [saved] = resultRows<{ saves: number }>(
      await tx.execute(
        sql`SELECT count(*)::int AS saves FROM public.saved_entities s WHERE EXISTS(SELECT 1 FROM public.ai_skills k WHERE k.id=s.skill_id AND k.user_id=${user}) OR EXISTS(SELECT 1 FROM public.ai_playbooks p WHERE p.id=s.playbook_id AND p.user_id=${user}) OR EXISTS(SELECT 1 FROM public.public_events e WHERE e.id=s.event_id AND e.user_id=${user})`,
      ),
    );
    return { ...counts, ...following, ...saved };
  });
}

export async function readToolRelatedContent(
  database: IdentityDatabase,
  tool: string,
) {
  return database.transaction(async (tx) => {
    if (!(await contentAvailable(tx)))
      return [] as { id: string; title: string; slug: string; kind: string }[];
    const items: { id: string; title: string; slug: string; kind: string }[] =
      [];
    for (const kind of ["skills", "playbooks", "events"] as const) {
      const table =
          kind === "skills"
            ? "skill_tools"
            : kind === "playbooks"
              ? "playbook_tools"
              : "event_tools",
        column =
          kind === "skills"
            ? "skill_id"
            : kind === "playbooks"
              ? "playbook_id"
              : "event_id";
      items.push(
        ...resultRows<{
          id: string;
          title: string;
          slug: string;
          kind: string;
        }>(
          await tx.execute(
            sql`SELECT r.id,r.title,r.slug,${kind} AS kind FROM public.${sql.identifier(contentTables[kind])} r JOIN public.${sql.identifier(table)} l ON l.${sql.identifier(column)}=r.id JOIN public.users u ON u.id=r.user_id WHERE l.tool_id=${tool} AND r.status='published' AND ${publicAuthor(kind)} ORDER BY r.published_at DESC LIMIT 20`,
          ),
        ),
      );
    }
    items.push(
      ...resultRows<{ id: string; title: string; slug: string; kind: string }>(
        await tx.execute(sql`
      SELECT s.id,s.name AS title,s.id AS slug,'collections' AS kind
      FROM public.stacks s JOIN public.stack_settings x ON x.stack_id=s.id
      JOIN public.users u ON u.id=s.user_id JOIN public.account_profiles p ON p.user_id=s.user_id AND p.status='published'
      WHERE x.visibility='public' AND ${publicAuthor("skills")}
      AND EXISTS(SELECT 1 FROM public.stack_tools m WHERE m.stack_id=s.id AND m.tool_id=${tool})
      ORDER BY x.created_at DESC,s.id LIMIT 6`),
      ),
    );
    return items;
  });
}

export async function readSkillPlaybooks(
  database: IdentityDatabase,
  skillId: string,
) {
  return database.transaction(async (tx) => {
    if (!(await contentAvailable(tx)))
      return [] as { id: string; title: string; slug: string }[];
    return resultRows<{ id: string; title: string; slug: string }>(
      await tx.execute(sql`
      SELECT r.id,r.title,r.slug FROM public.ai_playbooks r
      JOIN public.playbook_skills l ON l.playbook_id=r.id
      JOIN public.users u ON u.id=r.user_id
      WHERE l.skill_id=${skillId} AND r.status='published' AND ${publicAuthor("playbooks")}
      AND EXISTS(SELECT 1 FROM public.ai_skills k JOIN public.users u ON u.id=k.user_id
        WHERE k.id=${skillId} AND k.status='published' AND ${publicAuthor("skills")})
      ORDER BY r.published_at DESC,r.id LIMIT 20`),
    );
  });
}
