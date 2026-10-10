import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users, tools, claims } from "./schema";
import type { VendorEditInput } from "../admin/review-contracts";

// Forward proposal only: db/proposals/admin-review-v1.sql. Never regenerated
// into the two already-applied baseline migrations. Hosted installation pending.
const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
const decision = () => ({
  reviewerId: text("reviewer_id").references(() => users.id),
  reviewReason: text("review_reason"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});
export const creatorApplications = pgTable(
  "creator_applications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id),
    name: text("name").notNull(),
    bio: text("bio").notNull(),
    links: jsonb("links").$type<string[]>().notNull(),
    status: text("status").notNull().default("pending"),
    ...decision(),
    ...timestamps(),
  },
  (t) => [
    check(
      "creator_application_status",
      sql`${t.status} IN ('pending','approved','rejected','suspension_requested')`,
    ),
  ],
);
export const creatorCapabilityRequests = pgTable(
  "creator_capability_requests",
  {
    id: text("id").primaryKey(),
    applicationId: text("application_id")
      .notNull()
      .references(() => creatorApplications.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    desiredState: text("desired_state").notNull(),
    requestedBy: text("requested_by")
      .notNull()
      .references(() => users.id),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("pending_operator"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    appliedBy: text("applied_by"),
  },
  (t) => [
    check(
      "creator_capability_state",
      sql`${t.desiredState} IN ('enabled','disabled')`,
    ),
    check(
      "creator_capability_status",
      sql`${t.status} IN ('pending_operator','applied','cancelled')`,
    ),
  ],
);
export const vendorEditRequests = pgTable(
  "vendor_edit_requests",
  {
    id: text("id").primaryKey(),
    toolId: text("tool_id")
      .notNull()
      .references(() => tools.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    baseRevision: text("base_revision").notNull(),
    proposed: jsonb("proposed").$type<VendorEditInput>().notNull(),
    note: text("note").notNull(),
    status: text("status").notNull().default("pending"),
    ...decision(),
    ...timestamps(),
    paymentState: text("payment_state").notNull().default("required"),
  },
  (t) => [
    uniqueIndex("one_pending_vendor_edit")
      .on(t.toolId)
      .where(sql`${t.status}='pending'`),
    check(
      "vendor_edit_status",
      sql`${t.status} IN ('pending','approved','rejected')`,
    ),
  ],
);
export const verificationRequests = pgTable(
  "verification_requests",
  {
    id: text("id").primaryKey(),
    toolId: text("tool_id")
      .notNull()
      .references(() => tools.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    baseRevision: text("base_revision").notNull(),
    evidence: jsonb("evidence").$type<string[]>().notNull(),
    note: text("note").notNull(),
    status: text("status").notNull().default("pending"),
    ...decision(),
    ...timestamps(),
    paymentState: text("payment_state").notNull().default("required"),
  },
  (t) => [
    uniqueIndex("one_pending_verification_request")
      .on(t.toolId)
      .where(sql`${t.status}='pending'`),
    check(
      "verification_request_status",
      sql`${t.status} IN ('pending','approved','rejected')`,
    ),
  ],
);
export const claimDisputes = pgTable(
  "claim_disputes",
  {
    id: text("id").primaryKey(),
    toolId: text("tool_id")
      .notNull()
      .references(() => tools.id),
    claimId: text("claim_id")
      .notNull()
      .references(() => claims.id),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    openedBy: text("opened_by")
      .notNull()
      .references(() => users.id),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("open"),
    decision: text("decision"),
    ...decision(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("one_open_tool_dispute")
      .on(t.toolId)
      .where(sql`${t.status}='open'`),
    check("claim_dispute_status", sql`${t.status} IN ('open','resolved')`),
  ],
);
