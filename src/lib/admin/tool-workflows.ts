import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import {
  adminToolInput,
  initialTool,
  recordId,
  reasonInput,
  revisionInput,
  allowedToolTransition,
  trustInput,
  AdminWorkflowError,
  type ToolStatus,
} from "./contracts";
import type { Tool } from "../catalog/types";
import type {
  IdentityDatabase,
  IdentityTransaction,
} from "../supabase/identity";

export function resultRows<T>(result: unknown): T[] {
  const rows = Array.isArray(result)
    ? result
    : (result as { rows?: unknown })?.rows;
  if (!Array.isArray(rows))
    throw new AdminWorkflowError("Database response unavailable.");
  return rows as T[];
}
export async function checkAdmin(tx: IdentityTransaction, actorId: string) {
  const [actor] = resultRows<{ id: string }>(
    await tx.execute(
      sql`SELECT id FROM public.users WHERE id=${actorId} AND is_admin=true`,
    ),
  );
  if (!actor) throw new AdminWorkflowError("Admin authorization is required.");
}
export async function audit(
  tx: IdentityTransaction,
  actorId: string,
  action: string,
  entityId: string,
  detail: unknown,
) {
  await tx.execute(sql`INSERT INTO public.audit_logs(id,actor_id,action,entity_id,detail)
    VALUES (${randomUUID()},${actorId},${action},${entityId},${JSON.stringify(detail)})`);
}
export type AdminToolRecord = {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  status: ToolStatus;
  data: Tool;
  revision: string;
};
export async function lockedTool(
  tx: IdentityTransaction,
  id: string,
  revision?: string,
) {
  const [tool] = resultRows<AdminToolRecord>(
    await tx.execute(
      sql`SELECT *, updated_at::text AS revision FROM public.tools WHERE id=${id} FOR UPDATE`,
    ),
  );
  if (!tool) throw new AdminWorkflowError("This Tool is unavailable.");
  if (revision && tool.revision !== revision)
    throw new AdminWorkflowError(
      "This Tool changed since you opened it. Refresh before saving.",
    );
  return tool;
}
export async function assertCategory(
  tx: IdentityTransaction,
  categoryId: string,
) {
  const rows = resultRows(
    await tx.execute(
      sql`SELECT id FROM public.taxonomy WHERE id=${categoryId} AND kind='category'`,
    ),
  );
  if (rows.length !== 1)
    throw new AdminWorkflowError(
      "The approved category is not installed in this database.",
    );
}
export async function writeToolData(
  tx: IdentityTransaction,
  tool: AdminToolRecord,
  data: Tool,
) {
  await tx.execute(sql`UPDATE public.tools SET name=${data.name}, slug=${data.slug}, category_id=${data.categoryId}, data=${JSON.stringify(data)}::jsonb,
    updated_at=GREATEST(clock_timestamp(), updated_at + interval '1 microsecond') WHERE id=${tool.id}`);
}
export async function createAdminTool(
  database: IdentityDatabase,
  actorId: string,
  value: unknown,
) {
  const input = adminToolInput.parse(value);
  const id = randomUUID();
  await database.transaction(async (tx) => {
    await checkAdmin(tx, actorId);
    await assertCategory(tx, input.categoryId);
    await tx.execute(sql`INSERT INTO public.tools(id,name,slug,category_id,status,data)
      VALUES (${id},${input.name},${input.slug},${input.categoryId},'draft',${JSON.stringify(initialTool(id, input))}::jsonb)`);
    await audit(tx, actorId, "tool.created", id, {
      status: "draft",
      fields: Object.keys(input),
    });
  });
  return id;
}
export async function editAdminTool(
  database: IdentityDatabase,
  actorId: string,
  value: unknown,
) {
  const input = adminToolInput.parse(value);
  const { toolId, revision, reason } = value as {
    toolId?: unknown;
    revision?: unknown;
    reason?: unknown;
  };
  const id = recordId.parse(toolId);
  const token = revisionInput.parse(revision);
  const note = reasonInput.parse(reason);
  await database.transaction(async (tx) => {
    await checkAdmin(tx, actorId);
    const tool = await lockedTool(tx, id, token);
    await assertCategory(tx, input.categoryId);
    const fields = Object.keys(input).filter(
      (key) =>
        JSON.stringify(tool.data[key as keyof Tool]) !==
        JSON.stringify(input[key as keyof typeof input]),
    );
    if (!fields.length)
      throw new AdminWorkflowError("No Tool fields have changed.");
    // Trust, commercial and derived review fields are outside this edit contract.
    await writeToolData(tx, tool, { ...tool.data, ...input, id: tool.id });
    await audit(tx, actorId, "tool.edited", id, { reason: note, fields });
  });
}
export async function transitionAdminTool(
  database: IdentityDatabase,
  actorId: string,
  value: {
    toolId: unknown;
    revision: unknown;
    status: ToolStatus;
    reason: unknown;
  },
) {
  const id = recordId.parse(value.toolId);
  const revision = revisionInput.parse(value.revision);
  const reason = reasonInput.parse(value.reason);
  if (!["draft", "published", "archived"].includes(value.status))
    throw new AdminWorkflowError("Choose a valid publication status.");
  await database.transaction(async (tx) => {
    await checkAdmin(tx, actorId);
    const tool = await lockedTool(tx, id, revision);
    if (!allowedToolTransition(tool.status, value.status))
      throw new AdminWorkflowError(
        "Invalid transition. Restore an archived Tool to draft before publishing; unchanged status does not create an audit event.",
      );
    if (value.status === "published") {
      adminToolInput.parse(tool.data);
      await assertCategory(tx, tool.category_id);
      if (
        tool.name !== tool.data.name ||
        tool.slug !== tool.data.slug ||
        tool.category_id !== tool.data.categoryId ||
        tool.id !== tool.data.id
      )
        throw new AdminWorkflowError(
          "Tool columns and content must agree before publication.",
        );
      if (tool.data.demo && process.env.NODE_ENV === "production")
        throw new AdminWorkflowError(
          "Example fixtures cannot be published in production.",
        );
    }
    await tx.execute(
      sql`UPDATE public.tools SET status=${value.status}, updated_at=GREATEST(clock_timestamp(),updated_at + interval '1 microsecond') WHERE id=${id}`,
    );
    await audit(tx, actorId, `tool.${value.status}`, id, {
      from: tool.status,
      to: value.status,
      reason,
    });
  });
}
export async function updateAdminTrust(
  database: IdentityDatabase,
  actorId: string,
  value: unknown,
) {
  const input = trustInput.parse(value);
  await database.transaction(async (tx) => {
    await checkAdmin(tx, actorId);
    const tool = await lockedTool(tx, input.toolId, input.revision);
    const checked = [
      "auto_checked",
      "human_reviewed",
      "vendor_confirmed",
    ].includes(input.verification);
    const data = {
      ...tool.data,
      verification: input.verification,
      verified: input.verified,
      lastVerified: checked ? new Date(input.checkedOn).toISOString() : null,
    };
    await writeToolData(tx, tool, data);
    await audit(tx, actorId, "tool.trust-reviewed", tool.id, {
      from: tool.data.verification,
      to: input.verification,
      verified: data.verified,
      checkedOn: data.lastVerified,
      evidence: input.evidence,
      checklist: input.checklist,
      reason: input.reason,
    });
  });
}
export type ModerationReview = {
  id: string;
  tool_id: string;
  user_id: string;
  rating: number;
  body: string;
  status: string;
  row_version: string;
};
export async function moderateAdminReview(
  database: IdentityDatabase,
  actorId: string,
  value: {
    reviewId: unknown;
    revision: unknown;
    status: string;
    reason: unknown;
  },
) {
  const id = recordId.parse(value.reviewId);
  const revision = revisionInput.parse(value.revision);
  const reason = reasonInput.parse(value.reason);
  if (!["approved", "rejected", "pending"].includes(value.status))
    throw new AdminWorkflowError("Choose a valid review decision.");
  await database.transaction(async (tx) => {
    await checkAdmin(tx, actorId);
    // Tool lock serializes ownership review and review publication for this Tool.
    const [locator] = resultRows<{ tool_id: string }>(
      await tx.execute(
        sql`SELECT tool_id FROM public.tool_reviews WHERE id=${id}`,
      ),
    );
    if (!locator) throw new AdminWorkflowError("Review unavailable.");
    await lockedTool(tx, locator.tool_id);
    const [review] = resultRows<ModerationReview>(
      await tx.execute(
        sql`SELECT *,xmin::text AS row_version FROM public.tool_reviews WHERE id=${id} FOR UPDATE`,
      ),
    );
    if (!review || review.row_version !== revision)
      throw new AdminWorkflowError(
        "This review changed. Refresh before deciding.",
      );
    if (
      review.status === value.status ||
      (review.status !== "pending" && value.status === "approved")
    )
      throw new AdminWorkflowError(
        "Reopen a reviewed item before approval. An unchanged decision is not a transition.",
      );
    if (
      value.status === "approved" &&
      resultRows(
        await tx.execute(
          sql`SELECT tool_id FROM public.vendor_access WHERE tool_id=${review.tool_id} AND user_id=${review.user_id}`,
        ),
      ).length
    )
      throw new AdminWorkflowError(
        "Owners cannot publish reviews of their own Tool.",
      );
    await tx.execute(
      sql`UPDATE public.tool_reviews SET status=${value.status} WHERE id=${id}`,
    );
    await audit(tx, actorId, `review.${value.status}`, id, {
      from: review.status,
      to: value.status,
      reason,
    });
  });
}
export async function moderateAdminClaim(
  database: IdentityDatabase,
  actorId: string,
  value: {
    claimId: unknown;
    expectedStatus: unknown;
    decision: string;
    reason: unknown;
  },
) {
  const id = recordId.parse(value.claimId);
  const reason = reasonInput.parse(value.reason);
  if (!["approved", "rejected"].includes(value.decision))
    throw new AdminWorkflowError("Choose approve or reject.");
  await database.transaction(async (tx) => {
    await checkAdmin(tx, actorId);
    const [locator] = resultRows<{ tool_id: string }>(
      await tx.execute(
        sql`SELECT tool_id FROM public.claim_requests WHERE id=${id}`,
      ),
    );
    if (!locator) throw new AdminWorkflowError("Claim unavailable.");
    await lockedTool(tx, locator.tool_id);
    const [claim] = resultRows<{
      tool_id: string;
      user_id: string;
      status: string;
      proof: string;
    }>(
      await tx.execute(
        sql`SELECT * FROM public.claim_requests WHERE id=${id} FOR UPDATE`,
      ),
    );
    const [order] = resultRows<{ status: string; user_id: string }>(
      await tx.execute(
        sql`SELECT * FROM public.orders WHERE claim_id=${id} FOR UPDATE`,
      ),
    );
    if (
      !claim ||
      claim.status !== value.expectedStatus ||
      claim.status !== "pending_review" ||
      order?.status !== "paid" ||
      order.user_id !== claim.user_id
    )
      throw new AdminWorkflowError(
        "A matching confirmed payment and unchanged pending claim are required.",
      );
    if (value.decision === "approved") {
      if (claim.proof.trim().length < 30)
        throw new AdminWorkflowError(
          "Sufficient ownership proof is required before approval.",
        );
      if (
        resultRows(
          await tx.execute(
            sql`SELECT tool_id FROM public.vendor_access WHERE tool_id=${claim.tool_id}`,
          ),
        ).length
      )
        throw new AdminWorkflowError(
          "This Tool already has an approved owner. Resolve the ownership dispute before another claim.",
        );
      await tx.execute(
        sql`INSERT INTO public.vendor_access(tool_id,user_id) VALUES (${claim.tool_id},${claim.user_id})`,
      );
      // A newly approved owner cannot retain a public self-review.
      const withdrawn = resultRows<{ id: string }>(
        await tx.execute(
          sql`UPDATE public.tool_reviews SET status='rejected' WHERE tool_id=${claim.tool_id} AND user_id=${claim.user_id} AND status='approved' RETURNING id`,
        ),
      );
      for (const review of withdrawn)
        await audit(tx, actorId, "review.owner-withdrawn", review.id, {
          claimId: id,
          reason: "Approved ownership excludes public self-reviews.",
        });
    }
    await tx.execute(
      sql`UPDATE public.claim_requests SET status=${value.decision} WHERE id=${id}`,
    );
    await audit(tx, actorId, `claim.${value.decision}`, id, {
      from: claim.status,
      to: value.decision,
      reason,
      toolId: claim.tool_id,
    });
  });
}
