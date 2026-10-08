import {
  pgTable,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  primaryKey,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { Tool } from "@/lib/catalog/types";
export const taxonomyRecords = pgTable("taxonomy", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  parentId: text("parent_id"),
  data: jsonb("data").notNull(),
});
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  isAdmin: boolean("is_admin").notNull().default(false),
  isCreator: boolean("is_creator").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const tools = pgTable("tools", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  categoryId: text("category_id")
    .notNull()
    .references(() => taxonomyRecords.id),
  status: text("status").notNull().default("draft"),
  data: jsonb("data").$type<Tool>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const savedTools = pgTable(
  "saved_tools",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    toolId: text("tool_id")
      .notNull()
      .references(() => tools.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.toolId] })],
);
export const stacks = pgTable("stacks", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
});
export const stackTools = pgTable(
  "stack_tools",
  {
    stackId: text("stack_id")
      .notNull()
      .references(() => stacks.id, { onDelete: "cascade" }),
    toolId: text("tool_id")
      .notNull()
      .references(() => tools.id),
  },
  (t) => [primaryKey({ columns: [t.stackId, t.toolId] })],
);
export const reviews = pgTable(
  "tool_reviews",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    toolId: text("tool_id")
      .notNull()
      .references(() => tools.id),
    rating: integer("rating").notNull(),
    body: text("body").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("one_review_per_user_tool").on(t.userId, t.toolId),
    check("rating_range", sql`${t.rating} BETWEEN 1 AND 5`),
  ],
);
export const vendorAccess = pgTable("vendor_access", {
  toolId: text("tool_id")
    .primaryKey()
    .references(() => tools.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
});
export const claims = pgTable("claim_requests", {
  id: text("id").primaryKey(),
  toolId: text("tool_id")
    .notNull()
    .references(() => tools.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  company: text("company").notNull(),
  role: text("role").notNull(),
  proof: text("proof").notNull(),
  status: text("status").notNull().default("payment_required"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  claimId: text("claim_id")
    .notNull()
    .references(() => claims.id)
    .unique(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull().default("pending"),
  stripeSessionId: text("stripe_session_id").unique(),
});
export const webhookReceipts = pgTable("billing_webhook_receipts", {
  id: text("id").primaryKey(),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").notNull(),
  action: text("action").notNull(),
  entityId: text("entity_id").notNull(),
  detail: text("detail").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
});

export const featuredPlacements = pgTable(
  "featured_placements",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    toolId: text("tool_id")
      .notNull()
      .references(() => tools.id),
    sponsorName: text("sponsor_name").notNull(),
    note: text("note").notNull(),
    status: text("status").notNull().default("pending_review"),
    reviewReason: text("review_reason"),
    amount: integer("amount"),
    currency: text("currency"),
    durationDays: integer("duration_days"),
    stripePriceId: text("stripe_price_id"),
    stripeSessionId: text("stripe_session_id").unique(),
    checkoutAttempt: integer("checkout_attempt").notNull().default(0),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    check(
      "featured_status",
      sql`${t.status} IN ('pending_review','approved','rejected','active','suspended')`,
    ),
    check(
      "featured_positive_amount",
      sql`${t.amount} IS NULL OR ${t.amount} > 0`,
    ),
    check(
      "featured_duration",
      sql`${t.durationDays} IS NULL OR ${t.durationDays} BETWEEN 1 AND 365`,
    ),
    check(
      "featured_paid_window",
      sql`${t.status} NOT IN ('active','suspended') OR (${t.paidAt} IS NOT NULL AND ${t.startsAt} IS NOT NULL AND ${t.endsAt} IS NOT NULL AND ${t.endsAt} > ${t.startsAt} AND ${t.amount} IS NOT NULL AND ${t.durationDays} IS NOT NULL)`,
    ),
  ],
);
