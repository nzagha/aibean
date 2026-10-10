import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { getIdentity } from "./auth";
import { db } from "./db";
import { creatorPublishingAllowed } from "./admin/review-storage";
import { users, vendorAccess } from "./db/schema";
import {
  guestNavigation,
  resolveAccountNavigation,
} from "./account-navigation";

export const getAccountNavigation = cache(async () => {
  try {
    return await resolveAccountNavigation(
      await getIdentity(false),
      async (id) => {
        if (!process.env.DATABASE_URL) return undefined;
        const [user] = await db().select().from(users).where(eq(users.id, id));
        return user
          ? {
              ...user,
              isCreator: await creatorPublishingAllowed(
                db(),
                id,
                user.isCreator,
              ),
            }
          : undefined;
      },
      async (id) =>
        db().select().from(vendorAccess).where(eq(vendorAccess.userId, id)),
    );
  } catch {
    return guestNavigation;
  }
});
