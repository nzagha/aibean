import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  check,
  primaryKey,
  index,
  date,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users, tools, stacks, taxonomyRecords, reviews } from "./schema";
const times = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
const review = () => ({
  reviewerId: text("reviewer_id").references(() => users.id),
  reviewReason: text("review_reason"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
});
const authored = () => ({
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  categoryId: text("category_id")
    .notNull()
    .references(() => taxonomyRecords.id),
  useCaseIds: jsonb("use_case_ids").$type<string[]>().notNull(),
  industryIds: jsonb("industry_ids").$type<string[]>().notNull(),
  status: text("status").notNull().default("draft"),
  ...review(),
  ...times(),
});
export const accountProfiles = pgTable(
  "account_profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id),
    handle: text("handle").notNull().unique(),
    displayName: text("display_name").notNull(),
    bio: text("bio").notNull(),
    website: text("website"),
    status: text("status").notNull().default("draft"),
    ...review(),
    ...times(),
  },
  (t) => [
    check(
      "profile_status",
      sql`${t.status} IN ('draft','pending','published','rejected','suspended')`,
    ),
  ],
);
// Separate first-class models: Skills and Playbooks never share a content blob.
export const aiSkills = pgTable(
  "ai_skills",
  {
    ...authored(),
    outcome: text("outcome").notNull(),
    instructions: text("instructions").notNull(),
    prompts: text("prompts").notNull(),
    examples: text("examples").notNull(),
  },
  (t) => [
    check(
      "skill_status",
      sql`${t.status} IN ('draft','pending','published','rejected','archived')`,
    ),
    index("skill_queue").on(t.status, t.createdAt),
  ],
);
export const aiPlaybooks = pgTable(
  "ai_playbooks",
  {
    ...authored(),
    outcome: text("outcome").notNull(),
    audience: text("audience").notNull(),
    difficulty: text("difficulty").notNull(),
    minutes: integer("minutes").notNull(),
    steps: jsonb("steps")
      .$type<{ title: string; instruction: string }[]>()
      .notNull(),
    examples: text("examples").notNull(),
    freeToRead: boolean("free_to_read").notNull().default(true),
  },
  (t) => [
    check(
      "playbook_status",
      sql`${t.status} IN ('draft','pending','published','rejected','archived')`,
    ),
    check("playbook_free", sql`${t.freeToRead}=true`),
    check(
      "playbook_difficulty",
      sql`${t.difficulty} IN ('beginner','intermediate','advanced')`,
    ),
    check("playbook_minutes", sql`${t.minutes}>0`),
    index("playbook_queue").on(t.status, t.createdAt),
  ],
);
export const creatorResources = pgTable(
  "creator_resources",
  {
    ...authored(),
    destination: text("destination").notNull(),
    disclosure: text("disclosure").notNull(),
    skillId: text("skill_id").references(() => aiSkills.id),
    playbookId: text("playbook_id").references(() => aiPlaybooks.id),
  },
  (t) => [
    check(
      "resource_status",
      sql`${t.status} IN ('draft','pending','published','rejected','archived')`,
    ),
    index("resource_queue").on(t.status, t.createdAt),
  ],
);
export const publicEvents = pgTable(
  "public_events",
  {
    ...authored(),
    description: text("description").notNull(),
    organizer: text("organizer").notNull(),
    eventType: text("event_type").notNull(),
    format: text("format").notNull(),
    venue: text("venue").notNull(),
    city: text("city").notNull(),
    country: text("country").notNull(),
    virtualUrl: text("virtual_url"),
    registrationUrl: text("registration_url").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    timezone: text("timezone").notNull(),
    featured: boolean("featured").notNull().default(false),
  },
  (t) => [
    check(
      "event_status",
      sql`${t.status} IN ('draft','pending','published','rejected','archived','canceled')`,
    ),
    check("event_dates", sql`${t.endsAt}>${t.startsAt}`),
    check("event_format", sql`${t.format} IN ('in_person','virtual','hybrid')`),
    index("event_queue").on(t.status, t.startsAt),
  ],
);
export const skillTools = pgTable(
  "skill_tools",
  {
    skillId: text("skill_id")
      .notNull()
      .references(() => aiSkills.id),
    toolId: text("tool_id")
      .notNull()
      .references(() => tools.id),
  },
  (t) => [primaryKey({ columns: [t.skillId, t.toolId] })],
);
export const playbookTools = pgTable(
  "playbook_tools",
  {
    playbookId: text("playbook_id")
      .notNull()
      .references(() => aiPlaybooks.id),
    toolId: text("tool_id")
      .notNull()
      .references(() => tools.id),
  },
  (t) => [primaryKey({ columns: [t.playbookId, t.toolId] })],
);
export const playbookSkills = pgTable(
  "playbook_skills",
  {
    playbookId: text("playbook_id")
      .notNull()
      .references(() => aiPlaybooks.id),
    skillId: text("skill_id")
      .notNull()
      .references(() => aiSkills.id),
  },
  (t) => [primaryKey({ columns: [t.playbookId, t.skillId] })],
);
export const eventTools = pgTable(
  "event_tools",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => publicEvents.id),
    toolId: text("tool_id")
      .notNull()
      .references(() => tools.id),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.toolId] })],
);
export const savedEntities = pgTable(
  "saved_entities",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    skillId: text("skill_id").references(() => aiSkills.id),
    playbookId: text("playbook_id").references(() => aiPlaybooks.id),
    eventId: text("event_id").references(() => publicEvents.id),
    ...times(),
  },
  (t) => [
    check(
      "saved_one_target",
      sql`num_nonnulls(${t.skillId},${t.playbookId},${t.eventId})=1`,
    ),
    index("saved_entities_owner").on(t.userId, t.createdAt),
  ],
);
export const creatorFollows = pgTable(
  "creator_follows",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    creatorId: text("creator_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.creatorId] }),
    check("follow_not_self", sql`${t.userId}<>${t.creatorId}`),
  ],
);
export const accountNotifications = pgTable(
  "account_notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    message: text("message").notNull(),
    read: boolean("read").notNull().default(false),
    ...times(),
  },
  (t) => [index("notification_owner").on(t.userId, t.createdAt)],
);
export const stackSettings = pgTable(
  "stack_settings",
  {
    stackId: text("stack_id")
      .primaryKey()
      .references(() => stacks.id, { onDelete: "cascade" }),
    visibility: text("visibility").notNull().default("private"),
    orderedToolIds: jsonb("ordered_tool_ids").$type<string[]>().notNull(),
    note: text("note").notNull(),
    ...times(),
  },
  (t) => [
    check("stack_visibility", sql`${t.visibility} IN ('private','public')`),
  ],
);
export const contentReports = pgTable(
  "content_reports",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    reviewId: text("review_id").references(() => reviews.id),
    skillId: text("skill_id").references(() => aiSkills.id),
    playbookId: text("playbook_id").references(() => aiPlaybooks.id),
    resourceId: text("resource_id").references(() => creatorResources.id),
    eventId: text("event_id").references(() => publicEvents.id),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("open"),
    reviewerId: text("reviewer_id").references(() => users.id),
    reviewReason: text("review_reason"),
    ...times(),
  },
  (t) => [
    check(
      "report_one_target",
      sql`num_nonnulls(${t.reviewId},${t.skillId},${t.playbookId},${t.resourceId},${t.eventId})=1`,
    ),
    check("report_status", sql`${t.status} IN ('open','dismissed','actioned')`),
    index("report_queue").on(t.status, t.createdAt),
  ],
);
// Aggregated explicit outbound requests only: no identities, IPs, referrer
// URLs, personal records or inferred unique visitors are stored here.
export const engagementCounters = pgTable(
  "engagement_counters",
  {
    kind: text("kind").notNull(),
    entityId: text("entity_id").notNull(),
    day: date("day").notNull(),
    source: text("source").notNull(),
    requests: integer("requests").notNull().default(1),
  },
  (t) => [
    primaryKey({ columns: [t.kind, t.entityId, t.day, t.source] }),
    check("counter_kind", sql`${t.kind} IN ('tools','resources','events')`),
    check(
      "counter_source",
      sql`${t.source} IN ('internal','direct','external')`,
    ),
    check("counter_positive", sql`${t.requests}>0`),
  ],
);
