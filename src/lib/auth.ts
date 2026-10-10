import "server-only";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { users, vendorAccess } from "./db/schema";
import { safeReturnPath } from "./catalog/filter";
import { passwordIdentity } from "./password-auth";
import { hasCapability, ownsResource } from "./capabilities";
import { ordinaryUserInsert } from "./db/ordinary-user";
import { authMode, providerTestApproved } from "./auth-mode";
import { createSupabaseServerClient } from "./supabase/server";
import { resolveSupabaseUser } from "./supabase/identity";
import { ownerPredicates } from "./db/owned-resources";
import { ACCESS_COOKIE, RECOVERY_COOKIE } from "./supabase/auth-proof";
import { verifiedBusinessAccount } from "./supabase/business-session";
import { creatorPublishingAllowed } from "./admin/review-storage";
export const authConfigured = () => authMode() === "clerk";
export async function getIdentity(provision = true) {
  const mode = authMode();
  if (mode === "password") return passwordIdentity();
  if (mode === "clerk") return (await auth()).userId;
  if (mode !== "supabase" || !providerTestApproved()) return null;
  // A recovery-only session may reset its password through the checked flow,
  // but cannot provision or access account/business data before completion.
  const cookieStore = await cookies();
  if (cookieStore.get(RECOVERY_COOKIE)) return null;
  const client = await createSupabaseServerClient();
  const authUserId = await verifiedBusinessAccount(
    client.auth,
    cookieStore.get(ACCESS_COOKIE)?.value,
    process.env.AIBEAN_RECOVERY_SECRET || "",
  );
  if (!authUserId) return null;
  if (!provision) {
    const [mapping] = await db().execute<{ user_id: string }>(sql`
      SELECT user_id FROM aibean_private.user_identities
      WHERE auth_user_id = ${authUserId}::uuid`);
    return mapping?.user_id ?? null;
  }
  return (await resolveSupabaseUser(db(), authUserId)).id;
}
export async function requireUser(
  returnTo = "/account",
  databaseRequired = true,
) {
  const id = await getIdentity();
  if (!id)
    redirect(`/login?returnTo=${encodeURIComponent(safeReturnPath(returnTo))}`);
  if (!process.env.DATABASE_URL) {
    if (databaseRequired) redirect("/account?notice=storage-required");
    return { id, isAdmin: false, isCreator: false, createdAt: new Date(0) };
  }
  // Supabase resolves/provisions atomically through the private mapping. A
  // verified provider UUID is never used directly as the application User ID.
  if (authMode() !== "supabase") await db().execute(ordinaryUserInsert(id));
  const [user] = await db().select().from(users).where(eq(users.id, id));
  if (!user) redirect("/login?notice=session-expired");
  return user;
}
export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (!hasCapability(user, "admin")) redirect("/account?notice=admin-required");
  return user;
}
export async function requireCreator() {
  const user = await requireUser("/creator");
  if (
    !hasCapability(user, "creator") ||
    !(await creatorPublishingAllowed(db(), user.id, user.isCreator))
  )
    redirect("/account?notice=creator-required");
  return user;
}
export async function requireVendorCapability(toolId: string) {
  const user = await requireUser("/vendor");
  const [access] = await db()
    .select()
    .from(vendorAccess)
    .where(ownerPredicates(user.id).vendorTool(toolId));
  if (!ownsResource(user, access?.userId))
    redirect("/account?notice=vendor-required");
  return user;
}

export const requireApprovedCreator = requireCreator;
export const requireToolOwner = requireVendorCapability;
export async function requireVendor() {
  const user = await requireUser("/vendor");
  const access = await db()
    .select()
    .from(vendorAccess)
    .where(eq(vendorAccess.userId, user.id));
  return { user, access };
}
