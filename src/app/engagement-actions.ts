"use server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/security";
import {
  mutateEngagement,
  engagementInput,
} from "@/lib/db/engagement-workflows";
import { adminMessage, refreshAfterCommit } from "@/lib/admin/contracts";
import { safeReturnPath } from "@/lib/catalog/filter";
import type { ActionState } from "@/components/action-form";
import { revalidatePath } from "next/cache";
export async function updateEngagement(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser(safeReturnPath(form.get("returnTo")));
  const input = engagementInput.safeParse(Object.fromEntries(form));
  if (!input.success)
    return {
      error:
        "Check the fields. Reviews need a rating from 1 to 5 and at least 20 characters; stack names need 2–80 characters.",
    };
  try {
    await rateLimit(
      user.id,
      "engagement-" + input.data.operation,
      input.data.operation === "review" ? 10 : 60,
    );
    const message = await mutateEngagement(db(), user.id, input.data);
    return refreshAfterCommit({ message }, () => {
      revalidatePath("/account", "layout");
      revalidatePath("/tools", "layout");
    });
  } catch (error) {
    return { error: adminMessage(error) };
  }
}
