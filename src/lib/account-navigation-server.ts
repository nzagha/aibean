import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { getIdentity } from "./auth";
import { db } from "./db";
import { users, vendorAccess } from "./db/schema";
import {
  guestNavigation,
  resolveAccountNavigation,
} from "./account-navigation";

export const getAccountNavigation = cache(async () => {
  try {
    return await resolveAccountNavigation(
      await getIdentity(false),
      async (id) =>
        process.env.DATABASE_URL
          ? (await db().select().from(users).where(eq(users.id, id)))[0]
          : undefined,
      async (id) =>
        db().select().from(vendorAccess).where(eq(vendorAccess.userId, id)),
    );
  } catch {
    return guestNavigation;
  }
});
