import { requireUser } from "../auth";
import { contentAvailable } from "./storage";
import { authorAllowed } from "./workflows";
import { db } from "../db";
import { redirect } from "next/navigation";
import type { ContentKind } from "./contracts";
export async function requirePublishingUser(
  kind: ContentKind,
  returnTo: string,
) {
  const user = await requireUser(returnTo);
  if (
    (await contentAvailable(db())) &&
    !(await db().transaction((tx) => authorAllowed(tx, user.id, kind)))
  )
    redirect("/account?notice=publishing-required");
  return user;
}
