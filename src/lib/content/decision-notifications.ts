import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import type { IdentityTransaction } from "../supabase/identity";

// Existing baseline workflows can run before the separately reviewed content
// package is installed. Once enabled, notification failures roll back the
// decision and its audit together; they are never silently discarded.
export async function notifyDecision(
  tx: IdentityTransaction,
  userId: string,
  message: string,
) {
  if (process.env.AIBEAN_CONTENT_WORKFLOWS !== "1") return;
  const { requireContentStorage } = await import("./storage");
  await requireContentStorage(tx);
  await tx.execute(
    sql`INSERT INTO public.account_notifications(id,user_id,message) VALUES(${randomUUID()},${userId},${message})`,
  );
}
