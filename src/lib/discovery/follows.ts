import { randomUUID } from "node:crypto";
import { assertQuota } from "../pricing/entitlements";
import { entitlementLock } from "../pricing/storage";
import { PROPOSED_PRICING } from "../pricing/config";
import { sql } from "drizzle-orm";
import { z } from "zod";
import type {
  IdentityDatabase,
  IdentityTransaction,
} from "../supabase/identity";
import { audit, resultRows } from "../admin/tool-workflows";
import { AdminWorkflowError } from "../admin/contracts";
import { canonicalUser } from "./comparisons";
import { discoveryAvailable, requireDiscovery } from "./storage";
import { followKind, visibleTarget, type FollowKind } from "./targets";
import { publicAuthor } from "../content/queries";
export const followInput = z.object({
  kind: followKind,
  id: z.string().min(1).max(100),
  remove: z.boolean(),
});
const columns = {
  tools: "tool_id",
  skills: "skill_id",
  playbooks: "playbook_id",
  creators: "creator_id",
  events: "event_id",
  industries: "industry_id",
} as const;
export async function mutateFollow(
  database: IdentityDatabase,
  user: string,
  value: unknown,
) {
  const input = followInput.parse(value);
  return database.transaction(async (tx) => {
    await requireDiscovery(tx);
    await canonicalUser(tx, user);
    await entitlementLock(tx, user);
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${"discovery-account:" + user},0))`,
    );
    if (input.remove)
      await tx.execute(
        sql`DELETE FROM public.account_follows WHERE user_id=${user} AND kind=${input.kind} AND target_id=${input.id}`,
      );
    else {
      if (
        (input.kind === "creators" && input.id === user) ||
        !(await visibleTarget(tx, input.kind, input.id))
      )
        throw new AdminWorkflowError(
          "Only available public targets can be followed.",
        );
      const [count] = resultRows<{ n: number }>(
        await tx.execute(
          sql`SELECT count(*)::int AS n FROM public.account_follows WHERE user_id=${user}`,
        ),
      );
      const duplicate = resultRows(
        await tx.execute(
          sql`SELECT target_id FROM public.account_follows WHERE user_id=${user} AND kind=${input.kind} AND target_id=${input.id}`,
        ),
      ).length;
      if (!duplicate) await assertQuota(tx, user, "follows");
      if (count.n >= PROPOSED_PRICING.plans[0].quotas.follows && !duplicate)
        throw new AdminWorkflowError(
          "Following limit reached. Unfollow something first.",
        );
      await tx.execute(
        sql`INSERT INTO public.account_follows(user_id,kind,target_id,${sql.identifier(columns[input.kind])}) VALUES(${user},${input.kind},${input.id},${input.id}) ON CONFLICT DO NOTHING`,
      );
    }
    await audit(
      tx,
      user,
      input.remove ? "account.unfollowed" : "account.followed",
      input.id,
      { kind: input.kind },
    );
  });
}
export async function notifyCancelledEvent(
  tx: IdentityTransaction,
  id: string,
  previouslyPublic: boolean,
) {
  if (!previouslyPublic || !(await discoveryAvailable(tx))) return;
  const [event] = resultRows<{ user_id: string }>(
    await tx.execute(
      sql`SELECT r.user_id FROM public.public_events r JOIN public.users u ON u.id=r.user_id WHERE r.id=${id} AND r.status='canceled' AND ${publicAuthor("events")}`,
    ),
  );
  if (!event) return;
  await tx.execute(
    sql`INSERT INTO public.account_notifications(id,user_id,message) SELECT ${randomUUID()}||':'||f.user_id,f.user_id,'An Event you followed or saved was canceled. It is no longer available for registration.' FROM (SELECT user_id FROM public.account_follows WHERE kind='events' AND target_id=${id} UNION SELECT user_id FROM public.saved_entities WHERE event_id=${id}) f WHERE f.user_id<>${event.user_id}`,
  );
}
export async function followState(
  database: IdentityDatabase,
  user: string | null,
  kind: FollowKind,
  id: string,
) {
  return database.transaction(async (tx) => {
    if (!(await discoveryAvailable(tx)) || !(await visibleTarget(tx, kind, id)))
      return { ready: false, following: false, count: 0 };
    const [c] = resultRows<{ n: number; following: boolean }>(
      await tx.execute(
        sql`SELECT count(*)::int AS n,coalesce(bool_or(user_id=${user}),false) AS following FROM public.account_follows WHERE kind=${kind} AND target_id=${id}`,
      ),
    );
    return { ready: true, following: c.following, count: c.n };
  });
}
export async function readFollowing(
  database: IdentityDatabase,
  user: string,
  page = 1,
  kind?: FollowKind,
) {
  return database.transaction(async (tx) => {
    await canonicalUser(tx, user);
    if (!(await discoveryAvailable(tx)))
      return {
        ready: false,
        total: 0,
        page: 1,
        rows: [] as {
          kind: FollowKind;
          id: string;
          title: string;
          href?: string;
        }[],
      };
    page = Number.isSafeInteger(page) ? Math.min(50, Math.max(1, page)) : 1;
    if (kind) followKind.parse(kind);
    const [c] = resultRows<{ n: number }>(
      await tx.execute(
        sql`SELECT count(*)::int AS n FROM public.account_follows WHERE user_id=${user} AND (${kind || null}::text IS NULL OR kind=${kind || null})`,
      ),
    );
    page = Math.min(page, Math.max(1, Math.ceil(c.n / 20)));
    const records = resultRows<{ kind: FollowKind; target_id: string }>(
      await tx.execute(
        sql`SELECT kind,target_id FROM public.account_follows WHERE user_id=${user} AND (${kind || null}::text IS NULL OR kind=${kind || null}) ORDER BY created_at DESC,kind,target_id LIMIT 20 OFFSET ${(page - 1) * 20}`,
      ),
    );
    const rows = [];
    for (const f of records) {
      const t = await visibleTarget(tx, f.kind, f.target_id);
      rows.push({
        kind: f.kind,
        id: f.target_id,
        title: t?.title || "Unavailable followed content",
        href: t?.href,
      });
    }
    return { ready: true, total: c.n, page, rows };
  });
}
// Publication-only account delivery. The caller holds the content mutation lock;
// any delivery failure rolls back publication and its independent audit record.
export async function notifyFollowers(
  tx: IdentityTransaction,
  kind: FollowKind | "resources",
  id: string,
  deliver: boolean,
) {
  if (!deliver || !(await discoveryAvailable(tx))) return;
  const target = await visibleTarget(tx, kind, id);
  if (!target) return;
  const industries = (target.industries || []).slice(0, 100);
  await tx.execute(sql`INSERT INTO public.account_notifications(id,user_id,message)
 SELECT ${randomUUID()}||':'||f.user_id,f.user_id,${"Published update: " + target.title + " · " + target.href}
 FROM (SELECT user_id FROM public.account_follows WHERE kind=${kind} AND target_id=${id} OR kind='creators' AND target_id=${target.owner || null} OR kind='industries' AND target_id IN (${
   industries.length
     ? sql.join(
         industries.map((i) => sql`${i}`),
         sql`, `,
       )
     : sql`NULL`
 }) UNION SELECT user_id FROM public.saved_entities WHERE ${kind === "events"} AND event_id=${id}) f WHERE f.user_id<>${target.owner || ""} GROUP BY f.user_id`);
}
