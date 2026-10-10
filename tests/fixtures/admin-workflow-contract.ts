import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import type {
  IdentityDatabase,
  IdentityTransaction,
} from "../../src/lib/supabase/identity";
import { taxonomy } from "../../src/lib/catalog/taxonomy";
import { adminToolInput, trustInput } from "../../src/lib/admin/contracts";
import { readOwnedRequests } from "../../src/lib/admin/request-queries";
import {
  createAdminTool,
  editAdminTool,
  transitionAdminTool,
  updateAdminTrust,
  moderateAdminReview,
  moderateAdminClaim,
  resultRows,
} from "../../src/lib/admin/tool-workflows";
import {
  readAdminTool,
  readAdminTools,
  readAdminAudit,
  readAdminQueue,
} from "../../src/lib/admin/queries";
import {
  inspectReviewStorage,
  creatorPublishingAllowed,
} from "../../src/lib/admin/review-storage";
import {
  submitCreatorApplication,
  reviewCreatorApplication,
  submitVendorEdit,
  submitVerificationRequest,
  reviewVendorRequest,
  openClaimDispute,
  resolveClaimDispute,
} from "../../src/lib/admin/review-workflows";
export const adminFixtureInput = {
  name: "Admin synthetic Tool",
  slug: "admin-synthetic",
  description: "A synthetic discovery Tool for isolated permission testing.",
  categoryId: taxonomy.categories[0].id,
  website: "https://example.invalid/tool",
  logoUrl: "",
  pricing: "paid" as const,
  bestFor: "Synthetic workflows",
  notBestFor: "Real customer data",
  subcategoryId: null,
  useCaseIds: [],
  industries: [],
  listingTypeId: "LST-01",
  startingPrice: "$20",
  freePlan: false,
  trial: null,
  features: ["Synthetic feature"],
  integrations: [],
  platforms: [],
  pros: [],
  limitations: [],
};
export async function setupAdminFixtures(operator: IdentityTransaction) {
  await operator.execute(
    sql`INSERT INTO public.users(id,is_admin,is_creator) VALUES ('admin-fixture',true,false),('admin-ordinary',false,false),('admin-creator',false,true),('admin-vendor-a',false,false),('admin-vendor-b',false,false)`,
  );
  await operator.execute(
    sql`INSERT INTO public.taxonomy(id,kind,name,slug,data) VALUES (${adminFixtureInput.categoryId},'category','Synthetic category','admin-category','{}') ON CONFLICT(id) DO NOTHING`,
  );
}
export async function adminWorkflowContract(
  database: IdentityDatabase & IdentityTransaction,
) {
  const read = async (q: ReturnType<typeof sql>) =>
    resultRows<Record<string, unknown>>(await database.execute(q));
  for (const actor of [
    "admin-ordinary",
    "admin-creator",
    "admin-vendor-a",
    "admin-vendor-b",
    "nonexistent",
  ])
    await assert.rejects(
      createAdminTool(database, actor, { ...adminFixtureInput, isAdmin: true }),
    );
  const id = await createAdminTool(database, "admin-fixture", {
    ...adminFixtureInput,
    isAdmin: true,
    verified: true,
    claimed: true,
    status: "published",
  });
  let tool = (await readAdminTool(database, "admin-fixture", id))!;
  assert.equal(tool.status, "draft");
  assert.equal(tool.data.verified, false);
  assert.equal(tool.data.claimed, false);
  for (const actor of ["admin-ordinary", "admin-creator", "admin-vendor-a"])
    await assert.rejects(readAdminTool(database, actor, id));
  const audited = await read(
    sql`SELECT count(*)::int AS n FROM public.audit_logs`,
  );
  await assert.rejects(
    createAdminTool(database, "admin-fixture", adminFixtureInput),
  );
  assert.deepEqual(
    await read(sql`SELECT count(*)::int AS n FROM public.audit_logs`),
    audited,
  );
  await assert.rejects(
    editAdminTool(database, "admin-fixture", {
      ...adminFixtureInput,
      toolId: id,
      revision: "stale",
      reason: "Intentional stale edit",
    }),
  );
  await editAdminTool(database, "admin-fixture", {
    ...adminFixtureInput,
    name: "Updated synthetic Tool",
    toolId: id,
    revision: tool.revision,
    reason: "Correct synthetic description",
    verified: true,
  });
  tool = (await readAdminTool(database, "admin-fixture", id))!;
  assert.equal(tool.data.name, "Updated synthetic Tool");
  assert.equal(tool.data.verified, false);
  const before = tool;
  let calls = 0;
  const broken: IdentityDatabase = {
    transaction: (work) =>
      database.transaction((tx) =>
        work({
          execute: (query) => {
            calls++;
            if (calls === 5) throw new Error("Synthetic audit failure");
            return tx.execute(query);
          },
        }),
      ),
  };
  await assert.rejects(
    editAdminTool(broken, "admin-fixture", {
      ...adminFixtureInput,
      name: "Must roll back",
      toolId: id,
      revision: tool.revision,
      reason: "Synthetic rollback validation",
    }),
  );
  assert.deepEqual(await readAdminTool(database, "admin-fixture", id), before);
  for (const status of ["published", "archived"] as const) {
    await transitionAdminTool(database, "admin-fixture", {
      toolId: id,
      revision: tool.revision,
      status,
      reason: "Synthetic publication decision",
    });
    tool = (await readAdminTool(database, "admin-fixture", id))!;
  }
  await assert.rejects(
    transitionAdminTool(database, "admin-fixture", {
      toolId: id,
      revision: tool.revision,
      status: "published",
      reason: "Invalid direct restoration",
    }),
  );
  await transitionAdminTool(database, "admin-fixture", {
    toolId: id,
    revision: tool.revision,
    status: "draft",
    reason: "Restore for editorial review",
  });
  tool = (await readAdminTool(database, "admin-fixture", id))!;
  await assert.rejects(
    updateAdminTrust(database, "admin-fixture", {
      toolId: id,
      revision: tool.revision,
      verification: "human_reviewed",
      verified: true,
      checkedOn: "2026-01-01",
      evidence: "https://example.invalid/evidence",
      reason: "Missing checklist",
    }),
  );
  await updateAdminTrust(database, "admin-fixture", {
    toolId: id,
    revision: tool.revision,
    verification: "human_reviewed",
    verified: false,
    checkedOn: "2026-01-01",
    evidence: "https://example.invalid/evidence",
    reason: "Independent human check without badge",
  });
  tool = (await readAdminTool(database, "admin-fixture", id))!;
  assert.equal(tool.data.verified, false);
  await updateAdminTrust(database, "admin-fixture", {
    toolId: id,
    revision: tool.revision,
    verification: "human_reviewed",
    verified: true,
    checkedOn: "2026-01-01",
    evidence: "https://example.invalid/evidence",
    checklist:
      "Synthetic checklist: identity, functionality, claims and evidence checked.",
    reason: "Independent checklist review",
  });
  tool = (await readAdminTool(database, "admin-fixture", id))!;
  assert.equal(tool.data.verified, true);
  await database.execute(
    sql`INSERT INTO public.tool_reviews(id,user_id,tool_id,rating,body,status) VALUES ('admin-review','admin-vendor-a',${id},4,'Synthetic review for ownership continuity testing.','pending')`,
  );
  const reviewVersion = async () =>
    String(
      (
        await read(
          sql`SELECT xmin::text AS revision FROM public.tool_reviews WHERE id='admin-review'`,
        )
      )[0].revision,
    );
  let review = await reviewVersion();
  const initialReviewVersion = review;
  await assert.rejects(
    moderateAdminReview(database, "admin-vendor-a", {
      reviewId: "admin-review",
      revision: review,
      status: "approved",
      reason: "Forged Admin capability",
    }),
  );
  await moderateAdminReview(database, "admin-fixture", {
    reviewId: "admin-review",
    revision: review,
    status: "approved",
    reason: "Synthetic independent moderation",
  });
  await assert.rejects(
    moderateAdminReview(database, "admin-fixture", {
      reviewId: "admin-review",
      revision: review,
      status: "rejected",
      reason: "Stale moderation",
    }),
  );
  for (const [claim, user] of [
    ["admin-claim-a", "admin-vendor-a"],
    ["admin-claim-b", "admin-vendor-b"],
  ]) {
    await database.execute(
      sql`INSERT INTO public.claim_requests(id,tool_id,user_id,company,role,proof,status) VALUES (${claim},${id},${user},'Synthetic company','Synthetic operator','Synthetic ownership proof checked by the independent Admin.','pending_review')`,
    );
    await database.execute(
      sql`INSERT INTO public.orders(id,user_id,claim_id,amount,status) VALUES (${claim},${user},${claim},9900,'pending')`,
    );
  }
  await assert.rejects(
    moderateAdminClaim(database, "admin-fixture", {
      claimId: "admin-claim-a",
      expectedStatus: "pending_review",
      decision: "approved",
      reason: "Cannot approve unpaid claim",
    }),
  );
  await database.execute(
    sql`UPDATE public.orders SET status='paid' WHERE id IN ('admin-claim-a','admin-claim-b')`,
  );
  await moderateAdminClaim(database, "admin-fixture", {
    claimId: "admin-claim-a",
    expectedStatus: "pending_review",
    decision: "approved",
    reason: "Independent ownership proof approval",
  });
  await assert.rejects(
    moderateAdminClaim(database, "admin-fixture", {
      claimId: "admin-claim-b",
      expectedStatus: "pending_review",
      decision: "approved",
      reason: "Cannot replace an existing owner",
    }),
  );
  assert.equal(
    (
      await read(
        sql`SELECT status FROM public.tool_reviews WHERE id='admin-review'`,
      )
    )[0].status,
    "rejected",
  );
  review = await reviewVersion();
  await moderateAdminReview(database, "admin-fixture", {
    reviewId: "admin-review",
    revision: review,
    status: "pending",
    reason: "Reopen only for conflict check",
  });
  review = await reviewVersion();
  await assert.rejects(
    moderateAdminReview(database, "admin-fixture", {
      reviewId: "admin-review",
      revision: initialReviewVersion,
      status: "rejected",
      reason: "Reopened status cannot revive old form",
    }),
    /changed/,
  );
  await assert.rejects(
    moderateAdminReview(database, "admin-fixture", {
      reviewId: "admin-review",
      revision: review,
      status: "approved",
      reason: "Owner cannot publish a self-review",
    }),
  );
  assert.deepEqual(
    (await readAdminTool(database, "admin-fixture", id))!.data,
    tool.data,
  );
  for (let i = 0; i < 22; i++)
    await createAdminTool(database, "admin-fixture", {
      ...adminFixtureInput,
      slug: "admin-page-" + i,
      name: "Pagination fixture " + String(i).padStart(2, "0"),
    });
  const page = await readAdminTools(database, "admin-fixture", {
    q: "Pagination fixture",
    sort: "name",
  });
  assert.equal(page.total, 22);
  assert.equal(page.rows.length, 20);
  const next = await readAdminTools(database, "admin-fixture", {
    q: "Pagination fixture",
    sort: "name",
    page: "2",
  });
  assert.equal(next.rows.length, 2);
  assert.equal(new Set([...page.rows, ...next.rows].map((r) => r.id)).size, 22);
  assert.equal(
    (await readAdminTools(database, "admin-fixture", { q: "Pagination%" }))
      .total,
    0,
  );
  assert.equal(
    (
      await readAdminQueue(database, "admin-fixture", "claims", {
        status: "approved",
      })
    ).rows.some((r) => r.id === "admin-claim-a"),
    true,
  );
  assert.ok(
    (await readAdminAudit(database, "admin-fixture", { entity: id })).rows.some(
      (r) => r.action === "tool.edited",
    ),
  );
  return id;
}
export async function adminReviewWorkflowContract(
  database: IdentityDatabase & IdentityTransaction,
  toolId: string,
) {
  const previousFlag = process.env.AIBEAN_REVIEW_WORKFLOWS;
  const previousPromo = process.env.AIBEAN_VERIFICATION_PROMO_ZERO;
  process.env.AIBEAN_REVIEW_WORKFLOWS = "1";
  const read = async (q: ReturnType<typeof sql>) =>
    resultRows<Record<string, unknown>>(await database.execute(q));
  try {
    assert.equal(await inspectReviewStorage(database), true);
    const application = await submitCreatorApplication(
      database,
      "admin-ordinary",
      {
        name: "Synthetic Creator",
        bio: "Synthetic creator application for isolated workflow testing.",
        links: ["https://example.invalid/creator"],
        isCreator: true,
      },
    );
    let app = (
      await read(
        sql`SELECT updated_at::text AS revision,status FROM public.creator_applications WHERE id=${application}`,
      )
    )[0];
    await assert.rejects(
      reviewCreatorApplication(database, "admin-ordinary", {
        id: application,
        revision: app.revision,
        decision: "approved",
        reason: "Forbidden self-approval",
      }),
    );
    await reviewCreatorApplication(database, "admin-fixture", {
      id: application,
      revision: app.revision,
      decision: "approved",
      reason: "Synthetic portfolio review",
    });
    assert.equal(
      (
        await read(
          sql`SELECT is_creator FROM public.users WHERE id='admin-ordinary'`,
        )
      )[0].is_creator,
      false,
    );
    assert.equal(
      (
        await read(
          sql`SELECT status FROM public.creator_capability_requests WHERE user_id='admin-ordinary'`,
        )
      )[0].status,
      "pending_operator",
    );
    await assert.rejects(
      database.execute(
        sql`UPDATE public.users SET is_creator=true WHERE id='admin-ordinary'`,
      ),
    );
    await assert.rejects(
      database.execute(
        sql`UPDATE public.creator_capability_requests SET status='applied' WHERE user_id='admin-ordinary'`,
      ),
    );
    app = (
      await read(
        sql`SELECT updated_at::text AS revision FROM public.creator_applications WHERE id=${application}`,
      )
    )[0];
    await reviewCreatorApplication(database, "admin-fixture", {
      id: application,
      revision: app.revision,
      decision: "suspension_requested",
      reason: "Synthetic suspension decision",
    });
    assert.equal(
      await creatorPublishingAllowed(database, "admin-ordinary", true),
      false,
    );
    let tool = (await readAdminTool(database, "admin-fixture", toolId))!;
    const otherId = await createAdminTool(database, "admin-fixture", {
      ...adminFixtureInput,
      name: "Other Vendor synthetic Tool",
      slug: "other-vendor-synthetic",
    });
    await database.execute(
      sql`INSERT INTO public.vendor_access(tool_id,user_id) VALUES (${otherId},'admin-vendor-b')`,
    );
    const otherTool = (await readAdminTool(
      database,
      "admin-fixture",
      otherId,
    ))!;
    await assert.rejects(
      readOwnedRequests(database, "admin-vendor-a", otherId),
    );
    await assert.rejects(readOwnedRequests(database, "admin-vendor-b", toolId));
    await assert.rejects(
      submitVendorEdit(database, "admin-vendor-a", {
        toolId: otherId,
        baseRevision: otherTool.revision,
        note: "Cross-Tool request must fail safely.",
        proposed: adminFixtureInput,
      }),
    );
    await submitVendorEdit(database, "admin-vendor-b", {
      toolId: otherId,
      baseRevision: otherTool.revision,
      note: "Positive independently owned request.",
      proposed: adminFixtureInput,
    });
    const request = {
      toolId,
      baseRevision: tool.revision,
      note: "Synthetic request with independent editorial review.",
      proposed: {
        ...adminFixtureInput,
        name: "Vendor proposal",
        verified: true,
      },
    };
    await assert.rejects(submitVendorEdit(database, "admin-vendor-b", request));
    const edit = await submitVendorEdit(database, "admin-vendor-a", request);
    const item = (
      await read(
        sql`SELECT updated_at::text AS revision,proposed FROM public.vendor_edit_requests WHERE id=${edit}`,
      )
    )[0];
    assert.equal(
      (item.proposed as Record<string, unknown>).verified,
      undefined,
    );
    await assert.rejects(
      reviewVendorRequest(database, "admin-fixture", "edit", {
        id: edit,
        revision: item.revision,
        decision: "approved",
        reason: "Paid settlement must be integrated",
      }),
    );
    await reviewVendorRequest(database, "admin-fixture", "edit", {
      id: edit,
      revision: item.revision,
      decision: "rejected",
      reason: "Await a paid checkout contract",
    });
    assert.deepEqual(
      (await readAdminTool(database, "admin-fixture", toolId))!.data,
      tool.data,
    );
    delete process.env.AIBEAN_VERIFICATION_PROMO_ZERO;
    const verifyInput = {
      toolId,
      baseRevision: tool.revision,
      note: "Synthetic evidence request for verification.",
      evidence: ["https://example.invalid/proof"],
    };
    const paid = await submitVerificationRequest(
      database,
      "admin-vendor-a",
      verifyInput,
    );
    let v = (
      await read(
        sql`SELECT updated_at::text AS revision FROM public.verification_requests WHERE id=${paid}`,
      )
    )[0];
    await assert.rejects(
      reviewVendorRequest(database, "admin-fixture", "verification", {
        id: paid,
        revision: v.revision,
        decision: "approved",
        reason: "No payment settlement",
      }),
    );
    await reviewVendorRequest(database, "admin-fixture", "verification", {
      id: paid,
      revision: v.revision,
      decision: "rejected",
      reason: "Await paid verification integration",
    });
    process.env.AIBEAN_VERIFICATION_PROMO_ZERO = "1";
    const free = await submitVerificationRequest(
      database,
      "admin-vendor-a",
      verifyInput,
    );
    v = (
      await read(
        sql`SELECT updated_at::text AS revision FROM public.verification_requests WHERE id=${free}`,
      )
    )[0];
    await reviewVendorRequest(database, "admin-fixture", "verification", {
      id: free,
      revision: v.revision,
      decision: "approved",
      reason: "Independent zero-price verification review",
    });
    tool = (await readAdminTool(database, "admin-fixture", toolId))!;
    assert.equal(tool.data.verification, "human_reviewed");
    assert.equal(tool.data.verified, true);
    const dispute = await openClaimDispute(database, "admin-fixture", {
      claimId: "admin-claim-a",
      reason: "Synthetic ownership proof dispute",
    });
    assert.equal(
      (
        await read(
          sql`SELECT user_id FROM public.vendor_access WHERE tool_id=${toolId}`,
        )
      )[0].user_id,
      "admin-vendor-a",
    );
    const d = (
      await read(
        sql`SELECT updated_at::text AS revision FROM public.claim_disputes WHERE id=${dispute}`,
      )
    )[0];
    await assert.rejects(
      resolveClaimDispute(database, "admin-vendor-b", {
        id: dispute,
        revision: d.revision,
        decision: "revoke",
        reason: "Forbidden Vendor ownership change",
      }),
    );
    await resolveClaimDispute(database, "admin-fixture", {
      id: dispute,
      revision: d.revision,
      decision: "revoke",
      reason: "Synthetic independently reviewed revocation",
    });
    assert.equal(
      (
        await read(
          sql`SELECT user_id FROM public.vendor_access WHERE tool_id=${toolId}`,
        )
      ).length,
      0,
    );
    assert.equal(
      (
        await read(
          sql`SELECT status FROM public.claim_requests WHERE id='admin-claim-a'`,
        )
      )[0].status,
      "revoked",
    );
    await assert.rejects(
      submitVerificationRequest(database, "admin-vendor-a", {
        ...verifyInput,
        baseRevision: tool.revision,
      }),
    );
    assert.deepEqual(
      (await readAdminTool(database, "admin-fixture", toolId))!.data,
      tool.data,
    );
  } finally {
    if (previousFlag === undefined) delete process.env.AIBEAN_REVIEW_WORKFLOWS;
    else process.env.AIBEAN_REVIEW_WORKFLOWS = previousFlag;
    if (previousPromo === undefined)
      delete process.env.AIBEAN_VERIFICATION_PROMO_ZERO;
    else process.env.AIBEAN_VERIFICATION_PROMO_ZERO = previousPromo;
  }
}
export function adminContractValidation() {
  assert.equal(
    adminToolInput.safeParse({
      ...adminFixtureInput,
      website: "https://name:secret@example.invalid",
    }).success,
    false,
  );
  assert.equal(
    adminToolInput.safeParse({ ...adminFixtureInput, subcategoryId: "UNKNOWN" })
      .success,
    false,
  );
  assert.equal(
    adminToolInput.safeParse({ ...adminFixtureInput, useCaseIds: ["UC-035"] })
      .success,
    false,
  );
  assert.equal(
    trustInput.safeParse({
      toolId: "x",
      revision: "x",
      reason: "Future check date",
      verification: "auto_checked",
      evidence: "https://example.invalid",
      checkedOn: "2099-01-01",
    }).success,
    false,
  );
}
