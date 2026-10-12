import { mutateEngagement } from "../../src/lib/db/engagement-workflows";
import { saveEntity } from "../../src/lib/content/queries";
import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import type {
  IdentityDatabase,
  IdentityTransaction,
} from "../../src/lib/supabase/identity";
import { resultRows } from "../../src/lib/admin/tool-workflows";
import {
  mutateComparison,
  readComparisons,
} from "../../src/lib/discovery/comparisons";
import {
  mutateFollow,
  readFollowing,
  followState,
  notifyFollowers,
  notifyCancelledEvent,
} from "../../src/lib/discovery/follows";
import {
  recordAnalytics,
  readBehaviorAnalytics,
  pruneAnalytics,
} from "../../src/lib/discovery/analytics";
import { taxonomy } from "../../src/lib/catalog/taxonomy";
type Database = IdentityDatabase & IdentityTransaction;
export async function setupDiscoveryFixtures(db: Database) {
  await db.execute(
    sql`INSERT INTO public.users(id,is_admin,is_creator) VALUES('dis-admin',true,false),('dis-a',false,false),('dis-b',false,false),('dis-creator',false,true),('dis-vendor',false,false)`,
  );
  const category = taxonomy.categories[0],
    industry = taxonomy.industries[0];
  await db.execute(
    sql`INSERT INTO public.taxonomy(id,kind,name,slug,data) VALUES(${category.id},'category',${category.name},${category.slug},'{}'),(${industry.id},'industry',${industry.name},${industry.slug},'{}') ON CONFLICT DO NOTHING`,
  );
  for (const id of ["dis-t1", "dis-t2", "dis-t3", "dis-t4", "dis-t5"])
    await db.execute(
      sql`INSERT INTO public.tools(id,slug,name,category_id,status,data) VALUES(${id},${id},${"Synthetic " + id},${category.id},'published',${JSON.stringify({ industries: [{ id: industry.id, fit: "strong" }], website: "https://example.invalid/" + id })}::jsonb)`,
    );
  await db.execute(
    sql`INSERT INTO public.vendor_access(user_id,tool_id) VALUES('dis-vendor','dis-t1')`,
  );
  await db.execute(
    sql`INSERT INTO public.account_profiles(user_id,handle,display_name,bio,status) VALUES('dis-creator','dis-creator','Synthetic Creator','Synthetic biography','published')`,
  );
  for (const id of ["dis-skill", "dis-draft"])
    await db.execute(
      sql`INSERT INTO public.ai_skills(id,user_id,slug,title,summary,category_id,use_case_ids,industry_ids,status,outcome,instructions,prompts,examples) VALUES(${id},'dis-creator',${id},${id},'Synthetic description',${category.id},'[]',${JSON.stringify([industry.id])}::jsonb,${id === "dis-draft" ? "pending" : "published"},'Synthetic outcome','Synthetic instructions','','')`,
    );
  await db.execute(
    sql`INSERT INTO public.ai_playbooks(id,user_id,slug,title,summary,category_id,use_case_ids,industry_ids,status,outcome,audience,difficulty,minutes,steps,examples) VALUES('dis-playbook','dis-creator','dis-playbook','Synthetic Playbook','Synthetic summary',${category.id},'[]','[]','published','Outcome','Audience','beginner',10,'[]','')`,
  );
  await db.execute(
    sql`INSERT INTO public.creator_resources(id,user_id,slug,title,summary,category_id,use_case_ids,industry_ids,status,destination,disclosure,skill_id) VALUES('dis-resource','dis-creator','dis-resource','Synthetic Resource','Synthetic summary',${category.id},'[]','[]','published','https://example.invalid/resource','Synthetic disclosure','dis-skill')`,
  );
  await db.execute(
    sql`INSERT INTO public.public_events(id,user_id,slug,title,summary,category_id,use_case_ids,industry_ids,status,description,organizer,event_type,format,venue,city,country,registration_url,starts_at,ends_at,timezone) VALUES('dis-event','dis-creator','dis-event','Synthetic Event','Synthetic summary',${category.id},'[]','[]','published','Description','Organizer','workshop','virtual','','','','https://example.invalid/event',now(),now()+interval '1 hour','UTC')`,
  );
}
export async function comparisonContract(db: Database) {
  const value = {
    operation: "save",
    name: "My comparison",
    toolIds: ["dis-t1", "dis-t2"],
    context: { category: taxonomy.categories[0].id },
  };
  const id = await mutateComparison(db, "dis-a", value);
  assert.equal((await readComparisons(db, "dis-a")).rows[0].id, id);
  assert.equal((await readComparisons(db, "dis-b", 1, id)).rows.length, 0);
  await assert.rejects(
    mutateComparison(db, "dis-b", { ...value, id, revision: 1 }),
  );
  await assert.rejects(
    mutateComparison(db, "dis-b", { operation: "delete", id, revision: 1 }),
  );
  await mutateComparison(db, "dis-a", {
    ...value,
    id,
    revision: 1,
    name: "Renamed",
    toolIds: ["dis-t2", "dis-t3", "dis-t1"],
    context: { industry: taxonomy.industries[0].id },
  });
  await assert.rejects(
    mutateComparison(db, "dis-a", { ...value, id, revision: 1 }),
  );
  const c = (await readComparisons(db, "dis-a", 1, id)).rows[0];
  assert.equal(c.revision, 2);
  assert.deepEqual(
    c.tools.map((t) => t.id),
    ["dis-t2", "dis-t3", "dis-t1"],
  );
  await db.execute(
    sql`UPDATE public.tools SET status='archived' WHERE id='dis-t1'`,
  );
  const archived = (await readComparisons(db, "dis-a", 1, id)).rows[0].tools[2];
  assert.equal(archived.available, false);
  assert.equal(archived.slug, null);
  assert.equal(archived.name, "Unavailable Tool");
  await mutateComparison(db, "dis-a", { ...value, id, revision: 2 });
  await assert.rejects(mutateComparison(db, "dis-b", value));
  await mutateComparison(db, "dis-a", {
    ...value,
    id,
    revision: 3,
    toolIds: ["dis-t2", "dis-t3"],
  });
  await assert.rejects(
    mutateComparison(db, "dis-a", {
      ...value,
      id,
      revision: 4,
      toolIds: ["dis-t2"],
    }),
  );
  await mutateComparison(db, "dis-a", { operation: "delete", id, revision: 4 });
  assert.equal((await readComparisons(db, "dis-a")).total, 0);
  await db.execute(
    sql`UPDATE public.tools SET status='published' WHERE id='dis-t1'`,
  );
  // Deterministic audit failure wrapper recognizes compiled SQL rather than values.
  const { PgDialect } = await import("drizzle-orm/pg-core");
  const dialect = new PgDialect();
  const failAudit: IdentityDatabase = {
    transaction: (work) =>
      db.transaction((tx) =>
        work({
          execute: (q) =>
            dialect.sqlToQuery(q).sql.includes("audit_logs")
              ? tx.execute(sql`SELECT 1/0`)
              : tx.execute(q),
        }),
      ),
  };
  await assert.rejects(mutateComparison(failAudit, "dis-a", value));
  assert.equal((await readComparisons(db, "dis-a")).total, 0);
  const left = await mutateComparison(db, "dis-a", {
    ...value,
    toolIds: ["dis-t1", "dis-t2"],
  });
  const right = await mutateComparison(db, "dis-a", {
    ...value,
    toolIds: ["dis-t3", "dis-t4"],
  });
  await assert.rejects(
    db.execute(
      sql`UPDATE public.comparison_tools SET comparison_id=${right},position=2 WHERE comparison_id=${left} AND tool_id='dis-t2'`,
    ),
  );
  assert.equal(
    (await readComparisons(db, "dis-a", 1, left)).rows[0].tools.length,
    2,
  );
  assert.equal(
    (await readComparisons(db, "dis-a", 1, right)).rows[0].tools.length,
    2,
  );
  await mutateComparison(db, "dis-a", {
    operation: "delete",
    id: left,
    revision: 1,
  });
  await mutateComparison(db, "dis-a", {
    operation: "delete",
    id: right,
    revision: 1,
  });
}
export async function followsContract(db: Database) {
  const targets = [
    ["tools", "dis-t1"],
    ["skills", "dis-skill"],
    ["playbooks", "dis-playbook"],
    ["creators", "dis-creator"],
    ["events", "dis-event"],
    ["industries", taxonomy.industries[0].id],
  ] as const;
  for (const [kind, id] of targets) {
    await mutateFollow(db, "dis-a", { kind, id, remove: false });
    await mutateFollow(db, "dis-a", { kind, id, remove: false });
  }
  assert.equal((await readFollowing(db, "dis-a")).total, 6);
  assert.equal((await readFollowing(db, "dis-b")).total, 0);
  await assert.rejects(
    mutateFollow(db, "dis-a", {
      kind: "skills",
      id: "dis-draft",
      remove: false,
    }),
  );
  await assert.rejects(
    mutateFollow(db, "dis-a", {
      kind: "industries",
      id: "invented",
      remove: false,
    }),
  );
  await assert.rejects(
    mutateFollow(db, "dis-creator", {
      kind: "creators",
      id: "dis-creator",
      remove: false,
    }),
  );
  await db.execute(
    sql`UPDATE public.account_profiles SET status='suspended' WHERE user_id='dis-creator'`,
  );
  assert.equal(
    (await readFollowing(db, "dis-a")).rows.filter((t) => !t.href).length,
    4,
  );
  await assert.rejects(
    mutateFollow(db, "dis-b", {
      kind: "skills",
      id: "dis-skill",
      remove: false,
    }),
  );
  await db.execute(
    sql`UPDATE public.account_profiles SET status='published' WHERE user_id='dis-creator'`,
  );
  await mutateFollow(db, "dis-b", {
    kind: "tools",
    id: "dis-t1",
    remove: true,
  });
  assert.equal(
    (await followState(db, "dis-a", "tools", "dis-t1")).following,
    true,
  );
  await mutateFollow(db, "dis-a", {
    kind: "tools",
    id: "dis-t1",
    remove: true,
  });
  assert.equal((await followState(db, "dis-a", "tools", "dis-t1")).count, 0);
  assert.equal((await readFollowing(db, "dis-a", NaN)).page, 1);
  await assert.rejects(readFollowing(db, "dis-a", 1, "bad" as "tools"));
}
export async function notificationContract(db: Database) {
  await db.transaction((tx) =>
    notifyFollowers(tx, "skills", "dis-draft", true),
  );
  assert.equal(
    resultRows(
      await db.execute(
        sql`SELECT id FROM public.account_notifications WHERE user_id='dis-a'`,
      ),
    ).length,
    0,
  );
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`UPDATE public.ai_skills SET status='published' WHERE id='dis-draft'`,
    );
    await notifyFollowers(tx, "skills", "dis-draft", true);
  });
  assert.equal(
    resultRows(
      await db.execute(
        sql`SELECT id FROM public.account_notifications WHERE user_id='dis-a'`,
      ),
    ).length,
    1,
  );
  assert.equal(
    resultRows(
      await db.execute(
        sql`SELECT id FROM public.account_notifications WHERE user_id='dis-b'`,
      ),
    ).length,
    0,
  );
  await db.transaction((tx) =>
    notifyFollowers(tx, "skills", "dis-draft", false),
  );
  assert.equal(
    resultRows(
      await db.execute(
        sql`SELECT id FROM public.account_notifications WHERE user_id='dis-a'`,
      ),
    ).length,
    1,
  );
  const { PgDialect } = await import("drizzle-orm/pg-core");
  const dialect = new PgDialect();
  await assert.rejects(
    db.transaction(async (tx) => {
      await tx.execute(
        sql`UPDATE public.ai_skills SET title='Should roll back' WHERE id='dis-draft'`,
      );
      await notifyFollowers(
        {
          execute: (q) =>
            dialect
              .sqlToQuery(q)
              .sql.includes("INSERT INTO public.account_notifications")
              ? tx.execute(sql`SELECT 1/0`)
              : tx.execute(q),
        },
        "skills",
        "dis-draft",
        true,
      );
    }),
  );
  assert.equal(
    resultRows<{ title: string }>(
      await db.execute(
        sql`SELECT title FROM public.ai_skills WHERE id='dis-draft'`,
      ),
    )[0].title,
    "dis-draft",
  );
  await db.execute(
    sql`INSERT INTO public.saved_entities(id,user_id,event_id) VALUES('dis-save-event','dis-b','dis-event')`,
  );
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`UPDATE public.public_events SET status='canceled' WHERE id='dis-event'`,
    );
    await notifyCancelledEvent(tx, "dis-event", true);
  });
  assert.equal(
    resultRows(
      await db.execute(
        sql`SELECT id FROM public.account_notifications WHERE user_id='dis-b'`,
      ),
    ).length,
    1,
  );
  await db.execute(
    sql`UPDATE public.public_events SET status='published' WHERE id='dis-event'`,
  );
}
export async function analyticsContract(db: Database) {
  const session = { hash: "a".repeat(64), source: "resource" as const };
  assert.equal(
    await db.transaction((tx) =>
      recordAnalytics(tx, session, {
        event: "tool_view",
        kind: "tools",
        targetId: "dis-t1",
      }),
    ),
    true,
  );
  assert.equal(
    await db.transaction((tx) =>
      recordAnalytics(tx, session, {
        event: "tool_view",
        kind: "tools",
        targetId: "dis-t1",
      }),
    ),
    false,
  );
  await db.transaction((tx) =>
    recordAnalytics(tx, session, {
      event: "skill_view",
      kind: "skills",
      targetId: "dis-skill",
      campaignId: "dis-resource",
    }),
  );
  await db.transaction((tx) =>
    recordAnalytics(tx, session, {
      event: "resource_outbound",
      kind: "resources",
      targetId: "dis-resource",
      campaignId: "dis-resource",
    }),
  );
  await db.transaction((tx) =>
    recordAnalytics(tx, session, {
      event: "search",
      kind: "discovery",
      targetId: "tools",
      filters: { industry: taxonomy.industries[0].id, hasQuery: true },
    }),
  );
  await assert.rejects(
    db.transaction((tx) =>
      recordAnalytics(tx, session, {
        event: "tool_view",
        kind: "tools",
        targetId: "dis-t2",
        campaignId: "dis-resource",
      }),
    ),
  );
  await assert.rejects(
    db.transaction((tx) =>
      recordAnalytics(tx, session, {
        event: "tool_view",
        kind: "creators",
        targetId: "dis-creator",
      }),
    ),
  );
  await assert.rejects(
    db.transaction((tx) =>
      recordAnalytics(tx, session, {
        event: "search",
        kind: "discovery",
        targetId: "tools",
        filters: { industry: "invented" },
      }),
    ),
  );
  await assert.rejects(readBehaviorAnalytics(db, "dis-a", "admin"));
  await assert.rejects(readBehaviorAnalytics(db, "dis-a", "creator"));
  await assert.rejects(
    readBehaviorAnalytics(db, "dis-vendor", "vendor", "dis-t2"),
  );
  const vendor = await readBehaviorAnalytics(
    db,
    "dis-vendor",
    "vendor",
    "dis-t1",
  );
  assert.equal(vendor.rows.length, 1);
  assert.equal(vendor.rows[0].target_id, "dis-t1");
  const creator = await readBehaviorAnalytics(db, "dis-creator", "creator");
  assert.equal(creator.rows.length, 2);
  assert.ok(creator.rows.every((r) => r.campaign_id === "dis-resource"));
  const admin = await readBehaviorAnalytics(db, "dis-admin", "admin");
  assert.equal(admin.status!.events, 4);
  await db.execute(
    sql`INSERT INTO public.analytics_events(id,event,kind,target_id,session_hash,dedup_key,source,created_at) VALUES('expired','tool_view','tools','dis-t1',${"b".repeat(64)},${"b".repeat(64)},'direct',now()-interval '31 days')`,
  );
  assert.equal(
    (await readBehaviorAnalytics(db, "dis-vendor", "vendor", "dis-t1")).rows
      .length,
    1,
  );
  await assert.rejects(pruneAnalytics(db, "dis-a"));
  await db.execute(
    sql`INSERT INTO public.rate_limits(key,count,window_start) VALUES('analytics:expired-proof',1,now()-interval '2 days'),('unrelated-security-budget',1,now()-interval '2 days')`,
  );
  assert.equal(await pruneAnalytics(db, "dis-admin"), 1);
  assert.equal(
    resultRows(
      await db.execute(
        sql`SELECT key FROM public.rate_limits WHERE key='analytics:expired-proof'`,
      ),
    ).length,
    0,
  );
  assert.equal(
    resultRows(
      await db.execute(
        sql`SELECT key FROM public.rate_limits WHERE key='unrelated-security-budget'`,
      ),
    ).length,
    1,
  );
  const actorSession = { hash: "c".repeat(64), source: "directory" as const };
  await mutateEngagement(
    db,
    "dis-a",
    { operation: "save", toolId: "dis-t2" },
    actorSession,
  );
  await mutateEngagement(
    db,
    "dis-a",
    { operation: "save", toolId: "dis-t2" },
    actorSession,
  );
  await saveEntity(db, "dis-a", "skills", "dis-skill", false, actorSession);
  await saveEntity(db, "dis-a", "skills", "dis-skill", false, actorSession);
  assert.equal(
    resultRows(
      await db.execute(
        sql`SELECT id FROM public.analytics_events WHERE event='save'`,
      ),
    ).length,
    2,
  );
  await mutateEngagement(db, "dis-a", {
    operation: "create-stack",
    name: "Analytics synthetic Stack",
  });
  const [stack] = resultRows<{ id: string }>(
    await db.execute(
      sql`SELECT id FROM public.stacks WHERE user_id='dis-a' AND name='Analytics synthetic Stack'`,
    ),
  );
  await mutateEngagement(
    db,
    "dis-a",
    { operation: "add-stack", stackId: stack.id, toolId: "dis-t2" },
    actorSession,
  );
  await mutateEngagement(
    db,
    "dis-a",
    { operation: "add-stack", stackId: stack.id, toolId: "dis-t2" },
    actorSession,
  );
  assert.equal(
    resultRows(
      await db.execute(
        sql`SELECT id FROM public.analytics_events WHERE event='stack_add'`,
      ),
    ).length,
    1,
  );

  // Throttle counts persist; unique synthetic requests cannot bypass one signed session budget.
  await db.execute(
    sql`UPDATE public.rate_limits SET count=60 WHERE key LIKE ${"analytics:" + session.hash + ":%"}`,
  );
  assert.equal(
    await db.transaction((tx) =>
      recordAnalytics(tx, session, {
        event: "tool_view",
        kind: "tools",
        targetId: "dis-t3",
      }),
    ),
    false,
  );
}
