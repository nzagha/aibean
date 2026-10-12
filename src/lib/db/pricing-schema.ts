import {
  pgTable,
  text,
  integer,
  bigint,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./schema";
import {
  billingTransactions,
  commerceSubscriptions,
} from "./admin-commerce-schema";
import type { PricingConfig, PlanId } from "../pricing/config";
const created = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
export const pricingReleases = pgTable(
  "pricing_releases",
  {
    id: text("id").primaryKey(),
    version: text("version").notNull().unique(),
    config: jsonb("config").$type<PricingConfig>().notNull(),
    configSha256: text("config_sha256").notNull(),
    status: text("status")
      .$type<"proposed" | "reviewed" | "active" | "retired">()
      .notNull()
      .default("proposed"),
    revision: integer("revision").notNull().default(1),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    reviewedBy: text("reviewed_by").references(() => users.id),
    reviewReason: text("review_reason"),
    providerPrices: jsonb("provider_prices")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex("one_active_pricing")
      .on(sql`(true)`)
      .where(sql`${t.status}='active'`),
    check("release_hash", sql`${t.configSha256} ~ '^[a-f0-9]{64}$'`),
    check("release_revision", sql`${t.revision}>0`),
    check("release_config", sql`jsonb_typeof(${t.config})='object'`),
    check(
      "release_review",
      sql`${t.status}='proposed' OR ${t.reviewedBy} IS NOT NULL AND ${t.reviewReason} IS NOT NULL`,
    ),
  ],
);
export const pricingQuotes = pgTable(
  "pricing_quotes",
  {
    paymentId: text("payment_id")
      .primaryKey()
      .references(() => billingTransactions.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    releaseId: text("release_id")
      .notNull()
      .references(() => pricingReleases.id),
    planId: text("plan_id").$type<PlanId>(),
    interval: text("interval").$type<"month" | "year">(),
    base: integer("base").notNull(),
    discount: integer("discount").notNull(),
    amount: integer("amount").notNull(),
    beneficiaryPlans: jsonb("beneficiary_plans")
      .$type<PlanId[]>()
      .notNull()
      .default([]),
    configSha256: text("config_sha256").notNull(),
    createdAt: created(),
  },
  (t) => [
    index("pricing_quote_owner").on(t.userId, t.createdAt.desc()),
    check(
      "quote_amount",
      sql`${t.amount}=${t.base}-${t.discount} AND ${t.base}>=0 AND ${t.discount}>=0 AND ${t.discount}<=${t.base}`,
    ),
  ],
);
export const membershipBindings = pgTable(
  "membership_bindings",
  {
    subscriptionId: text("subscription_id")
      .primaryKey()
      .references(() => commerceSubscriptions.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    releaseId: text("release_id")
      .notNull()
      .references(() => pricingReleases.id),
    paymentId: text("payment_id")
      .notNull()
      .unique()
      .references(() => pricingQuotes.paymentId),
    planId: text("plan_id").$type<"creator_pro" | "vendor_pro">().notNull(),
    interval: text("interval").$type<"month" | "year">().notNull(),
    priceId: text("price_id").notNull(),
    paidFrom: timestamp("paid_from", { withTimezone: true }),
    paidThrough: timestamp("paid_through", { withTimezone: true }),
    lastInvoiceId: text("last_invoice_id").unique(),
    providerEventAt: bigint("provider_event_at", { mode: "number" })
      .notNull()
      .default(0),
    revision: integer("revision").notNull().default(1),
  },
  (t) => [
    index("membership_owner").on(t.userId, t.planId),
    check(
      "paid_period",
      sql`(${t.paidFrom} IS NULL)=(${t.paidThrough} IS NULL) AND (${t.paidThrough} IS NULL OR ${t.paidThrough}>${t.paidFrom})`,
    ),
  ],
);
export const membershipChanges = pgTable(
  "membership_changes",
  {
    id: text("id").primaryKey(),
    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => membershipBindings.subscriptionId),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    releaseId: text("release_id")
      .notNull()
      .references(() => pricingReleases.id),
    planId: text("plan_id").$type<"creator_pro" | "vendor_pro">().notNull(),
    interval: text("interval").$type<"month" | "year">().notNull(),
    priceId: text("price_id").notNull(),
    status: text("status")
      .$type<"prepared" | "scheduled" | "applied">()
      .notNull()
      .default("prepared"),
    providerScheduleId: text("provider_schedule_id").unique(),
    expectedRevision: integer("expected_revision").notNull(),
    effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex("one_open_membership_change")
      .on(t.subscriptionId)
      .where(sql`${t.status}<>'applied'`),
  ],
);
export const pricingRefunds = pgTable(
  "pricing_refunds",
  {
    id: text("id").primaryKey(),
    paymentId: text("payment_id")
      .notNull()
      .unique()
      .references(() => billingTransactions.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    amount: integer("amount").notNull(),
    status: text("status")
      .$type<"requested" | "approved" | "rejected" | "refunded">()
      .notNull()
      .default("requested"),
    reason: text("reason").notNull(),
    reviewerId: text("reviewer_id").references(() => users.id),
    reviewReason: text("review_reason"),
    providerRefundId: text("provider_refund_id").unique(),
    revision: integer("revision").notNull().default(1),
    createdAt: created(),
  },
  (t) => [
    index("pricing_refund_queue").on(t.status, t.createdAt, t.id),
    check("refund_amount", sql`${t.amount}>0`),
    check(
      "refund_review",
      sql`${t.status}='requested' OR ${t.reviewerId} IS NOT NULL AND ${t.reviewReason} IS NOT NULL`,
    ),
    check(
      "refund_confirmed",
      sql`${t.status}<>'refunded' OR ${t.providerRefundId} IS NOT NULL`,
    ),
  ],
);
