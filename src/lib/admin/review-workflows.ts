import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import type {
  IdentityDatabase,
  IdentityTransaction,
} from "../supabase/identity";
import { AdminWorkflowError } from "./contracts";
import {
  creatorApplicationInput,
  vendorRequestInput,
  verificationRequestInput,
  creatorDecisionInput,
  reviewDecisionInput,
  disputeInput,
  disputeDecisionInput,
} from "./review-contracts";
import {
  resultRows,
  checkAdmin,
  lockedTool,
  writeToolData,
  audit,
} from "./tool-workflows";
import { requireReviewStorage } from "./review-storage";

async function checkOwner(
  tx: IdentityTransaction,
  userId: string,
  toolId: string,
) {
  if (
    !userId ||
    !resultRows(
      await tx.execute(
        sql`SELECT tool_id FROM public.vendor_access WHERE tool_id=${toolId} AND user_id=${userId}`,
      ),
    ).length
  )
    throw new AdminWorkflowError(
      "Approved ownership of this Tool is required.",
    );
}
export async function submitCreatorApplication(
  database: IdentityDatabase,
  userId: string,
  value: unknown,
) {
  const input = creatorApplicationInput.parse(value);
  return database.transaction(async (tx) => {
    await requireReviewStorage(tx);
    const [user] = resultRows<{ is_creator: boolean }>(
      await tx.execute(
        sql`SELECT is_creator FROM public.users WHERE id=${userId}`,
      ),
    );
    if (!user || user.is_creator)
      throw new AdminWorkflowError(
        "An ordinary account without active Creator access is required to apply.",
      );
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${`creator-application:${userId}`},0))`,
    );
    const [existing] = resultRows<{ id: string; status: string }>(
      await tx.execute(
        sql`SELECT id,status FROM public.creator_applications WHERE user_id=${userId} FOR UPDATE`,
      ),
    );
    if (existing && existing.status !== "rejected")
      throw new AdminWorkflowError(
        "Your application is already awaiting review or activation.",
      );
    const id = existing?.id || randomUUID();
    if (existing)
      await tx.execute(
        sql`UPDATE public.creator_applications SET name=${input.name},bio=${input.bio},links=${JSON.stringify(input.links)}::jsonb,status='pending',reviewer_id=NULL,review_reason=NULL,reviewed_at=NULL,updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE id=${id}`,
      );
    else
      await tx.execute(
        sql`INSERT INTO public.creator_applications(id,user_id,name,bio,links) VALUES (${id},${userId},${input.name},${input.bio},${JSON.stringify(input.links)}::jsonb)`,
      );
    await audit(tx, userId, "creator.application-submitted", id, {
      resubmission: Boolean(existing),
    });
    return id;
  });
}
export async function reviewCreatorApplication(
  database: IdentityDatabase,
  actorId: string,
  value: unknown,
) {
  const input = creatorDecisionInput.parse(value);
  await database.transaction(async (tx) => {
    await checkAdmin(tx, actorId);
    await requireReviewStorage(tx);
    const [item] = resultRows<{
      user_id: string;
      status: string;
      revision: string;
    }>(
      await tx.execute(
        sql`SELECT *,updated_at::text AS revision FROM public.creator_applications WHERE id=${input.id} FOR UPDATE`,
      ),
    );
    if (!item || item.revision !== input.revision)
      throw new AdminWorkflowError(
        "Application changed or is unavailable. Refresh before deciding.",
      );
    if (
      input.decision === "suspension_requested"
        ? item.status !== "approved"
        : item.status !== "pending"
    )
      throw new AdminWorkflowError(
        "Only pending applications can be approved/rejected; only approved applications can be suspended.",
      );
    await tx.execute(
      sql`UPDATE public.creator_applications SET status=${input.decision},reviewer_id=${actorId},review_reason=${input.reason},reviewed_at=now(),updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE id=${input.id}`,
    );
    const [user] = resultRows<{ is_creator: boolean }>(
      await tx.execute(
        sql`SELECT is_creator FROM public.users WHERE id=${item.user_id}`,
      ),
    );
    if (
      input.decision === "suspension_requested" ||
      (input.decision === "approved" && !user?.is_creator)
    ) {
      await tx.execute(sql`INSERT INTO public.creator_capability_requests(id,application_id,user_id,desired_state,requested_by,reason)
        VALUES (${randomUUID()},${input.id},${item.user_id},${input.decision === "approved" ? "enabled" : "disabled"},${actorId},${input.reason}) ON CONFLICT DO NOTHING`);
    }
    await audit(
      tx,
      actorId,
      `creator.application-${input.decision}`,
      input.id,
      {
        from: item.status,
        to: input.decision,
        reason: input.reason,
        capabilityActivation: "separately-authorized-operator-only",
      },
    );
  });
}
export async function submitVendorEdit(
  database: IdentityDatabase,
  userId: string,
  value: unknown,
) {
  const input = vendorRequestInput.parse(value);
  return database.transaction(async (tx) => {
    await requireReviewStorage(tx);
    await lockedTool(tx, input.toolId, input.baseRevision);
    await checkOwner(tx, userId, input.toolId);
    const id = randomUUID();
    await tx.execute(
      sql`INSERT INTO public.vendor_edit_requests(id,tool_id,user_id,base_revision,proposed,note) VALUES (${id},${input.toolId},${userId},${input.baseRevision},${JSON.stringify(input.proposed)}::jsonb,${input.note})`,
    );
    await audit(tx, userId, "vendor.edit-requested", id, {
      toolId: input.toolId,
    });
    return id;
  });
}
export async function submitVerificationRequest(
  database: IdentityDatabase,
  userId: string,
  value: unknown,
) {
  const input = verificationRequestInput.parse(value);
  return database.transaction(async (tx) => {
    await requireReviewStorage(tx);
    await lockedTool(tx, input.toolId, input.baseRevision);
    await checkOwner(tx, userId, input.toolId);
    const id = randomUUID();
    const paymentState =
      process.env.AIBEAN_VERIFICATION_PROMO_ZERO === "1"
        ? "promo_zero"
        : "required";
    await tx.execute(
      sql`INSERT INTO public.verification_requests(id,tool_id,user_id,base_revision,evidence,note,payment_state) VALUES (${id},${input.toolId},${userId},${input.baseRevision},${JSON.stringify(input.evidence)}::jsonb,${input.note},${paymentState})`,
    );
    await audit(tx, userId, "vendor.verification-requested", id, {
      toolId: input.toolId,
    });
    return id;
  });
}
export async function reviewVendorRequest(
  database: IdentityDatabase,
  actorId: string,
  kind: "edit" | "verification",
  value: unknown,
) {
  const input = reviewDecisionInput.parse(value);
  if (!["edit", "verification"].includes(kind))
    throw new AdminWorkflowError("Invalid review queue.");
  const table = sql.identifier(
    kind === "edit" ? "vendor_edit_requests" : "verification_requests",
  );
  await database.transaction(async (tx) => {
    await checkAdmin(tx, actorId);
    await requireReviewStorage(tx);
    const [locator] = resultRows<{ tool_id: string }>(
      await tx.execute(
        sql`SELECT tool_id FROM public.${table} WHERE id=${input.id}`,
      ),
    );
    if (!locator) throw new AdminWorkflowError("Request unavailable.");
    const tool = await lockedTool(tx, locator.tool_id);
    const [item] = resultRows<{
      user_id: string;
      status: string;
      revision: string;
      base_revision: string;
      proposed: unknown;
      evidence: unknown;
      payment_state: string;
    }>(
      await tx.execute(
        sql`SELECT *,updated_at::text AS revision FROM public.${table} WHERE id=${input.id} FOR UPDATE`,
      ),
    );
    if (!item || item.status !== "pending" || item.revision !== input.revision)
      throw new AdminWorkflowError(
        "Only an unchanged pending request can be reviewed.",
      );
    if (input.decision === "approved") {
      if (kind === "edit" || item.payment_state !== "promo_zero")
        throw new AdminWorkflowError(
          "Paid edit/verification settlement is not integrated. Only a server-configured zero-price verification promotion can be approved.",
        );
      await checkOwner(tx, item.user_id, tool.id);
      if (item.base_revision !== tool.revision)
        throw new AdminWorkflowError(
          "Canonical Tool content changed after this request. Reject it and request a fresh proposal.",
        );
      verificationRequestInput.shape.evidence.parse(item.evidence);
      await writeToolData(tx, tool, {
        ...tool.data,
        verification: "human_reviewed",
        lastVerified: new Date().toISOString(),
      });
    }
    await tx.execute(
      sql`UPDATE public.${table} SET status=${input.decision},reviewer_id=${actorId},review_reason=${input.reason},reviewed_at=now(),updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE id=${input.id}`,
    );
    await audit(tx, actorId, `vendor.${kind}-${input.decision}`, input.id, {
      toolId: tool.id,
      reason: input.reason,
      from: item.status,
      to: input.decision,
    });
  });
}
export async function openClaimDispute(
  database: IdentityDatabase,
  actorId: string,
  value: unknown,
) {
  const input = disputeInput.parse(value);
  return database.transaction(async (tx) => {
    await checkAdmin(tx, actorId);
    await requireReviewStorage(tx);
    const [claim] = resultRows<{
      tool_id: string;
      user_id: string;
      status: string;
    }>(
      await tx.execute(
        sql`SELECT tool_id,user_id,status FROM public.claim_requests WHERE id=${input.claimId}`,
      ),
    );
    if (!claim || claim.status !== "approved")
      throw new AdminWorkflowError(
        "Select an approved claim to open an ownership dispute.",
      );
    await lockedTool(tx, claim.tool_id);
    await checkOwner(tx, claim.user_id, claim.tool_id);
    const [current] = resultRows<{ status: string; user_id: string }>(
      await tx.execute(
        sql`SELECT status,user_id FROM public.claim_requests WHERE id=${input.claimId} FOR UPDATE`,
      ),
    );
    if (current?.status !== "approved" || current.user_id !== claim.user_id)
      throw new AdminWorkflowError(
        "Claim changed. Refresh before opening a dispute.",
      );
    const id = randomUUID();
    await tx.execute(
      sql`INSERT INTO public.claim_disputes(id,tool_id,claim_id,owner_id,opened_by,reason) VALUES (${id},${claim.tool_id},${input.claimId},${claim.user_id},${actorId},${input.reason})`,
    );
    await audit(tx, actorId, "claim.dispute-opened", id, {
      claimId: input.claimId,
      toolId: claim.tool_id,
      reason: input.reason,
      ownership: "preserved-pending-review",
    });
    return id;
  });
}
export async function resolveClaimDispute(
  database: IdentityDatabase,
  actorId: string,
  value: unknown,
) {
  const input = disputeDecisionInput.parse(value);
  await database.transaction(async (tx) => {
    await checkAdmin(tx, actorId);
    await requireReviewStorage(tx);
    const [locator] = resultRows<{ tool_id: string }>(
      await tx.execute(
        sql`SELECT tool_id FROM public.claim_disputes WHERE id=${input.id}`,
      ),
    );
    if (!locator) throw new AdminWorkflowError("Dispute unavailable.");
    await lockedTool(tx, locator.tool_id);
    const [item] = resultRows<{
      owner_id: string;
      claim_id: string;
      tool_id: string;
      status: string;
      revision: string;
    }>(
      await tx.execute(
        sql`SELECT *,updated_at::text AS revision FROM public.claim_disputes WHERE id=${input.id} FOR UPDATE`,
      ),
    );
    if (!item || item.status !== "open" || item.revision !== input.revision)
      throw new AdminWorkflowError(
        "Only an unchanged open dispute can be resolved.",
      );
    await checkOwner(tx, item.owner_id, item.tool_id);
    if (input.decision === "revoke") {
      await tx.execute(
        sql`DELETE FROM public.vendor_access WHERE tool_id=${item.tool_id} AND user_id=${item.owner_id}`,
      );
      await tx.execute(
        sql`UPDATE public.claim_requests SET status='revoked' WHERE id=${item.claim_id} AND status='approved'`,
      );
    }
    await tx.execute(
      sql`UPDATE public.claim_disputes SET status='resolved',decision=${input.decision},reviewer_id=${actorId},review_reason=${input.reason},reviewed_at=now(),updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE id=${input.id}`,
    );
    await audit(tx, actorId, `claim.dispute-${input.decision}`, input.id, {
      toolId: item.tool_id,
      claimId: item.claim_id,
      reason: input.reason,
    });
  });
}
