import { notifyFollowers, notifyCancelledEvent } from "../discovery/follows";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import type {
  IdentityDatabase,
  IdentityTransaction,
} from "../supabase/identity";
import {
  audit,
  checkAdmin,
  assertCategory,
  resultRows,
} from "../admin/tool-workflows";
import {
  AdminWorkflowError,
  recordId,
  revisionInput,
  reasonInput,
} from "../admin/contracts";
import { creatorPublishingAllowed } from "../admin/review-storage";
import { requireContentStorage } from "./storage";
import {
  schemas,
  contentTables,
  contentKinds,
  contentDecision,
  profileDecision,
  profileInput,
  type ContentKind,
  type ContentRow,
} from "./contracts";
export async function authorAllowed(
  tx: IdentityTransaction,
  id: string,
  kind: ContentKind = "skills",
) {
  const [user] = resultRows<{ is_admin: boolean; is_creator: boolean }>(
    await tx.execute(
      sql`SELECT is_admin,is_creator FROM public.users WHERE id=${id}`,
    ),
  );
  if (!user) return false;
  if (user.is_admin) return true;
  const [profile] = resultRows<{ status: string }>(
    await tx.execute(
      sql`SELECT status FROM public.account_profiles WHERE user_id=${id} FOR SHARE`,
    ),
  );
  const [application] = resultRows<{ status: string }>(
    await tx.execute(
      sql`SELECT status FROM public.creator_applications WHERE user_id=${id} FOR SHARE`,
    ),
  );
  if (
    user.is_creator &&
    profile?.status !== "suspended" &&
    application?.status !== "suspension_requested" &&
    (await creatorPublishingAllowed(tx, id, true))
  )
    return true;
  return (
    kind === "events" &&
    resultRows(
      await tx.execute(
        sql`SELECT tool_id FROM public.vendor_access WHERE user_id=${id} LIMIT 1`,
      ),
    ).length > 0
  );
}
export async function checkAuthor(
  tx: IdentityTransaction,
  id: string,
  kind: ContentKind,
) {
  if (!(await authorAllowed(tx, id, kind)))
    throw new AdminWorkflowError("Approved publishing capability is required.");
}
export async function notify(
  tx: IdentityTransaction,
  user: string,
  message: string,
) {
  await tx.execute(
    sql`INSERT INTO public.account_notifications(id,user_id,message) VALUES(${randomUUID()},${user},${message})`,
  );
}
const columns: Record<string, string> = {
  title: "title",
  slug: "slug",
  summary: "summary",
  categoryId: "category_id",
  useCaseIds: "use_case_ids",
  industryIds: "industry_ids",
  outcome: "outcome",
  instructions: "instructions",
  prompts: "prompts",
  examples: "examples",
  audience: "audience",
  difficulty: "difficulty",
  minutes: "minutes",
  steps: "steps",
  destination: "destination",
  disclosure: "disclosure",
  skillId: "skill_id",
  playbookId: "playbook_id",
  description: "description",
  organizer: "organizer",
  eventType: "event_type",
  format: "format",
  venue: "venue",
  city: "city",
  country: "country",
  virtualUrl: "virtual_url",
  registrationUrl: "registration_url",
  startsAt: "starts_at",
  endsAt: "ends_at",
  timezone: "timezone",
};
function payload(kind: ContentKind, value: unknown) {
  if (!contentKinds.includes(kind))
    throw new AdminWorkflowError("Choose an approved content type.");
  return schemas[kind].parse(value) as Record<string, unknown>;
}
const dbValue = (key: string, value: unknown) =>
  ["useCaseIds", "industryIds", "steps"].includes(key)
    ? sql`${JSON.stringify(value)}::jsonb`
    : sql`${value}`;
const relations = {
  skills: { table: "skill_tools", key: "skill_id" },
  playbooks: { table: "playbook_tools", key: "playbook_id" },
  events: { table: "event_tools", key: "event_id" },
};
async function validateReferences(
  tx: IdentityTransaction,
  user: string,
  kind: ContentKind,
  data: Record<string, unknown>,
  publishing = false,
) {
  await assertCategory(tx, String(data.categoryId));
  for (const id of (data.toolIds || []) as string[]) {
    const [tool] = resultRows<{
      id: string;
      status: string;
      data: { demo?: boolean };
    }>(
      await tx.execute(
        sql`SELECT id,status,data FROM public.tools WHERE id=${id} FOR SHARE`,
      ),
    );
    if (!tool || tool.status !== "published" || tool.data.demo)
      throw new AdminWorkflowError("Reference only published real Tools.");
  }
  for (const [table, ids] of [
    [
      "ai_skills",
      [
        ...((data.skillIds as string[]) || []),
        ...(data.skillId ? [String(data.skillId)] : []),
      ],
    ],
    ["ai_playbooks", data.playbookId ? [String(data.playbookId)] : []],
  ] as [string, string[]][]) {
    for (const id of ids) {
      const [target] = resultRows<{ user_id: string; status: string }>(
        await tx.execute(
          sql`SELECT user_id,status FROM public.${sql.identifier(table)} WHERE id=${id} FOR SHARE`,
        ),
      );
      if (
        !target ||
        !["published", "draft", "pending", "rejected"].includes(
          target.status,
        ) ||
        (target.status !== "published" &&
          (publishing || target.user_id !== user))
      )
        throw new AdminWorkflowError(
          "Referenced content must be published or an owned draft; publication requires published dependencies.",
        );
      if (
        target.status === "published" &&
        !(await authorAllowed(tx, target.user_id, "skills"))
      )
        throw new AdminWorkflowError(
          "Referenced content author is no longer approved.",
        );
    }
  }
  // Resource campaigns belong to approved public Creator profiles, not generic
  // links to private resources or a different Creator's campaign namespace.
  if (publishing && kind === "resources") {
    if (
      !resultRows(
        await tx.execute(
          sql`SELECT user_id FROM public.account_profiles WHERE user_id=${user} AND status='published' FOR SHARE`,
        ),
      ).length
    )
      throw new AdminWorkflowError(
        "Publish the Creator profile before its resource campaign.",
      );
  }
}
async function replaceRelations(
  tx: IdentityTransaction,
  id: string,
  kind: ContentKind,
  data: Record<string, unknown>,
) {
  if (kind !== "resources") {
    const relation = relations[kind];
    await tx.execute(
      sql`DELETE FROM public.${sql.identifier(relation.table)} WHERE ${sql.identifier(relation.key)}=${id}`,
    );
    for (const toolId of data.toolIds as string[])
      await tx.execute(
        sql`INSERT INTO public.${sql.identifier(relation.table)}(${sql.identifier(relation.key)},tool_id) VALUES(${id},${toolId})`,
      );
  }
  if (kind === "playbooks") {
    await tx.execute(
      sql`DELETE FROM public.playbook_skills WHERE playbook_id=${id}`,
    );
    for (const skillId of data.skillIds as string[])
      await tx.execute(
        sql`INSERT INTO public.playbook_skills(playbook_id,skill_id) VALUES(${id},${skillId})`,
      );
  }
}
export async function saveContent(
  database: IdentityDatabase,
  user: string,
  kind: ContentKind,
  value: unknown,
  key?: { id: unknown; revision: unknown },
  admin = false,
) {
  const data = payload(kind, value);
  const reason = admin
    ? reasonInput.parse((value as Record<string, unknown>)?.reason)
    : null;
  const id = key ? recordId.parse(key.id) : randomUUID();
  const token = key ? revisionInput.parse(key.revision) : null;
  return database.transaction(async (tx) => {
    await requireContentStorage(tx);
    if (admin) await checkAdmin(tx, user);
    else await checkAuthor(tx, user, kind);
    const table = sql.identifier(contentTables[kind]);
    let owner = user;
    if (key) {
      const [row] = resultRows<ContentRow>(
        await tx.execute(
          sql`SELECT *,updated_at::text AS revision FROM public.${table} WHERE id=${id} AND ${admin ? sql`true` : sql`user_id=${user}`} FOR UPDATE`,
        ),
      );
      if (
        !row ||
        row.revision !== token ||
        ["archived", "canceled"].includes(row.status)
      )
        throw new AdminWorkflowError(
          "This draft changed, ended or belongs to another author.",
        );
      owner = row.user_id;
    }
    await validateReferences(tx, owner, kind, data);
    const entries = Object.entries(data).filter(([key]) => columns[key]);
    if (key)
      await tx.execute(
        sql`UPDATE public.${table} SET ${sql.join(
          entries.map(
            ([key, value]) =>
              sql`${sql.identifier(columns[key])}=${dbValue(key, value)}`,
          ),
          sql`, `,
        )},status='draft',reviewer_id=NULL,review_reason=NULL,updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE id=${id}`,
      );
    else
      await tx.execute(
        sql`INSERT INTO public.${table}(id,user_id,${sql.join(
          entries.map(([key]) => sql.identifier(columns[key])),
          sql`, `,
        )}) VALUES(${id},${user},${sql.join(
          entries.map(([key, value]) => dbValue(key, value)),
          sql`, `,
        )})`,
      );
    await replaceRelations(tx, id, kind, data);
    await audit(tx, user, kind + ".draft-saved", id, {
      fields: entries.map(([key]) => key),
      editorialReviewRequired: true,
      owner,
      ...(reason ? { reason } : {}),
    });
    return id;
  });
}
export async function readRelations(
  tx: IdentityTransaction,
  row: ContentRow,
  kind: ContentKind,
) {
  row.toolIds =
    kind === "resources"
      ? []
      : resultRows<{ tool_id: string }>(
          await tx.execute(
            sql`SELECT tool_id FROM public.${sql.identifier(relations[kind].table)} WHERE ${sql.identifier(relations[kind].key)}=${row.id} ORDER BY tool_id`,
          ),
        ).map((r) => r.tool_id);
  row.skillIds =
    kind === "playbooks"
      ? resultRows<{ skill_id: string }>(
          await tx.execute(
            sql`SELECT skill_id FROM public.playbook_skills WHERE playbook_id=${row.id} ORDER BY skill_id`,
          ),
        ).map((r) => r.skill_id)
      : [];
  return row;
}
function rowPayload(row: ContentRow) {
  return Object.fromEntries([
    ...Object.entries(columns).map(([key, column]) => [
      key,
      ["startsAt", "endsAt"].includes(key) && row[column] != null
        ? new Date(row[column] as string).toISOString()
        : row[column],
    ]),
    ["toolIds", row.toolIds],
    ["skillIds", row.skillIds],
  ]);
}
export async function submitContent(
  database: IdentityDatabase,
  user: string,
  kind: ContentKind,
  id: unknown,
  revision: unknown,
  admin = false,
) {
  const target = recordId.parse(id),
    token = revisionInput.parse(revision);
  if (!contentKinds.includes(kind))
    throw new AdminWorkflowError("Invalid content type.");
  await database.transaction(async (tx) => {
    await requireContentStorage(tx);
    if (admin) await checkAdmin(tx, user);
    else await checkAuthor(tx, user, kind);
    const table = sql.identifier(contentTables[kind]);
    const [row] = resultRows<ContentRow>(
      await tx.execute(
        sql`SELECT *,updated_at::text AS revision FROM public.${table} WHERE id=${target} AND ${admin ? sql`true` : sql`user_id=${user}`} FOR UPDATE`,
      ),
    );
    if (
      !row ||
      !["draft", "rejected"].includes(row.status) ||
      row.revision !== token
    )
      throw new AdminWorkflowError(
        "Only an unchanged owned draft can be submitted.",
      );
    await readRelations(tx, row, kind);
    const data = payload(kind, rowPayload(row));
    await validateReferences(tx, row.user_id, kind, data);
    await tx.execute(
      sql`UPDATE public.${table} SET status='pending',updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE id=${target}`,
    );
    await audit(tx, user, kind + ".submitted", target, { status: "pending" });
  });
}
export async function moderateContent(
  database: IdentityDatabase,
  actor: string,
  kind: ContentKind,
  value: unknown,
) {
  const input = contentDecision.parse(value);
  if (!contentKinds.includes(kind))
    throw new AdminWorkflowError("Invalid content type.");
  await database.transaction(async (tx) => {
    await requireContentStorage(tx);
    await checkAdmin(tx, actor);
    const table = sql.identifier(contentTables[kind]);
    const [row] = resultRows<ContentRow>(
      await tx.execute(
        sql`SELECT *,updated_at::text AS revision FROM public.${table} WHERE id=${input.id} FOR UPDATE`,
      ),
    );
    if (
      !row ||
      row.revision !== input.revision ||
      (input.decision === "canceled"
        ? kind !== "events" ||
          !["draft", "pending", "published"].includes(row.status)
        : input.decision === "archived"
          ? !["published", "rejected"].includes(row.status)
          : row.status !== "pending")
    )
      throw new AdminWorkflowError("Invalid or stale moderation transition.");
    if (input.decision === "published") {
      await checkAuthor(tx, row.user_id, kind);
      await readRelations(tx, row, kind);
      await validateReferences(
        tx,
        row.user_id,
        kind,
        payload(kind, rowPayload(row)),
        true,
      );
    }
    await tx.execute(
      sql`UPDATE public.${table} SET status=${input.decision},reviewer_id=${actor},review_reason=${input.reason},published_at=CASE WHEN ${input.decision}='published' THEN now() ELSE published_at END,updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE id=${input.id}`,
    );
    await notify(
      tx,
      row.user_id,
      `${row.title}: ${input.decision}. ${input.reason}`,
    );
    await notifyFollowers(tx, kind, input.id, input.decision === "published");
    if (kind === "events" && input.decision === "canceled")
      await notifyCancelledEvent(tx, input.id, row.status === "published");
    await audit(tx, actor, kind + ".moderated", input.id, {
      from: row.status,
      to: input.decision,
      reason: input.reason,
      owner: row.user_id,
    });
  });
}
export async function saveProfile(
  database: IdentityDatabase,
  user: string,
  value: unknown,
  revision?: unknown,
) {
  const input = profileInput.parse(value);
  await database.transaction(async (tx) => {
    await requireContentStorage(tx);
    if (
      !resultRows(
        await tx.execute(sql`SELECT id FROM public.users WHERE id=${user}`),
      ).length
    )
      throw new AdminWorkflowError("An account is required.");
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${"profile:" + user},0))`,
    );
    const [old] = resultRows<{
      revision: string;
      handle: string;
      published_at: string | null;
      status: string;
    }>(
      await tx.execute(
        sql`SELECT *,updated_at::text AS revision FROM public.account_profiles WHERE user_id=${user} FOR UPDATE`,
      ),
    );
    if (old && old.revision !== revision)
      throw new AdminWorkflowError("Profile changed. Refresh before saving.");
    if (old?.published_at && old.handle !== input.handle)
      throw new AdminWorkflowError(
        "A published Creator handle is stable and cannot be renamed here.",
      );
    await tx.execute(
      sql`INSERT INTO public.account_profiles(user_id,handle,display_name,bio,website) VALUES(${user},${input.handle},${input.displayName},${input.bio},${input.website || null}) ON CONFLICT(user_id) DO UPDATE SET handle=excluded.handle,display_name=excluded.display_name,bio=excluded.bio,website=excluded.website,status=CASE WHEN account_profiles.status='suspended' THEN 'suspended' ELSE 'draft' END,reviewer_id=CASE WHEN account_profiles.status='suspended' THEN account_profiles.reviewer_id ELSE NULL END,review_reason=CASE WHEN account_profiles.status='suspended' THEN account_profiles.review_reason ELSE NULL END,updated_at=GREATEST(clock_timestamp(),account_profiles.updated_at+interval '1 microsecond')`,
    );
    await audit(tx, user, "profile.saved", user, {
      fields: Object.keys(input),
      status: old?.status === "suspended" ? "suspended" : "draft",
    });
  });
}
export async function submitProfile(
  database: IdentityDatabase,
  user: string,
  revision: unknown,
) {
  const token = revisionInput.parse(revision);
  await database.transaction(async (tx) => {
    await requireContentStorage(tx);
    await checkAuthor(tx, user, "skills");
    const changed = resultRows(
      await tx.execute(
        sql`UPDATE public.account_profiles SET status='pending',updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE user_id=${user} AND updated_at::text=${token} AND status IN ('draft','rejected') RETURNING user_id`,
      ),
    );
    if (!changed.length)
      throw new AdminWorkflowError(
        "Only an unchanged owned profile draft can be submitted.",
      );
    await audit(tx, user, "profile.submitted", user, { status: "pending" });
  });
}
export async function moderateProfile(
  database: IdentityDatabase,
  actor: string,
  value: unknown,
) {
  const input = profileDecision.parse(value);
  await database.transaction(async (tx) => {
    await requireContentStorage(tx);
    await checkAdmin(tx, actor);
    const [row] = resultRows<{
      user_id: string;
      status: string;
      revision: string;
    }>(
      await tx.execute(
        sql`SELECT *,updated_at::text AS revision FROM public.account_profiles WHERE user_id=${input.id} FOR UPDATE`,
      ),
    );
    if (
      !row ||
      row.revision !== input.revision ||
      (input.decision === "suspended"
        ? row.status !== "published"
        : input.decision === "pending"
          ? row.status !== "suspended"
          : row.status !== "pending")
    )
      throw new AdminWorkflowError(
        "Invalid or stale profile review transition.",
      );
    if (input.decision === "published")
      await checkAuthor(tx, row.user_id, "skills");
    await tx.execute(
      sql`UPDATE public.account_profiles SET status=${input.decision},reviewer_id=${actor},review_reason=${input.reason},published_at=CASE WHEN ${input.decision}='published' THEN now() ELSE published_at END,updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE user_id=${row.user_id}`,
    );
    await notify(
      tx,
      row.user_id,
      "Creator profile: " + input.decision + ". " + input.reason,
    );
    await notifyFollowers(
      tx,
      "creators",
      row.user_id,
      input.decision === "published",
    );
    await audit(tx, actor, "profile.moderated", row.user_id, {
      decision: input.decision,
      reason: input.reason,
    });
  });
}
