import "server-only";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users, vendorAccess } from "./db/schema";
import { safeReturnPath } from "./catalog/filter";
import { passwordMode, passwordIdentity } from "./password-auth";
import { hasCapability, ownsResource } from "./capabilities";
export const authConfigured = () =>
  Boolean(
    !passwordMode() &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY,
  );
export async function getIdentity() {
  if (passwordMode()) return passwordIdentity();
  if (!authConfigured()) return null;
  return (await auth()).userId;
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
  await db().insert(users).values({ id }).onConflictDoNothing();
  const [user] = await db().select().from(users).where(eq(users.id, id));
  return user;
}
export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (!hasCapability(user, "admin")) redirect("/account?notice=admin-required");
  return user;
}
export async function requireCreator() {
  const user = await requireUser("/creator");
  if (!hasCapability(user, "creator"))
    redirect("/account?notice=creator-required");
  return user;
}
export async function requireVendorCapability(toolId: string) {
  const user = await requireUser("/vendor");
  const [access] = await db()
    .select()
    .from(vendorAccess)
    .where(eq(vendorAccess.toolId, toolId));
  if (!ownsResource(user, access?.userId))
    redirect("/account?notice=vendor-required");
  return user;
}
export async function requireVendor() {
  const user = await requireUser("/vendor");
  const access = await db()
    .select()
    .from(vendorAccess)
    .where(eq(vendorAccess.userId, user.id));
  return { user, access };
}
