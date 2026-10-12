import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type {
  AnalyticsInput,
  AnalyticsSession,
} from "../discovery/analytics-contracts";
import type { FollowKind } from "../discovery/targets";
import { users, tools, taxonomyRecords } from "./schema";
import {
  aiSkills,
  aiPlaybooks,
  publicEvents,
  creatorResources,
} from "./content-schema";
export const savedComparisons = pgTable(
  "saved_comparisons",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    context: jsonb("context")
      .$type<{ category?: string; useCase?: string; industry?: string }>()
      .notNull()
      .default({}),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("comparison_owner").on(t.userId, t.createdAt),
    check("comparison_name", sql`length(${t.name}) BETWEEN 2 AND 80`),
    check("comparison_context", sql`jsonb_typeof(${t.context})='object'`),
    check("comparison_revision", sql`${t.revision}>0`),
  ],
);
export const comparisonTools = pgTable(
  "comparison_tools",
  {
    comparisonId: text("comparison_id")
      .notNull()
      .references(() => savedComparisons.id, { onDelete: "cascade" }),
    toolId: text("tool_id")
      .notNull()
      .references(() => tools.id),
    position: integer("position").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.comparisonId, t.toolId] }),
    uniqueIndex("comparison_order").on(t.comparisonId, t.position),
    check("comparison_position", sql`${t.position} BETWEEN 0 AND 3`),
  ],
);
export const accountFollows = pgTable(
  "account_follows",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    kind: text("kind").$type<FollowKind>().notNull(),
    targetId: text("target_id").notNull(),
    toolId: text("tool_id").references(() => tools.id),
    skillId: text("skill_id").references(() => aiSkills.id),
    playbookId: text("playbook_id").references(() => aiPlaybooks.id),
    creatorId: text("creator_id").references(() => users.id),
    eventId: text("event_id").references(() => publicEvents.id),
    industryId: text("industry_id").references(() => taxonomyRecords.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.kind, t.targetId] }),
    index("follow_target").on(t.kind, t.targetId, t.userId),
    index("follow_owner").on(t.userId, t.createdAt, t.kind, t.targetId),
    check(
      "follow_one_target",
      sql`num_nonnulls(${t.toolId},${t.skillId},${t.playbookId},${t.creatorId},${t.eventId},${t.industryId})=1`,
    ),
    check(
      "follow_self",
      sql`${t.kind}<>'creators' OR ${t.userId}<>${t.creatorId}`,
    ),
    check(
      "follow_target_kind",
      sql`CASE ${t.kind} WHEN 'tools' THEN ${t.targetId}=${t.toolId} WHEN 'skills' THEN ${t.targetId}=${t.skillId} WHEN 'playbooks' THEN ${t.targetId}=${t.playbookId} WHEN 'creators' THEN ${t.targetId}=${t.creatorId} WHEN 'events' THEN ${t.targetId}=${t.eventId} WHEN 'industries' THEN ${t.targetId}=${t.industryId} ELSE false END IS TRUE`,
    ),
  ],
);
export const analyticsEventRecords = pgTable(
  "analytics_events",
  {
    id: text("id").primaryKey(),
    event: text("event").$type<AnalyticsInput["event"]>().notNull(),
    kind: text("kind").$type<AnalyticsInput["kind"]>().notNull(),
    targetId: text("target_id").notNull(),
    sessionHash: text("session_hash").notNull(),
    dedupKey: text("dedup_key").notNull().unique(),
    source: text("source").$type<AnalyticsSession["source"]>().notNull(),
    campaignId: text("campaign_id").references(() => creatorResources.id),
    metadata: jsonb("metadata")
      .$type<NonNullable<AnalyticsInput["filters"]>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("analytics_retention").on(t.createdAt),
    check(
      "analytics_event",
      sql`${t.event} IN ('search','discovery_view','tool_view','save','comparison_add','comparison_complete','stack_add','skill_view','playbook_view','resource_view','creator_view','event_view','resource_download','event_outbound','tool_outbound','resource_outbound')`,
    ),
    check(
      "analytics_kind",
      sql`${t.kind} IN ('tools','skills','playbooks','resources','creators','events','discovery')`,
    ),
    check("analytics_target_id", sql`length(${t.targetId}) BETWEEN 1 AND 100`),
    check("analytics_session", sql`${t.sessionHash} ~ '^[0-9a-f]{64}$'`),
    check("analytics_dedup", sql`${t.dedupKey} ~ '^[0-9a-f]{64}$'`),
    check(
      "analytics_source",
      sql`${t.source} IN ('direct','directory','comparison','stack','creator','resource','event','featured')`,
    ),
    check("analytics_metadata", sql`jsonb_typeof(${t.metadata})='object'`),
    index("analytics_target").on(t.kind, t.targetId, t.createdAt, t.event),
    index("analytics_campaign")
      .on(t.campaignId, t.createdAt)
      .where(sql`${t.campaignId} IS NOT NULL`),
  ],
);
