import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import type {
  IdentityDatabase,
  IdentityTransaction,
} from "../../src/lib/supabase/identity";
import { resultRows } from "../../src/lib/admin/tool-workflows";
import {
  PROPOSED_PRICING,
  pricingConfigSchema,
  feeQuote,
} from "../../src/lib/pricing/config";
import {
  savePricingRelease,
  reviewPricingRelease,
  activatePricingRelease,
  configDigest,
  type PriceProvider,
} from "../../src/lib/pricing/releases";
import {
  entitlements,
  assertQuota,
  quotaUsage,
} from "../../src/lib/pricing/entitlements";
import { saveContent } from "../../src/lib/content/workflows";
import { readContentDetail } from "../../src/lib/content/queries";
import { uploadResource } from "../../src/lib/resources/workflows";
import { taxonomy } from "../../src/lib/catalog/taxonomy";
import {
  preparePayment,
  bindCheckout,
  settleSandboxPayment,
  reconcileSubscription,
  requireSettledRequest,
} from "../../src/lib/admin/commerce-workflows";
import {
  recordPaidMembershipInvoice,
  requestMembershipInterval,
  requestCommercialRefund,
  reviewCommercialRefund,
  executeApprovedSandboxRefund,
} from "../../src/lib/pricing/lifecycle";
import { mutateEngagement } from "../../src/lib/db/engagement-workflows";
type Database = IdentityDatabase & IdentityTransaction;
export async function setupPricingFixtures(db: Database) {
  await db.execute(
    sql`INSERT INTO public.users(id,is_admin,is_creator) VALUES('pr-admin',true,false),('pr-user',false,false),('pr-peer',false,false),('pr-creator',false,true),('pr-vendor',false,false)`,
  );
  await db.execute(
    sql`INSERT INTO public.vendor_access(user_id,tool_id) VALUES('pr-vendor','dis-t2')`,
  );
  await db.execute(
    sql`INSERT INTO public.tool_submissions(id,user_id,proposed) VALUES('pr-submission','pr-creator','{}')`,
  );
  await db.execute(
    sql`INSERT INTO public.vendor_edit_requests(id,user_id,tool_id,base_revision,proposed,note) VALUES('pr-edit','pr-vendor','dis-t2','1','{}','Synthetic pending request')`,
  );
  await db.execute(
    sql`INSERT INTO public.verification_requests(id,user_id,tool_id,base_revision,evidence,note,payment_state) VALUES('pr-verification','pr-vendor','dis-t2','1','[]','Synthetic evidence request','required')`,
  );
}
export function priceProvider(config = PROPOSED_PRICING): PriceProvider {
  return {
    verify: async (id) => {
      const p = config.plans.find(
        (p) =>
          id === "price_" + p.id + "_month" || id === "price_" + p.id + "_year",
      )!;
      return {
        id,
        active: true,
        livemode: false,
        amount: id.endsWith("year") ? p.annual : p.monthly,
        currency: "usd",
        interval: id.endsWith("year") ? "year" : "month",
        intervalCount: 1,
      };
    },
  };
}
export const bindings = {
  creator_pro_month: "price_creator_pro_month",
  creator_pro_year: "price_creator_pro_year",
  vendor_pro_month: "price_vendor_pro_month",
  vendor_pro_year: "price_vendor_pro_year",
};
export async function pricingWorkflowContract(db: Database) {
  const config = structuredClone(PROPOSED_PRICING);
  config.plans.find((p) => p.id === "user_free")!.quotas.stacks = 1;
  await assert.rejects(
    savePricingRelease(db, "pr-user", {
      config,
      reason: "Synthetic ordinary user denial",
    }),
  );
  const release = await savePricingRelease(db, "pr-admin", {
    config,
    reason: "Synthetic commercial configuration",
  });
  await assert.rejects(
    preparePayment(db, "pr-creator", "creator_subscription", "pr-creator", {
      planId: "creator_pro",
      interval: "month",
    }),
  );
  await reviewPricingRelease(db, "pr-admin", {
    id: release,
    revision: 1,
    reason: "Synthetic independent review",
  });
  await assert.rejects(
    savePricingRelease(db, "pr-admin", {
      id: release,
      revision: 2,
      config,
      reason: "Cannot mutate reviewed contract",
    }),
  );
  await assert.rejects(
    activatePricingRelease(
      db,
      "pr-admin",
      { id: release, revision: 2, reason: "Owner approval missing" },
      bindings,
      priceProvider(config),
    ),
  );
  process.env.AIBEAN_PRICING_APPROVED_SHA256 = configDigest(config);
  await assert.rejects(
    activatePricingRelease(
      db,
      "pr-admin",
      { id: release, revision: 2, reason: "Reject live provider prices" },
      bindings,
      {
        verify: async (id) => ({
          ...(await priceProvider(config).verify(id)),
          livemode: true,
        }),
      },
    ),
  );
  await activatePricingRelease(
    db,
    "pr-admin",
    {
      id: release,
      revision: 2,
      reason: "Synthetic approved sandbox activation",
    },
    bindings,
    priceProvider(config),
  );
  await db.execute(
    sql`INSERT INTO public.tool_submissions(id,user_id,proposed,created_at) VALUES('pr-old-month','pr-creator','{}',now()-interval '40 days')`,
  );
  assert.equal(
    await db.transaction((tx) =>
      quotaUsage(tx, "pr-creator", "submissionsMonthly"),
    ),
    1,
  );
  await assert.rejects(
    db.transaction((tx) =>
      assertQuota(tx, "pr-creator", "submissionsMonthly", 10),
    ),
  );
  const skill = {
    title: "Synthetic quota Skill",
    slug: "pr-quota-skill",
    summary: "Synthetic quota description sufficiently long.",
    categoryId: taxonomy.categories[0].id,
    useCaseIds: [],
    industryIds: [],
    toolIds: [],
    outcome: "A synthetic outcome for quota verification.",
    instructions: "Synthetic instructions for quota verification.",
    prompts: "",
    examples: "",
  };
  await assert.rejects(saveContent(db, "pr-user", "skills", skill));
  const skillIds = [];
  for (let i = 0; i < 5; i++)
    skillIds.push(
      await saveContent(db, "pr-creator", "skills", {
        ...skill,
        slug: skill.slug + "-" + i,
      }),
    );
  await assert.rejects(
    saveContent(db, "pr-creator", "skills", {
      ...skill,
      slug: "pr-over-free-quota",
    }),
  );
  const firstSkill = await readContentDetail(
    db,
    "pr-creator",
    "skills",
    skillIds[0],
    "owner",
  );
  for (let i = 0; i < 10; i++)
    await db.execute(
      sql`INSERT INTO public.resource_files(id,user_id,skill_id,object_key,filename,mime,bytes,sha256,scan_status,status) VALUES(${"pr-file-" + i},'pr-creator',${skillIds[0]},${"resources/pr-file-" + i},'synthetic.txt','text/plain',1,${"a".repeat(64)},'clean','pending')`,
    );
  let uploads = 0;
  await assert.rejects(
    uploadResource(
      db,
      "pr-creator",
      { kind: "skills", id: firstSkill!.id, revision: firstSkill!.revision },
      {
        name: "synthetic.txt",
        mime: "text/plain",
        bytes: new TextEncoder().encode("Synthetic safe text"),
      },
      {
        assertPrivate: async () => {},
        upload: async () => {
          uploads++;
        },
        remove: async () => {},
        sign: async () => "",
      },
      { scan: async () => "clean" },
    ),
  );
  assert.equal(uploads, 0, "quota denial occurs before remote upload");
  await db.transaction((tx) => assertQuota(tx, "pr-user", "stacks"));
  await mutateEngagement(db, "pr-user", {
    operation: "create-stack",
    name: "Preserved Free Stack",
  });
  await assert.rejects(
    mutateEngagement(db, "pr-user", {
      operation: "create-stack",
      name: "Over allowance",
    }),
  );
  assert.equal(
    resultRows(
      await db.execute(
        sql`SELECT id FROM public.stacks WHERE user_id='pr-user'`,
      ),
    ).length,
    1,
  );
  await assert.rejects(
    preparePayment(db, "pr-user", "creator_subscription", "pr-user", {
      planId: "creator_pro",
      interval: "month",
    }),
  );
  await assert.rejects(
    preparePayment(db, "pr-user", "vendor_subscription", "pr-user", {
      planId: "vendor_pro",
      interval: "month",
    }),
  );
  const cp = await preparePayment(
    db,
    "pr-creator",
    "creator_subscription",
    "pr-creator",
    { planId: "creator_pro", interval: "month" },
  );
  assert.equal(cp.amount, 1900);
  assert.equal(
    (
      await preparePayment(
        db,
        "pr-creator",
        "creator_subscription",
        "pr-creator",
        { planId: "creator_pro", interval: "month" },
      )
    ).id,
    cp.id,
  );
  await assert.rejects(
    preparePayment(db, "pr-creator", "creator_subscription", "pr-creator", {
      planId: "creator_pro",
      interval: "year",
    }),
  );
  await bindCheckout(db, "pr-creator", cp.id, {
    id: "cs_pr_creator",
    livemode: false,
    amount_total: 1900,
    currency: "usd",
    client_reference_id: cp.id,
  });
  await settleSandboxPayment(db, {
    eventId: "evt_pr_paid",
    livemode: false,
    paymentStatus: "paid",
    sessionId: "cs_pr_creator",
    paymentId: cp.id,
    clientReferenceId: cp.id,
    amount: 1900,
    currency: "usd",
    subscriptionId: "sub_pr_creator",
  });
  const now = Math.floor(Date.now() / 1000),
    end = now + 30 * 86400;
  const [sub] = resultRows<{ id: string }>(
    await db.execute(
      sql`SELECT id FROM public.commerce_subscriptions WHERE stripe_subscription_id='sub_pr_creator'`,
    ),
  );
  await reconcileSubscription(db, {
    id: "evt_pr_active",
    created: now,
    livemode: false,
    subscriptionId: "sub_pr_creator",
    status: "active",
    cancelAtPeriodEnd: false,
    endsAt: end,
  });
  assert(
    !(await db.transaction((tx) => entitlements(tx, "pr-creator"))).plans.some(
      (p) => p.id === "creator_pro",
    ),
    "status alone cannot grant paid benefits",
  );
  const invoice = {
    eventId: "evt_pr_invoice",
    invoiceId: "in_pr_first",
    subscriptionId: "sub_pr_creator",
    created: now,
    livemode: false,
    paid: true,
    currency: "usd",
    amount: 1900,
    priceId: bindings.creator_pro_month,
    periodStart: now - 10,
    periodEnd: end,
  };
  await assert.rejects(
    recordPaidMembershipInvoice(db, { ...invoice, amount: 1 }),
  );
  await assert.rejects(
    recordPaidMembershipInvoice(db, { ...invoice, livemode: true }),
  );
  await recordPaidMembershipInvoice(db, invoice);
  await recordPaidMembershipInvoice(db, invoice);
  const paid = await db.transaction((tx) => entitlements(tx, "pr-creator"));
  assert(paid.plans.some((p) => p.id === "creator_pro"));
  assert.equal(paid.quotas.skills, 50);
  assert.equal(paid.discounts.submission, 2000);
  const expanded = await saveContent(db, "pr-creator", "skills", {
    ...skill,
    slug: "pr-pro-quota",
  });
  assert(expanded);
  assert.equal(
    (await db.transaction((tx) => entitlements(tx, "pr-peer"))).memberships
      .length,
    0,
  );
  const fee = await preparePayment(
    db,
    "pr-creator",
    "submission",
    "pr-submission",
  );
  assert.equal(fee.amount, 3920);
  await bindCheckout(db, "pr-creator", fee.id, {
    id: "cs_pr_fee",
    livemode: false,
    amount_total: fee.amount,
    currency: "usd",
    client_reference_id: fee.id,
  });
  await settleSandboxPayment(db, {
    eventId: "evt_pr_fee_paid",
    livemode: false,
    paymentStatus: "paid",
    sessionId: "cs_pr_fee",
    paymentId: fee.id,
    clientReferenceId: fee.id,
    amount: fee.amount,
    currency: "usd",
  });
  await db.transaction((tx) =>
    requireSettledRequest(tx, "submission", "pr-submission", "pr-creator"),
  );
  const feeRefund = await requestCommercialRefund(db, "pr-creator", {
    paymentId: fee.id,
    reason: "Synthetic unfulfilled submission refund request",
  });
  await reviewCommercialRefund(db, "pr-admin", {
    id: feeRefund,
    revision: 1,
    decision: "approved",
    reason: "Synthetic unfulfilled request refund approval",
  });
  await executeApprovedSandboxRefund(db, "pr-admin", feeRefund, {
    refund: async (i) => ({
      id: "re_pr_fee",
      livemode: false,
      amount: i.amount,
      sessionId: i.sessionId,
      status: "succeeded",
    }),
  });
  await assert.rejects(
    db.transaction((tx) =>
      requireSettledRequest(tx, "submission", "pr-submission", "pr-creator"),
    ),
  );
  assert.equal(
    feeQuote(config, "featured", ["creator_pro", "vendor_pro"]).amount,
    9900,
  );
  await reconcileSubscription(db, {
    id: "evt_pr_due",
    created: now + 1,
    livemode: false,
    subscriptionId: "sub_pr_creator",
    status: "past_due",
    cancelAtPeriodEnd: false,
    endsAt: end,
  });
  assert(
    !(await db.transaction((tx) => entitlements(tx, "pr-creator"))).plans.some(
      (p) => p.id === "creator_pro",
    ),
  );
  await reconcileSubscription(db, {
    id: "evt_pr_recovered",
    created: now + 2,
    livemode: false,
    subscriptionId: "sub_pr_creator",
    status: "active",
    cancelAtPeriodEnd: false,
    endsAt: end,
  });
  const fakeSchedule = {
    schedule: async (i: {
      subscriptionId: string;
      nextPrice: string;
      effectiveAt: number;
    }) => ({
      id: "sched_pr_creator",
      livemode: false,
      subscriptionId: i.subscriptionId,
      priceId: i.nextPrice,
      effectiveAt: i.effectiveAt,
    }),
  };
  await assert.rejects(
    requestMembershipInterval(
      db,
      "pr-peer",
      { id: sub.id, revision: 2, interval: "year" },
      fakeSchedule,
    ),
  );
  await requestMembershipInterval(
    db,
    "pr-creator",
    { id: sub.id, revision: 2, interval: "year" },
    fakeSchedule,
  );
  assert.equal(
    (await db.transaction((tx) => entitlements(tx, "pr-creator")))
      .memberships[0].interval,
    "month",
    "scheduling cannot activate annual benefits",
  );
  await assert.rejects(
    recordPaidMembershipInvoice(db, {
      ...invoice,
      eventId: "evt_pr_annual",
      invoiceId: "in_pr_annual",
      created: now + 3,
      amount: 19000,
      priceId: bindings.creator_pro_year,
      periodStart: end,
      periodEnd: end + 365 * 86400,
    }),
  );
  // Advance only disposable synthetic period metadata, not any system clock.
  await db.execute(
    sql`UPDATE public.membership_changes SET effective_at=now()-interval '11 seconds' WHERE subscription_id=${sub.id}`,
  );
  await db.execute(
    sql`UPDATE public.membership_bindings SET paid_through=now()-interval '1 second',paid_from=now()-interval '1 month' WHERE subscription_id=${sub.id}`,
  );
  await recordPaidMembershipInvoice(db, {
    ...invoice,
    eventId: "evt_pr_annual_now",
    invoiceId: "in_pr_annual_now",
    created: now + 3,
    amount: 19000,
    priceId: bindings.creator_pro_year,
    periodStart: now,
    periodEnd: now + 365 * 86400,
  });
  assert.equal(
    resultRows<{ interval: string }>(
      await db.execute(
        sql`SELECT interval FROM public.membership_bindings WHERE subscription_id=${sub.id}`,
      ),
    )[0].interval,
    "year",
  );
  await recordPaidMembershipInvoice(db, invoice);
  assert.equal(
    resultRows<{ interval: string }>(
      await db.execute(
        sql`SELECT interval FROM public.membership_bindings WHERE subscription_id=${sub.id}`,
      ),
    )[0].interval,
    "year",
    "duplicate old invoice cannot revert a renewal",
  );
  // Restore the currently paid synthetic month for refund/expiry assertions, without hosted/provider access.
  await db.execute(
    sql`UPDATE public.membership_bindings SET paid_from=now()-interval '1 minute',paid_through=now()+interval '1 month' WHERE subscription_id=${sub.id}`,
  );
  await db.execute(
    sql`UPDATE public.commerce_subscriptions SET ends_at=now()-interval '1 second' WHERE id=${sub.id}`,
  );
  assert(
    !(await db.transaction((tx) => entitlements(tx, "pr-creator"))).plans.some(
      (p) => p.id === "creator_pro",
    ),
  );
  await db.execute(
    sql`UPDATE public.commerce_subscriptions SET ends_at=now()+interval '1 month' WHERE id=${sub.id}`,
  );
  await assert.rejects(
    requestCommercialRefund(db, "pr-peer", {
      paymentId: cp.id,
      reason: "Another account cannot request this refund",
    }),
  );
  await db.execute(
    sql`UPDATE public.billing_transactions SET created_at=now()-interval '8 days' WHERE id=${cp.id}`,
  );
  await assert.rejects(
    requestCommercialRefund(db, "pr-creator", {
      paymentId: cp.id,
      reason: "Too late for the request window",
    }),
  );
  await db.execute(
    sql`UPDATE public.billing_transactions SET created_at=now() WHERE id=${cp.id}`,
  );
  const refund = await requestCommercialRefund(db, "pr-creator", {
    paymentId: cp.id,
    reason: "Synthetic seven-day cancellation request",
  });
  await assert.rejects(
    reviewCommercialRefund(db, "pr-user", {
      id: refund,
      revision: 1,
      decision: "approved",
      reason: "Ordinary user denial",
    }),
  );
  await reviewCommercialRefund(db, "pr-admin", {
    id: refund,
    revision: 1,
    decision: "approved",
    reason: "Synthetic full refund approved",
  });
  const refundProvider = {
    refund: async (i: { sessionId: string; amount: number }) => ({
      id: "re_pr_creator",
      livemode: false,
      amount: i.amount,
      sessionId: i.sessionId,
      status: "succeeded",
    }),
  };
  await assert.rejects(
    executeApprovedSandboxRefund(db, "pr-admin", refund, refundProvider),
    "subscription cancellation must precede refund",
  );
  await reconcileSubscription(db, {
    id: "evt_pr_cancel",
    created: now + 4,
    livemode: false,
    subscriptionId: "sub_pr_creator",
    status: "active",
    cancelAtPeriodEnd: true,
    endsAt: end,
  });
  await assert.rejects(
    executeApprovedSandboxRefund(db, "pr-admin", refund, {
      refund: async (i) => ({
        ...(await refundProvider.refund(i)),
        livemode: true,
      }),
    }),
  );
  await executeApprovedSandboxRefund(db, "pr-admin", refund, refundProvider);
  await executeApprovedSandboxRefund(db, "pr-admin", refund, refundProvider);
  await assert.rejects(
    saveContent(db, "pr-creator", "skills", {
      ...skill,
      slug: "pr-over-downgraded-quota",
    }),
  );
  const retained = await readContentDetail(
    db,
    "pr-creator",
    "skills",
    skillIds[0],
    "owner",
  );
  await saveContent(
    db,
    "pr-creator",
    "skills",
    {
      ...skill,
      slug: retained!.slug,
      title: "Edited existing over-limit Skill",
    },
    { id: retained!.id, revision: retained!.revision },
  );
  assert(
    !(await db.transaction((tx) => entitlements(tx, "pr-creator"))).plans.some(
      (p) => p.id === "creator_pro",
    ),
  );
  const [flags] = resultRows<{ is_creator: boolean; is_admin: boolean }>(
    await db.execute(
      sql`SELECT is_creator,is_admin FROM public.users WHERE id='pr-vendor'`,
    ),
  );
  assert.deepEqual(flags, { is_creator: false, is_admin: false });
  // Vendor Pro annual checkout, discount and ordinary capability isolation.
  const vp = await preparePayment(
    db,
    "pr-vendor",
    "vendor_subscription",
    "pr-vendor",
    { planId: "vendor_pro", interval: "year" },
  );
  assert.equal(vp.amount, 39000);
  await bindCheckout(db, "pr-vendor", vp.id, {
    id: "cs_pr_vendor",
    livemode: false,
    amount_total: 39000,
    currency: "usd",
    client_reference_id: vp.id,
  });
  await settleSandboxPayment(db, {
    eventId: "evt_pr_vendor_paid",
    livemode: false,
    paymentStatus: "paid",
    sessionId: "cs_pr_vendor",
    paymentId: vp.id,
    clientReferenceId: vp.id,
    amount: 39000,
    currency: "usd",
    subscriptionId: "sub_pr_vendor",
  });
  await reconcileSubscription(db, {
    id: "evt_pr_vendor_active",
    created: now,
    livemode: false,
    subscriptionId: "sub_pr_vendor",
    status: "active",
    cancelAtPeriodEnd: false,
    endsAt: now + 365 * 86400,
  });
  await recordPaidMembershipInvoice(db, {
    ...invoice,
    eventId: "evt_pr_vendor_invoice",
    invoiceId: "in_pr_vendor",
    subscriptionId: "sub_pr_vendor",
    amount: 39000,
    priceId: bindings.vendor_pro_year,
    periodEnd: now + 365 * 86400,
  });
  const edit = await preparePayment(db, "pr-vendor", "edit", "pr-edit");
  assert.equal(edit.amount, 950);
  // New versions preserve old paid benefits and quote amounts; no reprice of pending checkout.
  const next = structuredClone(config);
  next.version = "pricing-v1.1.0";
  next.plans.find((p) => p.id === "vendor_pro")!.discounts.edit = 1000;
  next.fees.verification = 0;
  const v2 = await savePricingRelease(db, "pr-admin", {
    config: next,
    reason: "Synthetic promotional next version",
  });
  await reviewPricingRelease(db, "pr-admin", {
    id: v2,
    revision: 1,
    reason: "Synthetic new version review",
  });
  process.env.AIBEAN_PRICING_APPROVED_SHA256 = configDigest(next);
  await activatePricingRelease(
    db,
    "pr-admin",
    { id: v2, revision: 2, reason: "Synthetic version activation" },
    bindings,
    priceProvider(next),
  );
  assert.equal(
    (await db.transaction((tx) => entitlements(tx, "pr-vendor"))).discounts
      .edit,
    5000,
    "grandfather existing paid benefits",
  );
  assert.equal(
    (await preparePayment(db, "pr-vendor", "edit", "pr-edit")).amount,
    950,
  );
  const verification = await preparePayment(
    db,
    "pr-vendor",
    "verification",
    "pr-verification",
  );
  assert.equal(verification.amount, 0);
  assert.equal(verification.status, "paid");
  await db.transaction((tx) =>
    requireSettledRequest(tx, "verification", "pr-verification", "pr-vendor"),
  );
  assert.equal(
    resultRows(
      await db.execute(
        sql`SELECT id FROM public.users WHERE is_admin AND id LIKE 'pr-%'`,
      ),
    ).length,
    1,
  );
  // Audit failure rolls back a proposed release, rather than partially changing active settings.
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
  await assert.rejects(
    savePricingRelease(failAudit, "pr-admin", {
      config: { ...next, version: "pricing-v9.9.9" },
      reason: "Synthetic rollback check",
    }),
  );
  assert.equal(
    resultRows(
      await db.execute(
        sql`SELECT id FROM public.pricing_releases WHERE version='pricing-v9.9.9'`,
      ),
    ).length,
    0,
  );
  assert(
    pricingConfigSchema.safeParse({
      ...config,
      fees: { ...config.fees, featured: 1 },
    }).success === false,
  );
}
