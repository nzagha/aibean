import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import type {
  IdentityDatabase,
  IdentityTransaction,
} from "../../src/lib/supabase/identity";
import { adminFixtureInput } from "./admin-workflow-contract";
import {
  createAdminTool,
  transitionAdminTool,
  resultRows,
} from "../../src/lib/admin/tool-workflows";
import { readAdminTool } from "../../src/lib/admin/queries";
import {
  saveContent,
  submitContent,
  moderateContent,
  saveProfile,
  submitProfile,
  moderateProfile,
} from "../../src/lib/content/workflows";
import {
  readContentDetail,
  readContentList,
  readProfile,
  readPublicProfile,
  saveEntity,
  readEngagement,
  followCreator,
  markNotificationRead,
  updateStackSettings,
  readPublicStack,
  readCreatorPublicContent,
  readToolRelatedContent,
  readOwnedStackSettings,
  readSkillPlaybooks,
  readPublicProfiles,
} from "../../src/lib/content/queries";
import { notifyDecision } from "../../src/lib/content/decision-notifications";
import { moderateAdminReview } from "../../src/lib/admin/tool-workflows";
import { skillInput, eventInput } from "../../src/lib/content/contracts";
import {
  createContentReport,
  resolveContentReport,
  featureEvent,
  readContentReports,
  updateSimilarTools,
} from "../../src/lib/content/operations";
import {
  registerOutbound,
  readAdminAnalytics,
  readVendorAnalytics,
  readCreatorAnalytics,
} from "../../src/lib/content/analytics";
import { moderatePlacement } from "../../src/lib/featured/moderation";
import { taxonomy, activeUseCases } from "../../src/lib/catalog/taxonomy";
type Database = IdentityDatabase & IdentityTransaction;
export async function contentWorkflowContract(database: Database) {
  const previous = process.env.AIBEAN_CONTENT_WORKFLOWS;
  process.env.AIBEAN_CONTENT_WORKFLOWS = "1";
  try {
    const admin = "admin-fixture",
      creator = "admin-creator",
      ordinary = "admin-ordinary",
      other = "content-other";
    {
      // Decisions notify only the affected account; failed notification writes
      // must roll back the real moderation update and transactional audit.
      const notificationTool = await createAdminTool(database, admin, {
        ...adminFixtureInput,
        slug: "notification-regression-tool",
      });
      await database.execute(
        sql`INSERT INTO public.tool_reviews(id,tool_id,user_id,rating,body,status) VALUES('notification-review',${notificationTool},${ordinary},4,'Synthetic notification review integrity.','pending')`,
      );
      const [reviewVersion] = resultRows<{ revision: string }>(
        await database.execute(
          sql`SELECT xmin::text AS revision FROM public.tool_reviews WHERE id='notification-review'`,
        ),
      );
      const decision = {
        reviewId: "notification-review",
        revision: reviewVersion.revision,
        status: "approved",
        reason: "Synthetic notification decision",
      };
      const beforeNotices = (await readEngagement(database, ordinary))
        .notifications.length;
      const failing: IdentityDatabase = {
        transaction: (work) =>
          database.transaction((tx) =>
            work({
              execute: async (query) => {
                // Reproduce a SQL failure at the notification insert without
                // changing grants or schema in either PostgreSQL test environment.
                const dialect = await import("drizzle-orm/pg-core");
                if (
                  new dialect.PgDialect()
                    .sqlToQuery(query)
                    .sql.includes("INSERT INTO public.account_notifications")
                )
                  return tx.execute(sql`SELECT 1/0`);
                return tx.execute(query);
              },
            }),
          ),
      };
      await assert.rejects(moderateAdminReview(failing, admin, decision));
      const [unchangedReview] = resultRows<{ status: string }>(
        await database.execute(
          sql`SELECT status FROM public.tool_reviews WHERE id='notification-review'`,
        ),
      );
      assert.equal(unchangedReview.status, "pending");
      assert.equal(
        resultRows(
          await database.execute(
            sql`SELECT id FROM public.audit_logs WHERE entity_id='notification-review'`,
          ),
        ).length,
        0,
      );
      assert.equal(
        (await readEngagement(database, ordinary)).notifications.length,
        beforeNotices,
      );
      await moderateAdminReview(database, admin, decision);
      assert.equal(
        (await readEngagement(database, ordinary)).notifications.length,
        beforeNotices + 1,
      );
      assert.equal(
        (await readEngagement(database, other)).notifications.length,
        0,
      );
      await assert.rejects(moderateAdminReview(database, admin, decision));
      assert.equal(
        (await readEngagement(database, ordinary)).notifications.length,
        beforeNotices + 1,
      );
      process.env.AIBEAN_CONTENT_WORKFLOWS = "";
      await database.transaction((tx) =>
        notifyDecision(
          tx,
          ordinary,
          "Must not be stored before installation activation",
        ),
      );
      process.env.AIBEAN_CONTENT_WORKFLOWS = "1";
      assert.equal(
        (await readEngagement(database, ordinary)).notifications.length,
        beforeNotices + 1,
      );
    }
    const base = {
      title: "Synthetic Skill",
      slug: "synthetic-skill",
      summary: "A synthetic content summary for isolated publishing tests.",
      categoryId: adminFixtureInput.categoryId,
      useCaseIds: [activeUseCases[0].id],
      industryIds: [taxonomy.industries[0].id],
      toolIds: [],
      outcome: "A concrete synthetic outcome with a measurable result.",
      instructions:
        "Follow these synthetic instructions to complete this isolated workflow.",
      prompts: "Synthetic prompt",
      examples: "Synthetic example",
    };
    assert.equal(
      skillInput.safeParse({ ...base, categoryId: "invented" }).success,
      false,
    );
    await assert.rejects(
      saveContent(database, ordinary, "skills", {
        ...base,
        isCreator: true,
        status: "published",
      }),
    );
    await assert.rejects(
      saveContent(database, "admin-vendor-a", "skills", base),
    );
    await assert.rejects(
      saveContent(
        database,
        other,
        "skills",
        { ...base, reason: "Spoofed editorial authority" },
        undefined,
        true,
      ),
    );
    const id = await saveContent(database, creator, "skills", {
      ...base,
      status: "published",
      userId: other,
    });
    let row = (await readContentDetail(
      database,
      creator,
      "skills",
      id,
      "owner",
    ))!;
    assert.equal(row.user_id, creator);
    assert.equal(row.status, "draft");
    assert.equal(
      await readContentDetail(database, other, "skills", id, "owner"),
      undefined,
    );
    assert.equal(
      await readContentDetail(database, null, "skills", base.slug, "public"),
      undefined,
    );
    assert.equal(
      (await readContentList(database, other, "skills", "owner")).rows.length,
      0,
    );
    await assert.rejects(readContentList(database, other, "skills", "admin"));
    await assert.rejects(
      saveContent(database, other, "skills", base, {
        id,
        revision: row.revision,
      }),
    );
    await assert.rejects(
      saveContent(database, creator, "skills", {
        ...base,
        slug: "bad-tool-link",
        toolIds: ["missing"],
      }),
    );
    await submitContent(database, creator, "skills", id, row.revision);
    row = (await readContentDetail(database, creator, "skills", id, "owner"))!;
    const decision = {
      id,
      revision: row.revision,
      decision: "published",
      reason: "Synthetic editorial approval after review",
    };
    await assert.rejects(
      moderateContent(database, creator, "skills", decision),
    );
    await moderateContent(database, admin, "skills", decision);
    await assert.rejects(moderateContent(database, admin, "skills", decision));
    assert.equal(
      (await readContentDetail(database, null, "skills", base.slug, "public"))!
        .status,
      "published",
    );
    const publicCreatorContent = await readCreatorPublicContent(
      database,
      creator,
    );
    assert.equal(
      publicCreatorContent.skills.some((item) => item.id === id),
      true,
    );
    assert.equal(publicCreatorContent.stacks.length, 0);
    const book = {
      ...base,
      title: "Synthetic Playbook",
      slug: "synthetic-playbook",
      audience: "Synthetic workflow authors",
      difficulty: "beginner",
      minutes: 60,
      steps: [
        {
          title: "Step one",
          instruction: "Complete the first concrete synthetic workflow step.",
        },
        {
          title: "Step two",
          instruction:
            "Validate the expected synthetic result of the workflow.",
        },
      ],
      skillIds: [id],
      freeToRead: false,
      paid: true,
    };
    const bookId = await saveContent(database, creator, "playbooks", book);
    assert.equal((await readSkillPlaybooks(database, id)).length, 0);
    let pb = (await readContentDetail(
      database,
      creator,
      "playbooks",
      bookId,
      "owner",
    ))!;
    assert.equal(pb.free_to_read, true);
    await submitContent(database, creator, "playbooks", bookId, pb.revision);
    pb = (await readContentDetail(
      database,
      creator,
      "playbooks",
      bookId,
      "owner",
    ))!;
    await moderateContent(database, admin, "playbooks", {
      id: bookId,
      revision: pb.revision,
      decision: "published",
      reason: "Synthetic free Playbook editorial review",
    });
    assert.equal((await readSkillPlaybooks(database, id))[0]?.id, bookId);
    assert.equal(
      (await readContentDetail(
        database,
        null,
        "playbooks",
        book.slug,
        "public",
      ))!.skillIds[0],
      id,
    );
    await saveProfile(database, ordinary, {
      handle: "ordinary-profile",
      displayName: "Ordinary private profile",
      bio: "This private synthetic profile cannot grant a Creator role.",
      website: "",
      isAdmin: true,
      status: "published",
    });
    const privateProfile = (await readProfile(database, ordinary))!;
    assert.equal(privateProfile.status, "draft");
    await assert.rejects(
      submitProfile(database, ordinary, privateProfile.revision),
    );
    assert.equal(
      await readPublicProfile(database, "ordinary-profile"),
      undefined,
    );
    await saveProfile(database, creator, {
      handle: "synthetic-creator",
      displayName: "Synthetic Creator",
      bio: "An approved Creator's synthetic profile for isolated review tests.",
      website: "https://example.invalid/creator",
    });
    let profile = (await readProfile(database, creator))!;
    await submitProfile(database, creator, profile.revision);
    profile = (await readProfile(database, creator))!;
    assert.equal(
      (await readPublicProfiles(database, { category: base.categoryId })).total,
      0,
    );
    await moderateProfile(database, admin, {
      id: creator,
      revision: profile.revision,
      decision: "published",
      reason: "Synthetic profile editorial approval",
    });
    assert.equal(
      (
        await readPublicProfiles(database, {
          category: base.categoryId,
          industry: base.industryIds[0],
          useCase: base.useCaseIds[0],
        })
      ).rows[0]?.user_id,
      creator,
    );
    await saveContent(database, creator, "skills", {
      ...base,
      slug: "private-context-skill",
      industryIds: [taxonomy.industries[1].id],
    });
    assert.equal(
      (
        await readPublicProfiles(database, {
          industry: taxonomy.industries[1].id,
        })
      ).total,
      0,
    );
    profile = (await readProfile(database, creator))!;
    assert.equal(
      (await readPublicProfile(database, profile.handle))!.user_id,
      creator,
    );
    await assert.rejects(
      saveProfile(
        database,
        creator,
        {
          handle: "renamed-creator",
          displayName: profile.display_name,
          bio: profile.bio,
          website: profile.website,
        },
        profile.revision,
      ),
    );
    const resource = {
      ...base,
      title: "Synthetic campaign",
      slug: "synthetic-campaign",
      destination: "https://example.invalid/resource",
      disclosure: "No affiliate relationship in this synthetic campaign.",
      skillId: id,
      playbookId: bookId,
    };
    const resourceId = await saveContent(
      database,
      creator,
      "resources",
      resource,
    );
    let r = (await readContentDetail(
      database,
      creator,
      "resources",
      resourceId,
      "owner",
    ))!;
    assert.equal(
      await readContentDetail(
        database,
        null,
        "resources",
        resource.slug,
        "public",
      ),
      undefined,
    );
    await submitContent(database, creator, "resources", resourceId, r.revision);
    r = (await readContentDetail(
      database,
      creator,
      "resources",
      resourceId,
      "owner",
    ))!;
    await moderateContent(database, admin, "resources", {
      id: resourceId,
      revision: r.revision,
      decision: "published",
      reason: "Synthetic approved campaign destination",
    });
    const event = {
      ...base,
      title: "Synthetic public Event",
      slug: "synthetic-event",
      description:
        "An isolated synthetic workshop with no real attendees or mail.",
      organizer: "Synthetic organizer",
      eventType: "workshop",
      format: "virtual",
      venue: "",
      city: "",
      country: "",
      virtualUrl: "https://example.invalid/virtual",
      registrationUrl: "https://example.invalid/register",
      startsAt: "2026-11-01T12:00:00Z",
      endsAt: "2026-11-01T13:00:00Z",
      timezone: "UTC",
    };
    assert.equal(
      eventInput.safeParse({ ...event, endsAt: event.startsAt }).success,
      false,
    );
    assert.equal(
      eventInput.safeParse({ ...event, timezone: "Not/A_Zone" }).success,
      false,
    );
    const eventId = await saveContent(database, creator, "events", event);
    let e = (await readContentDetail(
      database,
      creator,
      "events",
      eventId,
      "owner",
    ))!;
    await submitContent(database, creator, "events", eventId, e.revision);
    e = (await readContentDetail(
      database,
      creator,
      "events",
      eventId,
      "owner",
    ))!;
    await moderateContent(database, admin, "events", {
      id: eventId,
      revision: e.revision,
      decision: "published",
      reason: "Synthetic external-registration Event review",
    });
    await saveEntity(database, ordinary, "skills", id);
    await saveEntity(database, ordinary, "skills", id);
    await saveEntity(database, ordinary, "playbooks", bookId);
    await saveEntity(database, ordinary, "events", eventId);
    await followCreator(database, ordinary, creator);
    await followCreator(database, ordinary, creator);
    assert.equal((await readEngagement(database, ordinary)).saves.length, 3);
    assert.equal((await readEngagement(database, other)).saves.length, 0);
    assert.equal((await readEngagement(database, ordinary)).follows.length, 1);
    const notices = (await readEngagement(database, creator)).notifications;
    assert.ok(notices.length >= 5);
    await assert.rejects(markNotificationRead(database, other, notices[0].id));
    await markNotificationRead(database, creator, notices[0].id);
    assert.equal(
      (await readEngagement(database, creator)).notifications.find(
        (n) => n.id === notices[0].id,
      )!.read,
      true,
    );
    const publishedSkill = (await readContentDetail(
      database,
      creator,
      "skills",
      id,
      "owner",
    ))!;
    await saveContent(
      database,
      creator,
      "skills",
      { ...base, title: "PRIVATE REVISED TITLE" },
      { id, revision: publishedSkill.revision },
    );
    assert.equal(
      await readContentDetail(database, null, "skills", base.slug, "public"),
      undefined,
    );
    assert.equal(
      (await readEngagement(database, ordinary)).saves.find(
        (s) => s.target_id === id,
      )!.title,
      "Unavailable saved content",
    );
    await saveEntity(database, ordinary, "skills", id, true);
    assert.equal((await readEngagement(database, ordinary)).saves.length, 2);
    const toolId = await createAdminTool(database, admin, {
      ...adminFixtureInput,
      slug: "content-stack-tool",
    });
    const tool = (await readAdminTool(database, admin, toolId))!;
    await transitionAdminTool(database, admin, {
      toolId,
      revision: tool.revision,
      status: "published",
      reason: "Synthetic content relationship fixture",
    });
    await database.execute(
      sql`INSERT INTO public.stacks(id,user_id,name) VALUES('content-user-stack',${ordinary},'Private stack'),('content-creator-stack',${creator},'Creator stack')`,
    );
    await database.execute(
      sql`INSERT INTO public.stack_tools(stack_id,tool_id) VALUES('content-user-stack',${toolId}),('content-creator-stack',${toolId})`,
    );
    await assert.rejects(
      updateStackSettings(database, other, {
        id: "content-user-stack",
        orderedToolIds: [toolId],
        visibility: "private",
        note: "",
      }),
    );
    await assert.rejects(
      updateStackSettings(database, ordinary, {
        id: "content-user-stack",
        orderedToolIds: [toolId],
        visibility: "public",
        note: "",
      }),
    );
    await assert.rejects(
      updateStackSettings(database, ordinary, {
        id: "content-user-stack",
        orderedToolIds: [],
        visibility: "private",
        note: "",
      }),
    );
    await updateStackSettings(database, ordinary, {
      id: "content-user-stack",
      orderedToolIds: [toolId],
      visibility: "private",
      note: "Ordered private stack",
    });
    await updateStackSettings(database, creator, {
      id: "content-creator-stack",
      orderedToolIds: [toolId],
      visibility: "public",
      note: "Approved Creator stack",
    });
    assert.equal(
      await readPublicStack(database, "content-user-stack"),
      undefined,
    );
    assert.equal(
      (await readPublicStack(database, "content-creator-stack"))!.members
        .length,
      1,
    );
    assert.deepEqual(
      (await readCreatorPublicContent(database, creator)).stacks.map(
        (s) => s.id,
      ),
      ["content-creator-stack"],
    );
    assert.deepEqual(
      (await readToolRelatedContent(database, toolId))
        .filter((i) => i.kind === "collections")
        .map((s) => s.id),
      ["content-creator-stack"],
    );
    assert.equal(
      await readOwnedStackSettings(database, other, "content-user-stack"),
      undefined,
    );
    await database.execute(
      sql`INSERT INTO public.vendor_access(tool_id,user_id) VALUES(${toolId},'admin-vendor-a')`,
    );
    await assert.rejects(
      readVendorAnalytics(database, "admin-vendor-b", toolId),
    );
    assert.equal(
      await registerOutbound(
        database,
        "tools",
        "content-stack-tool",
        "internal",
      ),
      adminFixtureInput.website,
    );
    assert.equal(
      (await readVendorAnalytics(database, "admin-vendor-a", toolId)).rows[0]
        .requests,
      1,
    );
    const placementId = crypto.randomUUID(),
      scheduled = new Date(Date.now() + 86400000).toISOString();
    await database.execute(
      sql`INSERT INTO public.featured_placements(id,user_id,tool_id,sponsor_name,note) VALUES(${placementId},${ordinary},${toolId},'Synthetic sponsor','Synthetic schedule review request')`,
    );
    await assert.rejects(
      moderatePlacement(database, ordinary, {
        id: placementId,
        decision: "approved",
        reason: "Synthetic unauthorized placement",
        scheduledStart: scheduled,
      }),
    );
    await moderatePlacement(database, admin, {
      id: placementId,
      decision: "approved",
      reason: "Synthetic approved placement schedule",
      scheduledStart: scheduled,
    });
    const [scheduledRow] = resultRows<{
      status: string;
      paid_at: unknown;
      days: number;
    }>(
      await database.execute(
        sql`SELECT status,paid_at,extract(epoch FROM (ends_at-starts_at))/86400 AS days FROM public.featured_placements WHERE id=${placementId}`,
      ),
    );
    assert.equal(scheduledRow.status, "approved");
    assert.equal(scheduledRow.paid_at, null);
    assert.equal(Number(scheduledRow.days), 5);
    await assert.rejects(readAdminAnalytics(database, ordinary));
    await assert.rejects(readContentReports(database, "admin-vendor-a", {}));
    await assert.rejects(
      updateSimilarTools(database, ordinary, {
        toolId,
        revision: (await readAdminTool(database, admin, toolId))!.revision,
        relatedIds: [],
        reason: "Synthetic unauthorized relationship",
      }),
    );
    await assert.rejects(
      updateSimilarTools(database, admin, {
        toolId,
        revision: (await readAdminTool(database, admin, toolId))!.revision,
        relatedIds: [toolId],
        reason: "Synthetic invalid self relationship",
      }),
    );
    const before = resultRows<{ n: number }>(
      await database.execute(
        sql`SELECT count(*)::int AS n FROM public.ai_skills`,
      ),
    )[0].n;
    const broken: IdentityDatabase = {
      transaction: (work) =>
        database.transaction((tx) =>
          work({
            execute: async (query) => {
              const t = (
                query as unknown as { queryChunks: unknown[] }
              ).queryChunks
                .map((c) => String((c as { value?: unknown }).value || ""))
                .join("");
              if (t.includes("INSERT INTO public.audit_logs"))
                throw new Error("Synthetic content audit failure");
              return tx.execute(query);
            },
          }),
        ),
    };
    await assert.rejects(
      saveContent(broken, creator, "skills", {
        ...base,
        slug: "rolled-back-skill",
        toolIds: [toolId],
      }),
    );
    assert.equal(
      resultRows<{ n: number }>(
        await database.execute(
          sql`SELECT count(*)::int AS n FROM public.ai_skills`,
        ),
      )[0].n,
      before,
    );
    assert.equal(
      resultRows(
        await database.execute(
          sql`SELECT id FROM public.ai_skills WHERE slug='rolled-back-skill'`,
        ),
      ).length,
      0,
    );
    const reportId = await createContentReport(database, ordinary, {
      kind: "resources",
      id: resourceId,
      reason: "Synthetic abusive destination report",
    });
    assert.equal(
      await createContentReport(database, ordinary, {
        kind: "resources",
        id: resourceId,
        reason: "Duplicate synthetic report",
      }),
      reportId,
    );
    let report = (await readContentReports(database, admin, {})).rows.find(
      (r) => r.id === reportId,
    )!;
    const reportDecision = {
      id: reportId,
      revision: report.revision,
      decision: "actioned",
      reason: "Synthetic Admin removal after review",
    };
    await assert.rejects(
      resolveContentReport(database, "admin-vendor-a", reportDecision),
    );
    await assert.rejects(resolveContentReport(broken, admin, reportDecision));
    assert.equal(
      (await readContentReports(database, admin, {})).rows.find(
        (r) => r.id === reportId,
      )!.status,
      "open",
    );
    assert.ok(
      await readContentDetail(
        database,
        null,
        "resources",
        resource.slug,
        "public",
      ),
    );
    await registerOutbound(database, "resources", resource.slug, "external");
    assert.equal(
      (await readCreatorAnalytics(database, creator))[0].requests,
      1,
    );
    assert.equal((await readCreatorAnalytics(database, other)).length, 0);
    await resolveContentReport(database, admin, reportDecision);
    await assert.rejects(resolveContentReport(database, admin, reportDecision));
    assert.equal(
      await readContentDetail(
        database,
        null,
        "resources",
        resource.slug,
        "public",
      ),
      undefined,
    );
    await assert.rejects(
      registerOutbound(database, "resources", resource.slug, "external"),
    );
    e = (await readContentDetail(
      database,
      creator,
      "events",
      eventId,
      "owner",
    ))!;
    await assert.rejects(
      featureEvent(database, creator, {
        id: eventId,
        revision: e.revision,
        featured: true,
        reason: "Synthetic unauthorized feature",
      }),
    );
    await featureEvent(database, admin, {
      id: eventId,
      revision: e.revision,
      featured: true,
      reason: "Synthetic editorial pick",
    });
    e = (await readContentDetail(
      database,
      creator,
      "events",
      eventId,
      "owner",
    ))!;
    assert.equal(e.featured, true);
    await moderateContent(database, admin, "events", {
      id: eventId,
      revision: e.revision,
      decision: "canceled",
      reason: "Synthetic organizer cancellation",
    });
    assert.equal(
      await readContentDetail(database, null, "events", event.slug, "public"),
      undefined,
    );
    const currentProfile = (await readProfile(database, creator))!;
    await moderateProfile(database, admin, {
      id: creator,
      revision: currentProfile.revision,
      decision: "suspended",
      reason: "Synthetic publishing suspension",
    });
    assert.equal((await readSkillPlaybooks(database, id)).length, 0);
    assert.equal(
      await readPublicProfile(database, "synthetic-creator"),
      undefined,
    );
    assert.equal(
      await readPublicStack(database, "content-creator-stack"),
      undefined,
    );
    const suspended = (await readProfile(database, creator))!;
    await saveProfile(
      database,
      creator,
      {
        handle: suspended.handle,
        displayName: "Private suspended update",
        bio: suspended.bio,
        website: suspended.website || "",
      },
      suspended.revision,
    );
    assert.equal((await readProfile(database, creator))!.status, "suspended");
    await assert.rejects(
      submitProfile(
        database,
        creator,
        (await readProfile(database, creator))!.revision,
      ),
    );
    await assert.rejects(
      saveContent(database, creator, "skills", {
        ...base,
        slug: "suspension-bypass",
      }),
    );
    const following = (await readEngagement(database, ordinary)).follows[0];
    assert.equal(following.display_name, "Unavailable Creator");
    assert.equal(following.handle, null);
    await followCreator(database, ordinary, creator, true);
    assert.equal((await readEngagement(database, ordinary)).follows.length, 0);
    report = (await readContentReports(database, admin, {})).rows[0];
    assert.equal(report.status, "actioned");
  } finally {
    if (previous === undefined) delete process.env.AIBEAN_CONTENT_WORKFLOWS;
    else process.env.AIBEAN_CONTENT_WORKFLOWS = previous;
  }
}
