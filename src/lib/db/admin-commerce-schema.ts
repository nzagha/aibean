import {
  pgTable,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  bigint,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users, tools } from "./schema";
import type { AdminToolInput } from "../admin/contracts";
const times = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
// Forward-only proposal; never overwrite baseline Drizzle snapshots/history.
export const billingProducts = pgTable(
  "billing_products",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("usd"),
    active: boolean("active").notNull().default(false),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "product_kind",
      sql`${t.id} IN ('submission','edit','verification','vendor_subscription','creator_subscription')`,
    ),
    check(
      "product_amount",
      sql`${t.amount} BETWEEN 0 AND 1000000 AND (${t.amount}>0 OR ${t.id}='verification')`,
    ),
    check("product_currency", sql`${t.currency}='usd'`),
  ],
);
export const toolSubmissions = pgTable("tool_submissions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  proposed: jsonb("proposed").$type<AdminToolInput>().notNull(),
  status: text("status").notNull().default("pending"),
  toolId: text("tool_id").references(() => tools.id),
  reviewerId: text("reviewer_id").references(() => users.id),
  reviewReason: text("review_reason"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  ...times(),
});
export const billingTransactions = pgTable(
  "billing_transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    productId: text("product_id")
      .notNull()
      .references(() => billingProducts.id),
    kind: text("kind").notNull(),
    subjectId: text("subject_id").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull().default("created"),
    stripeSessionId: text("stripe_session_id").unique(),
    ...times(),
  },
  (t) => [
    uniqueIndex("billing_subject").on(t.kind, t.subjectId),
    check("transaction_product", sql`${t.kind}=${t.productId}`),
    check(
      "transaction_amount",
      sql`${t.amount} BETWEEN 0 AND 1000000 AND (${t.amount}>0 OR ${t.kind}='verification')`,
    ),
  ],
);
export const commerceSubscriptions = pgTable("commerce_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  productId: text("product_id")
    .notNull()
    .references(() => billingProducts.id),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  status: text("status").notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  providerEventAt: bigint("provider_event_at", { mode: "number" })
    .notNull()
    .default(0),
  ...times(),
});
