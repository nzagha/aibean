import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import type {
  IdentityDatabase,
  IdentityTransaction,
} from "../../src/lib/supabase/identity";
import { adminFixtureInput } from "./admin-workflow-contract";
import {
  editTaxonomy,
  readTaxonomy,
  updateOrganicRanking,
} from "../../src/lib/admin/catalog-controls";
import {
  createAdminTool,
  resultRows,
  updateAdminTrust,
} from "../../src/lib/admin/tool-workflows";
import { readAdminTool } from "../../src/lib/admin/queries";
import {
  saveProduct,
  submitToolProposal,
  reviewToolSubmission,
  preparePayment,
  bindCheckout,
  settleSandboxPayment,
  reconcileSubscription,
} from "../../src/lib/admin/commerce-workflows";
import {
  readOwnCommerce,
  readCommercialAdmin,
} from "../../src/lib/admin/commerce-queries";
import { inspectCommerceStorage } from "../../src/lib/admin/commerce-storage";
import {
  submitVendorEdit,
  submitVerificationRequest,
  reviewVendorRequest,
} from "../../src/lib/admin/review-workflows";
import { filterTools } from "../../src/lib/catalog/filter";
import { rankingWeightsInput } from "../../src/lib/admin/catalog-controls";
import {
  requestSandboxCancellation,
  type SubscriptionProvider,
} from "../../src/lib/admin/subscription-management";
type Database = IdentityDatabase & IdentityTransaction;
const actor = "admin-fixture",
  user = "admin-creator",
  vendor = "admin-vendor-a";
export async function catalogControlsContract(database: Database) {
  const [category] = await readTaxonomy(database, actor);
  const input = {
    id: category.id,
    revision: category.revision,
    name: "Edited synthetic label",
    description: "Synthetic explanatory metadata",
    reason: "Operator-reviewed display label",
    slug: "smuggled",
    parentId: "smuggled",
  };
  for (const ordinary of [user, "admin-ordinary", vendor])
    await assert.rejects(editTaxonomy(database, ordinary, input));
  await editTaxonomy(database, actor, input);
  const after = (await readTaxonomy(database, actor)).find(
    (c) => c.id === category.id,
  )!;
  assert.equal(after.slug, category.slug);
  assert.equal(after.parent_id, category.parent_id);
  assert.equal(after.kind, category.kind);
  assert.equal(after.name, input.name);
  await assert.rejects(editTaxonomy(database, actor, input));
  await assert.rejects(
    editTaxonomy(database, actor, { ...input, id: "UC-035" }),
  );
  const id = await createAdminTool(database, actor, {
    ...adminFixtureInput,
    slug: "organic-synthetic",
  });
  const tool = (await readAdminTool(database, actor, id))!;
  const ranking = {
    toolId: id,
    revision: tool.revision,
    reason: "Synthetic explainable ranking",
    editorial: 80,
    context: 60,
    verification: 0,
    completeness: 80,
    freshness: 40,
    reviews: 0,
    popularity: 0,
    engagement: 0,
    risk: 2,
    adjustment: 1,
    paid: 99999,
    featured: true,
  };
  await assert.rejects(updateOrganicRanking(database, user, ranking));
  const result = await updateOrganicRanking(database, actor, ranking);
  assert.equal(result.score, 42);
  await assert.rejects(updateOrganicRanking(database, actor, ranking));
  let current = (await readAdminTool(database, actor, id))!;
  assert.equal(current.data.verified, false);
  assert.equal(current.data.claimed, false);
  assert.equal(current.data.organicRanking?.factors.editorial, 80);
  assert.equal("paid" in current.data.organicRanking!.factors, false);
  assert.equal(
    rankingWeightsInput.safeParse({
      editorial: 1,
      context: 1,
      verification: 0,
      completeness: 0,
      freshness: 0,
      reviews: 0,
      popularity: 0,
      engagement: 0,
    }).success,
    false,
  );
  const custom = {
    editorial: 0.5,
    context: 0.5,
    verification: 0,
    completeness: 0,
    freshness: 0,
    reviews: 0,
    popularity: 0,
    engagement: 0,
  };
  const ranked = await updateOrganicRanking(database, actor, {
    ...ranking,
    revision: current.revision,
    weights: custom,
  });
  assert.equal(ranked.score, 69);
  assert.match(ranked.version, /^0\.1-/);
  current = (await readAdminTool(database, actor, id))!;
  assert.equal(
    filterTools([tool.data, current.data], { sort: "rank" })[0].organicRanking
      ?.score,
    69,
  );
  await updateAdminTrust(database, actor, {
    toolId: id,
    revision: current.revision,
    reason: "Synthetic successful human inspection",
    verification: "human_reviewed",
    verified: false,
    evidence: "https://example.invalid/proof",
    checkedOn: "2026-01-01",
    checklist: "",
  });
  current = (await readAdminTool(database, actor, id))!;
  await assert.rejects(
    updateAdminTrust(database, actor, {
      toolId: id,
      revision: current.revision,
      reason: "No retroactive date regression",
      verification: "human_reviewed",
      verified: false,
      evidence: "https://example.invalid/proof",
      checkedOn: "2025-12-31",
      checklist: "",
    }),
  );
  await updateAdminTrust(database, actor, {
    toolId: id,
    revision: current.revision,
    reason: "Synthetic revalidation required",
    verification: "needs_reverification",
    verified: false,
    evidence: "",
    checkedOn: "",
    checklist: "",
  });
  assert.equal(
    (await readAdminTool(database, actor, id))!.data.lastVerified,
    current.data.lastVerified,
  );
}
export async function commerceContract(database: Database) {
  assert.equal(await inspectCommerceStorage(database), true);
  await assert.rejects(
    submitToolProposal(database, "admin-ordinary", {
      ...adminFixtureInput,
      slug: "ordinary-denied",
      isAdmin: true,
      isCreator: true,
    }),
  );
  for (const kind of [
    "submission",
    "edit",
    "verification",
    "vendor_subscription",
    "creator_subscription",
  ] as const) {
    await assert.rejects(
      saveProduct(database, user, {
        kind,
        name: "Synthetic price",
        amount: 2500,
        active: true,
        reason: "Price control denial",
      }),
    );
    await saveProduct(database, actor, {
      kind,
      name: "Synthetic " + kind,
      amount: 2500,
      active: true,
      reason: "Configure synthetic sandbox fee",
    });
  }
  await assert.rejects(
    saveProduct(database, actor, {
      kind: "edit",
      name: "Synthetic zero",
      amount: 0,
      active: true,
      reason: "Edits cannot be free",
    }),
  );
  const submission = await submitToolProposal(database, user, {
    ...adminFixtureInput,
    slug: "paid-synthetic-submission",
    isAdmin: true,
    verified: true,
    status: "published",
  });
  const revision = async (table: string, id: string) =>
    resultRows<{ revision: string }>(
      await database.execute(
        sql`SELECT updated_at::text AS revision FROM public.${sql.identifier(table)} WHERE id=${id}`,
      ),
    )[0].revision;
  const decision = {
    id: submission,
    revision: await revision("tool_submissions", submission),
    decision: "approved",
    reason: "Synthetic paid editorial decision",
  };
  await assert.rejects(reviewToolSubmission(database, actor, decision));
  await assert.rejects(
    preparePayment(database, vendor, "submission", submission),
  );
  const payment = await preparePayment(
    database,
    user,
    "submission",
    submission,
  );
  assert.equal(
    (await preparePayment(database, user, "submission", submission)).id,
    payment.id,
  );
  const settle = async (
    p: typeof payment,
    tag: string,
    subscriptionId?: string,
  ) => {
    const session = {
      id: "cs_test_" + tag,
      livemode: false,
      amount_total: p.amount,
      currency: p.currency,
      client_reference_id: p.id,
    };
    await assert.rejects(
      bindCheckout(database, "admin-vendor-b", p.id, session),
    );
    await assert.rejects(
      bindCheckout(database, p.user_id, p.id, { ...session, livemode: true }),
    );
    await bindCheckout(database, p.user_id, p.id, session);
    const event = {
      eventId: "evt_test_" + tag,
      sessionId: session.id,
      paymentId: p.id,
      clientReferenceId: p.id,
      paymentStatus: "paid",
      amount: p.amount,
      currency: p.currency,
      livemode: false,
      subscriptionId,
    };
    await assert.rejects(
      settleSandboxPayment(database, { ...event, amount: 1 }),
    );
    await assert.rejects(
      settleSandboxPayment(database, { ...event, livemode: true }),
    );
    await settleSandboxPayment(database, event);
    await settleSandboxPayment(database, event);
    return event;
  };
  await settle(payment, "submission");
  await assert.rejects(reviewToolSubmission(database, vendor, decision));
  const toolId = (await reviewToolSubmission(database, actor, decision))!;
  await assert.rejects(reviewToolSubmission(database, actor, decision));
  const tool = (await readAdminTool(database, actor, toolId))!;
  assert.equal(tool.status, "draft");
  assert.equal(tool.data.verified, false);
  assert.equal(tool.data.claimed, false);
  assert.equal(
    resultRows(
      await database.execute(
        sql`SELECT * FROM public.vendor_access WHERE tool_id=${toolId}`,
      ),
    ).length,
    0,
  );
  await database.execute(
    sql`INSERT INTO public.vendor_access(tool_id,user_id) VALUES(${toolId},${vendor})`,
  );
  const edit = await submitVendorEdit(database, vendor, {
    toolId,
    baseRevision: tool.revision,
    note: "Synthetic controlled Vendor proposal",
    proposed: { ...tool.data, name: "Approved paid edit", verified: true },
  });
  const reviewEdit = {
    id: edit,
    revision: await revision("vendor_edit_requests", edit),
    decision: "approved",
    reason: "Synthetic paid edit review",
  };
  await assert.rejects(
    reviewVendorRequest(database, actor, "edit", reviewEdit),
  );
  await assert.rejects(
    preparePayment(database, "admin-vendor-b", "edit", edit),
  );
  await settle(await preparePayment(database, vendor, "edit", edit), "edit");
  await assert.rejects(
    reviewVendorRequest(database, "admin-creator", "edit", reviewEdit),
  );
  await reviewVendorRequest(database, actor, "edit", reviewEdit);
  const edited = (await readAdminTool(database, actor, toolId))!;
  assert.equal(edited.data.name, "Approved paid edit");
  assert.equal(edited.data.verified, false);
  assert.equal(edited.status, "draft");
  assert.equal(edited.data.organicRanking, undefined);
  const verification = await submitVerificationRequest(database, vendor, {
    toolId,
    baseRevision: edited.revision,
    note: "Synthetic controlled verification request",
    evidence: ["https://example.invalid/evidence"],
  });
  await settle(
    await preparePayment(database, vendor, "verification", verification),
    "verify",
  );
  await reviewVendorRequest(database, actor, "verification", {
    id: verification,
    revision: await revision("verification_requests", verification),
    decision: "approved",
    reason: "Reviewed synthetic verification evidence",
  });
  const verified = (await readAdminTool(database, actor, toolId))!;
  assert.equal(verified.data.verification, "human_reviewed");
  assert.equal(verified.data.verified, false);
  assert.ok(verified.data.lastVerified);
  // Payment settlement and audit must roll back together, including event receipts.
  const another = await submitToolProposal(database, user, {
    ...adminFixtureInput,
    slug: "rollback-submission",
  });
  const rollback = await preparePayment(database, user, "submission", another);
  await bindCheckout(database, user, rollback.id, {
    id: "cs_test_rollback",
    livemode: false,
    amount_total: rollback.amount,
    currency: rollback.currency,
    client_reference_id: rollback.id,
  });
  const broken: IdentityDatabase = {
    transaction: (work) =>
      database.transaction((tx) =>
        work({
          execute: async (query) => {
            // Fail the final statement after the real mutation. The wrapper is synthetic only.
            const queryText = (
              query as unknown as { queryChunks: unknown[] }
            ).queryChunks
              .map((c) => String((c as { value?: unknown }).value || ""))
              .join("");
            if (queryText.includes("INSERT INTO public.audit_logs"))
              throw new Error("Synthetic audit failure");
            return tx.execute(query);
          },
        }),
      ),
  };
  await assert.rejects(
    settleSandboxPayment(broken, {
      eventId: "evt_test_rollback",
      sessionId: "cs_test_rollback",
      paymentId: rollback.id,
      clientReferenceId: rollback.id,
      paymentStatus: "paid",
      amount: rollback.amount,
      currency: rollback.currency,
      livemode: false,
    }),
  );
  assert.equal(
    resultRows<{ status: string }>(
      await database.execute(
        sql`SELECT status FROM public.billing_transactions WHERE id=${rollback.id}`,
      ),
    )[0].status,
    "created",
  );
  assert.equal(
    resultRows(
      await database.execute(
        sql`SELECT id FROM public.billing_webhook_receipts WHERE id='evt_test_rollback'`,
      ),
    ).length,
    0,
  );
  await assert.rejects(
    preparePayment(database, user, "vendor_subscription", user),
  );
  await assert.rejects(
    preparePayment(database, vendor, "creator_subscription", vendor),
  );
  const subscription = await preparePayment(
    database,
    vendor,
    "vendor_subscription",
    vendor,
  );
  await settle(subscription, "subscription", "sub_test_admin");
  await reconcileSubscription(database, {
    id: "evt_sub_active",
    created: 10,
    livemode: false,
    subscriptionId: "sub_test_admin",
    status: "active",
    cancelAtPeriodEnd: false,
    endsAt: 2000000000,
  });
  await reconcileSubscription(database, {
    id: "evt_sub_stale",
    created: 9,
    livemode: false,
    subscriptionId: "sub_test_admin",
    status: "past_due",
    cancelAtPeriodEnd: false,
    endsAt: 2000000000,
  });
  assert.equal(
    (await readOwnCommerce(database, vendor)).subscriptions[0].status,
    "active",
  );
  const sub = (await readOwnCommerce(database, vendor)).subscriptions[0];
  let calls = 0;
  const provider: SubscriptionProvider = {
    retrieve: async (id) => ({
      id,
      livemode: false,
      status: "active",
      cancelAtPeriodEnd: false,
      endsAt: 2000000000,
    }),
    cancelAtPeriodEnd: async (id) => {
      calls++;
      return {
        id,
        livemode: false,
        status: "active",
        cancelAtPeriodEnd: true,
        endsAt: 2000000000,
      };
    },
  };
  const cancellation = {
    id: sub.id,
    revision: sub.revision,
    reason: "Synthetic sandbox cancellation approval",
  };
  await assert.rejects(
    requestSandboxCancellation(
      database,
      "admin-vendor-b",
      cancellation,
      "owner",
      provider,
    ),
  );
  await assert.rejects(
    requestSandboxCancellation(database, user, cancellation, "admin", provider),
  );
  await assert.rejects(
    requestSandboxCancellation(
      database,
      vendor,
      { ...cancellation, revision: "stale" },
      "owner",
      provider,
    ),
  );
  await assert.rejects(
    requestSandboxCancellation(database, actor, cancellation, "admin", {
      ...provider,
      retrieve: async (id) => ({
        id,
        livemode: true,
        status: "active",
        cancelAtPeriodEnd: false,
        endsAt: 2000000000,
      }),
    }),
  );
  assert.equal(calls, 0);
  await requestSandboxCancellation(
    database,
    actor,
    cancellation,
    "admin",
    provider,
  );
  assert.equal(calls, 1);
  assert.equal(
    (await readOwnCommerce(database, vendor)).subscriptions[0]
      .cancel_at_period_end,
    true,
  );
  await assert.rejects(
    requestSandboxCancellation(
      database,
      actor,
      cancellation,
      "admin",
      provider,
    ),
  );
  assert.equal(calls, 1);
  await assert.rejects(
    preparePayment(database, vendor, "vendor_subscription", vendor),
  );
  assert.equal(
    (await readOwnCommerce(database, "admin-vendor-b")).payments.length,
    0,
  );
  assert.equal(
    (await readOwnCommerce(database, "admin-vendor-b")).subscriptions.length,
    0,
  );
  await assert.rejects(readCommercialAdmin(database, vendor, "payments", {}));
  await reconcileSubscription(database, {
    id: "evt_sub_canceled",
    created: Math.floor(Date.now() / 1000) + 1,
    livemode: false,
    subscriptionId: "sub_test_admin",
    status: "canceled",
    cancelAtPeriodEnd: true,
    endsAt: 2000000000,
  });
  await assert.rejects(
    reconcileSubscription(database, {
      id: "evt_sub_resurrect",
      created: Math.floor(Date.now() / 1000) + 2,
      livemode: false,
      subscriptionId: "sub_test_admin",
      status: "active",
      cancelAtPeriodEnd: false,
      endsAt: 2000000000,
    }),
  );
  assert.notEqual(
    (await preparePayment(database, vendor, "vendor_subscription", vendor)).id,
    subscription.id,
  );
  const flags = resultRows<{ is_admin: boolean; is_creator: boolean }>(
    await database.execute(
      sql`SELECT is_admin,is_creator FROM public.users WHERE id=${vendor}`,
    ),
  )[0];
  assert.equal(flags.is_admin, false);
  assert.equal(flags.is_creator, false);
}
