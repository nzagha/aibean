import {
  pgTable,
  text,
  integer,
  timestamp,
  check,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./schema";
import { aiSkills, aiPlaybooks, creatorResources } from "./content-schema";
export const resourceFiles = pgTable(
  "resource_files",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    skillId: text("skill_id").references(() => aiSkills.id),
    playbookId: text("playbook_id").references(() => aiPlaybooks.id),
    resourceId: text("resource_id").references(() => creatorResources.id),
    objectKey: text("object_key").notNull().unique(),
    filename: text("filename").notNull(),
    mime: text("mime").notNull(),
    bytes: integer("bytes").notNull(),
    sha256: text("sha256").notNull(),
    scanStatus: text("scan_status").notNull(),
    status: text("status").notNull().default("uploading"),
    reviewerId: text("reviewer_id").references(() => users.id),
    reviewReason: text("review_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "file_one_parent",
      sql`num_nonnulls(${t.skillId},${t.playbookId},${t.resourceId})=1`,
    ),
    check(
      "file_status",
      sql`${t.status} IN ('uploading','pending','approved','rejected','disabled','failed')`,
    ),
    check("file_scan", sql`${t.scanStatus}='clean'`),
    check("file_checksum", sql`${t.sha256} ~ '^[0-9a-f]{64}$'`),
    check("file_size", sql`${t.bytes}>0 AND ${t.bytes}<=5242880`),
    index("file_queue").on(t.status, t.createdAt),
  ],
);
