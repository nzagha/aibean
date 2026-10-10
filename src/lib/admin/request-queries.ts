import { sql } from "drizzle-orm";
import type { IdentityDatabase } from "../supabase/identity";
import { resultRows, type AdminToolRecord } from "./tool-workflows";
import { requireReviewStorage } from "./review-storage";
import { AdminWorkflowError } from "./contracts";
export async function readOwnedRequests(
  database: IdentityDatabase,
  userId: string,
  toolId: string,
) {
  return database.transaction(async (tx) => {
    if (!userId)
      throw new AdminWorkflowError("An authenticated account is required.");
    const [tool] = resultRows<AdminToolRecord>(
      await tx.execute(
        sql`SELECT t.*,t.updated_at::text AS revision FROM public.tools t JOIN public.vendor_access v ON v.tool_id=t.id WHERE t.id=${toolId} AND v.user_id=${userId}`,
      ),
    );
    if (!tool)
      throw new AdminWorkflowError(
        "Approved ownership of this Tool is required.",
      );
    await requireReviewStorage(tx);
    const requests = resultRows<{
      id: string;
      kind: string;
      status: string;
      payment_state: string;
      review_reason: string | null;
      created_at: string;
    }>(
      await tx.execute(
        sql`SELECT id,'edit' AS kind,status,payment_state,review_reason,created_at::text FROM public.vendor_edit_requests WHERE tool_id=${toolId} AND user_id=${userId} UNION ALL SELECT id,'verification' AS kind,status,payment_state,review_reason,created_at::text FROM public.verification_requests WHERE tool_id=${toolId} AND user_id=${userId} ORDER BY created_at DESC LIMIT 50`,
      ),
    );
    return { tool, requests };
  });
}
export async function readOwnApplication(
  database: IdentityDatabase,
  userId: string,
) {
  if (!userId)
    throw new AdminWorkflowError("An authenticated account is required.");
  return database.transaction(async (tx) => {
    await requireReviewStorage(tx);
    const [application] = resultRows<{
      status: string;
      review_reason: string | null;
    }>(
      await tx.execute(
        sql`SELECT status,review_reason FROM public.creator_applications WHERE user_id=${userId}`,
      ),
    );
    return application;
  });
}
