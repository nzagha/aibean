import {
  pgTable,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users, tools, stacks } from "./schema";
import {
  accountProfiles,
  creatorResources,
  aiSkills,
  aiPlaybooks,
  publicEvents,
} from "./content-schema";
import { resourceFiles } from "./resource-schema";
import type { Presentation } from "../creator-enhancements/contracts";
const time = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const editor = () => ({
  revision: integer("revision").notNull().default(1),
  updatedBy: text("updated_by")
    .notNull()
    .references(() => users.id),
  updatedAt: time(),
});
export const affiliatePrograms = pgTable(
  "affiliate_programs",
  {
    id: text("id").primaryKey(),
    partner: text("partner").notNull(),
    name: text("name").notNull(),
    hosts: jsonb("hosts").$type<string[]>().notNull(),
    proposedRateBps: integer("proposed_rate_bps").notNull(),
    status: text("status").notNull().default("disabled"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    configSha256: text("config_sha256").notNull(),
    ...editor(),
  },
  (t) => [
    check("affiliate_rate", sql`${t.proposedRateBps} BETWEEN 0 AND 10000`),
    check("affiliate_dates", sql`${t.endsAt}>${t.startsAt}`),
    check("affiliate_status", sql`${t.status} IN ('disabled','enabled')`),
  ],
);
export const affiliateDestinations = pgTable(
  "affiliate_destinations",
  {
    id: text("id").primaryKey(),
    programId: text("program_id")
      .notNull()
      .references(() => affiliatePrograms.id),
    label: text("label").notNull(),
    url: text("url").notNull(),
    parameters: jsonb("parameters").$type<Record<string, string>>().notNull(),
    disclosure: text("disclosure").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    ...editor(),
  },
  (t) => [index("affiliate_destination_program").on(t.programId)],
);
export const affiliateRelationships = pgTable(
  "affiliate_relationships",
  {
    id: text("id").primaryKey(),
    destinationId: text("destination_id")
      .notNull()
      .references(() => affiliateDestinations.id),
    toolId: text("tool_id")
      .notNull()
      .references(() => tools.id),
    campaignId: text("campaign_id").references(() => creatorResources.id),
    creatorShareBps: integer("creator_share_bps").notNull().default(0),
    enabled: boolean("enabled").notNull().default(false),
    ...editor(),
  },
  (t) => [
    uniqueIndex("affiliate_one_context").on(
      t.toolId,
      sql`coalesce(${t.campaignId},'')`,
    ),
    index("affiliate_relationship_destination").on(t.destinationId),
    index("affiliate_relationship_campaign")
      .on(t.campaignId)
      .where(sql`${t.campaignId} IS NOT NULL`),
    check(
      "affiliate_creator_share",
      sql`${t.creatorShareBps} BETWEEN 0 AND 10000`,
    ),
  ],
);
export const affiliateClicks = pgTable(
  "affiliate_clicks",
  {
    id: text("id").primaryKey(),
    relationshipId: text("relationship_id")
      .notNull()
      .references(() => affiliateRelationships.id),
    toolId: text("tool_id")
      .notNull()
      .references(() => tools.id),
    campaignId: text("campaign_id").references(() => creatorResources.id),
    dedupKey: text("dedup_key").notNull().unique(),
    source: text("source").notNull(),
    disclosure: text("disclosure").notNull(),
    programSha256: text("program_sha256").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("affiliate_click_reporting").on(t.relationshipId, t.createdAt),
    index("affiliate_click_tool").on(t.toolId, t.createdAt),
    index("affiliate_click_campaign")
      .on(t.campaignId, t.createdAt)
      .where(sql`${t.campaignId} IS NOT NULL`),
  ],
);
export const affiliateReconciliations = pgTable(
  "affiliate_reconciliations",
  {
    id: text("id").primaryKey(),
    programId: text("program_id")
      .notNull()
      .references(() => affiliatePrograms.id),
    providerEventId: text("provider_event_id").notNull(),
    clickId: text("click_id")
      .notNull()
      .references(() => affiliateClicks.id),
    status: text("status").notNull(),
    conversionCount: integer("conversion_count").notNull(),
    commissionCents: integer("commission_cents").notNull(),
    currency: text("currency").notNull(),
    evidenceSha256: text("evidence_sha256").notNull(),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("affiliate_program_event").on(t.programId, t.providerEventId),
    index("affiliate_reconciliation_click").on(t.clickId),
  ],
);
export const creatorPresentations = pgTable("creator_presentations", {
  userId: text("user_id")
    .primaryKey()
    .references(() => accountProfiles.userId),
  headline: text("headline").notNull(),
  biography: jsonb("biography").$type<Presentation["biography"]>().notNull(),
  socials: jsonb("socials").$type<Presentation["socials"]>().notNull(),
  avatarFileId: text("avatar_file_id").references(() => resourceFiles.id),
  avatarAlt: text("avatar_alt").notNull(),
  coverFileId: text("cover_file_id").references(() => resourceFiles.id),
  coverAlt: text("cover_alt").notNull(),
  updatedAt: time(),
});
export const campaignBlocks = pgTable(
  "campaign_blocks",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => creatorResources.id),
    position: integer("position").notNull(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    toolId: text("tool_id").references(() => tools.id),
    skillId: text("skill_id").references(() => aiSkills.id),
    playbookId: text("playbook_id").references(() => aiPlaybooks.id),
    stackId: text("stack_id").references(() => stacks.id),
    eventId: text("event_id").references(() => publicEvents.id),
    resourceId: text("resource_id").references(() => creatorResources.id),
    fileId: text("file_id").references(() => resourceFiles.id),
  },
  (t) => [
    uniqueIndex("campaign_block_position").on(t.campaignId, t.position),
    check("campaign_block_position_bound", sql`${t.position} BETWEEN 0 AND 39`),
    check(
      "campaign_block_parent",
      sql`${t.resourceId} IS NULL OR ${t.resourceId}<>${t.campaignId}`,
    ),
  ],
);
export const creatorRevisionHistory = pgTable(
  "creator_revision_history",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    entityId: text("entity_id").notNull(),
    revision: text("revision").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("creator_revision_unique").on(t.kind, t.entityId, t.revision),
    index("creator_revision_entity").on(t.kind, t.entityId, t.createdAt),
  ],
);
